export type BillingPlan = 'monthly' | 'annual'
export type InvoicingTier = 'starter' | 'professional'
export type CheckoutProduct = 'invoicing' | 'enquiries'

export function resolveInvoicingPriceId(tier: InvoicingTier, plan: BillingPlan): string | null {
  const tierSpecific = process.env[`STRIPE_${tier.toUpperCase()}_${plan.toUpperCase()}_PRICE_ID`]
  if (tierSpecific) return tierSpecific
  return plan === 'monthly'
    ? process.env.STRIPE_MONTHLY_PRICE_ID ?? null
    : process.env.STRIPE_ANNUAL_PRICE_ID ?? null
}

export function resolveEnquiriesPriceId(plan: BillingPlan): string | null {
  return plan === 'monthly'
    ? process.env.STRIPE_ENQUIRIES_MONTHLY_PRICE_ID ?? null
    : process.env.STRIPE_ENQUIRIES_ANNUAL_PRICE_ID ?? null
}

export function enquiriesPriceIds(): string[] {
  return [
    process.env.STRIPE_ENQUIRIES_MONTHLY_PRICE_ID,
    process.env.STRIPE_ENQUIRIES_ANNUAL_PRICE_ID,
  ].filter((id): id is string => Boolean(id))
}
