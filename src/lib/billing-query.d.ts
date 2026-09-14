export type BillingPlan = 'monthly' | 'annual'

export function parseBilling(raw: string | null | undefined): BillingPlan
export function billingFromSearch(search: string): BillingPlan
export function withBilling(path: string, billing?: string | null): string
export function authCallbackRedirect(origin: string, nextPath: string): string
export function subscribeNext(billing?: string | null, product?: string): string
