import assert from 'node:assert/strict'
import { test } from 'node:test'
import { escalationEmail } from '../email/templates.ts'
import { shouldSendEscalationEmail } from './notify-escalation.mjs'

test('escalation email names the parent and links to the enquiry', () => {
  const mail = escalationEmail({
    displayName: 'Mary Childminder',
    parentName: 'Emma',
    childName: 'Rosie',
    reasons: ['They mentioned extra needs or health — you should reply.'],
    prospectId: 'abc-123',
  })
  assert.match(mail.subject, /Emma/)
  assert.match(mail.subject, /Rosie/)
  assert.match(mail.html, /Dottie needs you/)
  assert.match(mail.html, /\/enquiries\/abc-123/)
  assert.match(mail.html, /extra needs/)
  assert.match(mail.html, /Nothing was sent to the parent/)
  assert.doesNotMatch(mail.html, /<script/)
})

test('escalation emails cool down for 15 minutes per parent', () => {
  const now = Date.parse('2026-09-15T12:00:00Z')
  assert.equal(shouldSendEscalationEmail(null, now), true)
  assert.equal(shouldSendEscalationEmail('2026-09-15T11:50:00Z', now), false)
  assert.equal(shouldSendEscalationEmail('2026-09-15T11:40:00Z', now), true)
})
