/**
 * Paid Anthropic calls are closed outside production.
 *
 * Vercel Preview sets NODE_ENV=production and can inherit production keys, so
 * VERCEL_ENV is what distinguishes a real production deploy from Preview.
 * Set ALLOW_PREVIEW_PAID_APIS to "1" or "true" to opt a non-production
 * process in explicitly.
 */
export type PaidAnthropicEnv = {
  VERCEL_ENV?: string
  NODE_ENV?: string
  ALLOW_PREVIEW_PAID_APIS?: string
}

export function isPaidAnthropicAllowed(env: PaidAnthropicEnv = process.env): boolean {
  const allow = env.ALLOW_PREVIEW_PAID_APIS?.trim()
  if (allow === '1' || allow === 'true') return true

  if (env.VERCEL_ENV === 'preview') return false
  if (env.VERCEL_ENV === 'production') return true

  // Self-hosted or `next start`: production Node, and not a Vercel Preview.
  if (env.NODE_ENV === 'production' && !env.VERCEL_ENV) return true

  return false
}
