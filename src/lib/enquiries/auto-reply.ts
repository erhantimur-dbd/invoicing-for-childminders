import type { SupabaseClient } from '@supabase/supabase-js'
import type { createEnquiryDraft } from './create-draft'
import type { sendApprovedEnquiry } from './gmail/send'
import { isAgentPaused } from './pause'
import { hasOutboundSince } from './reply-guard'
import { receivedAfterConnect } from './gmail/filters'
import { isAutoSendEnabled } from './send-mode'
import { markAutoSendHeld, resolveAutoSendDecision } from './auto-send-holdback.mjs'
import type { HoldbackDecision } from './auto-send-holdback'
import { log } from '../log'

export type AutoInbound = {
  id: string
  receivedAt: string | null
}

export type AutoReplyResult = {
  sent: number
  skipped: number
  reason?: 'paused' | 'approve' | 'none'
}

const MAX_AUTO_SEND_PER_SYNC = 10

export type AutoSendDeps = {
  createDraft?: typeof createEnquiryDraft
  send?: typeof sendApprovedEnquiry
  classify?: (inboundText: string, draftText: string) => HoldbackDecision | Promise<HoldbackDecision>
  timeoutMs?: number
}

export async function autoDraftAndSend(
  supabase: SupabaseClient,
  userId: string,
  inbound: AutoInbound[],
  deps?: AutoSendDeps,
): Promise<AutoReplyResult> {
  if (!inbound.length) return { sent: 0, skipped: 0, reason: 'none' }

  const { data: settings } = await supabase
    .from('enquiry_settings')
    .select('agent_paused, send_mode')
    .eq('user_id', userId)
    .maybeSingle()

  if (isAgentPaused(settings)) {
    return { sent: 0, skipped: inbound.length, reason: 'paused' }
  }
  if (!isAutoSendEnabled(settings)) {
    return { sent: 0, skipped: 0, reason: 'approve' }
  }

  const { data: account } = await supabase
    .from('enquiry_gmail_accounts')
    .select('connected_at')
    .eq('user_id', userId)
    .maybeSingle()
  const connectedAt = (account?.connected_at as string | null) ?? null

  const createDraft = deps?.createDraft ?? (async (
    ...args: Parameters<typeof createEnquiryDraft>
  ) => {
    const mod = await import('./create-draft')
    return mod.createEnquiryDraft(...args)
  })
  const send = deps?.send ?? (async (
    ...args: Parameters<typeof sendApprovedEnquiry>
  ) => {
    const mod = await import('./gmail/send')
    return mod.sendApprovedEnquiry(...args)
  })

  let sent = 0
  let skipped = 0

  for (const item of inbound.slice(0, MAX_AUTO_SEND_PER_SYNC)) {
    if (!receivedAfterConnect(item.receivedAt, connectedAt)) {
      skipped += 1
      continue
    }
    const inboundId = item.id
    try {
      const { data: stillAllowed } = await supabase
        .from('enquiry_settings')
        .select('agent_paused, send_mode')
        .eq('user_id', userId)
        .maybeSingle()
      if (isAgentPaused(stillAllowed) || !isAutoSendEnabled(stillAllowed)) {
        return { sent, skipped, reason: isAgentPaused(stillAllowed) ? 'paused' : 'approve' }
      }

      const { data: inbound } = await supabase
        .from('enquiry_messages')
        .select('id, prospect_id, body, subject, created_at')
        .eq('id', inboundId)
        .eq('user_id', userId)
        .eq('direction', 'in')
        .maybeSingle()

      if (!inbound) {
        skipped += 1
        continue
      }

      const { data: prospect } = await supabase
        .from('enquiry_prospects')
        .select('id, stage, parent_email')
        .eq('id', inbound.prospect_id)
        .eq('user_id', userId)
        .maybeSingle()

      if (
        !prospect ||
        !prospect.parent_email ||
        prospect.stage === 'lost' ||
        prospect.stage === 'started' ||
        prospect.stage === 'accepted'
      ) {
        skipped += 1
        continue
      }

      if (await hasOutboundSince(supabase, userId, prospect.id, inbound.created_at)) {
        skipped += 1
        continue
      }

      const draft = await createDraft(
        supabase,
        userId,
        prospect.id,
        inbound.body || inbound.subject || undefined,
      )

      const decision = await resolveAutoSendDecision({
        inboundText: [inbound.subject, inbound.body].filter(Boolean).join('\n'),
        draftText: draft.message.body || '',
        needsHuman: draft.needsHuman,
        classify: deps?.classify,
        timeoutMs: deps?.timeoutMs,
      })
      if (!decision.send) {
        await markAutoSendHeld(supabase, userId, prospect.id, draft.message.id)
        skipped += 1
        continue
      }

      await send({
        supabase,
        userId,
        prospectId: prospect.id,
        draftId: draft.message.id,
        body: draft.message.body,
        subject: inbound.subject || `Your enquiry`,
        via: 'auto',
      })
      sent += 1
    } catch (err) {
      skipped += 1
      log.error('enquiry_auto_send_failed', err, { user_id: userId, inbound_id: inboundId })
    }
  }

  return { sent, skipped }
}
