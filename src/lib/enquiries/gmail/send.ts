import type { SupabaseClient } from '@supabase/supabase-js'
import { sendRawMessage } from './client'
import { encodeRfc2822, toGmailRaw } from './parse'
import { getValidAccessToken, loadGmailAccount } from './tokens'

export async function sendApprovedEnquiry(opts: {
  supabase: SupabaseClient
  userId: string
  prospectId: string
  draftId: string
  body: string
  subject: string
}): Promise<{ gmailMessageId: string; gmailThreadId: string }> {
  const account = await loadGmailAccount(opts.supabase, opts.userId)
  if (!account) {
    throw new Error('Connect Gmail first so Dottie can send from your inbox after you approve.')
  }

  const [{ data: prospect }, { data: draft }] = await Promise.all([
    opts.supabase
      .from('enquiry_prospects')
      .select('*')
      .eq('id', opts.prospectId)
      .eq('user_id', opts.userId)
      .maybeSingle(),
    opts.supabase
      .from('enquiry_messages')
      .select('*')
      .eq('id', opts.draftId)
      .eq('prospect_id', opts.prospectId)
      .eq('user_id', opts.userId)
      .maybeSingle(),
  ])

  if (!prospect) throw new Error('Parent not found.')
  if (!draft || draft.direction !== 'draft') throw new Error('That draft is gone. Write a new one.')
  if (!prospect.parent_email) throw new Error('This parent has no email address.')

  const body = opts.body.trim()
  if (!body) throw new Error('The reply is empty.')

  const { data: lastInbound } = await opts.supabase
    .from('enquiry_messages')
    .select('rfc_message_id, gmail_thread_id, subject')
    .eq('prospect_id', opts.prospectId)
    .eq('user_id', opts.userId)
    .eq('direction', 'in')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const subject = opts.subject.trim() || lastInbound?.subject || `Your enquiry${prospect.child_name ? ` — ${prospect.child_name}` : ''}`
  const accessToken = await getValidAccessToken(opts.supabase, account)
  const raw = toGmailRaw(
    encodeRfc2822({
      from: account.email,
      to: prospect.parent_email,
      subject,
      body,
      inReplyTo: lastInbound?.rfc_message_id || null,
      references: lastInbound?.rfc_message_id || null,
    }),
  )

  const sent = await sendRawMessage(
    accessToken,
    raw,
    lastInbound?.gmail_thread_id || prospect.gmail_thread_id,
  )

  const now = new Date().toISOString()
  const { error: outError } = await opts.supabase.from('enquiry_messages').insert({
    prospect_id: opts.prospectId,
    user_id: opts.userId,
    direction: 'out',
    subject,
    body,
    from_address: account.email,
    to_address: prospect.parent_email,
    status: 'sent',
    model: draft.model,
    gmail_message_id: sent.id,
    gmail_thread_id: sent.threadId,
  })
  if (outError) throw outError

  await opts.supabase
    .from('enquiry_messages')
    .update({ status: 'approved', body, subject })
    .eq('id', draft.id)

  await opts.supabase
    .from('enquiry_prospects')
    .update({
      last_email_at: now,
      updated_at: now,
      gmail_thread_id: sent.threadId,
      stage: prospect.stage === 'new' ? 'chatting' : prospect.stage,
    })
    .eq('id', opts.prospectId)

  return { gmailMessageId: sent.id, gmailThreadId: sent.threadId }
}
