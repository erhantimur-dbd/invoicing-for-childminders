import assert from 'node:assert/strict'
import { test } from 'node:test'
import { slotMinutesFromSettings, visitEventPayload } from './calendar-event.mjs'

test('visit event is 45 minutes in London, invites the parent, and has no Meet', () => {
  const event = visitEventPayload({
    parentName: 'Emma',
    childName: 'Rosie',
    parentEmail: 'emma@x.com',
    visitAt: '2026-09-17T17:30:00.000Z',
    slotMinutes: 45,
  })
  assert.equal(event.summary, 'Visit: Emma (Rosie)')
  assert.equal(event.start.timeZone, 'Europe/London')
  const ms = new Date(event.end.dateTime) - new Date(event.start.dateTime)
  assert.equal(ms, 45 * 60 * 1000)
  assert.deepEqual(event.attendees, [{ email: 'emma@x.com' }])
  assert.equal('conferenceData' in event, false)
  assert.match(event.description, /opportunity/i)
})

test('slot minutes fall back to 45', () => {
  assert.equal(slotMinutesFromSettings({ visiting_windows: [{ slot_minutes: 30 }] }), 30)
  assert.equal(slotMinutesFromSettings({ visiting_windows: [] }), 45)
})
