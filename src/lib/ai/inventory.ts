/**
 * Spike inventory of AI provider call sites.
 * Enquiries drafting is documented as xAI/Grok. Anthropic is silent
 * failover only (server logs). Do not describe Anthropic as a primary
 * Enquiries path in UI or Soft Launch marketing.
 */
export const AI_CALL_SITES = [
  {
    path: 'src/lib/ai/complete-chat.ts',
    role: 'Shared chat helper: xAI/Grok documented primary; Anthropic silent failover',
    env: 'XAI_API_KEY (primary), ANTHROPIC_API_KEY (silent failover)',
    wired: true,
  },
  {
    path: 'src/lib/enquiries/grok.ts',
    role: 'Soft Launch Enquiries draft: builds the parent-reply prompt',
    env: 'via completeChat — XAI_API_KEY (documented); ANTHROPIC_API_KEY silent failover only',
    wired: true,
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
    reason: 'Anthropic-specific multi-turn tools; already has deterministic fallback',
  },
  {
    path: 'src/app/api/agent/invoice-decisions/route.ts',
    role: 'Manual bulk invoice preview — runs invoice agent or deterministic fallback',
    env: 'ANTHROPIC_API_KEY (gate only)',
    wired: false,
  },
  {
    path: 'src/app/api/cron/generate-invoices/route.ts',
    role: 'Cron invoice generation — same agent + deterministic fallback',
    env: 'ANTHROPIC_API_KEY (gate only)',
    wired: false,
  },
  {
    path: 'src/app/api/expenses/extract-receipt/route.ts',
    role: 'Receipt vision extract (Claude Haiku image → JSON)',
    env: 'ANTHROPIC_API_KEY',
    wired: false,
    reason: 'Vision/image API, not a text chat completion',
  },
] as const
