import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { loadEnquiryAgentsPolicy, mayLearnFromReasons, parseEnquiryAgentsPolicy } from './agents-policy.mjs'
import { proposeKnowledgeFromEscalation } from './learn-knowledge.mjs'

const md = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'AGENTS.md'), 'utf8')

test('AGENTS.md never learns SEN or extra needs, and requires approval', () => {
  const policy = parseEnquiryAgentsPolicy(md)
  assert.equal(policy.learning, true)
  assert.equal(policy.require_approval, true)
  assert.equal(policy.auto_apply_safe, false)
  assert.ok(policy.never_learn.includes('extra_needs'))
  assert.ok(policy.never_learn.includes('sen_notes'))
  assert.ok(policy.learn_from.includes('unanswered_question'))
  const loaded = loadEnquiryAgentsPolicy()
  assert.ok(loaded.never_learn.includes('extra_needs'))
})

test('never_learn cannot be stripped by a weaker file', () => {
  const policy = parseEnquiryAgentsPolicy(`---
never_learn:
  - age_outside
---
`)
  assert.ok(policy.never_learn.includes('extra_needs'))
  assert.ok(policy.never_learn.includes('sen_notes'))
})

test('pets question proposes a pending FAQ; extra needs does not', () => {
  const pets = proposeKnowledgeFromEscalation({
    reasons: ['unanswered_question'],
    parentMessage: 'Hi, do you have pets? Emma',
    knowledge: [],
    voiceNotes: 'One labrador, used to children.',
  })
  assert.equal(pets.length, 1)
  assert.equal(pets[0].topic, 'pets')
  assert.equal(pets[0].auto_apply, false)
  assert.match(pets[0].suggested_answer, /labrador/i)

  const sen = proposeKnowledgeFromEscalation({
    reasons: ['extra_needs', 'unanswered_question'],
    parentMessage: 'Do you have pets? She has an allergy.',
    knowledge: [],
  })
  assert.equal(sen.length, 0)
  assert.equal(mayLearnFromReasons(loadEnquiryAgentsPolicy(), ['extra_needs']), false)
})

test('learning off proposes nothing', () => {
  const policy = parseEnquiryAgentsPolicy('---\nlearning: off\n---\n')
  const rows = proposeKnowledgeFromEscalation({
    reasons: ['unanswered_question'],
    parentMessage: 'Do you have pets?',
    knowledge: [],
  }, policy)
  assert.equal(rows.length, 0)
})
