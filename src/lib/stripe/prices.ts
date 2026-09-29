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

const INVOICING_TIERS: InvoicingTier[] = ['starter', 'professional']
const BILLING_PLANS: BillingPlan[] = ['monthly', 'annual']

export function isInvoicingTier(value: string | null | undefined): value is InvoicingTier {
  return value === 'starter' || value === 'professional'
}

/** Tier implied by a configured Starter/Professional price. Fallback interval prices do not map. */
export function tierForInvoicingPriceId(priceId: string | null | undefined): InvoicingTier | null {
  if (!priceId) return null
  for (const tier of INVOICING_TIERS) {
    for (const plan of BILLING_PLANS) {
      const configured = process.env[`STRIPE_${tier.toUpperCase()}_${plan.toUpperCase()}_PRICE_ID`]
      if (configured && configured === priceId) return tier
    }
  }
  return null
}

/**
 * Child cap follows the price that was charged. A configured price id wins;
 * otherwise the checkout button tier is used.
 */
export function resolveSubscriptionTier(
  metadataTier: string | null | undefined,
  priceId: string | null | undefined,
): InvoicingTier | null {
  return tierForInvoicingPriceId(priceId) ?? (isInvoicingTier(metadataTier) ? metadataTier : null)
}
