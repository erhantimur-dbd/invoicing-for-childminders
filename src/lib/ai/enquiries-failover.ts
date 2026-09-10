/**
 * Enquiries drafting: silent Anthropic failover after Privacy Soft CTA.
 *
 * Production (VERCEL_ENV=production) may fall back to Anthropic when xAI is
 * unavailable — Privacy now names that path (John Soft CTA-stamped).
 * Preview/local still requires ENQUIRIES_ANTHROPIC_FAILOVER=true so the
 * explicit Preview flag stays opt-in. Invoice AI is unchanged.
 *
 * Use VERCEL_ENV, not NODE_ENV — Preview builds also run NODE_ENV=production.
 * Fallback attempts stay logged.
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
  // Soft CTA-clear: Privacy lines live → production silent failover unlocked.
  if (isProductionDeploy(resolved)) return true
  return resolved.ENQUIRIES_ANTHROPIC_FAILOVER === 'true'
}

export function enquiriesFailoverBlockReason(env?: FailoverEnv): 'production_privacy' | 'flag_off' | null {
  if (enquiriesAnthropicFailoverEnabled(env)) return null
  // production_privacy is retained on the union for log compatibility but is
  // no longer emitted after the Soft CTA lift.
  return 'flag_off'
}

/**
 * John Legal Soft CTA-stamped Privacy lines (shipped on /privacy#gmail-enquiries).
 * Soft Launch Enquiries silent Anthropic failover unlocks when these are live.
 */
export const JOHN_LEGAL_ENQUIRIES_FAILOVER_PRIVACY = {
  aiProcessingBullet:
    'Drafting enquiry replies uses AI services from xAI (Grok). If xAI is unavailable, drafting may fall back to Anthropic (Claude). Sending the reply is via your Gmail (gmail.send), not via xAI or Anthropic.',
  transferBullet:
    'Drafting may involve a transfer of enquiry content to the United States (or other locations where xAI or Anthropic process data). We only send what is needed to draft the reply for that enquiry thread.',
  anthropicProcessorRole:
    'AI-assisted invoice generation, and (when xAI is unavailable) failover drafting of enquiry replies for Soft Launch Gmail Enquiries. Sending the reply is via the childminder’s Gmail, not via Anthropic. We only send what is needed to draft that reply.',
} as const
