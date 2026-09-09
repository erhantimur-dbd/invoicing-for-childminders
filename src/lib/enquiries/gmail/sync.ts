import type { SupabaseClient } from '@supabase/supabase-js'
import { log } from '@/lib/log'
import { classifyEnquiryMail, gmailSearchQuery } from './filters'
import { parseFrom, parseGmailMessage } from './parse'
import { getValidAccessToken, loadGmailAccount } from './tokens'
import { getThread, listLabels, listThreadIds } from './client'

export type SyncResult = {
  createdProspects: number
  newMessages: number
  skipped: number
  threads: number
  watchedLabels: string[]
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
  const account = await loadGmailAccount(supabase, userId)
  if (!account) {
    throw new Error('Connect Gmail first.')
  }

  const { data: settings } = await supabase
    .from('enquiry_settings')
    .select('gmail_label')
    .eq('user_id', userId)
    .maybeSingle()

  const customLabel = (settings?.gmail_label as string | null) || account.label_name
  const accessToken = await getValidAccessToken(supabase, account)
  const labels = await listLabels(accessToken)
  const names = labelNameMap(labels)
  const query = gmailSearchQuery(customLabel)
  const threadIds = await listThreadIds(accessToken, query, 40)

  let createdProspects = 0
  let newMessages = 0
  let skipped = 0

  const { data: existingMsgs } = await supabase
    .from('enquiry_messages')
    .select('gmail_message_id')
    .eq('user_id', userId)
    .not('gmail_message_id', 'is', null)

  const seenIds = new Set(
    (existingMsgs ?? []).map((m) => m.gmail_message_id as string).filter(Boolean),
  )

  for (const threadId of threadIds) {
    const thread = await getThread(accessToken, threadId)
    const messages = [...(thread.messages ?? [])].sort((a, b) => {
      const da = Number(a.internalDate || 0)
      const db = Number(b.internalDate || 0)
      return da - db
    })

    for (const message of messages) {
      if (!message.id || seenIds.has(message.id)) {
        if (message.id && seenIds.has(message.id)) skipped += 1
        continue
      }

      const parsed = parseGmailMessage(message.payload)
      const labelNames = resolveLabelNames(message.labelIds, names)
      const decision = classifyEnquiryMail({
        from: parsed.from,
        subject: parsed.subject,
        body: parsed.body,
        labelNames,
        headers: parsed.headers,
        connectedEmail: account.email,
        extraLabels: customLabel ? [customLabel] : [],
      })

      if (!decision.include) {
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
        threadId,
        receivedAt: message.internalDate
          ? new Date(Number(message.internalDate)).toISOString()
          : new Date().toISOString(),
      })
      if (prospectId.created) createdProspects += 1

      const { error } = await supabase.from('enquiry_messages').insert({
        prospect_id: prospectId.id,
        user_id: userId,
        direction: 'in',
        subject: parsed.subject || null,
        body: parsed.body || parsed.subject || '(empty message)',
        from_address: email,
        to_address: parseFrom(parsed.to).email,
        status: 'logged',
        gmail_message_id: message.id,
        gmail_thread_id: threadId,
        rfc_message_id: parsed.rfcMessageId || null,
      })

      if (error) {
        if (error.code === '23505') {
          skipped += 1
          continue
        }
        log.error('enquiry_gmail_message_insert_failed', error, {
          user_id: userId,
          gmail_message_id: message.id,
        })
        throw new Error('Could not save a parent email.')
      }

      seenIds.add(message.id)
      newMessages += 1
    }
  }

  await supabase
    .from('enquiry_gmail_accounts')
    .update({
      last_sync_at: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  return {
    createdProspects,
    newMessages,
    skipped,
    threads: threadIds.length,
    watchedLabels: customLabel ? [customLabel] : [],
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

  const { data: matches } = await supabase
    .from('enquiry_prospects')
    .select('id, parent_name, parent_email')
    .eq('user_id', input.userId)

  const existing = (matches ?? []).find(
    (p) => (p.parent_email || '').trim().toLowerCase() === input.email,
  )

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
