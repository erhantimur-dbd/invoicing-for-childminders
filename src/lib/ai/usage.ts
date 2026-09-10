/**
 * Shared AI usage meter (Jim Architecture-OK / Ethan Finance SoT `2026-09-10.3`).
 *
 * Emits a single-line JSON `ai_usage` event (same shape as `log.info`) so
 * Vercel Preview logs are greppable. Never throws — Soft Launch seats must
 * not be blocked by metering.
 *
 * Preview-first: `env` is `prod` only when VERCEL_ENV=production. Local and
 * Preview deploys are `preview`. Do not promote main from this spike.
 *
 * Enquiries: Grok primary; silent Anthropic failover is on in production
 * (Privacy Soft CTA). When xAI returns `usage.cost_in_usd_ticks`, that
 * vendor-actual value is included on the event (Ethan).
 */

export const RATE_CARD_VERSION = '2026-09-10.3' as const

export const PRODUCT_TAGS = {
  enquiries: 'godottie-enquiries',
  invoice: 'godottie-invoice',
} as const

export type AiProductTag = (typeof PRODUCT_TAGS)[keyof typeof PRODUCT_TAGS]
export type AiEnv = 'preview' | 'prod'
export type AiVendor = 'xai' | 'anthropic'

/** Live SKUs Noah’s lane reports to Finance. */
export const METERED_MODELS = {
  enquiriesLive: 'grok-4.6',
  enquiriesFailover: 'claude-sonnet-4-6',
  invoiceAgent: 'claude-sonnet-4-6',
  receiptVision: 'claude-haiku-4-5-20251001',
} as const

export const AI_USAGE_EVENT = 'ai_usage'

function writeUsageLine(fields: Record<string, unknown>) {
  // Same single-line JSON shape as `log.info` so Vercel parses it. Avoids the
  // Next `@/` alias so node:test can load this helper without a bundler.
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: 'info',
      event: AI_USAGE_EVENT,
      ...fields,
    }),
  )
}

export type AiUsageEvent = {
  product_tag: AiProductTag
  env: AiEnv
  vendor: AiVendor
  model: string
  tokens_in: number
  tokens_out: number
  tokens_cached: number
  tool_calls: number
  request_id: string
  rate_card_version: typeof RATE_CARD_VERSION
  /** xAI vendor-actual billed cost. Omitted when the provider did not send it. */
  cost_in_usd_ticks?: number
}

export type AiUsageEmitInput = Omit<AiUsageEvent, 'env' | 'rate_card_version' | 'cost_in_usd_ticks'> & {
  env?: AiEnv
  cost_in_usd_ticks?: number
  /** Call-site label for logs only (not on Ethan’s rate card). */
  purpose?: string
}

export type AnthropicUsageLike = {
  id?: string
  model?: string
  usage?: {
    input_tokens?: number
    output_tokens?: number
    cache_read_input_tokens?: number | null
    cache_creation_input_tokens?: number | null
  }
  content?: Array<{ type?: string }>
}

export type OpenAIUsageLike = {
  id?: string
  model?: string
  cost_in_usd_ticks?: number
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    input_tokens?: number
    output_tokens?: number
    cost_in_usd_ticks?: number
    prompt_tokens_details?: {
      cached_tokens?: number
      cache_write_tokens?: number
    }
    input_tokens_details?: { cached_tokens?: number }
  }
  choices?: Array<{ message?: { tool_calls?: unknown[] | null } }>
}

export function resolveAiEnv(vercelEnv: string | undefined = process.env.VERCEL_ENV): AiEnv {
  return vercelEnv === 'production' ? 'prod' : 'preview'
}

export function productTagForPurpose(purpose: string | undefined): AiProductTag {
  return purpose === 'enquiry_draft' ? PRODUCT_TAGS.enquiries : PRODUCT_TAGS.invoice
}

function asCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

/** Finite non-negative integer ticks. Rejects strings / NaN / negatives. */
export function asUsdTicks(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : undefined
}

function requestIdFrom(id: unknown): string {
  return typeof id === 'string' && id.length > 0 ? id : crypto.randomUUID()
}

/** Prefer the vendor-reported model id; fall back to our locked SKU string. */
export function preferVendorModel(reported: unknown, fallback: string): string {
  return typeof reported === 'string' && reported.length > 0 ? reported : fallback
}

/**
 * Anthropic: `input_tokens` is the uncached remainder. Cache writes bill like
 * input, so they fold into `tokens_in`. Cache reads go to `tokens_cached`.
 */
export function usageFromAnthropic(response: AnthropicUsageLike): Pick<
  AiUsageEvent,
  'tokens_in' | 'tokens_out' | 'tokens_cached' | 'tool_calls' | 'request_id'
> {
  const usage = response.usage ?? {}
  const tokens_cached = asCount(usage.cache_read_input_tokens)
  const tokens_in = asCount(usage.input_tokens) + asCount(usage.cache_creation_input_tokens)
  const tokens_out = asCount(usage.output_tokens)
  const tool_calls = Array.isArray(response.content)
    ? response.content.filter((block) => block?.type === 'tool_use').length
    : 0
  return {
    tokens_in,
    tokens_out,
    tokens_cached,
    tool_calls,
    request_id: requestIdFrom(response.id),
  }
}

/**
 * OpenAI / xAI: `prompt_tokens` includes cached tokens when details are
 * present. Subtract cached so `tokens_in` is the full-rate bucket.
 *
 * When xAI sends `usage.cost_in_usd_ticks` (vendor-actual billed ticks,
 * 1 USD = 1e10 ticks), include it. Prefer that over computing cost from
 * tokens. Omit the field when the provider did not send a valid value.
 */
export function usageFromOpenAI(response: OpenAIUsageLike): Pick<
  AiUsageEvent,
  'tokens_in' | 'tokens_out' | 'tokens_cached' | 'tool_calls' | 'request_id' | 'cost_in_usd_ticks'
> {
  const usage = response.usage ?? {}
  const tokens_cached = asCount(
    usage.prompt_tokens_details?.cached_tokens ?? usage.input_tokens_details?.cached_tokens,
  )
  const prompt = asCount(usage.prompt_tokens ?? usage.input_tokens)
  const writes = asCount(usage.prompt_tokens_details?.cache_write_tokens)
  const tokens_in = Math.max(0, prompt - tokens_cached) + writes
  const tokens_out = asCount(usage.completion_tokens ?? usage.output_tokens)
  const tool_calls = response.choices?.[0]?.message?.tool_calls?.length ?? 0
  const cost_in_usd_ticks = asUsdTicks(usage.cost_in_usd_ticks ?? response.cost_in_usd_ticks)
  return {
    tokens_in,
    tokens_out,
    tokens_cached,
    tool_calls,
    request_id: requestIdFrom(response.id),
    ...(cost_in_usd_ticks !== undefined ? { cost_in_usd_ticks } : {}),
  }
}

export function buildAiUsageEvent(input: AiUsageEmitInput): AiUsageEvent {
  const cost_in_usd_ticks = asUsdTicks(input.cost_in_usd_ticks)
  return {
    product_tag: input.product_tag,
    env: input.env ?? resolveAiEnv(),
    vendor: input.vendor,
    // Prefer the vendor-reported model id when the call site passes it through.
    model: input.model,
    tokens_in: asCount(input.tokens_in),
    tokens_out: asCount(input.tokens_out),
    tokens_cached: asCount(input.tokens_cached),
    tool_calls: asCount(input.tool_calls),
    request_id: requestIdFrom(input.request_id),
    rate_card_version: RATE_CARD_VERSION,
    ...(cost_in_usd_ticks !== undefined ? { cost_in_usd_ticks } : {}),
  }
}

/** Fire-and-forget. Metering must never fail a draft, invoice, or receipt. */
export function emitAiUsage(input: AiUsageEmitInput): AiUsageEvent | null {
  try {
    const event = buildAiUsageEvent(input)
    writeUsageLine({
      ...event,
      ...(input.purpose ? { purpose: input.purpose } : {}),
    })
    return event
  } catch {
    return null
  }
}
