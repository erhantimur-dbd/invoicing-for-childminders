import { NextResponse } from 'next/server'
import { requireEnquiriesUser } from '@/lib/enquiries/require'
import { AGENT_PAUSED_MESSAGE, isAgentPaused } from '@/lib/enquiries/pause'
import { sendApprovedEnquiry } from '@/lib/enquiries/gmail/send'
import { log } from '@/lib/log'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const auth = await requireEnquiriesUser()
  if ('error' in auth) return auth.error

  const { data: settings } = await auth.supabase
    .from('enquiry_settings')
    .select('agent_paused')
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (isAgentPaused(settings)) {
    return NextResponse.json({ error: AGENT_PAUSED_MESSAGE }, { status: 403 })
  }

  const limited = await rateLimit({
    bucket: 'enquiry-send',
    identifier: auth.user.id,
    limit: 40,
    windowMs: 60 * 60 * 1000,
  })
  if (!limited.ok) {
    return NextResponse.json({ error: 'That’s a lot of sends. Try again shortly.' }, { status: 429 })
  }

  let prospectId: string
  let draftId: string
  let body: string
  let subject: string
  try {
    const json = await request.json()
    if (!json.prospectId || typeof json.prospectId !== 'string') {
      return NextResponse.json({ error: 'Missing parent.' }, { status: 400 })
    }
    if (!json.draftId || typeof json.draftId !== 'string') {
      return NextResponse.json({ error: 'Missing draft.' }, { status: 400 })
    }
    prospectId = json.prospectId
    draftId = json.draftId
    body = typeof json.body === 'string' ? json.body : ''
    subject = typeof json.subject === 'string' ? json.subject : ''
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const sent = await sendApprovedEnquiry({
      supabase: auth.supabase,
      userId: auth.user.id,
      prospectId,
      draftId,
      body,
      subject,
      via: 'approve',
    })
    return NextResponse.json({ ok: true, ...sent })
  } catch (err) {
    log.error('enquiry_send_failed', err, { user_id: auth.user.id, prospect_id: prospectId })
    const message = err instanceof Error ? err.message : 'Could not send that reply.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
