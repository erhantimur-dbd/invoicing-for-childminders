import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'
import { autoDraftAndSend } from './auto-reply.ts'
import { draftAndMaybeSend } from './ingest.ts'
import { childminderFooterName, composeOutboundBody } from './auto-send-holdback.mjs'
import { AUTO_SEND_CONNECT_NOTICE } from './auto-send-notice.ts'
import type { HoldbackDecision } from './auto-send-holdback'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const CONNECTED = '2026-01-01T00:00:00.000Z'
const AFTER = '2026-06-01T00:00:00.000Z'
const DRAFT_BODY = 'Thank you. Tuesday and Wednesday are free for a visit.'

type SendCall = { body: string; via?: string }

function fakeDb(opts: { paused?: boolean; mode?: string; inboundBody: string }) {
  let messageReads = 0
  const updates: { table: string; payload: Record<string, unknown> }[] = []
  function chain(table: string) {
    const api = {
      select() { return api },
      eq() { return api },
      gte() { return api },
      order() { return api },
      limit() { return api },
      in() { return api },
      update(payload: Record<string, unknown>) {
        updates.push({ table, payload })
        return api
      },
      async maybeSingle() {
        if (table === 'enquiry_settings') {
          return { data: { agent_paused: Boolean(opts.paused), send_mode: opts.mode ?? 'auto' } }
        }
        if (table === 'enquiry_gmail_accounts') return { data: { connected_at: CONNECTED } }
        if (table === 'enquiry_prospects') {
          return { data: { id: 'p1', stage: 'chatting', parent_email: 'parent@example.com' } }
        }
        if (table === 'enquiry_messages') {
          messageReads += 1
          if (messageReads % 2 === 1) {
            return {
              data: {
                id: 'in1',
                prospect_id: 'p1',
                body: opts.inboundBody,
                subject: 'A place',
                created_at: AFTER,
              },
            }
          }
          return { data: null }
        }
        return { data: null }
      },
      then(resolve: (value: unknown) => void) {
        resolve({ data: null, error: null })
      },
    }
    return api
  }
  return { from(table: string) { return chain(table) }, updates }
}

function spies(inboundBody: string, paused = false) {
  const db = fakeDb({ paused, inboundBody })
  const drafts: string[] = []
  const sends: SendCall[] = []
  const createDraft = async () => {
    drafts.push(DRAFT_BODY)
    return {
      message: { id: 'd1', body: DRAFT_BODY },
      needsHuman: false,
      escalateReasons: [] as string[],
      escalateLabels: [] as string[],
    }
  }
  const gmailSend = async (opts: SendCall) => {
    sends.push(opts)
    return { gmailMessageId: 'g1', gmailThreadId: 't1', body: opts.body }
  }
  return { db, drafts, sends, createDraft, gmailSend }
}

async function runAuto(inboundBody: string, extra?: {
  paused?: boolean
  receivedAt?: string
  classify?: (inbound: string, draft: string) => HoldbackDecision | Promise<HoldbackDecision>
  timeoutMs?: number
}) {
  const { db, drafts, sends, createDraft, gmailSend } = spies(inboundBody, extra?.paused)
  const result = await autoDraftAndSend(db as never, 'user-1', [{
    id: 'in1',
    receivedAt: extra?.receivedAt ?? AFTER,
  }], {
    createDraft: createDraft as never,
    send: gmailSend as never,
    classify: extra?.classify,
    timeoutMs: extra?.timeoutMs,
  })
  return { result, drafts, sends }
}

async function runIngest(parentMessage: string, extra?: {
  classify?: (inbound: string, draft: string) => HoldbackDecision | Promise<HoldbackDecision>
  timeoutMs?: number
}) {
  const { db, drafts, sends, createDraft, gmailSend } = spies(parentMessage)
  const result = await draftAndMaybeSend({
    supabase: db as never,
    userId: 'user-1',
    prospect: { id: 'p1', parent_email: 'parent@example.com' } as never,
    settings: { send_mode: 'auto', agent_paused: false } as never,
    parentMessage,
  }, {
    createDraft: createDraft as never,
    send: gmailSend as never,
    classify: extra?.classify,
    timeoutMs: extra?.timeoutMs,
  })
  return { result, drafts, sends }
}

const TOPICS: [string, string][] = [
  ['safeguarding enquiry is saved as a draft and Gmail send is never called', 'I need to raise a safeguarding concern about my child.'],
  ['child health or medical enquiry is saved as a draft and Gmail send is never called', 'She has a peanut allergy and takes medication for asthma.'],
  ['complaint is saved as a draft and Gmail send is never called', 'I want to make a complaint about last week.'],
  ['payment dispute is saved as a draft and Gmail send is never called', 'I am writing to dispute the payment on your invoice.'],
]

describe('sensitive-topic holdback', () => {
  for (const [name, message] of TOPICS) {
    it(name, async () => {
      const auto = await runAuto(message)
      assert.equal(auto.drafts.length, 1)
      assert.equal(auto.sends.length, 0)
      assert.equal(auto.result.sent, 0)
      const ingested = await runIngest(message)
      assert.equal(ingested.drafts.length, 1)
      assert.equal(ingested.sends.length, 0)
      assert.equal(ingested.result.sent, false)
      assert.equal(ingested.result.draftId, 'd1')
    })

    it(`ingest: ${name}`, async () => {
      const ingested = await runIngest(message)
      assert.equal(ingested.drafts.length, 1)
      assert.equal(ingested.sends.length, 0)
      assert.equal(ingested.result.sent, false)
    })
  }

  it('an ordinary enquiry still auto-sends', async () => {
    const message = 'Hi, I am looking for a place for my daughter three days a week from September.'
    const auto = await runAuto(message)
    assert.equal(auto.drafts.length, 1)
    assert.equal(auto.sends.length, 1)
    assert.equal(auto.result.sent, 1)
    assert.equal(auto.sends[0].via, 'auto')
    assert.doesNotMatch(auto.sends[0].body, /Written with Go Dottie/)
    const ingested = await runIngest(message)
    assert.equal(ingested.sends.length, 1)
    assert.equal(ingested.result.sent, true)
  })

  it('a classifier error saves a draft and never sends', async () => {
    const classify = () => {
      throw new Error('classifier down')
    }
    const auto = await runAuto('Hi, I am looking for a place three days a week.', { classify })
    assert.equal(auto.drafts.length, 1)
    assert.equal(auto.sends.length, 0)
    assert.equal(auto.result.sent, 0)
    const ingested = await runIngest('Hi, I am looking for a place three days a week.', { classify })
    assert.equal(ingested.drafts.length, 1)
    assert.equal(ingested.sends.length, 0)
    assert.equal(ingested.result.sent, false)
  })

  it('a classifier timeout saves a draft and never sends', async () => {
    const classify = () => new Promise<HoldbackDecision>(() => {})
    const auto = await runAuto('Hi, I am looking for a place three days a week.', { classify, timeoutMs: 30 })
    assert.equal(auto.drafts.length, 1)
    assert.equal(auto.sends.length, 0)
    assert.equal(auto.result.sent, 0)
  })

  it('an unclear classifier result saves a draft and never sends', async () => {
    const auto = await runAuto('Hi, I am looking for a place three days a week.', {
      classify: () => ({ decision: 'unclear' }),
    })
    assert.equal(auto.drafts.length, 1)
    assert.equal(auto.sends.length, 0)
  })

  it('mail received before connected_at is not auto-sent', async () => {
    let classified = 0
    const auto = await runAuto('Hi, I am looking for a place three days a week.', {
      receivedAt: '2025-01-01T00:00:00.000Z',
      classify: () => {
        classified += 1
        return { decision: 'send' }
      },
    })
    assert.equal(classified, 0)
    assert.equal(auto.drafts.length, 0)
    assert.equal(auto.sends.length, 0)
  })

  it('pause stops the auto-send before a draft or a Gmail send', async () => {
    const auto = await runAuto('Hi, I am looking for a place three days a week.', { paused: true })
    assert.equal(auto.drafts.length, 0)
    assert.equal(auto.sends.length, 0)
    assert.equal(auto.result.reason, 'paused')
  })
})

describe('auto-send footer', () => {
  it('approve and manual sends do not include the Go Dottie footer', () => {
    const letter = 'Thank you. Tuesday and Wednesday are free for a visit.'
    assert.equal(composeOutboundBody(letter, 'approve', 'Mary'), letter)
    assert.equal(composeOutboundBody(letter, 'manual', 'Mary'), letter)
    assert.equal(composeOutboundBody(letter, undefined, 'Mary'), letter)
    assert.match(composeOutboundBody(letter, 'auto', 'Mary'), /Written with Go Dottie, Mary's AI assistant\./)
    assert.match(composeOutboundBody(letter, 'auto', null), /Written with Go Dottie, an AI assistant\./)
    assert.equal(childminderFooterName('Mary Jones', 'Someone Else'), 'Mary Jones')
    assert.equal(childminderFooterName(null, 'Mary Jones'), 'Mary')
    assert.equal(childminderFooterName('  ', ''), null)

    const sendSrc = readFileSync(join(root, 'lib/enquiries/gmail/send.ts'), 'utf8')
    const route = readFileSync(join(root, 'app/api/enquiries/send/route.ts'), 'utf8')
    const detail = readFileSync(join(root, 'app/(dashboard)/enquiries/[id]/ProspectDetail.tsx'), 'utf8')
    assert.match(sendSrc, /composeOutboundBody\(originalBody/)
    assert.match(sendSrc, /body: originalBody/)
    assert.match(route, /via: 'approve'/)
    assert.doesNotMatch(route, /Written with Go Dottie/)
    assert.match(detail, /data\.sent\.body/)
  })
})

describe('connect screen notice', () => {
  it('puts the Auto-send notice above a 44px switch that says the state in words', () => {
    assert.equal(
      AUTO_SEND_CONNECT_NOTICE,
      'Auto-send is on: Go Dottie will reply to enquiries from your Gmail automatically. You can switch to draft & approve now or any time.',
    )
    const toggle = readFileSync(join(root, 'components/enquiries/SendModeToggle.tsx'), 'utf8')
    const connect = readFileSync(join(root, 'components/enquiries/GmailConnect.tsx'), 'utf8')
    const noticeAt = toggle.indexOf('{notice')
    const switchAt = toggle.indexOf('role="group"')
    assert.ok(noticeAt > -1 && switchAt > noticeAt)
    assert.match(toggle, /min-h-\[44px\]/)
    assert.match(toggle, /Auto-send: on/)
    assert.match(toggle, /Draft & approve: on/)
    assert.match(toggle, /aria-label=\{status\}/)
    assert.match(connect, /notice=\{sendMode === 'auto' \? AUTO_SEND_CONNECT_NOTICE/)
    assert.match(connect, /toast\.success\(mode === 'auto' \? AUTO_SEND_CONNECT_NOTICE/)
  })
})
