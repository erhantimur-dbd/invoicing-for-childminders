import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DEFAULT_SEND_MODE, isAutoSendEnabled, parseSendMode } from './send-mode.ts'

describe('parseSendMode', () => {
  it('defaults to draft & approve', () => {
    assert.equal(parseSendMode(null), 'approve')
    assert.equal(parseSendMode(undefined), 'approve')
    assert.equal(parseSendMode('approve'), 'approve')
    assert.equal(DEFAULT_SEND_MODE, 'approve')
  })

  it('only treats auto as auto-send', () => {
    assert.equal(parseSendMode('auto'), 'auto')
    assert.equal(parseSendMode('silent'), 'approve')
  })
})

describe('isAutoSendEnabled', () => {
  it('is off unless the user chose Auto-send', () => {
    assert.equal(isAutoSendEnabled({ send_mode: 'approve', agent_paused: false }), false)
    assert.equal(isAutoSendEnabled({ send_mode: 'auto', agent_paused: false }), true)
  })

  it('pause blocks auto-send', () => {
    assert.equal(isAutoSendEnabled({ send_mode: 'auto', agent_paused: true }), false)
  })
})
