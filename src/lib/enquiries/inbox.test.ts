import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { alreadyRepliedToLatestInbound, inboxStatus, isOpenDraft, replySubject, snippet } from './inbox.ts'
import type { EnquiryMessage } from './types.ts'

function msg(partial: Partial<EnquiryMessage>): EnquiryMessage {
  return {
    id: '1',
    prospect_id: 'p',
    user_id: 'u',
    direction: 'in',
    subject: null,
    body: 'Hello',
    from_address: null,
    to_address: null,
    status: 'logged',
    model: null,
    gmail_message_id: null,
    gmail_thread_id: null,
    rfc_message_id: null,
    created_at: '2026-09-10T00:00:00.000Z',
    ...partial,
  }
}

describe('inboxStatus', () => {
  it('marks an open draft as needs approval', () => {
    const status = inboxStatus([msg({ direction: 'in' }), msg({ id: '2', direction: 'draft', status: 'draft' })], 'chatting')
    assert.deepEqual(status, { key: 'needs_approval', label: 'Needs approval' })
  })

  it('marks a Gmail send as sent from Gmail', () => {
    const status = inboxStatus(
      [
        msg({ direction: 'in', created_at: '2026-09-10T00:00:00.000Z' }),
        msg({ id: '2', direction: 'out', status: 'auto_sent', created_at: '2026-09-10T00:01:00.000Z' }),
      ],
      'chatting',
    )
    assert.deepEqual(status, { key: 'sent', label: 'Sent from Gmail' })
  })

  it('uses created_at so newest-first rows still read as sent', () => {
    const status = inboxStatus(
      [
        msg({ id: '2', direction: 'out', status: 'auto_sent', created_at: '2026-09-10T01:00:00.000Z' }),
        msg({ direction: 'in', created_at: '2026-09-10T00:00:00.000Z' }),
      ],
      'chatting',
    )
    assert.deepEqual(status, { key: 'sent', label: 'Sent from Gmail' })
  })

  it('marks the latest inbound as parent wrote', () => {
    const status = inboxStatus([msg({ direction: 'in' })], 'new')
    assert.deepEqual(status, { key: 'waiting', label: 'Parent wrote' })
  })

  it('does not treat a consumed draft as needing approval', () => {
    assert.equal(isOpenDraft(msg({ direction: 'draft', status: 'auto_sent' })), false)
  })
})

describe('replySubject', () => {
  it('keeps the Gmail thread subject', () => {
    assert.equal(replySubject('Place for Amira'), 'Re: Place for Amira')
    assert.equal(replySubject('Re: Place for Amira'), 'Re: Place for Amira')
  })
})

describe('alreadyRepliedToLatestInbound', () => {
  it('is true after a Gmail send for the latest parent message', () => {
    assert.equal(
      alreadyRepliedToLatestInbound([
        msg({ direction: 'in', created_at: '2026-09-10T00:00:00.000Z' }),
        msg({ id: '2', direction: 'out', status: 'auto_sent', created_at: '2026-09-10T00:01:00.000Z' }),
      ]),
      true,
    )
  })

  it('is false when the parent wrote again after the last send', () => {
    assert.equal(
      alreadyRepliedToLatestInbound([
        msg({ direction: 'in', created_at: '2026-09-10T00:00:00.000Z' }),
        msg({ id: '2', direction: 'out', created_at: '2026-09-10T00:01:00.000Z' }),
        msg({ id: '3', direction: 'in', created_at: '2026-09-10T00:02:00.000Z' }),
      ]),
      false,
    )
  })
})

describe('snippet', () => {
  it('collapses whitespace', () => {
    assert.equal(snippet('Hello\n\nthere'), 'Hello there')
  })
})
