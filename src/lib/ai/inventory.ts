/**
 * Spike inventory of AI provider call sites.
 * Enquiries drafting: Grok primary; silent Anthropic failover on in
 * production (Privacy Soft CTA). Preview: ENQUIRIES_ANTHROPIC_FAILOVER=true.
 * Invoice AI stays on Anthropic (already Privacy-listed).
 */
export const AI_CALL_SITES = [
  {
    path: 'src/lib/ai/usage.ts',
    role: 'Shared AI usage meter — schema 2026-09-10.3 for Ethan; xAI cost_in_usd_ticks',
    env: 'VERCEL_ENV (preview|prod)',
    wired: true,
    metered: true,
  },
  {
    path: 'src/lib/ai/complete-chat.ts',
    role: 'Shared chat helper: Grok primary; Enquiries Anthropic failover on in prod; emits ai_usage',
    env: 'XAI_API_KEY; ENQUIRIES_ANTHROPIC_FAILOVER (Preview only); ANTHROPIC_API_KEY',
    wired: true,
    metered: true,
  },
  {
    path: 'src/lib/ai/enquiries-failover.ts',
    role: 'Prod Soft CTA failover on; Preview flag; John’s Privacy lines',
    env: 'VERCEL_ENV, ENQUIRIES_ANTHROPIC_FAILOVER',
    wired: true,
  },
  {
    path: 'src/lib/enquiries/grok.ts',
    role: 'Soft Launch Enquiries draft: builds the parent-reply prompt',
    env: 'via completeChat — prod silent Anthropic failover; Preview flag',
    wired: true,
    metered: true,
  },
  {
    path: 'src/app/api/enquiries/draft/route.ts',
    role: 'POST /api/enquiries/draft — rate-limits and persists the draft',
    env: 'none directly (calls draftEnquiryReply)',
    wired: true,
  },
  {
    path: 'src/lib/agent/invoice-agent.ts',
    role: 'Invoice agent: Anthropic tool loop (holidays / term-time / decide_invoices)',
    env: 'ANTHROPIC_API_KEY',
    wired: false,
    metered: true,
    model: 'claude-sonnet-4-6',
    reason: 'Anthropic-specific multi-turn tools; already has deterministic fallback',
  },
  {
    path: 'src/app/api/agent/invoice-decisions/route.ts',
    role: 'Manual bulk invoice preview — runs invoice agent or deterministic fallback',
    env: 'ANTHROPIC_API_KEY (gate only)',
    wired: false,
    metered: true,
    model: 'claude-sonnet-4-6',
  },
  {
    path: 'src/app/api/cron/generate-invoices/route.ts',
    role: 'Cron invoice generation — same agent + deterministic fallback',
    env: 'ANTHROPIC_API_KEY (gate only)',
    wired: false,
    metered: true,
    model: 'claude-sonnet-4-6',
  },
  {
    path: 'src/app/api/expenses/extract-receipt/route.ts',
    role: 'Receipt vision extract (Claude Haiku image → JSON)',
    env: 'ANTHROPIC_API_KEY',
    wired: false,
    metered: true,
    model: 'claude-haiku-4-5-20251001',
    reason: 'Vision/image API, not a text chat completion',
  },
] as const
