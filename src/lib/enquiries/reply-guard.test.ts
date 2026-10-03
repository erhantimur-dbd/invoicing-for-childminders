import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ALREADY_REPLIED_MESSAGE } from './reply-guard.ts'

describe('ALREADY_REPLIED_MESSAGE', () => {
  it('blocks a second auto-send on the same parent message', () => {
    assert.match(ALREADY_REPLIED_MESSAGE, /Already sent/i)
    assert.match(ALREADY_REPLIED_MESSAGE, /Gmail/i)
  })
})
