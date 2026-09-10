import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { AGENT_PAUSED_MESSAGE, isAgentPaused, isGmailPollingAllowed } from './pause.ts'

describe('isAgentPaused', () => {
  it('is true only when agent_paused is set', () => {
    assert.equal(isAgentPaused({ agent_paused: true }), true)
    assert.equal(isAgentPaused({ agent_paused: false }), false)
    assert.equal(isAgentPaused(null), false)
    assert.equal(isAgentPaused(undefined), false)
  })

  it('stops Gmail polling while paused', () => {
    assert.equal(isGmailPollingAllowed({ agent_paused: true }), false)
    assert.equal(isGmailPollingAllowed({ agent_paused: false }), true)
    assert.equal(isGmailPollingAllowed(null), true)
  })

  it('has copy the draft, send, and poll APIs can return', () => {
    assert.match(AGENT_PAUSED_MESSAGE, /paused/i)
    assert.match(AGENT_PAUSED_MESSAGE, /read Gmail/i)
    assert.match(AGENT_PAUSED_MESSAGE, /draft/i)
    assert.match(AGENT_PAUSED_MESSAGE, /send/i)
  })
})
