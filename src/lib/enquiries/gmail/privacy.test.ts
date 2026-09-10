import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { GMAIL_SCOPES } from './config.ts'
import { classifyEnquiryMail } from './filters.ts'
import { rejectWithoutFetchingBody, shouldPersistEnquiry } from './privacy.ts'

describe('enquiry Gmail scopes', () => {
  it('is readonly + send only', () => {
    assert.deepEqual([...GMAIL_SCOPES], [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
    ])
    assert.equal(
      GMAIL_SCOPES.some((scope) => /gmail\.(modify|insert|compose|metadata|full|addons)/.test(scope)),
      false,
    )
  })
})

describe('shouldPersistEnquiry', () => {
  it('persists only classified enquiry mail', () => {
    const keep = classifyEnquiryMail({
      from: 'Sarah Jones <sarah@example.com>',
      subject: 'Place for Amira',
      body: 'Do you have a space from September?',
      labelNames: ['New parent'],
    })
    const drop = classifyEnquiryMail({
      from: 'Neighbour <n@example.com>',
      subject: 'Cup of tea later?',
      body: 'Are you free after pickup?',
      labelNames: ['INBOX'],
    })
    assert.equal(shouldPersistEnquiry(keep), true)
    assert.equal(shouldPersistEnquiry(drop), false)
  })

  it('rejects receipts from metadata without fetching the body', () => {
    const receipt = classifyEnquiryMail({
      from: 'Stripe Receipts <receipts@stripe.com>',
      subject: 'Your receipt from Stripe',
      body: '',
      labelNames: ['Enquiries'],
    })
    assert.equal(rejectWithoutFetchingBody(receipt), true)
    assert.equal(shouldPersistEnquiry(receipt), false)
  })

  it('rejects newsletters and personal mail without persisting them', () => {
    const newsletter = classifyEnquiryMail({
      from: 'Tips <hello@childcare-mag.example>',
      subject: 'This week in childminding',
      body: 'Newsletter',
      labelNames: ['INBOX'],
      headers: { 'list-unsubscribe': '<mailto:unsub@example.com>' },
    })
    const personal = classifyEnquiryMail({
      from: 'Neighbour <n@example.com>',
      subject: 'Cup of tea later?',
      body: 'Are you free after pickup?',
      labelNames: ['INBOX'],
    })
    assert.equal(shouldPersistEnquiry(newsletter), false)
    assert.equal(shouldPersistEnquiry(personal), false)
    assert.equal(rejectWithoutFetchingBody(newsletter), true)
    assert.equal(rejectWithoutFetchingBody(personal), true)
  })
})
