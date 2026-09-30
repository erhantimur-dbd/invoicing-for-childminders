import type { SupabaseClient } from '@supabase/supabase-js'
import { createEnquiryDraft } from '@/lib/enquiries/create-draft'
import { sendApprovedEnquiry } from '@/lib/enquiries/gmail/send'
import { parseFromHeader, shouldIngestMessage } from '@/lib/enquiries/ingest-filter.mjs'
import { ENQUIRIES_QUOTA } from '@/lib/enquiries/quota.mjs'
import { isAutoSendEnabled } from '@/lib/enquiries/send-mode'
import type { EnquiryProspect, EnquirySettings } from '@/lib/enquiries/types'
import { log } from '@/lib/log'

type Admin = SupabaseClient

export async function ingestParentEmail(input: {
  supabase: Admin
  userId: string
  from: string
  to?: string
  subject?: string
  body: string
  providerMessageId?: string | null
  source: 'gmail' | 'forward'
  connectedEmail?: string | null
  labelIds?: string[]
  headers?: Record<string, string> | { name: string; value: string }[]
}) {
  const parsed = parseFromHeader(input.from)
  if (!shouldIngestMessage({
    from: input.from,
    connectedEmail: input.connectedEmail,
    headers: input.headers,
    labelIds: input.labelIds,
  })) {
    return { ingested: false, reason: 'filtered' as const }
  }

  const { data: settings } = await input.supabase
    .from('enquiry_settings')
    .select('*')
    .eq('user_id', input.userId)
    .maybeSingle()
  if (!settings?.setup_completed_at) {
    return { ingested: false, reason: 'no_setup' as const }
  }

  if (input.providerMessageId) {
    const { data: dup } = await input.supabase
      .from('enquiry_messages')
      .select('id')
      .eq('user_id', input.userId)
      .eq('provider_message_id', input.providerMessageId)
      .maybeSingle()
    if (dup) return { ingested: false, reason: 'duplicate' as const }
  }

  let prospect: EnquiryProspect | null = null
  if (parsed.email) {
    const { data: existing } = await input.supabase
      .from('enquiry_prospects')
      .select('*')
      .eq('user_id', input.userId)
      .eq('parent_email', parsed.email)
      .not('stage', 'in', '(started,lost)')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    prospect = (existing as EnquiryProspect | null) ?? null
  }

  if (!prospect) {
    const { data: created, error } = await input.supabase
      .from('enquiry_prospects')
      .insert({
        user_id: input.userId,
        parent_name: parsed.name,
        parent_email: parsed.email,
        source: input.source,
        stage: 'new',
        last_email_at: new Date().toISOString(),
      })
      .select('*')
      .single()
    if (error || !created) throw error || new Error('prospect_insert_failed')
    prospect = created as EnquiryProspect
  } else {
    await input.supabase
      .from('enquiry_prospects')
      .update({ last_email_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', prospect.id)
  }

  const body = String(input.body || '').slice(0, ENQUIRIES_QUOTA.parentMessageMaxChars)
  const { data: inbound, error: msgError } = await input.supabase
    .from('enquiry_messages')
    .insert({
      prospect_id: prospect.id,
      user_id: input.userId,
      direction: 'in',
      subject: input.subject || null,
      body: body || '(empty)',
      from_address: parsed.email,
      to_address: input.to || null,
      status: 'logged',
      provider_message_id: input.providerMessageId || null,
    })
    .select('*')
    .single()
  if (msgError) {
    if (msgError.code === '23505') return { ingested: false, reason: 'duplicate' as const }
    throw msgError
  }

  if (settings.agent_paused) {
    return { ingested: true, prospectId: prospect.id, drafted: false, sent: false, inboundId: inbound.id }
  }

  const draft = await draftAndMaybeSend({
    supabase: input.supabase,
    userId: input.userId,
    prospect,
    settings: settings as EnquirySettings,
    parentMessage: body,
  })

  return {
    ingested: true,
    prospectId: prospect.id,
    inboundId: inbound.id,
    drafted: Boolean(draft.draftId),
    sent: Boolean(draft.sent),
    draftId: draft.draftId,
  }
}

export async function draftAndMaybeSend(input: {
  supabase: Admin
  userId: string
  prospect: EnquiryProspect
  settings: EnquirySettings
  parentMessage?: string
}) {
  let created
  try {
    created = await createEnquiryDraft(
      input.supabase,
      input.userId,
      input.prospect.id,
      input.parentMessage,
    )
  } catch (err) {
    return { draftId: null, sent: false, error: err instanceof Error ? err.message : 'draft_failed' }
  }

  if (created.needsHuman || !isAutoSendEnabled(input.settings) || !input.prospect.parent_email) {
    return { draftId: created.message.id, sent: false, needsHuman: created.needsHuman, escalateLabels: created.escalateLabels }
  }

  try {
    await sendApprovedEnquiry({
      supabase: input.supabase,
      userId: input.userId,
      prospectId: input.prospect.id,
      draftId: created.message.id,
      body: created.message.body,
      subject: '',
      via: 'auto',
    })
  } catch (err) {
    log.warn('gmail_auto_send_failed', { user_id: input.userId, error: err instanceof Error ? err.message : 'fail' })
    return { draftId: created.message.id, sent: false, needsHuman: false }
  }
  return { draftId: created.message.id, sent: true }
}
