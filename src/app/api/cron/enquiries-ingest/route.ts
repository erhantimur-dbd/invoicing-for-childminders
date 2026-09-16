import { NextRequest, NextResponse } from 'next/server'
import { decryptField } from '@/lib/crypto'
import { ingestParentEmail } from '@/lib/enquiries/ingest'
import { listRecentInbox } from '@/lib/integrations/gmail'
import { supabaseAdmin } from '@/lib/integrations/admin'
import { log } from '@/lib/log'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = supabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })

  const { data: connections, error } = await admin
    .from('enquiry_connections')
    .select('user_id, account_email, refresh_token_enc')
    .eq('provider', 'google')
    .eq('status', 'active')

  if (error) {
    log.error('enquiries_ingest_list_failed', error)
    return NextResponse.json({ error: 'list_failed' }, { status: 500 })
  }

  let ingested = 0
  let drafted = 0
  let sent = 0
  for (const conn of connections ?? []) {
    let refresh: string | null = null
    try {
      refresh = decryptField(conn.refresh_token_enc)
    } catch {
      await admin.from('enquiry_connections').update({ status: 'error', last_error: 'decrypt_failed' }).eq('user_id', conn.user_id).eq('provider', 'google')
      continue
    }
    if (!refresh) continue
    try {
      const messages = await listRecentInbox(refresh)
      for (const msg of messages) {
        const result = await ingestParentEmail({
          supabase: admin,
          userId: conn.user_id,
          from: msg.from,
          to: msg.to,
          subject: msg.subject,
          body: msg.body,
          providerMessageId: `gmail:${msg.id}`,
          source: 'gmail',
          connectedEmail: conn.account_email,
          labelIds: msg.labelIds,
          headers: msg.headers,
        })
        if (result.ingested) ingested += 1
        if (result.drafted) drafted += 1
        if (result.sent) sent += 1
      }
      await admin.from('enquiry_connections').update({
        last_synced_at: new Date().toISOString(),
        last_error: null,
        updated_at: new Date().toISOString(),
      }).eq('user_id', conn.user_id).eq('provider', 'google')
    } catch (err) {
      log.error('enquiries_ingest_user_failed', err, { user_id: conn.user_id })
      await admin.from('enquiry_connections').update({
        status: 'error',
        last_error: err instanceof Error ? err.message : 'ingest_failed',
        updated_at: new Date().toISOString(),
      }).eq('user_id', conn.user_id).eq('provider', 'google')
    }
  }

  return NextResponse.json({ ok: true, accounts: connections?.length ?? 0, ingested, drafted, sent })
}
