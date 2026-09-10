import { NextResponse } from 'next/server'
import { requireEnquiriesUser } from '@/lib/enquiries/require'
import { AGENT_PAUSED_MESSAGE, isAgentPaused } from '@/lib/enquiries/pause'
import { createEnquiryDraft } from '@/lib/enquiries/create-draft'
import { sendApprovedEnquiry } from '@/lib/enquiries/gmail/send'
import { isAutoSendEnabled } from '@/lib/enquiries/send-mode'
import { ALREADY_REPLIED_MESSAGE, hasOutboundSince, latestInboundCreatedAt } from '@/lib/enquiries/reply-guard'
import { isOpenDraft } from '@/lib/enquiries/inbox'
import { log } from '@/lib/log'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const auth = await requireEnquiriesUser()
  if ('error' in auth) return auth.error
  const { supabase, user } = auth

  const limited = await rateLimit({
    bucket: 'enquiry-draft',
    identifier: user.id,
    limit: 30,
    windowMs: 60 * 60 * 1000,
  })
  if (!limited.ok) {
    return NextResponse.json({ error: 'That’s a lot of drafts. Try again shortly.' }, { status: 429 })
  }

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
      return NextResponse.json({ draft: leftover })
    }

    const inboundAt = await latestInboundCreatedAt(supabase, user.id, prospectId)
    if (isAutoSendEnabled(settings) && inboundAt && (await hasOutboundSince(supabase, user.id, prospectId, inboundAt))) {
      return NextResponse.json({ error: ALREADY_REPLIED_MESSAGE }, { status: 409 })
    }

    const draft = await createEnquiryDraft(supabase, user.id, prospectId, parentMessage)
    if (isAutoSendEnabled(settings)) {
      const sent = await sendApprovedEnquiry({
        supabase,
        userId: user.id,
        prospectId,
        draftId: draft.id,
        body: draft.body,
        subject: '',
        via: 'auto',
      })
      return NextResponse.json({ draft, sent })
    }
    return NextResponse.json({ draft })
  } catch (err) {
    log.error('enquiry_draft_failed', err, { user_id: user.id, prospect_id: prospectId })
    const raw = err instanceof Error ? err.message : ''
    // Never mention Anthropic/Claude in the Enquiries UI — xAI is the documented path.
    const message =
      /anthropic|claude/i.test(raw) || !raw ? 'Could not draft a reply.' : raw
    const status = message === AGENT_PAUSED_MESSAGE ? 403 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
