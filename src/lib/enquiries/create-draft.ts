import type { SupabaseClient } from '@supabase/supabase-js'
import { draftEnquiryReply } from '@/lib/enquiries/grok'
import { persistLearningProposals } from '@/lib/enquiries/persist-learning'
import { notifyHumanEscalation } from '@/lib/enquiries/notify-escalation'
import { shouldSendEscalationEmail } from '@/lib/enquiries/notify-escalation.mjs'
import { AGENT_PAUSED_MESSAGE, isAgentPaused } from '@/lib/enquiries/pause'
import { ENQUIRIES_QUOTA, runEnquiryDraft } from '@/lib/enquiries/quota.mjs'
import { enquiriesActive } from '@/lib/enquiries/access'
import { failClosedUsageCount, incrementEnquiryDraftUsage, usageFromStoredDrafts, utcMonthStart } from '@/lib/enquiries/usage'
import { rateLimit } from '@/lib/rate-limit'
import type { EnquiryKnowledge, EnquiryMessage, EnquiryProspect, EnquirySettings, EnquiryVacancy } from '@/lib/enquiries/types'

export class EnquiryDraftError extends Error {
  status: number
  reason?: string

  constructor(message: string, status = 500, reason?: string) {
    super(message)
    this.name = 'EnquiryDraftError'
    this.status = status
    this.reason = reason
  }
}

export type CreatedEnquiryDraft = {
  message: EnquiryMessage
  needsHuman: boolean
  escalateReasons: string[]
  escalateLabels: string[]
}

export async function createEnquiryDraft(
  supabase: SupabaseClient,
  userId: string,
  prospectId: string,
  parentMessage?: string,
): Promise<CreatedEnquiryDraft> {
  const [{ data: settings }, { data: vacancies }, { data: knowledge }, { data: prospect }, { data: sub }] = await Promise.all([
    supabase.from('enquiry_settings').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('enquiry_vacancies').select('*').eq('user_id', userId),
    supabase.from('enquiry_knowledge').select('*').eq('user_id', userId),
    supabase.from('enquiry_prospects').select('*').eq('id', prospectId).eq('user_id', userId).maybeSingle(),
    supabase.from('subscriptions').select('enquiries_status').eq('user_id', userId).maybeSingle(),
  ])

  if (!prospect) throw new EnquiryDraftError('Parent not found.', 404)
  if (!settings) throw new EnquiryDraftError('Finish the short setup first.', 400)
  if (isAgentPaused(settings)) throw new EnquiryDraftError(AGENT_PAUSED_MESSAGE, 403)

  const clipped = parentMessage
    ? parentMessage.slice(0, ENQUIRIES_QUOTA.parentMessageMaxChars)
    : undefined

  const hourBurst = await rateLimit({
    bucket: 'enquiry-draft-hour',
    identifier: userId,
    limit: ENQUIRIES_QUOTA.burstPerHour,
    windowMs: ENQUIRIES_QUOTA.burstWindowMs,
    failOpen: false,
  })
  const dayBurst = await rateLimit({
    bucket: 'enquiry-draft-day',
    identifier: userId,
    limit: ENQUIRIES_QUOTA.burstPerDay,
    windowMs: ENQUIRIES_QUOTA.dayWindowMs,
    failOpen: false,
  })

  let usedIncludingThis = await incrementEnquiryDraftUsage(userId)
  if (usedIncludingThis == null) {
    const { count } = await supabase
      .from('enquiry_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('direction', 'draft')
      .gte('created_at', utcMonthStart())
    usedIncludingThis = count == null ? failClosedUsageCount() : usageFromStoredDrafts(count)
  }

  const run = await runEnquiryDraft({
    subscribed: enquiriesActive(sub),
    usedIncludingThis,
    hourOk: hourBurst.ok,
    dayOk: dayBurst.ok,
    generate: () => draftEnquiryReply({
      settings: settings as EnquirySettings,
      vacancies: (vacancies ?? []) as EnquiryVacancy[],
      knowledge: (knowledge ?? []) as EnquiryKnowledge[],
      prospect: prospect as EnquiryProspect,
      parentMessage: clipped,
    }),
  })

  if (!run.ok) {
    throw new EnquiryDraftError(run.decision.error, run.decision.status, run.decision.reason)
  }

  const { body, model, needsHuman, escalateReasons, escalateLabels } = run.result as {
    body: string
    model: string
    needsHuman: boolean
    escalateReasons: string[]
    escalateLabels: string[]
  }

  const { data: saved, error } = await supabase
    .from('enquiry_messages')
    .insert({
      prospect_id: prospectId,
      user_id: userId,
      direction: 'draft',
      body,
      to_address: prospect.parent_email,
      status: needsHuman ? 'needs_human' : 'draft',
      model,
    })
    .select('*')
    .single()

  if (error || !saved) throw new EnquiryDraftError('Could not save the draft.')

  await supabase
    .from('enquiry_prospects')
    .update({
      stage: prospect.stage === 'new' ? 'chatting' : prospect.stage,
      needs_human: needsHuman,
      escalate_reasons: escalateReasons ?? [],
      updated_at: new Date().toISOString(),
    })
    .eq('id', prospectId)

  if (needsHuman) {
    const pending = await persistLearningProposals({
      supabase,
      userId,
      prospectId,
      reasons: escalateReasons ?? [],
      parentMessage: clipped,
      knowledge: (knowledge ?? []) as { question?: string | null; answer?: string | null }[],
      voiceNotes: (settings as EnquirySettings).voice_notes,
    })
    await maybeEmailChildminder({
      supabase,
      userId,
      prospect: prospect as EnquiryProspect,
      settings: settings as EnquirySettings,
      labels: escalateLabels || [],
      pendingCount: pending.length,
    })
  }

  return {
    message: saved as EnquiryMessage,
    needsHuman,
    escalateReasons: escalateReasons ?? [],
    escalateLabels: escalateLabels ?? [],
  }
}

async function maybeEmailChildminder(input: {
  supabase: SupabaseClient
  userId: string
  prospect: EnquiryProspect
  settings: EnquirySettings
  labels: string[]
  pendingCount?: number
}) {
  if (!shouldSendEscalationEmail(input.prospect.last_escalation_email_at)) return
  const { data: profile } = await input.supabase
    .from('profiles')
    .select('email, full_name')
    .eq('id', input.userId)
    .maybeSingle()
  const to = profile?.email
  if (!to) return
  const reasons = [...input.labels]
  if (input.pendingCount) reasons.push('There is a fact to add to Your answers.')
  const result = await notifyHumanEscalation({
    to,
    displayName: input.settings.display_name || profile?.full_name,
    parentName: input.prospect.parent_name,
    childName: input.prospect.child_name,
    reasons,
    prospectId: input.prospect.id,
  })
  if (result.sent) {
    await input.supabase
      .from('enquiry_prospects')
      .update({ last_escalation_email_at: new Date().toISOString() })
      .eq('id', input.prospect.id)
  }
}
