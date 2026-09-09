import { NextResponse } from 'next/server'
import { requireEnquiriesUser } from '@/lib/enquiries/require'
import { AGENT_PAUSED_MESSAGE, isAgentPaused } from '@/lib/enquiries/pause'
import { draftEnquiryReply } from '@/lib/enquiries/grok'
import type { EnquiryKnowledge, EnquiryProspect, EnquirySettings, EnquiryVacancy } from '@/lib/enquiries/types'
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

  const [{ data: settings }, { data: vacancies }, { data: knowledge }, { data: prospect }] = await Promise.all([
    supabase.from('enquiry_settings').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('enquiry_vacancies').select('*').eq('user_id', user.id),
    supabase.from('enquiry_knowledge').select('*').eq('user_id', user.id),
    supabase.from('enquiry_prospects').select('*').eq('id', prospectId).eq('user_id', user.id).maybeSingle(),
  ])

  if (!prospect) return NextResponse.json({ error: 'Parent not found.' }, { status: 404 })
  if (!settings) {
    return NextResponse.json({ error: 'Finish the short setup first.' }, { status: 400 })
  }
  if (isAgentPaused(settings)) {
    return NextResponse.json({ error: AGENT_PAUSED_MESSAGE }, { status: 403 })
  }

  try {
    const { body, model } = await draftEnquiryReply({
      settings: settings as EnquirySettings,
      vacancies: (vacancies ?? []) as EnquiryVacancy[],
      knowledge: (knowledge ?? []) as EnquiryKnowledge[],
      prospect: prospect as EnquiryProspect,
      parentMessage,
    })

    const { data: saved, error } = await supabase
      .from('enquiry_messages')
      .insert({
        prospect_id: prospectId,
        user_id: user.id,
        direction: 'draft',
        body,
        to_address: prospect.parent_email,
        status: 'draft',
        model,
      })
      .select('*')
      .single()

    if (error) throw error

    await supabase
      .from('enquiry_prospects')
      .update({
        stage: prospect.stage === 'new' ? 'chatting' : prospect.stage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', prospectId)

    return NextResponse.json({ draft: saved })
  } catch (err) {
    log.error('enquiry_draft_failed', err, { user_id: user.id, prospect_id: prospectId })
    const raw = err instanceof Error ? err.message : ''
    // Never mention Anthropic/Claude in the Enquiries UI — xAI is the documented path.
    const message =
      /anthropic|claude/i.test(raw) || !raw ? 'Could not draft a reply.' : raw
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
