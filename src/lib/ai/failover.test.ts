import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { EmptyModelOutputError, isFailoverError, statusFromUnknown } from './failover.ts'

describe('statusFromUnknown', () => {
  it('reads status and statusCode', () => {
    assert.equal(statusFromUnknown({ status: 503 }), 503)
    assert.equal(statusFromUnknown({ statusCode: 429 }), 429)
    assert.equal(statusFromUnknown('nope'), undefined)
  })
})

describe('isFailoverError', () => {
  it('fails over on downtime, rate limits, and auth', () => {
    for (const status of [401, 403, 408, 429, 500, 502, 503, 529]) {
      assert.equal(isFailoverError({ status }), true, `status ${status}`)
    }
  })

  it('does not fail over on caller/prompt bugs', () => {
    assert.equal(isFailoverError({ status: 400 }), false)
    assert.equal(isFailoverError({ status: 404 }), false)
    assert.equal(isFailoverError({ status: 422 }), false)
  })

  it('fails over on connection / timeout shapes', () => {
    const timeout = new Error('Request timed out')
    timeout.name = 'APIConnectionTimeoutError'
    assert.equal(isFailoverError(timeout), true)

    const conn = new Error('Connection error.')
    conn.name = 'APIConnectionError'
    assert.equal(isFailoverError(conn), true)

    assert.equal(isFailoverError(new Error('fetch failed')), true)
    assert.equal(isFailoverError(new Error('xAI overloaded')), true)
  })

  it('fails over on empty model output', () => {
    assert.equal(isFailoverError(new EmptyModelOutputError('xAI')), true)
  })

  it('does not fail over on programming errors', () => {
    assert.equal(isFailoverError(new TypeError('Cannot read properties of undefined')), false)
    assert.equal(isFailoverError(new SyntaxError('Unexpected token')), false)
  })
})
