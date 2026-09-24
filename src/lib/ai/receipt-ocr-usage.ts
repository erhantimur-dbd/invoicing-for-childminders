/**
 * One `ai_usage` row for a paid receipt OCR call.
 *
 * `main` has no shared meter helper. Repo migrations do not define an
 * `ai_usage` table. This writes a single JSON log line tagged `receipt_ocr`
 * instead of creating a table or pulling in unmerged meter branches.
 *
 * Never throws — a metering failure must not block receipt extraction.
 */

export const RECEIPT_OCR_PURPOSE = 'receipt_ocr'
export const RECEIPT_OCR_MODEL = 'claude-haiku-4-5'

export type ReceiptOcrUsage = {
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

export function emitReceiptOcrUsage(response: ReceiptOcrUsage): void {
  try {
    const usage = response.usage ?? {}
    const tokensCached = count(usage.cache_read_input_tokens)
    const tokensIn = count(usage.input_tokens) + count(usage.cache_creation_input_tokens)
    const tokensOut = count(usage.output_tokens)
    console.log(JSON.stringify({
      ts: new Date().toISOString(),
      level: 'info',
      event: 'ai_usage',
      purpose: RECEIPT_OCR_PURPOSE,
      product_tag: 'godottie-invoice',
      env: process.env.VERCEL_ENV === 'production' ? 'prod' : 'preview',
      vendor: 'anthropic',
      model: response.model || RECEIPT_OCR_MODEL,
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
