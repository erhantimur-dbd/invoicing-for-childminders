import assert from 'node:assert/strict'
import test from 'node:test'
import { emitReceiptOcrUsage, RECEIPT_OCR_MODEL, RECEIPT_OCR_PURPOSE } from './receipt-ocr-usage'

test('ai_usage row records the receipt_ocr call and ignores bad token counts', () => {
  const lines: string[] = []
  const original = console.log
  console.log = (line?: unknown) => {
    if (typeof line === 'string') lines.push(line)
  }
  try {
    emitReceiptOcrUsage({
      id: 'msg_receipt',
      model: RECEIPT_OCR_MODEL,
      usage: { input_tokens: 1800, output_tokens: 90, cache_read_input_tokens: 0 },
    })
    emitReceiptOcrUsage({ usage: { input_tokens: Number.NaN, output_tokens: -3 } })
  } finally {
    console.log = original
  }

  const first = JSON.parse(lines[0])
  assert.equal(first.event, 'ai_usage')
  assert.equal(first.purpose, RECEIPT_OCR_PURPOSE)
  assert.equal(first.purpose, 'receipt_ocr')
  assert.equal(first.vendor, 'anthropic')
  assert.equal(first.model, 'claude-haiku-4-5')
  assert.equal(first.tokens_in, 1800)
  assert.equal(first.tokens_out, 90)
  assert.equal(first.tokens_cached, 0)
  assert.equal(first.tool_calls, 0)
  assert.equal(first.request_id, 'msg_receipt')
  assert.equal(first.product_tag, 'godottie-invoice')

  const second = JSON.parse(lines[1])
  assert.equal(second.purpose, RECEIPT_OCR_PURPOSE)
  assert.equal(second.tokens_in, 0)
  assert.equal(second.tokens_out, 0)
  assert.equal(second.model, 'claude-haiku-4-5')
})
