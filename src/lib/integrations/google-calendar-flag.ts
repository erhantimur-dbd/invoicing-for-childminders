/**
 * Visit times are always saved on the parent in Dottie.
 * Writing them to Google Calendar needs calendar.events, which Gmail connect
 * does not request (gmail.readonly + gmail.send only).
 * Set GOOGLE_CALENDAR_VISITS=1 only after a separate Calendar grant exists.
 */
export function googleCalendarVisitsEnabled(): boolean {
  return process.env.GOOGLE_CALENDAR_VISITS === '1'
}
