export type SubscriptionRow = {
  status?: string | null
  trial_end?: string | null
  enquiries_status?: string | null
  enquiries_plan?: string | null
  enquiries_stripe_subscription_id?: string | null
  enquiries_current_period_end?: string | null
  stripe_subscription_id?: string | null
  stripe_customer_id?: string | null
  plan?: string | null
}

export function invoicingActive(sub: SubscriptionRow | null | undefined): boolean {
  if (!sub) return false
  if (sub.status === 'active') return true
  if (sub.status === 'trialing' && sub.trial_end && new Date(sub.trial_end) > new Date()) {
    return true
  }
  return false
}

export function enquiriesActive(sub: SubscriptionRow | null | undefined): boolean {
  if (!sub) return false
  return sub.enquiries_status === 'active'
}

/** Post-checkout success page: wait for product status, not Stripe IDs. */
export function checkoutLanded(
  product: string | null | undefined,
  sub: SubscriptionRow | null | undefined,
): boolean {
  if (product === 'enquiries') return enquiriesActive(sub)
  return invoicingActive(sub)
}

export function anyProductActive(sub: SubscriptionRow | null | undefined): boolean {
  return invoicingActive(sub) || enquiriesActive(sub)
}

/**
 * OAuth and email-confirm landings. Password reset stays put. Dashboard and
 * onboarding are not a free trial — without a paid plan or a live admin grant,
 * send the user to Enquiries checkout.
 */
export function destinationAfterAuth(
  next: string,
  sub: SubscriptionRow | null | undefined,
): string {
  const path = next.split('?')[0] ?? next
  if (path.startsWith('/reset-password')) return next
  if (path !== '/dashboard' && path !== '/onboarding') return next
  if (anyProductActive(sub)) return next
  return '/subscribe?product=enquiries'
}

export function isEnquiriesStripeSub(
  subscriptionId: string | null | undefined,
  sub: SubscriptionRow | null | undefined,
  metadataProduct?: string | null,
): boolean {
  if (metadataProduct === 'enquiries') return true
  if (!subscriptionId || !sub) return false
  return sub.enquiries_stripe_subscription_id === subscriptionId
}
