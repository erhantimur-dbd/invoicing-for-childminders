import assert from 'node:assert/strict'
import test from 'node:test'
import { emitInvoiceDecisionUsage, INVOICE_DECISIONS_PURPOSE } from '../ai/invoice-decision-usage'
import {
  buildFallbackDecisions,
  runInvoiceAgent,
  type AgentChild,
} from './invoice-agent'

const WEEK = ['2026-05-04', '2026-05-05', '2026-05-06', '2026-05-07', '2026-05-08']
const SUMMER_WEEK = ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07']
const TERM_WEEK = ['2026-03-02', '2026-03-03', '2026-03-04', '2026-03-05', '2026-03-06']

function child(overrides: Partial<AgentChild> = {}): AgentChild {
  return {
    id: 'child-1',
    first_name: 'Amelia-PII-ZX',
    last_name: 'Last-PII-ZX',
    parent_name: 'Parent-PII-ZX',
    daily_rate: 47.25,
    half_day_rate: 28.5,
    hourly_rate: 6.75,
    hours_per_day: 8,
    schedule_days: [
      { day: 'monday', type: 'full' },
      { day: 'tuesday', type: 'half' },
      { day: 'wednesday', type: 'full' },
    ],
    schedule_note: null,
    funding_type: 'none',
    funded_hours_per_day: null,
    funded_days: null,
    ...overrides,
  }
}

function withoutApiKey<T>(run: () => Promise<T>): Promise<T> {
  const previous = process.env.ANTHROPIC_API_KEY
  delete process.env.ANTHROPIC_API_KEY
  return run().finally(() => {
    if (previous === undefined) delete process.env.ANTHROPIC_API_KEY
    else process.env.ANTHROPIC_API_KEY = previous
  })
}

test('bank holiday drops the priced day and keeps the other scheduled rates', () => {
  const [decision] = buildFallbackDecisions([child()], WEEK, ['2026-05-04'])

  assert.equal(decision.generate, true)
  assert.deepEqual(decision.line_items.map(item => item.care_date), ['2026-05-05', '2026-05-06'])
  assert.equal(decision.line_items[0].amount, 28.5)
  assert.equal(decision.line_items[0].quantity, 0.5)
  assert.equal(decision.line_items[1].amount, 47.25)
  assert.equal(decision.week_total, 75.75)
  assert.match(decision.agent_notes || '', /Bank holiday removed/)
})

test('a week of bank holidays skips the invoice without inventing a rate', () => {
  const mondayOnly = child({
    schedule_days: [{ day: 'monday', type: 'full' }],
  })
  const [decision] = buildFallbackDecisions([mondayOnly], WEEK, ['2026-05-04'])

  assert.equal(decision.generate, false)
  assert.equal(decision.line_items.length, 0)
  assert.equal(decision.week_total, 0)
  assert.equal(decision.skip_reason, 'Bank holiday')
})

test('term time only skips a summer week and does not call the model', async () => {
  let calls = 0
  const decisions = await runInvoiceAgent(
    [child({ schedule_note: 'Term-time only.' })],
    SUMMER_WEEK,
    [],
    { complete: async () => { calls += 1; return { text: '{}' } } },
  )

  assert.equal(calls, 0)
  assert.equal(decisions[0].generate, false)
  assert.equal(decisions[0].week_total, 0)
  assert.match(decisions[0].skip_reason || '', /Term time only — Summer holidays/)
})

test('term time only keeps a March week at the schedule rates', async () => {
  const baseline = buildFallbackDecisions([child()], TERM_WEEK, [])
  const decisions = await runInvoiceAgent(
    [child({ schedule_note: 'term time only' })],
    TERM_WEEK,
    [],
    { complete: async () => { throw new Error('model should not run') } },
  )

  assert.equal(decisions[0].generate, true)
  assert.deepEqual(decisions[0].line_items, baseline[0].line_items)
  assert.equal(decisions[0].week_total, baseline[0].week_total)
  assert.equal(decisions[0].agent_notes, null)
})

test('empty notes stay on the deterministic path', async () => {
  const decisions = await withoutApiKey(() => runInvoiceAgent(
    [child({ schedule_note: '  ' }), child({ id: 'child-2', schedule_note: 'none' })],
    TERM_WEEK,
    [],
  ))
  const baseline = buildFallbackDecisions(
    [child({ schedule_note: '  ' }), child({ id: 'child-2', schedule_note: 'none' })],
    TERM_WEEK,
    [],
  )

  assert.deepEqual(decisions.map(decision => decision.line_items), baseline.map(decision => decision.line_items))
  assert.deepEqual(decisions.map(decision => decision.week_total), baseline.map(decision => decision.week_total))
})

test('a free-text note calls the model once, hides names, and keeps remaining prices', async () => {
  const funded = child({
    id: 'child-funded',
    schedule_note: 'away on Wednesday',
    funding_type: '15',
    funded_hours_per_day: 5,
    funded_days: ['monday'],
    hourly_rate: 6,
    daily_rate: 48,
    schedule_days: [
      { day: 'monday', type: 'full' },
      { day: 'wednesday', type: 'full' },
    ],
  })
  const plain = child({ id: 'child-plain', schedule_note: null })
  let calls = 0
  let prompt = ''

  const decisions = await runInvoiceAgent([funded, plain], TERM_WEEK, [], {
    complete: async (body) => {
      calls += 1
      prompt = body
      return {
        text: JSON.stringify({
          adjustments: [
            {
              child_id: 'child-funded',
              exclude_dates: ['2026-03-04', '1999-01-01'],
              skip_week: false,
              note: 'Away on Wednesday',
            },
            {
              child_id: 'child-plain',
              exclude_dates: [],
              skip_week: true,
              note: 'Should be ignored',
            },
          ],
        }),
      }
    },
  })

  assert.equal(calls, 1)
  assert.doesNotMatch(prompt, /Amelia-PII-ZX|Last-PII-ZX|Parent-PII-ZX|first_name|last_name|parent_name/)
  assert.doesNotMatch(prompt, /47\.25|6\.75/)
  assert.match(prompt, /child-funded/)
  assert.doesNotMatch(prompt, /child-plain/)

  const fundedDecision = decisions.find(decision => decision.child_id === 'child-funded')
  assert.ok(fundedDecision)
  assert.deepEqual([...new Set(fundedDecision.line_items.map(item => item.care_date))], ['2026-03-02'])
  assert.equal(fundedDecision.line_items.find(item => item.is_funded)?.amount, 0)
  assert.equal(fundedDecision.week_total, 18)
  assert.match(fundedDecision.agent_notes || '', /Away on Wednesday/)

  const plainDecision = decisions.find(decision => decision.child_id === 'child-plain')
  const plainBaseline = buildFallbackDecisions([plain], TERM_WEEK, [])[0]
  assert.deepEqual(plainDecision?.line_items, plainBaseline.line_items)
  assert.equal(plainDecision?.week_total, plainBaseline.week_total)
})

test('an unreadable model reply keeps the deterministic invoice', async () => {
  const baseline = buildFallbackDecisions([child({ schedule_note: 'away in August' })], TERM_WEEK, [])
  const decisions = await runInvoiceAgent(
    [child({ schedule_note: 'away in August' })],
    TERM_WEEK,
    [],
    { complete: async () => ({ text: 'not json' }) },
  )

  assert.deepEqual(decisions[0].line_items, baseline[0].line_items)
  assert.equal(decisions[0].week_total, baseline[0].week_total)
  assert.equal(decisions[0].generate, true)
})

test('skip_week clears line items and does not invent a charge', async () => {
  const decisions = await runInvoiceAgent(
    [child({ schedule_note: 'away all this week' })],
    TERM_WEEK,
    [],
    {
      complete: async () => ({
        text: '{"adjustments":[{"child_id":"child-1","exclude_dates":[],"skip_week":true,"note":"Away all week"}]}',
      }),
    },
  )

  assert.equal(decisions[0].generate, false)
  assert.equal(decisions[0].line_items.length, 0)
  assert.equal(decisions[0].week_total, 0)
  assert.equal(decisions[0].skip_reason, 'Away all week')
})

test('without an API key a free-text note still invoices the schedule', async () => {
  const decisions = await withoutApiKey(() => runInvoiceAgent(
    [child({ schedule_note: 'away in August' })],
    SUMMER_WEEK,
    [],
  ))

  assert.equal(decisions[0].generate, true)
  assert.ok(decisions[0].week_total > 0)
})

test('ai_usage row records the invoice_decisions call and ignores bad token counts', () => {
  const lines: string[] = []
  const original = console.log
  console.log = (line?: unknown) => {
    if (typeof line === 'string') lines.push(line)
  }
  try {
    emitInvoiceDecisionUsage({
      id: 'msg_test',
      model: 'claude-haiku-4-5',
      usage: { input_tokens: 120, output_tokens: 40, cache_read_input_tokens: 0 },
    })
    emitInvoiceDecisionUsage({ usage: { input_tokens: Number.NaN, output_tokens: -3 } })
  } finally {
    console.log = original
  }

  const first = JSON.parse(lines[0])
  assert.equal(first.event, 'ai_usage')
  assert.equal(first.purpose, INVOICE_DECISIONS_PURPOSE)
  assert.equal(first.vendor, 'anthropic')
  assert.equal(first.model, 'claude-haiku-4-5')
  assert.equal(first.tokens_in, 120)
  assert.equal(first.tokens_out, 40)
  assert.equal(first.tokens_cached, 0)
  assert.equal(first.tool_calls, 0)
  assert.equal(first.request_id, 'msg_test')
  assert.equal(first.product_tag, 'godottie-invoice')

  const second = JSON.parse(lines[1])
  assert.equal(second.purpose, INVOICE_DECISIONS_PURPOSE)
  assert.equal(second.tokens_in, 0)
  assert.equal(second.tokens_out, 0)
  assert.equal(second.model, 'claude-haiku-4-5')
})
