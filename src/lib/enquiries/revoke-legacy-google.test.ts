import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  classifyRevokeResponse,
  revokeMode,
  shouldDeleteAfterRevoke,
} from '../../../scripts/revoke-legacy-google-connections.ts'

describe('legacy Google revoke', () => {
  it('dry-run is the default and --dry-run wins over --apply', () => {
    assert.equal(revokeMode([]), 'dry-run')
    assert.equal(revokeMode(['--dry-run']), 'dry-run')
    assert.equal(revokeMode(['--apply']), 'apply')
    assert.equal(revokeMode(['--apply', '--dry-run']), 'dry-run')
  })

  it('treats 400 invalid_token as already revoked and still deletes the row', () => {
    assert.equal(classifyRevokeResponse(200, null), 'revoked')
    assert.equal(classifyRevokeResponse(400, 'invalid_token'), 'already_revoked')
    assert.equal(classifyRevokeResponse(400, 'invalid_request'), 'failed')
    assert.equal(classifyRevokeResponse(500, null), 'failed')
    assert.equal(shouldDeleteAfterRevoke('revoked'), true)
    assert.equal(shouldDeleteAfterRevoke('already_revoked'), true)
    assert.equal(shouldDeleteAfterRevoke('failed'), false)
  })
})
