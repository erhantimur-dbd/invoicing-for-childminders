import assert from 'node:assert/strict'
import { test } from 'node:test'
import { nextVisitSlots } from './visit-policy.mjs'
import { assembleEnquiryLetter, letterFailsGuardrails } from './letter-template.mjs'
import { extractFactsFromText, mergeProspectFacts } from './extract-facts.mjs'

const windows = [{ days: ['tuesday', 'thursday'], start: '18:30', end: '19:30', slot_minutes: 45 }]
const vacancies = [
  { weekday: 1, remaining_places: 1, funded: true, private: true },
  { weekday: 2, remaining_places: 1, funded: true, private: true },
  { weekday: 3, remaining_places: 1, funded: true, private: true },
]

const emma = `Hi, I'm looking for childcare for my daughter Rosie who is 14 months old. We're looking for 3 days, Mon–Wed, 8am–6pm. This will be 30 hours of government-funded childcare. Would you have a place from October? Emma`

test('regex extract fills Emma / Rosie / Mon–Wed without a model', () => {
  const facts = extractFactsFromText(emma)
  assert.equal(facts.child_name, 'Rosie')
  assert.match(facts.child_age_text, /14 months/)
  assert.equal(facts.days_needed, 'Mon, Tue, Wed')
  assert.match(facts.hours_needed, /8am–6pm/i)
  assert.equal(facts.parent_name, 'Emma')
  assert.equal(facts.funding, 'wp_under5')
})

test('template letter uses computed visit slots and never leaks scheme ids', () => {
  const facts = extractFactsFromText(emma)
  const prospect = mergeProspectFacts({ funding: 'unknown' }, facts)
  const settings = {
    display_name: 'Mary',
    day_rate: 65,
    quote_fees_in_email: true,
    offer_waitlist: true,
    visiting_windows: windows,
  }
  const body = assembleEnquiryLetter({ prospect, settings, vacancies, parentMessage: emma })
  assert.match(body, /^Hi Emma,/)
  assert.match(body, /Rosie/)
  assert.match(body, /I do have a space/)
  assert.match(body, /working-parent 30 hours/)
  assert.doesNotMatch(body, /wp_under5/)
  assert.doesNotMatch(body, /Barley/)
  const slots = nextVisitSlots(windows)
  for (const slot of slots) assert.match(body, new RegExp(slot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(body, /Which of those suits you/)
  assert.match(body, /Mary\s*$/)
  assert.equal(letterFailsGuardrails(body, { settings }).ok, true)
})

test('waitlist off does not offer a waitlist when there is no space', () => {
  const prospect = { parent_name: 'Priya', child_name: 'Arun', days_needed: 'Fri' }
  const settings = { display_name: 'Mary', offer_waitlist: false, visiting_windows: windows }
  const body = assembleEnquiryLetter({ prospect, settings, vacancies, parentMessage: '' })
  assert.match(body, /do not have a matching space/)
  assert.doesNotMatch(body, /waitlist/)
  assert.doesNotMatch(body, /I can offer/)
})

test('waitlist on offers a waitlist when there is no space', () => {
  const prospect = { parent_name: 'Priya', days_needed: 'Fri' }
  const settings = { display_name: 'Mary', offer_waitlist: true, visiting_windows: windows }
  const body = assembleEnquiryLetter({ prospect, settings, vacancies: [], parentMessage: '' })
  assert.match(body, /waitlist/)
})
