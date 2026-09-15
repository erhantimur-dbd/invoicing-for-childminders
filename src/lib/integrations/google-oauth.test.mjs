import assert from 'node:assert/strict'
import { test } from 'node:test'
import { GOOGLE_SCOPES, googleAuthUrl } from './google-oauth.mjs'

test('Google consent asks for inbox, send, and calendar — not login SSO', () => {
  assert.ok(GOOGLE_SCOPES.some((s) => s.includes('gmail.readonly')))
  assert.ok(GOOGLE_SCOPES.some((s) => s.includes('gmail.send')))
  assert.ok(GOOGLE_SCOPES.some((s) => s.includes('calendar.events')))
  const url = googleAuthUrl({
    clientId: 'cid',
    redirectUri: 'https://www.godottie.cloud/api/integrations/google/callback',
    state: 'abc',
  })
  assert.match(url, /access_type=offline/)
  assert.match(url, /prompt=consent/)
  assert.match(url, /integrations%2Fgoogle%2Fcallback/)
})
