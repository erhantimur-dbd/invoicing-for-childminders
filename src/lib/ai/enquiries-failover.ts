/**
 * Enquiries drafting: Anthropic failover is Preview-only until Privacy names it.
 *
 * Production (VERCEL_ENV=production) never sends enquiry content to Anthropic,
 * even if ENQUIRIES_ANTHROPIC_FAILOVER is set. Preview/local requires
 * ENQUIRIES_ANTHROPIC_FAILOVER=true. Invoice AI is unchanged (already listed).
 *
 * Use VERCEL_ENV, not NODE_ENV — Preview builds also run NODE_ENV=production.
 */

export type FailoverEnv = {
  VERCEL_ENV?: string
  ENQUIRIES_ANTHROPIC_FAILOVER?: string
}

function readEnv(env?: FailoverEnv): FailoverEnv {
  return env ?? {
    VERCEL_ENV: process.env.VERCEL_ENV,
    ENQUIRIES_ANTHROPIC_FAILOVER: process.env.ENQUIRIES_ANTHROPIC_FAILOVER,
  }
}

export function isProductionDeploy(env?: FailoverEnv): boolean {
  return readEnv(env).VERCEL_ENV === 'production'
}

export function enquiriesAnthropicFailoverEnabled(env?: FailoverEnv): boolean {
  const resolved = readEnv(env)
  if (isProductionDeploy(resolved)) return false
  return resolved.ENQUIRIES_ANTHROPIC_FAILOVER === 'true'
}

export function enquiriesFailoverBlockReason(env?: FailoverEnv): 'production_privacy' | 'flag_off' | null {
  if (enquiriesAnthropicFailoverEnabled(env)) return null
  return isProductionDeploy(env) ? 'production_privacy' : 'flag_off'
}

/**
 * John's required Privacy line before Soft Launch relies on Anthropic
 * Enquiries failover in production (Soft CTA). Do not ship this copy
 * until Legal signs it — live Privacy still says xAI only.
 */
export const JOHN_LEGAL_ENQUIRIES_FAILOVER_PRIVACY = {
  aiProcessingBullet:
    'Drafting enquiry replies uses AI services from xAI (Grok). If xAI is unavailable, drafting may fall back to Anthropic (Claude). Sending the reply is via your Gmail (gmail.send), not via xAI or Anthropic.',
  transferBullet:
    'Drafting may involve a transfer of enquiry content to the United States (or other locations where xAI or Anthropic process data). We only send what is needed to draft the reply for that enquiry thread.',
  anthropicProcessorRole:
    'AI-assisted invoice generation, and (when xAI is unavailable) failover drafting of enquiry replies for Soft Launch Gmail Enquiries. Sending the reply is via the childminder’s Gmail, not via Anthropic. We only send what is needed to draft that reply.',
} as const
