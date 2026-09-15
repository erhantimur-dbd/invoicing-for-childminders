import { NextResponse } from 'next/server'
import { decryptField } from '@/lib/crypto'
import { createClient } from '@/lib/supabase/server'
import { slotMinutesFromSettings } from '@/lib/integrations/calendar-event.mjs'
import { cancelVisitEvent, upsertVisitEvent } from '@/lib/integrations/google-calendar'
import { log } from '@/lib/log'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { prospectId?: string; visitAt?: string | null }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.prospectId) return NextResponse.json({ error: 'Missing parent.' }, { status: 400 })

  const { data: prospect } = await supabase
    .from('enquiry_prospects')
    .select('*')
    .eq('id', body.prospectId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!prospect) return NextResponse.json({ error: 'Parent not found.' }, { status: 404 })

  const { data: settings } = await supabase
    .from('enquiry_settings')
    .select('visiting_windows')
    .eq('user_id', user.id)
    .maybeSingle()

  const visitAt = body.visitAt ? new Date(body.visitAt).toISOString() : null
  const patch: Record<string, unknown> = {
    visit_at: visitAt,
    updated_at: new Date().toISOString(),
  }
  if (visitAt) patch.stage = 'visit'

  const { data: conn } = await supabase
    .from('enquiry_connections')
    .select('refresh_token_enc, status')
    .eq('user_id', user.id)
    .eq('provider', 'google')
    .maybeSingle()

  if (conn?.status === 'active') {
    try {
      const refresh = decryptField(conn.refresh_token_enc)
      if (refresh && visitAt) {
        const eventId = await upsertVisitEvent({
          refreshToken: refresh,
          eventId: prospect.calendar_event_id,
          parentName: prospect.parent_name,
          childName: prospect.child_name,
          parentEmail: prospect.parent_email,
          visitAt,
          slotMinutes: slotMinutesFromSettings(settings),
        })
        patch.calendar_event_id = eventId
        patch.calendar_provider = 'google'
      } else if (refresh && prospect.calendar_event_id) {
        await cancelVisitEvent({ refreshToken: refresh, eventId: prospect.calendar_event_id })
        patch.calendar_event_id = null
        patch.calendar_provider = null
      }
    } catch (err) {
      log.warn('calendar_sync_failed', { user_id: user.id, error: err instanceof Error ? err.message : 'fail' })
    }
  }

  const { error } = await supabase.from('enquiry_prospects').update(patch).eq('id', prospect.id)
  if (error) return NextResponse.json({ error: 'Could not save.' }, { status: 500 })
  return NextResponse.json({ ok: true, visit_at: visitAt, calendar_event_id: patch.calendar_event_id ?? null })
}
