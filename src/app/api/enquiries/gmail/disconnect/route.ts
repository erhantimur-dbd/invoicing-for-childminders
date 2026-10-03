import { NextResponse } from 'next/server'
import { requireEnquiriesUser } from '@/lib/enquiries/require'
import { decryptToken, loadGmailAccount } from '@/lib/enquiries/gmail/tokens'
import { revokeGoogleToken } from '@/lib/enquiries/gmail/oauth'
import { log } from '@/lib/log'

export async function POST() {
  const auth = await requireEnquiriesUser()
  if ('error' in auth) return auth.error

  const account = await loadGmailAccount(auth.supabase, auth.user.id)
  // Revoke + delete so cron / Check Gmail cannot poll this mailbox again.
  if (account) {
    const access = decryptToken(account.access_token_enc)
    const refresh = decryptToken(account.refresh_token_enc)
    if (refresh) await revokeGoogleToken(refresh)
    else if (access) await revokeGoogleToken(access)
  }

  const { error } = await auth.supabase
    .from('enquiry_gmail_accounts')
    .delete()
    .eq('user_id', auth.user.id)

  if (error) {
    log.error('enquiry_gmail_disconnect_failed', error, { user_id: auth.user.id })
    return NextResponse.json({ error: 'Could not disconnect Gmail.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
