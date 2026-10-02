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
 * Signup and Enquiries checkout. Always the annual price.
 * `STRIPE_ENQUIRIES_ANNUAL_PRICE_ID` overrides the locked id when set.
 * Monthly Enquiries price env vars are not read.
 */
export function resolveEnquiriesPriceId(): string {
  const override = process.env.STRIPE_ENQUIRIES_ANNUAL_PRICE_ID?.trim()
  return override || GO_DOTTIE_ENQUIRIES_PRICE_ID
}

export function enquiriesPriceIds(): string[] {
  return [resolveEnquiriesPriceId()]
}
