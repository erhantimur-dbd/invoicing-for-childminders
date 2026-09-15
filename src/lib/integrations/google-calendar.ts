import { googleAccessToken } from './google-token'
import { visitEventPayload } from './calendar-event.mjs'

export async function upsertVisitEvent(input: {
  refreshToken: string
  eventId?: string | null
  parentName: string | null
  childName: string | null
  parentEmail: string | null
  visitAt: string
  slotMinutes: number
  doFetch?: typeof fetch
}): Promise<string> {
  const doFetch = input.doFetch ?? fetch
  const access = await googleAccessToken(input.refreshToken, doFetch)
  const body = visitEventPayload({
    parentName: input.parentName,
    childName: input.childName,
    parentEmail: input.parentEmail,
    visitAt: input.visitAt,
    slotMinutes: input.slotMinutes,
  })
  const update = Boolean(input.eventId)
  const url = update
    ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(input.eventId!)}?sendUpdates=all`
    : 'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all'
  const res = await doFetch(url, {
    method: update ? 'PATCH' : 'POST',
    headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error('calendar_write_failed')
  const json = (await res.json()) as { id?: string }
  if (!json.id) throw new Error('calendar_write_failed')
  return json.id
}

export async function cancelVisitEvent(input: {
  refreshToken: string
  eventId: string
  doFetch?: typeof fetch
}) {
  const doFetch = input.doFetch ?? fetch
  const access = await googleAccessToken(input.refreshToken, doFetch)
  const res = await doFetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(input.eventId)}?sendUpdates=all`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${access}` } },
  )
  if (!res.ok && res.status !== 404 && res.status !== 410) throw new Error('calendar_cancel_failed')
}
