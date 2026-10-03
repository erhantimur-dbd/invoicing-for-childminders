import { NextResponse } from 'next/server'
import { requireEnquiriesUser } from '@/lib/enquiries/require'
import { AGENT_PAUSED_MESSAGE, isAgentPaused } from '@/lib/enquiries/pause'
import { createEnquiryDraft, EnquiryDraftError } from '@/lib/enquiries/create-draft'
import { sendApprovedEnquiry } from '@/lib/enquiries/gmail/send'
import { isAutoSendEnabled } from '@/lib/enquiries/send-mode'
import { markAutoSendHeld, resolveAutoSendDecision } from '@/lib/enquiries/auto-send-holdback.mjs'
import { ALREADY_REPLIED_MESSAGE, hasOutboundSince, latestInboundCreatedAt } from '@/lib/enquiries/reply-guard'
import { isOpenDraft } from '@/lib/enquiries/inbox'
import { log } from '@/lib/log'

export async function POST(request: Request) {
  const auth = await requireEnquiriesUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  let prospectId: string
  let parentMessage: string | undefined
  try {
    const body = await request.json()
    if (!body.prospectId || typeof body.prospectId !== 'string') {
      return NextResponse.json({ error: 'Missing parent.' }, { status: 400 })
    }
    prospectId = body.prospectId
    parentMessage = typeof body.parentMessage === 'string' ? body.parentMessage : undefined
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { data: settings } = await supabase
    .from('enquiry_settings')
    .select('agent_paused, send_mode')
    .eq('user_id', user.id)
    .maybeSingle()

  if (isAgentPaused(settings)) {
    return NextResponse.json({ error: AGENT_PAUSED_MESSAGE }, { status: 403 })
  }

  try {
    const { data: existingDrafts } = await supabase
      .from('enquiry_messages')
      .select('*')
      .eq('user_id', user.id)
      .eq('prospect_id', prospectId)
      .eq('direction', 'draft')
      .order('created_at', { ascending: false })
      .limit(5)

    const leftover = (existingDrafts ?? []).find(isOpenDraft)
    if (leftover) {
      return NextResponse.json({
        draft: leftover,
        needsHuman: leftover.status === 'needs_human',
      })
    }

    const inboundAt = await latestInboundCreatedAt(supabase, user.id, prospectId)
    if (isAutoSendEnabled(settings) && inboundAt && (await hasOutboundSince(supabase, user.id, prospectId, inboundAt))) {
      return NextResponse.json({ error: ALREADY_REPLIED_MESSAGE }, { status: 409 })
    }

    const created = await createEnquiryDraft(supabase, user.id, prospectId, parentMessage)
    if (!isAutoSendEnabled(settings)) {
      return NextResponse.json({
        draft: created.message,
        needsHuman: created.needsHuman,
        escalateLabels: created.escalateLabels,
        escalateReasons: created.escalateReasons,
      })
    }

    const { data: latestIn } = await supabase
      .from('enquiry_messages')
      .select('status, body, subject')
      .eq('user_id', user.id)
      .eq('prospect_id', prospectId)
      .eq('direction', 'in')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (latestIn?.status === 'historical') {
      return NextResponse.json({
        draft: created.message,
        needsHuman: created.needsHuman,
        escalateLabels: created.escalateLabels,
        escalateReasons: created.escalateReasons,
        held: 'before_connect',
      })
    }

    const decision = await resolveAutoSendDecision({
      inboundText: [parentMessage, latestIn?.subject, latestIn?.body].filter(Boolean).join('\n'),
      draftText: created.message.body,
      needsHuman: created.needsHuman,
    })
    if (!decision.send) {
      await markAutoSendHeld(supabase, user.id, prospectId, created.message.id)
      return NextResponse.json({
        draft: created.message,
        needsHuman: true,
        held: decision.reason,
        escalateLabels: created.escalateLabels,
        escalateReasons: [...(created.escalateReasons || []), decision.reason],
      })
    }

    const sent = await sendApprovedEnquiry({
      supabase,
      userId: user.id,
      prospectId,
      draftId: created.message.id,
      body: created.message.body,
      subject: '',
      via: 'auto',
    })
    return NextResponse.json({
      draft: created.message,
      sent,
      needsHuman: false,
      escalateLabels: created.escalateLabels,
      escalateReasons: created.escalateReasons,
    })
  } catch (err) {
    log.error('enquiry_draft_failed', err, { user_id: user.id, prospect_id: prospectId })
    if (err instanceof EnquiryDraftError) {
      return NextResponse.json(
        { error: err.message, reason: err.reason },
        { status: err.status },
      )
    }
    const raw = err instanceof Error ? err.message : ''
    const message = /anthropic|claude/i.test(raw) || !raw ? 'Could not draft a reply.' : raw
    const status = message === AGENT_PAUSED_MESSAGE ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
