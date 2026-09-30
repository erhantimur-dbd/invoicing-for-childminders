import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { DEFAULT_SEND_MODE, isAutoSendEnabled, parseSendMode } from './send-mode.ts'

describe('parseSendMode', () => {
  it('defaults to auto-send', () => {
    assert.equal(parseSendMode(null), 'auto')
    assert.equal(parseSendMode(undefined), 'auto')
    assert.equal(parseSendMode('auto'), 'auto')
    assert.equal(DEFAULT_SEND_MODE, 'auto')
  })

  it('keeps draft & approve when the user chose it', () => {
    assert.equal(parseSendMode('approve'), 'approve')
    assert.equal(parseSendMode('silent'), 'auto')
  })
})

describe('isAutoSendEnabled', () => {
  it('is on by default and when send_mode is auto', () => {
    assert.equal(isAutoSendEnabled({ send_mode: null, agent_paused: false }), true)
    assert.equal(isAutoSendEnabled({ send_mode: 'auto', agent_paused: false }), true)
    assert.equal(isAutoSendEnabled({ send_mode: 'approve', agent_paused: false }), false)
  })

  it('pause blocks auto-send', () => {
    assert.equal(isAutoSendEnabled({ send_mode: 'auto', agent_paused: true }), false)
    assert.equal(isAutoSendEnabled({ send_mode: null, agent_paused: true }), false)
  })

  it('does not auto-send when settings are missing', () => {
    assert.equal(isAutoSendEnabled(null), false)
  })
})
