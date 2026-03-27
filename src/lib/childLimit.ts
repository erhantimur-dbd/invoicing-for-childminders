export type SubscriptionTier = 'starter' | 'professional' | 'enterprise'

export const TIER_LIMITS: Record<SubscriptionTier, number> = {
  starter: 5,
  professional: 20,
  enterprise: Infinity,
}

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
}

export function getChildLimit(tier: string | null | undefined): number {
  return TIER_LIMITS[(tier as SubscriptionTier) ?? 'starter'] ?? 5
}

export function isAtLimit(activeChildCount: number, tier: string | null | undefined): boolean {
  const limit = getChildLimit(tier)
  return activeChildCount >= limit
}
