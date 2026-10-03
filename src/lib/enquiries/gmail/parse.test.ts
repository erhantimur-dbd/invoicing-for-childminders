import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { encodeRfc2822, parseFrom, parseGmailMessage, toGmailRaw } from './parse.ts'

describe('parseFrom', () => {
  it('splits a display name and address', () => {
    assert.deepEqual(parseFrom('Sarah Jones <sarah@example.com>'), {
      name: 'Sarah Jones',
      email: 'sarah@example.com',
    })
  })

  it('handles a bare address', () => {
    assert.deepEqual(parseFrom('sarah@example.com'), {
      name: null,
      email: 'sarah@example.com',
    })
  })
})

describe('parseGmailMessage', () => {
  it('prefers text/plain over html', () => {
    const parsed = parseGmailMessage({
      mimeType: 'multipart/alternative',
      headers: [
        { name: 'From', value: 'Tom <tom@gmail.com>' },
        { name: 'Subject', value: 'Place for Noah' },
        { name: 'Message-ID', value: '<abc@mail.gmail.com>' },
      ],
      parts: [
        { mimeType: 'text/plain', body: { data: Buffer.from('Hello from a parent').toString('base64url') } },
        { mimeType: 'text/html', body: { data: Buffer.from('<p>Hello from a parent</p>').toString('base64url') } },
      ],
    })
    assert.equal(parsed.from, 'Tom <tom@gmail.com>')
    assert.equal(parsed.subject, 'Place for Noah')
    assert.equal(parsed.body, 'Hello from a parent')
    assert.equal(parsed.rfcMessageId, '<abc@mail.gmail.com>')
  })
})

describe('encodeRfc2822', () => {
  it('builds a Gmail raw payload', () => {
    const raw = toGmailRaw(
      encodeRfc2822({
        from: 'mary@gmail.com',
        to: 'sarah@example.com',
        subject: 'Your enquiry',
        body: 'Hello Sarah',
      }),
    )
    const decoded = Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    assert.match(decoded, /To: sarah@example.com/)
    assert.match(decoded, /Subject: Your enquiry/)
    assert.match(decoded, new RegExp(Buffer.from('Hello Sarah', 'utf8').toString('base64')))
  })
})
