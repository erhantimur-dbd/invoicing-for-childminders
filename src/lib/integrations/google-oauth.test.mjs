import assert from 'node:assert/strict'
import { test } from 'node:test'
import { GOOGLE_SCOPES, googleAuthUrl } from './google-oauth.mjs'

test('leftover Google client does not request Gmail or Calendar scopes', () => {
  const joined = GOOGLE_SCOPES.join(' ')
  assert.doesNotMatch(joined, /gmail\.readonly/)
  assert.doesNotMatch(joined, /gmail\.send/)
  assert.doesNotMatch(joined, /calendar\.events/)
  const url = googleAuthUrl({
    clientId: 'cid',
    redirectUri: 'https://www.godottie.cloud/api/enquiries/gmail/callback',
    state: 'abc',
  })
  assert.doesNotMatch(url, /calendar\.events/)
  assert.doesNotMatch(url, /gmail\.readonly/)
  assert.match(url, /enquiries%2Fgmail%2Fcallback/)
})
