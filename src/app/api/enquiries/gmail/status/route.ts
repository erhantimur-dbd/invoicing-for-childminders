import { NextResponse } from 'next/server'
import { requireEnquiriesUser } from '@/lib/enquiries/require'
import { gmailOAuthConfigured } from '@/lib/enquiries/gmail/config'
import { DEFAULT_ENQUIRY_LABELS, watchedLabels } from '@/lib/enquiries/gmail/filters'
import { listLabels } from '@/lib/enquiries/gmail/client'
import { getValidAccessToken, loadGmailAccount, publicAccount } from '@/lib/enquiries/gmail/tokens'
import { parseSendMode, type SendMode } from '@/lib/enquiries/send-mode'

export async function GET() {
  const auth = await requireEnquiriesUser()
  if ('error' in auth) return auth.error

  const [{ data: settings }, account] = await Promise.all([
    auth.supabase
      .from('enquiry_settings')
      .select('gmail_label, agent_paused, send_mode')
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
    sendMode: parseSendMode(settings?.send_mode),
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

  let label: string | undefined
  let sendMode: SendMode | undefined
  try {
    const body = await request.json()
    if (typeof body.gmailLabel === 'string') label = body.gmailLabel.trim()
    if (body.sendMode === 'approve' || body.sendMode === 'auto') sendMode = body.sendMode
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (label !== undefined) patch.gmail_label = label || null
  if (sendMode) patch.send_mode = sendMode

  if (label === undefined && !sendMode) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
  }

  const { error } = await auth.supabase
    .from('enquiry_settings')
    .update(patch)
    .eq('user_id', auth.user.id)

  if (error) {
    return NextResponse.json({ error: 'Could not save those settings.' }, { status: 500 })
  }

  if (label) {
    await auth.supabase
      .from('enquiry_gmail_accounts')
      .update({ label_name: label, updated_at: new Date().toISOString() })
      .eq('user_id', auth.user.id)
  }

  return NextResponse.json({ ok: true, gmailLabel: label, sendMode })
}
