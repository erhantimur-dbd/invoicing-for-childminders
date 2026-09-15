import { NextResponse } from 'next/server'
import { decryptField } from '@/lib/crypto'
import { sendEmail } from '@/lib/email/resend'
import { placeOfferEmail } from '@/lib/email/templates'
import { createClient } from '@/lib/supabase/server'
import { assertCanSendPlaceOffer, closeLostPatch, closeWonPatch } from '@/lib/enquiries/close-enquiry.mjs'
import { createOnboardToken, placeOfferUrl } from '@/lib/enquiries/onboard-token.mjs'
import { cancelVisitEvent } from '@/lib/integrations/google-calendar'
import { log } from '@/lib/log'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { prospectId?: string; outcome?: string; lostReason?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.prospectId || !['lost', 'won', 'started'].includes(String(body.outcome))) {
    return NextResponse.json({ error: 'Missing close action.' }, { status: 400 })
  }

  const { data: prospect } = await supabase
    .from('enquiry_prospects')
    .select('*')
    .eq('id', body.prospectId)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!prospect) return NextResponse.json({ error: 'Parent not found.' }, { status: 404 })

  if (body.outcome === 'lost') {
    if (prospect.calendar_event_id) {
      const { data: conn } = await supabase
        .from('enquiry_connections')
        .select('refresh_token_enc, status')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .maybeSingle()
      if (conn?.status === 'active') {
        try {
          const refresh = decryptField(conn.refresh_token_enc)
          if (refresh) await cancelVisitEvent({ refreshToken: refresh, eventId: prospect.calendar_event_id })
        } catch (err) {
          log.warn('calendar_cancel_on_lost_failed', { user_id: user.id })
        }
      }
    }
    const patch = { ...closeLostPatch(body.lostReason), calendar_event_id: null, calendar_provider: null }
    const { error } = await supabase.from('enquiry_prospects').update(patch).eq('id', prospect.id)
    if (error) return NextResponse.json({ error: 'Could not save.' }, { status: 500 })
    return NextResponse.json({ ok: true, stage: 'lost' })
  }

  if (body.outcome === 'started') {
    const { error } = await supabase
      .from('enquiry_prospects')
      .update({ stage: 'started', updated_at: new Date().toISOString() })
      .eq('id', prospect.id)
    if (error) return NextResponse.json({ error: 'Could not save.' }, { status: 500 })
    return NextResponse.json({ ok: true, stage: 'started' })
  }

  let email: string
  try {
    email = assertCanSendPlaceOffer(prospect)
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Add the parent email first.' }, { status: 400 })
  }

  const { data: settings } = await supabase
    .from('enquiry_settings')
    .select('display_name, onboarding_style')
    .eq('user_id', user.id)
    .maybeSingle()

  const token = createOnboardToken(prospect.id)
  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://www.godottie.cloud'
  const formUrl = placeOfferUrl(token, origin)
  const mail = placeOfferEmail({
    parentName: prospect.parent_name,
    childName: prospect.child_name,
    childminderName: settings?.display_name,
    formUrl,
    comprehensive: settings?.onboarding_style === 'comprehensive',
  })
  const sent = await sendEmail({ to: email, subject: mail.subject, html: mail.html })
  if (!sent.success) {
    log.warn('place_offer_email_failed', { user_id: user.id, error: sent.error })
    return NextResponse.json({ error: 'Could not email the parent. Try again.' }, { status: 500 })
  }

  const { error } = await supabase.from('enquiry_prospects').update(closeWonPatch()).eq('id', prospect.id)
  if (error) return NextResponse.json({ error: 'Emailed, but could not update the enquiry.' }, { status: 500 })
  return NextResponse.json({ ok: true, stage: 'accepted' })
}
