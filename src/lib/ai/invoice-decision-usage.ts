/**
 * One `ai_usage` row for a paid invoice schedule-note call.
 *
 * `main` has no shared meter helper. Repo migrations do not define an
 * `ai_usage` table, and the childminder Supabase project was paused so its
 * live columns could not be read. This writes a single JSON log line tagged
 * `invoice_decisions` instead of creating a table or pulling in the unmerged
 * Enquiries meter.
 *
 * Never throws — a metering failure must not block invoice generation.
 */

export const INVOICE_DECISIONS_PURPOSE = 'invoice_decisions'
export const INVOICE_DECISIONS_MODEL = 'claude-haiku-4-5'

export type InvoiceDecisionUsage = {
  id?: string
  model?: string
  usage?: {
    input_tokens?: number
    output_tokens?: number
    cache_read_input_tokens?: number | null
    cache_creation_input_tokens?: number | null
  }
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

export function emitInvoiceDecisionUsage(response: InvoiceDecisionUsage): void {
  try {
    const usage = response.usage ?? {}
    const tokensCached = count(usage.cache_read_input_tokens)
    const tokensIn = count(usage.input_tokens) + count(usage.cache_creation_input_tokens)
    const tokensOut = count(usage.output_tokens)
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      level: 'info',
      event: 'ai_usage',
      purpose: INVOICE_DECISIONS_PURPOSE,
      product_tag: 'godottie-invoice',
      env: process.env.VERCEL_ENV === 'production' ? 'prod' : 'preview',
      vendor: 'anthropic',
      model: response.model || INVOICE_DECISIONS_MODEL,
      tokens_in: tokensIn,
      tokens_out: tokensOut,
      tokens_cached: tokensCached,
      tool_calls: 0,
      request_id: response.id || crypto.randomUUID(),
    }))
  } catch {
    // Metering is best-effort.
  }
}
