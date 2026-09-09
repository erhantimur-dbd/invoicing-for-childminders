import { NextResponse } from 'next/server'
import { requireEnquiriesUser } from '@/lib/enquiries/require'
import { gmailOAuthConfigured } from '@/lib/enquiries/gmail/config'
import { DEFAULT_ENQUIRY_LABELS, watchedLabels } from '@/lib/enquiries/gmail/filters'
import { listLabels } from '@/lib/enquiries/gmail/client'
import { getValidAccessToken, loadGmailAccount, publicAccount } from '@/lib/enquiries/gmail/tokens'

export async function GET() {
  const auth = await requireEnquiriesUser()
  if ('error' in auth) return auth.error

  const [{ data: settings }, account] = await Promise.all([
    auth.supabase
      .from('enquiry_settings')
      .select('gmail_label, agent_paused')
      .eq('user_id', auth.user.id)
      .maybeSingle(),
    loadGmailAccount(auth.supabase, auth.user.id),
  ])

  let labels: { id: string; name: string }[] = []
  if (account) {
    try {
      const token = await getValidAccessToken(auth.supabase, account)
      labels = (await listLabels(token))
        .filter((l) => l.type === 'user' || /enquir|parent/i.test(l.name))
        .map((l) => ({ id: l.id, name: l.name }))
    } catch {
      labels = []
    }
  }

  return NextResponse.json({
    configured: gmailOAuthConfigured(),
    connected: Boolean(account),
    paused: Boolean(settings?.agent_paused),
    gmailLabel: settings?.gmail_label || account?.label_name || '',
    watchedLabels: watchedLabels(settings?.gmail_label || account?.label_name),
    defaultLabels: DEFAULT_ENQUIRY_LABELS,
    account: account ? publicAccount(account) : null,
    labels,
  })
}

export async function PATCH(request: Request) {
  const auth = await requireEnquiriesUser()
  if ('error' in auth) return auth.error

  let label = ''
  try {
    const body = await request.json()
    label = typeof body.gmailLabel === 'string' ? body.gmailLabel.trim() : ''
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { error } = await auth.supabase
    .from('enquiry_settings')
    .update({ gmail_label: label || null, updated_at: new Date().toISOString() })
    .eq('user_id', auth.user.id)

  if (error) {
    return NextResponse.json({ error: 'Could not save that label.' }, { status: 500 })
  }

  if (label) {
    await auth.supabase
      .from('enquiry_gmail_accounts')
      .update({ label_name: label, updated_at: new Date().toISOString() })
      .eq('user_id', auth.user.id)
  }

  return NextResponse.json({ ok: true, gmailLabel: label })
}
