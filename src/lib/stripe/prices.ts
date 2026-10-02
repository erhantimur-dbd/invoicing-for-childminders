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
