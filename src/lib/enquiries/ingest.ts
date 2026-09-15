import type { SupabaseClient } from '@supabase/supabase-js'
import { decryptField } from '@/lib/crypto'
import { sendViaGmail } from '@/lib/enquiries/gmail-send'
import { draftEnquiryReply } from '@/lib/enquiries/grok'
import { parseFromHeader, shouldIngestMessage } from '@/lib/enquiries/ingest-filter.mjs'
import { ENQUIRIES_QUOTA, runEnquiryDraft } from '@/lib/enquiries/quota.mjs'
import { failClosedUsageCount, incrementEnquiryDraftUsage, usageFromStoredDrafts, utcMonthStart } from '@/lib/enquiries/usage'
import { rateLimit } from '@/lib/rate-limit'
import type { EnquiryKnowledge, EnquiryProspect, EnquirySettings, EnquiryVacancy } from '@/lib/enquiries/types'
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

  const [{ data: settings }, { data: vacancies }, { data: knowledge }] = await Promise.all([
    input.supabase.from('enquiry_settings').select('*').eq('user_id', input.userId).maybeSingle(),
    input.supabase.from('enquiry_vacancies').select('*').eq('user_id', input.userId),
    input.supabase.from('enquiry_knowledge').select('*').eq('user_id', input.userId),
  ])
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
    vacancies: (vacancies ?? []) as EnquiryVacancy[],
    knowledge: (knowledge ?? []) as EnquiryKnowledge[],
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
  vacancies: EnquiryVacancy[]
  knowledge: EnquiryKnowledge[]
  parentMessage?: string
}) {
  const hourBurst = await rateLimit({
    bucket: 'enquiry-draft-hour',
    identifier: input.userId,
    limit: ENQUIRIES_QUOTA.burstPerHour,
    windowMs: ENQUIRIES_QUOTA.burstWindowMs,
    failOpen: false,
  })
  const dayBurst = await rateLimit({
    bucket: 'enquiry-draft-day',
    identifier: input.userId,
    limit: ENQUIRIES_QUOTA.burstPerDay,
    windowMs: ENQUIRIES_QUOTA.dayWindowMs,
    failOpen: false,
  })
  let usedIncludingThis = await incrementEnquiryDraftUsage(input.userId)
  if (usedIncludingThis == null) {
    const { count } = await input.supabase
      .from('enquiry_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', input.userId)
      .eq('direction', 'draft')
      .gte('created_at', utcMonthStart())
    usedIncludingThis = count == null ? failClosedUsageCount() : usageFromStoredDrafts(count)
  }

  const run = await runEnquiryDraft({
    subscribed: true,
    usedIncludingThis,
    hourOk: hourBurst.ok,
    dayOk: dayBurst.ok,
    generate: () => draftEnquiryReply({
      settings: input.settings,
      vacancies: input.vacancies,
      knowledge: input.knowledge,
      prospect: input.prospect,
      parentMessage: input.parentMessage,
    }),
  })
  if (!run.ok) {
    return { draftId: null, sent: false, error: run.decision.error }
  }
  const { body, model } = run.result as { body: string; model: string }
  const { data: saved, error } = await input.supabase
    .from('enquiry_messages')
    .insert({
      prospect_id: input.prospect.id,
      user_id: input.userId,
      direction: 'draft',
      body,
      to_address: input.prospect.parent_email,
      status: 'draft',
      model,
    })
    .select('id, body')
    .single()
  if (error || !saved) return { draftId: null, sent: false, error: error?.message }

  await input.supabase
    .from('enquiry_prospects')
    .update({
      stage: input.prospect.stage === 'new' ? 'chatting' : input.prospect.stage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.prospect.id)

  if (!input.settings.auto_send_replies || !input.prospect.parent_email) {
    return { draftId: saved.id, sent: false }
  }

  const { data: conn } = await input.supabase
    .from('enquiry_connections')
    .select('refresh_token_enc, status')
    .eq('user_id', input.userId)
    .eq('provider', 'google')
    .maybeSingle()
  if (!conn || conn.status !== 'active') {
    return { draftId: saved.id, sent: false }
  }
  let refresh: string | null = null
  try {
    refresh = decryptField(conn.refresh_token_enc)
  } catch (err) {
    log.warn('gmail_token_decrypt_failed', { user_id: input.userId })
    return { draftId: saved.id, sent: false }
  }
  const sent = await sendViaGmail({
    to: input.prospect.parent_email,
    subject: input.prospect.child_name ? `Your enquiry — ${input.prospect.child_name}` : 'Your childcare enquiry',
    html: `<pre style="font-family:inherit;white-space:pre-wrap">${escapeHtml(saved.body)}</pre>`,
    text: saved.body,
    replyTo: undefined,
  }, refresh)
  if (!sent.success) {
    log.warn('gmail_auto_send_failed', { user_id: input.userId, error: sent.error })
    return { draftId: saved.id, sent: false }
  }
  await input.supabase.from('enquiry_messages').insert({
    prospect_id: input.prospect.id,
    user_id: input.userId,
    direction: 'out',
    body: saved.body,
    to_address: input.prospect.parent_email,
    status: 'sent',
  })
  await input.supabase.from('enquiry_messages').update({ status: 'sent' }).eq('id', saved.id)
  return { draftId: saved.id, sent: true }
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
