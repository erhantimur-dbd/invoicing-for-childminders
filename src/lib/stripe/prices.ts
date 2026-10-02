export type BillingPlan = 'monthly' | 'annual'
export type InvoicingTier = 'starter' | 'professional'
export type CheckoutProduct = 'invoicing' | 'enquiries'

/** Locked Go Dottie Enquiries price: £160, billed once a year. */
export const GO_DOTTIE_ENQUIRIES_ANNUAL_GBP = 160
export const GO_DOTTIE_ENQUIRIES_PRICE_ID = 'price_1UDvB2B9AB27n7OAFxVLPfDD'

export function resolveInvoicingPriceId(tier: InvoicingTier, plan: BillingPlan): string | null {
  const tierSpecific = process.env[`STRIPE_${tier.toUpperCase()}_${plan.toUpperCase()}_PRICE_ID`]
  if (tierSpecific) return tierSpecific
  return plan === 'monthly'
    ? process.env.STRIPE_MONTHLY_PRICE_ID ?? null
    : process.env.STRIPE_ANNUAL_PRICE_ID ?? null
}

/**
 * Shown when Production checkout cannot use a live annual price.
 * Preview and development may still use the sandbox price id.
 */
export const ENQUIRIES_CHECKOUT_UNAVAILABLE =
  "We can't start checkout right now. The annual price is not available for live payments."

export type EnquiriesPriceEnv = NodeJS.ProcessEnv

/**
 * Annual Enquiries price only.
 * The id comes from `STRIPE_ENQUIRIES_ANNUAL_PRICE_ID`.
 * `GO_DOTTIE_ENQUIRIES_PRICE_ID` is the sandbox default, and only when
 * VERCEL_ENV is not `production` (Preview and development).
 * Production with the env var missing returns null — never the sandbox id.
 * Monthly Enquiries price env vars are not read.
 */
export function resolveEnquiriesPriceId(env: EnquiriesPriceEnv = process.env): string | null {
  const fromEnv = env.STRIPE_ENQUIRIES_ANNUAL_PRICE_ID?.trim()
  if (fromEnv) return fromEnv
  if (env.VERCEL_ENV === 'production') return null
  return GO_DOTTIE_ENQUIRIES_PRICE_ID
}

export type RetrievedEnquiriesPrice = {
  livemode?: boolean
  active?: boolean
} | null

/**
 * Production must use a live secret key and a live, active Price.
 * Returns a refusal reason, or null when checkout may continue.
 * Non-production does not apply this gate.
 */
export function enquiriesProductionPriceRefusal(input: {
  vercelEnv?: string
  secretKey?: string
  price: RetrievedEnquiriesPrice
}): 'key_not_live' | 'test_price' | 'price_inactive' | null {
  if (input.vercelEnv !== 'production') return null
  if (!input.secretKey?.startsWith('sk_live')) return 'key_not_live'
  if (!input.price || input.price.livemode !== true) return 'test_price'
  if (input.price.active !== true) return 'price_inactive'
  return null
}

export function enquiriesPriceIds(env: NodeJS.ProcessEnv = process.env): string[] {
  const id = resolveEnquiriesPriceId(env)
  return id ? [id] : []
}

/** How long a Production Stripe price lookup may be reused. */
const LOOKUP_CACHE_MS = 60_000

type PaidSignupCache = { key: string; at: number; open: boolean }

let paidSignupCache: PaidSignupCache | null = null

export type PaidSignupLookup = (priceId: string) => Promise<RetrievedEnquiriesPrice>

export function clearPaidSignupCache(): void {
  paidSignupCache = null
}

function paidSignupCacheKey(env: EnquiriesPriceEnv, priceId: string): string {
  const secret = env.STRIPE_SECRET_KEY ?? ''
  const liveKey = secret.startsWith('sk_live') ? 'sk_live' : 'other'
  return `${env.VERCEL_ENV}|${priceId}|${liveKey}`
}

async function retrieveEnquiriesPrice(secretKey: string, priceId: string): Promise<RetrievedEnquiriesPrice> {
  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(secretKey)
  const price = await stripe.prices.retrieve(priceId)
  return { livemode: price.livemode, active: price.active }
}

/** Query value, cookie value, and the request header the proxy copies from `?paid=`. */
export const PAID_SIGNUP_CLOSED = 'closed'
export const PAID_SIGNUP_COOKIE = 'gd_paid'
export const PAID_SIGNUP_QUERY_HEADER = 'x-gd-paid'

export type PaidSignupSignals = {
  /** `paid` query param. `closed` forces the closed state outside Production. */
  paidQuery?: string | null
  /** `gd_paid` cookie. `closed` forces the closed state outside Production. */
  paidCookie?: string | null
}

/**
 * Preview and development QA override.
 * Production always returns false here, so a query or cookie cannot open or close checkout.
 */
export function paidSignupQaClosed(env: EnquiriesPriceEnv, signals: PaidSignupSignals): boolean {
  if (env.VERCEL_ENV === 'production') return false
  return signals.paidQuery === PAID_SIGNUP_CLOSED || signals.paidCookie === PAID_SIGNUP_CLOSED
}

async function readNonProductionSignals(): Promise<PaidSignupSignals> {
  try {
    const { cookies, headers } = await import('next/headers')
    const jar = await cookies()
    const h = await headers()
    const marked = h.get(PAID_SIGNUP_QUERY_HEADER)
    return {
      paidCookie: jar.get(PAID_SIGNUP_COOKIE)?.value ?? null,
      paidQuery: marked === PAID_SIGNUP_CLOSED ? PAID_SIGNUP_CLOSED : null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : ''
    if (message.includes('outside a request scope')) return {}
    throw err
  }
}

/**
 * Enquiries checkout is open unless this is Production and the annual price is not live.
 * Live means `STRIPE_ENQUIRIES_ANNUAL_PRICE_ID` is set, the secret is `sk_live`,
 * and the retrieved price is livemode and active.
 * Preview, development, and an unset VERCEL_ENV return true and do not call Stripe,
 * unless `?paid=closed` is on the request or the `gd_paid=closed` cookie is set.
 * Visiting `?paid=closed` once sets that cookie. Production ignores both.
 * Production fails closed: a missing env var, a non-live key, an inactive or test
 * price, or a lookup error all return false. The Stripe lookup is cached.
 */
export async function isPaidSignupOpen(
  env: EnquiriesPriceEnv = process.env,
  lookup?: PaidSignupLookup,
  signals?: PaidSignupSignals,
): Promise<boolean> {
  if (env.VERCEL_ENV !== 'production') {
    const read = signals ?? (env === process.env ? await readNonProductionSignals() : {})
    if (paidSignupQaClosed(env, read)) return false
    return true
  }

  const priceId = resolveEnquiriesPriceId(env)
  const secretKey = env.STRIPE_SECRET_KEY
  if (!priceId || !secretKey?.startsWith('sk_live')) return false

  const key = paidSignupCacheKey(env, priceId)
  const now = Date.now()
  if (paidSignupCache && paidSignupCache.key === key && now - paidSignupCache.at < LOOKUP_CACHE_MS) {
    return paidSignupCache.open
  }

  let price: RetrievedEnquiriesPrice = null
  try {
    price = lookup ? await lookup(priceId) : await retrieveEnquiriesPrice(secretKey, priceId)
  } catch {
    paidSignupCache = { key, at: now, open: false }
    return false
  }

  const open = enquiriesProductionPriceRefusal({
    vercelEnv: 'production',
    secretKey,
    price,
  }) === null
  paidSignupCache = { key, at: now, open }
  return open
}
