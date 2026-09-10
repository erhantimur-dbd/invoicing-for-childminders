import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  AI_USAGE_EVENT,
  METERED_MODELS,
  PRODUCT_TAGS,
  RATE_CARD_VERSION,
  buildAiUsageEvent,
  emitAiUsage,
  productTagForPurpose,
  resolveAiEnv,
  usageFromAnthropic,
  usageFromOpenAI,
} from './usage.ts'

describe('resolveAiEnv', () => {
  it('is prod only for VERCEL_ENV=production', () => {
    assert.equal(resolveAiEnv('production'), 'prod')
    assert.equal(resolveAiEnv('preview'), 'preview')
    assert.equal(resolveAiEnv('development'), 'preview')
    assert.equal(resolveAiEnv(undefined), 'preview')
  })
})

describe('productTagForPurpose', () => {
  it('tags Enquiries drafts vs Invoice AI', () => {
    assert.equal(productTagForPurpose('enquiry_draft'), PRODUCT_TAGS.enquiries)
    assert.equal(productTagForPurpose('invoice_agent'), PRODUCT_TAGS.invoice)
    assert.equal(productTagForPurpose('extract_receipt'), PRODUCT_TAGS.invoice)
    assert.equal(productTagForPurpose(undefined), PRODUCT_TAGS.invoice)
  })
})

describe('usageFromAnthropic', () => {
  it('maps input/output/cached and tool_use blocks', () => {
    const extracted = usageFromAnthropic({
      id: 'msg_invoice_1',
      usage: {
        input_tokens: 120,
        output_tokens: 40,
        cache_read_input_tokens: 80,
        cache_creation_input_tokens: 15,
      },
      content: [
        { type: 'text' },
        { type: 'tool_use' },
        { type: 'tool_use' },
      ],
    })
    assert.deepEqual(extracted, {
      tokens_in: 135,
      tokens_out: 40,
      tokens_cached: 80,
      tool_calls: 2,
      request_id: 'msg_invoice_1',
    })
  })

  it('treats missing usage as zeros', () => {
    const extracted = usageFromAnthropic({ content: [{ type: 'text' }] })
    assert.equal(extracted.tokens_in, 0)
    assert.equal(extracted.tokens_out, 0)
    assert.equal(extracted.tokens_cached, 0)
    assert.equal(extracted.tool_calls, 0)
    assert.ok(extracted.request_id.length > 0)
  })
})

describe('usageFromOpenAI', () => {
  it('subtracts cached tokens from the xAI/OpenAI prompt total', () => {
    const extracted = usageFromOpenAI({
      id: 'chatcmpl_grok_1',
      usage: {
        prompt_tokens: 200,
        completion_tokens: 50,
        prompt_tokens_details: { cached_tokens: 30 },
      },
    })
    assert.deepEqual(extracted, {
      tokens_in: 170,
      tokens_out: 50,
      tokens_cached: 30,
      tool_calls: 0,
      request_id: 'chatcmpl_grok_1',
    })
  })
})

describe('buildAiUsageEvent / emitAiUsage', () => {
  it('emits the shared schema Jim locked for Ethan', () => {
    const event = buildAiUsageEvent({
      product_tag: PRODUCT_TAGS.enquiries,
      env: 'preview',
      vendor: 'xai',
      model: METERED_MODELS.enquiriesLive,
      tokens_in: 10,
      tokens_out: 4,
      tokens_cached: 0,
      tool_calls: 0,
      request_id: 'req_1',
    })
    assert.deepEqual(event, {
      product_tag: 'godottie-enquiries',
      env: 'preview',
      vendor: 'xai',
      model: 'grok-4.6',
      tokens_in: 10,
      tokens_out: 4,
      tokens_cached: 0,
      tool_calls: 0,
      request_id: 'req_1',
      rate_card_version: '2026-09-10.1',
    })
    assert.equal(event.rate_card_version, RATE_CARD_VERSION)
  })

  it('logs ai_usage JSON and never throws', () => {
    const lines: string[] = []
    const orig = console.log
    console.log = (line: string) => {
      lines.push(String(line))
    }
    try {
      const emitted = emitAiUsage({
        product_tag: PRODUCT_TAGS.invoice,
        env: 'preview',
        vendor: 'anthropic',
        model: METERED_MODELS.invoiceAgent,
        tokens_in: 12,
        tokens_out: 3,
        tokens_cached: 0,
        tool_calls: 1,
        request_id: 'msg_2',
        purpose: 'invoice_agent',
      })
      assert.ok(emitted)
      const parsed = JSON.parse(lines[0]) as Record<string, unknown>
      assert.equal(parsed.event, AI_USAGE_EVENT)
      assert.equal(parsed.product_tag, 'godottie-invoice')
      assert.equal(parsed.model, 'claude-sonnet-4-6')
      assert.equal(parsed.rate_card_version, '2026-09-10.1')
      assert.equal(parsed.purpose, 'invoice_agent')
    } finally {
      console.log = orig
    }
  })

  it('keeps live SKU strings exact for Finance', () => {
    assert.equal(METERED_MODELS.enquiriesLive, 'grok-4.6')
    assert.equal(METERED_MODELS.enquiriesFailover, 'claude-sonnet-4-6')
    assert.equal(METERED_MODELS.invoiceAgent, 'claude-sonnet-4-6')
    assert.equal(METERED_MODELS.receiptVision, 'claude-haiku-4-5-20251001')
  })
})
