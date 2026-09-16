import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createInvoicePaySig, verifyInvoicePaySig } from './pay-sig.mjs'

test('invoice pay sig round-trips and rejects stale or wrong ids', () => {
  process.env.INVOICE_VERIFY_SECRET = 'x'.repeat(32)
  const token = createInvoicePaySig('inv-1')
  assert.equal(verifyInvoicePaySig('inv-1', token), true)
  assert.equal(verifyInvoicePaySig('inv-2', token), false)
  const stale = createInvoicePaySig('inv-1', Date.now() - 8 * 24 * 60 * 60 * 1000)
  assert.equal(verifyInvoicePaySig('inv-1', stale), false)
  assert.equal(verifyInvoicePaySig('inv-1', 'nope'), false)
})
