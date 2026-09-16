export function visitEventPayload(input) {
  const start = new Date(input.visitAt)
  if (Number.isNaN(start.getTime())) throw new Error('invalid_visit_at')
  const minutes = Number(input.slotMinutes) > 0 ? Number(input.slotMinutes) : 45
  const end = new Date(start.getTime() + minutes * 60_000)
  const parent = String(input.parentName || 'Parent').trim() || 'Parent'
  const child = String(input.childName || '').trim()
  const summary = child ? `Visit: ${parent} (${child})` : `Visit: ${parent}`
  const attendees = input.parentEmail ? [{ email: String(input.parentEmail).trim() }] : []
  return {
    summary,
    description: 'Childminding visit — an opportunity to meet and see if the place is a fit.',
    start: { dateTime: start.toISOString(), timeZone: input.timeZone || 'Europe/London' },
    end: { dateTime: end.toISOString(), timeZone: input.timeZone || 'Europe/London' },
    attendees,
    reminders: { useDefault: true },
  }
}

export function slotMinutesFromSettings(settings) {
  const windows = settings?.visiting_windows
  if (!Array.isArray(windows) || !windows.length) return 45
  const n = Number(windows[0].slot_minutes)
  return n > 0 ? n : 45
}
