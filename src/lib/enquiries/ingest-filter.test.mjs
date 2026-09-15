import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  inboundSlugFromRecipient,
  parseFromHeader,
  shouldIngestMessage,
} from './ingest-filter.mjs'

test('parseFromHeader reads name and address', () => {
  assert.deepEqual(parseFromHeader('Emma Parent <emma@x.com>'), { name: 'Emma Parent', email: 'emma@x.com' })
  assert.deepEqual(parseFromHeader('emma@x.com'), { name: null, email: 'emma@x.com' })
})

test('shouldIngestMessage skips self, no-reply, sent, and newsletters', () => {
  const base = { from: 'Emma <emma@x.com>', connectedEmail: 'mary@gmail.com', headers: {}, labelIds: ['INBOX'] }
  assert.equal(shouldIngestMessage(base), true)
  assert.equal(shouldIngestMessage({ ...base, from: 'mary@gmail.com' }), false)
  assert.equal(shouldIngestMessage({ ...base, from: 'noreply@nursery.com' }), false)
  assert.equal(shouldIngestMessage({ ...base, labelIds: ['SENT'] }), false)
  assert.equal(shouldIngestMessage({ ...base, headers: { 'List-Unsubscribe': '<http://x>' } }), false)
})

test('inboundSlugFromRecipient reads the unique Dottie address', () => {
  assert.equal(
    inboundSlugFromRecipient('Mary <mary-ab12@enquiries.godottie.cloud>'),
    'mary-ab12',
  )
  assert.equal(inboundSlugFromRecipient('emma@gmail.com'), null)
})
