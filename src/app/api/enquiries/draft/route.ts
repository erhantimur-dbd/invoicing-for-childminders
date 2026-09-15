import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { enquiriesActive } from '@/lib/enquiries/access'
import { draftEnquiryReply } from '@/lib/enquiries/grok'
import type { EnquiryKnowledge, EnquiryProspect, EnquirySettings, EnquiryVacancy } from '@/lib/enquiries/types'
import { ENQUIRIES_QUOTA, runEnquiryDraft } from '@/lib/enquiries/quota.mjs'
import { failClosedUsageCount, incrementEnquiryDraftUsage, usageFromStoredDrafts, utcMonthStart } from '@/lib/enquiries/usage'
import { log } from '@/lib/log'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('enquiries_status')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!enquiriesActive(sub)) {
    return NextResponse.json({ error: 'Turn on Enquiries first.' }, { status: 403 })
  }

  const hourBurst = await rateLimit({
    bucket: 'enquiry-draft-hour',
    identifier: user.id,
    limit: ENQUIRIES_QUOTA.burstPerHour,
    windowMs: ENQUIRIES_QUOTA.burstWindowMs,
    failOpen: false,
  })
  const dayBurst = await rateLimit({
    bucket: 'enquiry-draft-day',
    identifier: user.id,
    limit: ENQUIRIES_QUOTA.burstPerDay,
    windowMs: ENQUIRIES_QUOTA.dayWindowMs,
    failOpen: false,
  })

  let prospectId: string
  let parentMessage: string | undefined
  try {
    const body = await request.json()
    if (!body.prospectId || typeof body.prospectId !== 'string') {
      return NextResponse.json({ error: 'Missing parent.' }, { status: 400 })
    }
    prospectId = body.prospectId
    parentMessage = typeof body.parentMessage === 'string' ? body.parentMessage : undefined
    if (parentMessage && parentMessage.length > ENQUIRIES_QUOTA.parentMessageMaxChars) {
      parentMessage = parentMessage.slice(0, ENQUIRIES_QUOTA.parentMessageMaxChars)
    }
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

  let usedIncludingThis = await incrementEnquiryDraftUsage(user.id)
  if (usedIncludingThis == null) {
    const { count } = await supabase
      .from('enquiry_messages')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('direction', 'draft')
      .gte('created_at', utcMonthStart())
    usedIncludingThis = count == null ? failClosedUsageCount() : usageFromStoredDrafts(count)
  }

  try {
    const run = await runEnquiryDraft({
      subscribed: true,
      usedIncludingThis,
      hourOk: hourBurst.ok,
      dayOk: dayBurst.ok,
      generate: () => draftEnquiryReply({
        settings: settings as EnquirySettings,
        vacancies: (vacancies ?? []) as EnquiryVacancy[],
        knowledge: (knowledge ?? []) as EnquiryKnowledge[],
        prospect: prospect as EnquiryProspect,
        parentMessage,
      }),
    })

    if (!run.ok) {
      return NextResponse.json(
        { error: run.decision.error, reason: run.decision.reason },
        { status: run.decision.status },
      )
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
        user_id: user.id,
        direction: 'draft',
        body,
        to_address: prospect.parent_email,
        status: needsHuman ? 'needs_human' : 'draft',
        model,
      })
      .select('*')
      .single()

    if (error) throw error

    await supabase
      .from('enquiry_prospects')
      .update({
        stage: prospect.stage === 'new' ? 'chatting' : prospect.stage,
        needs_human: needsHuman,
        escalate_reasons: escalateReasons ?? [],
        updated_at: new Date().toISOString(),
      })
      .eq('id', prospectId)

    return NextResponse.json({ draft: saved, needsHuman, escalateLabels })
  } catch (err) {
    log.error('enquiry_draft_failed', err, { user_id: user.id, prospect_id: prospectId })
    return NextResponse.json({ error: 'Could not draft a reply.' }, { status: 500 })
  }
}
