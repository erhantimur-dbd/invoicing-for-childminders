import { NextResponse } from 'next/server'
import { requireEnquiriesUser } from '@/lib/enquiries/require'
import { AGENT_PAUSED_MESSAGE, isAgentPaused } from '@/lib/enquiries/pause'
import { syncEnquiryGmail } from '@/lib/enquiries/gmail/sync'
import { log } from '@/lib/log'
import { rateLimit } from '@/lib/rate-limit'

export async function POST() {
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
    bucket: 'enquiry-gmail-sync',
    identifier: auth.user.id,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  })
  if (!limited.ok) {
    return NextResponse.json({ error: 'Try checking Gmail again in a little while.' }, { status: 429 })
  }

  try {
    const result = await syncEnquiryGmail(auth.supabase, auth.user.id)
    if (result.stopped === 'paused') {
      return NextResponse.json({ error: AGENT_PAUSED_MESSAGE }, { status: 403 })
    }
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    log.error('enquiry_gmail_sync_failed', err, { user_id: auth.user.id })
    const message = err instanceof Error ? err.message : 'Could not read Gmail.'
    await auth.supabase
      .from('enquiry_gmail_accounts')
      .update({ last_error: message, updated_at: new Date().toISOString() })
      .eq('user_id', auth.user.id)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
