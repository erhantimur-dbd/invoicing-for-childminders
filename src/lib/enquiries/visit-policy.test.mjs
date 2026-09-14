import assert from 'node:assert/strict'
import { test } from 'node:test'
import { coerceVisitPolicy, decideVisit, nextVisitSlots, parseRequestedWeekdays } from './visit-policy.mjs'

const prospect = {
  days_needed: 'Tuesday to Thursday',
  hours_needed: '30 hours',
  start_date: '2026-09-07',
  funding: '3to4_working',
}

const tue = { weekday: 2, remaining_places: 1, funded: true, private: true }
const wed = { weekday: 3, remaining_places: 1, funded: true, private: true }

test('parseRequestedWeekdays reads spoken day names', () => {
  assert.deepEqual(parseRequestedWeekdays('Tue–Thu, three days'), [2, 3, 4])
})

test('match_vacancy books only when a listed day still has a place', () => {
  const hit = decideVisit({
    policy: 'match_vacancy',
    vacancies: [tue, wed],
    prospect,
    hasVisitingWindows: true,
  })
  assert.equal(hit.mayBook, true)
  assert.equal(hit.reason, 'match')

  const miss = decideVisit({
    policy: 'match_vacancy',
    vacancies: [{ weekday: 5, remaining_places: 1, funded: true, private: true }],
    prospect,
    hasVisitingWindows: true,
  })
  assert.equal(miss.mayBook, false)
  assert.equal(miss.reason, 'no_space')
})

test('accept_all books once facts are in, even without a matching vacancy', () => {
  const hit = decideVisit({
    policy: 'accept_all',
    vacancies: [],
    prospect,
    hasVisitingWindows: true,
  })
  assert.equal(hit.mayBook, true)
  assert.equal(hit.reason, 'accept_all')
})

test('neither policy books without visiting hours', () => {
  const d = decideVisit({
    policy: 'accept_all',
    vacancies: [tue],
    prospect,
    hasVisitingWindows: false,
  })
  assert.equal(d.mayBook, false)
  assert.equal(d.reason, 'no_windows')
})

test('coerceVisitPolicy defaults to match_vacancy', () => {
  assert.equal(coerceVisitPolicy(null), 'match_vacancy')
  assert.equal(coerceVisitPolicy('accept_all'), 'accept_all')
})

test('nextVisitSlots emits the next two London evenings, never a past clock time today', () => {
  const windows = [{ days: ['tuesday', 'thursday'], start: '18:30', end: '19:30', slot_minutes: 45 }]
  const mondayNoon = new Date('2026-09-14T12:00:00+01:00')
  const slots = nextVisitSlots(windows, mondayNoon, 2)
  assert.equal(slots.length, 2)
  assert.match(slots[0], /Tuesday 15 September 2026 at 6:30pm/)
  assert.match(slots[1], /Thursday 17 September 2026 at 6:30pm/)

  const tuesdayEvening = new Date('2026-09-15T19:00:00+01:00')
  const later = nextVisitSlots(windows, tuesdayEvening, 2)
  assert.match(later[0], /Thursday 17 September 2026/)
  assert.equal(nextVisitSlots([], mondayNoon, 2).length, 0)
})
