import assert from 'node:assert/strict'
import { test } from 'node:test'
import { decideHumanEscalation } from './escalate.mjs'
import { extractFactsFromText, mergeProspectFacts } from './extract-facts.mjs'

const windows = [{ days: ['tuesday', 'thursday'], start: '18:30', end: '19:30', slot_minutes: 45 }]
const vacancies = [
  { weekday: 1, remaining_places: 1, funded: true, private: true },
  { weekday: 2, remaining_places: 1, funded: true, private: true },
  { weekday: 3, remaining_places: 1, funded: true, private: true },
]
const settings = {
  display_name: 'Mary',
  ages_from_months: 9,
  ages_to_years: 5,
  accepts_funded: true,
  visiting_windows: windows,
}

const emma = `Hi, I'm looking for childcare for my daughter Rosie who is 14 months old. We're looking for 3 days, Mon–Wed, 8am–6pm. This will be 30 hours of government-funded childcare. Would you have a place from October? Emma`

test('Emma sample is confident when days match listed spaces', () => {
  const prospect = mergeProspectFacts({}, extractFactsFromText(emma))
  const d = decideHumanEscalation({ prospect, settings, vacancies, parentMessage: emma, knowledge: [] })
  assert.equal(d.confident, true)
  assert.deepEqual(d.reasons, [])
})

test('extra needs escalate to a human', () => {
  const prospect = mergeProspectFacts({}, extractFactsFromText(emma))
  const d = decideHumanEscalation({
    prospect,
    settings,
    vacancies,
    parentMessage: emma + ' She has a peanut allergy.',
    knowledge: [],
  })
  assert.equal(d.confident, false)
  assert.ok(d.reasons.includes('extra_needs'))
})

test('a pets question with no FAQ escalates', () => {
  const prospect = mergeProspectFacts({}, extractFactsFromText(emma))
  const d = decideHumanEscalation({
    prospect,
    settings,
    vacancies,
    parentMessage: emma + ' Do you have pets?',
    knowledge: [],
  })
  assert.equal(d.confident, false)
  assert.ok(d.reasons.includes('unanswered_question'))
})

test('asking for Friday when only Mon–Wed are listed is a partial vacancy', () => {
  const prospect = { parent_name: 'Priya', days_needed: 'Mon, Fri' }
  const d = decideHumanEscalation({ prospect, settings, vacancies, parentMessage: 'Mon and Fri please', knowledge: [] })
  assert.equal(d.confident, false)
  assert.ok(d.reasons.includes('partial_vacancy'))
})

test('facts guessed by the model are not 100% confident', () => {
  const prospect = mergeProspectFacts({}, extractFactsFromText(emma))
  const d = decideHumanEscalation({
    prospect,
    settings,
    vacancies,
    parentMessage: emma,
    knowledge: [],
    usedAiExtract: true,
  })
  assert.equal(d.confident, false)
  assert.ok(d.reasons.includes('facts_from_model'))
})
