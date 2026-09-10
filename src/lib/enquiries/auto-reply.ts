import type { SupabaseClient } from '@supabase/supabase-js'
import { createEnquiryDraft } from '@/lib/enquiries/create-draft'
import { sendApprovedEnquiry } from '@/lib/enquiries/gmail/send'
import { isAgentPaused } from '@/lib/enquiries/pause'
import { isAutoSendEnabled } from '@/lib/enquiries/send-mode'
import { log } from '@/lib/log'

export type AutoReplyResult = {
  sent: number
  skipped: number
  reason?: 'paused' | 'approve' | 'none'
}

const MAX_AUTO_SEND_PER_SYNC = 10

export async function autoDraftAndSend(
  supabase: SupabaseClient,
  userId: string,
  inboundIds: string[],
): Promise<AutoReplyResult> {
  if (!inboundIds.length) return { sent: 0, skipped: 0, reason: 'none' }

  const { data: settings } = await supabase
    .from('enquiry_settings')
    .select('agent_paused, send_mode')
    .eq('user_id', userId)
    .maybeSingle()

  if (isAgentPaused(settings)) {
    return { sent: 0, skipped: inboundIds.length, reason: 'paused' }
  }
  if (!isAutoSendEnabled(settings)) {
    return { sent: 0, skipped: 0, reason: 'approve' }
  }

  let sent = 0
  let skipped = 0

  for (const inboundId of inboundIds.slice(0, MAX_AUTO_SEND_PER_SYNC)) {
    try {
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

      if (!prospect || !prospect.parent_email || prospect.stage === 'lost' || prospect.stage === 'started') {
        skipped += 1
        continue
      }

      const { data: alreadyOut } = await supabase
        .from('enquiry_messages')
        .select('id')
        .eq('prospect_id', prospect.id)
        .eq('user_id', userId)
        .eq('direction', 'out')
        .gte('created_at', inbound.created_at)
        .limit(1)
        .maybeSingle()

      if (alreadyOut) {
        skipped += 1
        continue
      }

      const draft = await createEnquiryDraft(
        supabase,
        userId,
        prospect.id,
        inbound.body || inbound.subject || undefined,
      )

      await sendApprovedEnquiry({
        supabase,
        userId,
        prospectId: prospect.id,
        draftId: draft.id,
        body: draft.body,
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
