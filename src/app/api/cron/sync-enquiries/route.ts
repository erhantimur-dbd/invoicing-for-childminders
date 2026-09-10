import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { syncEnquiryGmail } from '@/lib/enquiries/gmail/sync'
import { log } from '@/lib/log'

/**
 * Soft Launch poll path. Gmail push / GCP Pub/Sub is not required to ship.
 * The Parents inbox also polls on open, and she can tap Check Gmail.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 })
  }

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { persistSession: false },
  })

  const { data: accounts, error } = await admin.from('enquiry_gmail_accounts').select('user_id, last_sync_at')
  if (error) {
    log.error('enquiry_gmail_cron_list_failed', error)
    return NextResponse.json({ error: 'Could not list Gmail accounts.' }, { status: 500 })
  }

  const results: { userId: string; ok: boolean; error?: string }[] = []
  for (const row of accounts ?? []) {
    const last = row.last_sync_at ? new Date(row.last_sync_at).getTime() : 0
    if (Date.now() - last < 8 * 60 * 1000) {
      results.push({ userId: row.user_id, ok: true })
      continue
    }
    try {
      await syncEnquiryGmail(admin, row.user_id)
      results.push({ userId: row.user_id, ok: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'sync failed'
      log.error('enquiry_gmail_cron_user_failed', err, { user_id: row.user_id })
      await admin
        .from('enquiry_gmail_accounts')
        .update({ last_error: message, updated_at: new Date().toISOString() })
        .eq('user_id', row.user_id)
      results.push({ userId: row.user_id, ok: false, error: message })
    }
  }

  return NextResponse.json({
    ok: true,
    checked: results.length,
    failed: results.filter((r) => !r.ok).length,
  })
}
