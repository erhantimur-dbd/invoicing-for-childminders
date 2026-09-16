import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createOnboardToken, placeOfferUrl, verifyOnboardToken } from './onboard-token.mjs'

test('onboard token round-trips and expires', () => {
  process.env.INVOICE_VERIFY_SECRET = 'x'.repeat(32)
  const token = createOnboardToken('prospect-1', Date.now())
  const ok = verifyOnboardToken(token)
  assert.equal(ok.ok, true)
  assert.equal(ok.prospectId, 'prospect-1')
  const stale = createOnboardToken('prospect-1', Date.now() - 8 * 24 * 60 * 60 * 1000)
  assert.equal(verifyOnboardToken(stale).reason, 'expired')
  assert.equal(verifyOnboardToken('nope').ok, false)
  assert.match(placeOfferUrl(token, 'https://www.godottie.cloud'), /\/signup-place\//)
})

test('won without email is rejected by the close helper', async () => {
  const { assertCanSendPlaceOffer } = await import('./close-enquiry.mjs')
  assert.throws(() => assertCanSendPlaceOffer({ parent_email: null }), /email/i)
})
