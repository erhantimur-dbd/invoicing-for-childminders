import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { classifyEnquiryMail, gmailSearchQuery, hasEnquiryLabel, watchedLabels } from './filters.ts'

describe('watchedLabels', () => {
  it('includes Soft Launch defaults plus a custom label', () => {
    const labels = watchedLabels('Enquiry inbox')
    assert.ok(labels.includes('enquiries'))
    assert.ok(labels.includes('new parent'))
    assert.ok(labels.includes('enquiry inbox'))
  })
})

describe('hasEnquiryLabel', () => {
  it('matches New parent case-insensitively', () => {
    assert.equal(hasEnquiryLabel(['New Parent']), true)
  })
  it('does not treat Inbox as an enquiry label', () => {
    assert.equal(hasEnquiryLabel(['INBOX']), false)
  })
})

describe('classifyEnquiryMail', () => {
  it('includes labelled parent mail', () => {
    const decision = classifyEnquiryMail({
      from: 'Sarah Jones <sarah@example.com>',
      subject: 'Place for Amira',
      body: 'Do you have a space from September?',
      labelNames: ['New parent'],
    })
    assert.deepEqual(decision, { include: true, reason: 'label' })
  })

  it('excludes labelled receipts', () => {
    const decision = classifyEnquiryMail({
      from: 'Stripe Receipts <receipts@stripe.com>',
      subject: 'Your receipt from Stripe',
      body: 'Payment received',
      labelNames: ['Enquiries'],
    })
    assert.deepEqual(decision, { include: false, reason: 'noise' })
  })

  it('excludes newsletters via List-Unsubscribe', () => {
    const decision = classifyEnquiryMail({
      from: 'Tips <hello@childcare-mag.example>',
      subject: 'This week in childminding',
      body: 'Newsletter',
      labelNames: ['INBOX'],
      headers: { 'list-unsubscribe': '<mailto:unsub@example.com>' },
    })
    assert.deepEqual(decision, { include: false, reason: 'noise' })
  })

  it('includes unlabelled inbox mail with a clear parent signal', () => {
    const decision = classifyEnquiryMail({
      from: 'Tom <tom@gmail.com>',
      subject: 'Childminder enquiry',
      body: 'We are looking for a place for our 2 year old, funded hours if possible.',
      labelNames: ['INBOX'],
    })
    assert.deepEqual(decision, { include: true, reason: 'inbox_signal' })
  })

  it('excludes promotions and amazon-style mail', () => {
    const decision = classifyEnquiryMail({
      from: 'Amazon <order-update@amazon.co.uk>',
      subject: 'Your order has shipped',
      body: 'Delivery update',
      labelNames: ['INBOX', 'CATEGORY_PROMOTIONS'],
    })
    assert.deepEqual(decision, { include: false, reason: 'noise' })
  })

  it('excludes the childminder emailing herself', () => {
    const decision = classifyEnquiryMail({
      from: 'Mary <mary@gmail.com>',
      subject: 'Place for Amira',
      body: 'looking for a place',
      labelNames: ['INBOX'],
      connectedEmail: 'mary@gmail.com',
    })
    assert.deepEqual(decision, { include: false, reason: 'self' })
  })

  it('skips sent and spam', () => {
    const sent = classifyEnquiryMail({
      from: 'Tom <tom@gmail.com>',
      subject: 'Childminder enquiry',
      body: 'looking for a place',
      labelNames: ['SENT'],
    })
    assert.deepEqual(sent, { include: false, reason: 'system' })
  })

  it('does not treat a random inbox email as an enquiry', () => {
    const decision = classifyEnquiryMail({
      from: 'Neighbour <n@example.com>',
      subject: 'Cup of tea later?',
      body: 'Are you free after pickup?',
      labelNames: ['INBOX'],
    })
    assert.deepEqual(decision, { include: false, reason: 'no_signal' })
  })
})

describe('gmailSearchQuery', () => {
  it('prefers labels and excludes promotions', () => {
    const q = gmailSearchQuery('New parents')
    assert.match(q, /label:"new parents"/)
    assert.match(q, /label:enquiries/)
    assert.match(q, /-category:promotions/)
    assert.match(q, /-in:sent/)
  })
})
