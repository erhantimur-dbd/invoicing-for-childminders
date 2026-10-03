import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { sendEmail, type OutboundEmail } from './resend.ts'

function capture() {
  const sent: OutboundEmail[] = []
  return {
    sent,
    transport: async (payload: OutboundEmail) => {
      sent.push(payload)
      return { id: 'email_1' }
    },
  }
}

const message = {
  to: 'parent@example.com',
  cc: 'office@example.com',
  bcc: 'hidden@example.com',
  subject: 'Invoice INV-1',
  html: '<p>Hello</p>',
  replyTo: 'sender@example.com',
}

describe('sendEmail chokepoint', () => {
  it('redirects to, cc, and bcc when the override is set', async () => {
    const { sent, transport } = capture()
    const result = await sendEmail(message, {
      transport,
      env: { VERCEL_ENV: 'preview', RESEND_TO_OVERRIDE: 'pip@example.com' },
    })
    assert.deepEqual(result, { success: true, id: 'email_1' })
    assert.equal(sent.length, 1)
    assert.equal(sent[0].to, 'pip@example.com')
    assert.equal(sent[0].cc, undefined)
    assert.equal(sent[0].bcc, undefined)
    assert.equal(sent[0].replyTo, 'sender@example.com')
    assert.equal(sent[0].subject, 'Invoice INV-1')
    assert.match(sent[0].headers?.['X-Original-To'] ?? '', /parent@example.com/)
    assert.match(sent[0].headers?.['X-Original-To'] ?? '', /office@example.com/)
    assert.match(sent[0].headers?.['X-Original-To'] ?? '', /hidden@example.com/)
  })

  it('returns a no-op success and does not send when the override is unset', async () => {
    const { sent, transport } = capture()
    const result = await sendEmail(message, {
      transport,
      env: { VERCEL_ENV: 'preview' },
    })
    assert.deepEqual(result, { success: true, skipped: true })
    assert.equal(sent.length, 0)
  })

  it('returns a no-op success and does not send when the override is empty', async () => {
    const { sent, transport } = capture()
    const result = await sendEmail(message, {
      transport,
      env: { VERCEL_ENV: '', RESEND_TO_OVERRIDE: '' },
    })
    assert.deepEqual(result, { success: true, skipped: true })
    assert.equal(sent.length, 0)
  })

  it('sends the original recipients in Production', async () => {
    const { sent, transport } = capture()
    const result = await sendEmail(message, {
      transport,
      env: { VERCEL_ENV: 'production', RESEND_TO_OVERRIDE: 'pip@example.com' },
    })
    assert.equal(result.success, true)
    assert.equal(result.skipped, undefined)
    assert.equal(sent.length, 1)
    assert.equal(sent[0].to, 'parent@example.com')
    assert.equal(sent[0].cc, 'office@example.com')
    assert.equal(sent[0].bcc, 'hidden@example.com')
    assert.equal(sent[0].headers?.['X-Original-To'], undefined)
  })
})
