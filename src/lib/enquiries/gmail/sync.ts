import type { SupabaseClient } from '@supabase/supabase-js'
import { autoDraftAndSend } from '@/lib/enquiries/auto-reply'
import { isGmailPollingAllowed } from '@/lib/enquiries/pause'
import { log } from '@/lib/log'
import { getMessage, listLabels, listMessageRefs } from './client'
import { classifyEnquiryMail, gmailSearchQuery } from './filters'
import { parseFrom, parseGmailMessage } from './parse'
import { rejectWithoutFetchingBody, shouldPersistEnquiry } from './privacy'
import { getValidAccessToken, loadGmailAccount } from './tokens'

export type SyncResult = {
  createdProspects: number
  newMessages: number
  skipped: number
  threads: number
  watchedLabels: string[]
  autoSent: number
  stopped?: 'paused'
}

function labelNameMap(labels: { id: string; name: string }[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const label of labels) {
    map.set(label.id, label.name)
    map.set(label.name.toLowerCase(), label.name)
  }
  return map
}

function resolveLabelNames(labelIds: string[] | undefined, names: Map<string, string>): string[] {
  return (labelIds ?? []).map((id) => names.get(id) || id)
}

export async function syncEnquiryGmail(
  supabase: SupabaseClient,
  userId: string,
): Promise<SyncResult> {
  const { data: settings } = await supabase
    .from('enquiry_settings')
    .select('gmail_label, agent_paused')
    .eq('user_id', userId)
    .maybeSingle()

  if (!isGmailPollingAllowed(settings)) {
    return {
      createdProspects: 0,
      newMessages: 0,
      skipped: 0,
      threads: 0,
      watchedLabels: [],
      autoSent: 0,
      stopped: 'paused',
    }
  }

  const account = await loadGmailAccount(supabase, userId)
  if (!account) {
    throw new Error('Connect Gmail first.')
  }

  const customLabel = (settings?.gmail_label as string | null) || account.label_name
  const accessToken = await getValidAccessToken(supabase, account)
  const labels = await listLabels(accessToken)
  const names = labelNameMap(labels)
  const query = gmailSearchQuery(customLabel)
  const candidates = await listMessageRefs(accessToken, query, 40)

  let createdProspects = 0
  let newMessages = 0
  let skipped = 0
  const newInboundIds: string[] = []

  const { data: existingMsgs } = await supabase
    .from('enquiry_messages')
    .select('gmail_message_id')
    .eq('user_id', userId)
    .not('gmail_message_id', 'is', null)

  const seenIds = new Set(
    (existingMsgs ?? []).map((m) => m.gmail_message_id as string).filter(Boolean),
  )

  for (const ref of candidates) {
    if (seenIds.has(ref.id)) {
      skipped += 1
      continue
    }

    const meta = await getMessage(accessToken, ref.id, 'metadata')
    const metaParsed = parseGmailMessage(meta.payload)
    const metaDecision = classifyEnquiryMail({
      from: metaParsed.from,
      subject: metaParsed.subject,
      body: meta.snippet || metaParsed.body,
      labelNames: resolveLabelNames(meta.labelIds, names),
      headers: metaParsed.headers,
      connectedEmail: account.email,
      extraLabels: customLabel ? [customLabel] : [],
    })

    if (rejectWithoutFetchingBody(metaDecision)) {
      skipped += 1
      continue
    }

    const full = await getMessage(accessToken, ref.id, 'full')
    const parsed = parseGmailMessage(full.payload)
    const decision = classifyEnquiryMail({
      from: parsed.from,
      subject: parsed.subject,
      body: parsed.body,
      labelNames: resolveLabelNames(full.labelIds, names),
      headers: parsed.headers,
      connectedEmail: account.email,
      extraLabels: customLabel ? [customLabel] : [],
    })

    if (!shouldPersistEnquiry(decision)) {
      skipped += 1
      continue
    }

    const { name, email } = parseFrom(parsed.from)
    if (!email) {
      skipped += 1
      continue
    }

    const prospectId = await upsertProspect(supabase, {
      userId,
      email,
      name,
      threadId: ref.threadId,
      receivedAt: full.internalDate
        ? new Date(Number(full.internalDate)).toISOString()
        : new Date().toISOString(),
    })
    if (prospectId.created) createdProspects += 1

    const { data: inserted, error } = await supabase
      .from('enquiry_messages')
      .insert({
        prospect_id: prospectId.id,
        user_id: userId,
        direction: 'in',
        subject: parsed.subject || null,
        body: parsed.body || parsed.subject || '(empty message)',
        from_address: email,
        to_address: parseFrom(parsed.to).email,
        status: 'logged',
        gmail_message_id: ref.id,
        gmail_thread_id: ref.threadId,
        rfc_message_id: parsed.rfcMessageId || null,
      })
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') {
        skipped += 1
        continue
      }
      log.error('enquiry_gmail_message_insert_failed', error, {
        user_id: userId,
        gmail_message_id: ref.id,
      })
      throw new Error('Could not save a parent email.')
    }

    seenIds.add(ref.id)
    newMessages += 1
    if (inserted?.id) newInboundIds.push(inserted.id)
  }

  await supabase
    .from('enquiry_gmail_accounts')
    .update({
      last_sync_at: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  const auto = await autoDraftAndSend(supabase, userId, newInboundIds)

  return {
    createdProspects,
    newMessages,
    skipped,
    threads: candidates.length,
    watchedLabels: customLabel ? [customLabel] : [],
    autoSent: auto.sent,
  }
}

async function upsertProspect(
  supabase: SupabaseClient,
  input: {
    userId: string
    email: string
    name: string | null
    threadId: string
    receivedAt: string
  },
): Promise<{ id: string; created: boolean }> {
  const { data: byThread } = await supabase
    .from('enquiry_prospects')
    .select('id, parent_name')
    .eq('user_id', input.userId)
    .eq('gmail_thread_id', input.threadId)
    .maybeSingle()

  if (byThread) {
    await supabase
      .from('enquiry_prospects')
      .update({
        last_email_at: input.receivedAt,
        updated_at: new Date().toISOString(),
        ...(byThread.parent_name || !input.name ? {} : { parent_name: input.name }),
      })
      .eq('id', byThread.id)
    return { id: byThread.id, created: false }
  }

  const { data: existing } = await supabase
    .from('enquiry_prospects')
    .select('id, parent_name')
    .eq('user_id', input.userId)
    .ilike('parent_email', input.email)
    .limit(1)
    .maybeSingle()

  if (existing) {
    await supabase
      .from('enquiry_prospects')
      .update({
        gmail_thread_id: input.threadId,
        last_email_at: input.receivedAt,
        updated_at: new Date().toISOString(),
        ...(existing.parent_name || !input.name ? {} : { parent_name: input.name }),
      })
      .eq('id', existing.id)
    return { id: existing.id, created: false }
  }

  const { data: created, error } = await supabase
    .from('enquiry_prospects')
    .insert({
      user_id: input.userId,
      parent_name: input.name,
      parent_email: input.email,
      source: 'gmail',
      gmail_thread_id: input.threadId,
      last_email_at: input.receivedAt,
    })
    .select('id')
    .single()

  if (error || !created) {
    log.error('enquiry_gmail_prospect_insert_failed', error, { user_id: input.userId })
    throw new Error('Could not save this parent from Gmail.')
  }
  return { id: created.id, created: true }
}
