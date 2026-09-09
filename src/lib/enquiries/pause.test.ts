import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { AGENT_PAUSED_MESSAGE, isAgentPaused } from './pause.ts'

describe('isAgentPaused', () => {
  it('is true only when agent_paused is set', () => {
    assert.equal(isAgentPaused({ agent_paused: true }), true)
    assert.equal(isAgentPaused({ agent_paused: false }), false)
    assert.equal(isAgentPaused(null), false)
    assert.equal(isAgentPaused(undefined), false)
  })

  it('has copy the draft and send APIs can return', () => {
    assert.match(AGENT_PAUSED_MESSAGE, /paused/i)
    assert.match(AGENT_PAUSED_MESSAGE, /draft or send/i)
  })
})
