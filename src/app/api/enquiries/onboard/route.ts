import { NextResponse } from 'next/server'
import { decryptField } from '@/lib/crypto'
import { sendEmail } from '@/lib/email/resend'
import { childOnboardedEmail } from '@/lib/email/templates'
import { childFormPrefill, hoursPerDayFromText } from '@/lib/enquiries/prospect-to-child.mjs'
import { verifyOnboardToken } from '@/lib/enquiries/onboard-token.mjs'
import { supabaseAdmin } from '@/lib/integrations/admin'
import { log } from '@/lib/log'

async function loadContext(token: string) {
  const verified = verifyOnboardToken(token)
  if (!verified.ok) return { error: verified.reason === 'expired' ? 'This signup link has expired.' : 'This signup link is not valid.', status: 400 as const }
  const admin = supabaseAdmin()
  if (!admin) return { error: 'Not configured', status: 500 as const }
  const { data: prospect } = await admin.from('enquiry_prospects').select('*').eq('id', verified.prospectId).maybeSingle()
  if (!prospect || prospect.stage === 'lost') return { error: 'This offer is no longer open.', status: 404 as const }
  const { data: settings } = await admin
    .from('enquiry_settings')
    .select('user_id, display_name, ofsted_urn, inbound_slug, onboarding_style, day_rate, voice_notes')
    .eq('user_id', prospect.user_id)
    .maybeSingle()
  return { admin, prospect, settings }
}

async function payeeBank(admin: NonNullable<ReturnType<typeof supabaseAdmin>>, userId: string) {
  const { data: profile } = await admin
    .from('profiles')
    .select('primary_bank_account_id, default_bank_name, default_bank_account_name, default_bank_sort_code, default_bank_account_number, email, full_name')
    .eq('id', userId)
    .maybeSingle()
  if (profile?.primary_bank_account_id) {
    const { data: row } = await admin
      .from('bank_accounts')
      .select('bank_name, account_name, sort_code, account_number')
      .eq('id', profile.primary_bank_account_id)
      .maybeSingle()
    if (row) {
      return {
        bank_name: row.bank_name,
        account_name: row.account_name,
        sort_code: decryptField(row.sort_code),
        account_number: decryptField(row.account_number),
        childminder_email: profile.email,
        childminder_name: profile.full_name,
      }
    }
  }
  return {
    bank_name: profile?.default_bank_name || null,
    account_name: profile?.default_bank_account_name || null,
    sort_code: decryptField(profile?.default_bank_sort_code),
    account_number: decryptField(profile?.default_bank_account_number),
    childminder_email: profile?.email,
    childminder_name: profile?.full_name,
  }
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || ''
  const ctx = await loadContext(token)
  if ('error' in ctx && !('prospect' in ctx)) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }
  const { admin, prospect, settings } = ctx as Awaited<ReturnType<typeof loadContext>> & { admin: NonNullable<ReturnType<typeof supabaseAdmin>>; prospect: Record<string, unknown> }
  const style = settings?.onboarding_style === 'comprehensive' ? 'comprehensive' : 'simple'
  let pack: { file_name: string; url: string | null }[] = []
  if (style === 'comprehensive' && settings?.inbound_slug) {
    const { data: docs } = await admin
      .from('enquiry_knowledge')
      .select('file_name, file_path')
      .eq('user_id', prospect.user_id)
      .eq('kind', 'document')
    pack = (docs || []).filter((d) => d.file_name).map((d) => ({
      file_name: d.file_name as string,
      url: d.file_path
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/enquiry-pack/${d.file_path}`
        : null,
    }))
  }
  const bank = style === 'comprehensive' ? await payeeBank(admin, String(prospect.user_id)) : null
  const prefill = childFormPrefill(prospect)
  return NextResponse.json({
    style,
    displayName: settings?.display_name,
    ofstedUrn: settings?.ofsted_urn,
    pack,
    bank: bank
      ? { bank_name: bank.bank_name, account_name: bank.account_name, sort_code: bank.sort_code, account_number: bank.account_number }
      : null,
    form: {
      parent_name: prefill.parent_name,
      parent_email: prefill.parent_email,
      parent_phone: prefill.parent_phone,
      child_first: prefill.first_name,
      child_last: prefill.last_name,
      date_of_birth: prefill.date_of_birth,
      start_date: prospect.start_date || '',
      days_needed: prospect.days_needed || '',
      hours_needed: prospect.hours_needed || '',
      funding: prospect.funding || '',
      address: '',
    },
  })
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  const token = String(body.token || '')
  const ctx = await loadContext(token)
  if ('error' in ctx && !('prospect' in ctx)) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status })
  }
  const { admin, prospect, settings } = ctx as Awaited<ReturnType<typeof loadContext>> & { admin: NonNullable<ReturnType<typeof supabaseAdmin>>; prospect: Record<string, unknown> }
  const style = settings?.onboarding_style === 'comprehensive' ? 'comprehensive' : 'simple'

  if (style === 'comprehensive' && body.policiesAccepted !== true) {
    const { count } = await admin
      .from('enquiry_knowledge')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', prospect.user_id)
      .eq('kind', 'document')
    if ((count || 0) > 0) {
      return NextResponse.json({ error: 'Please confirm you have read the policies.' }, { status: 400 })
    }
  }

  const parent_name = String(body.parent_name || '').trim()
  const parent_email = String(body.parent_email || '').trim()
  const child_first = String(body.child_first || '').trim()
  const dob = String(body.date_of_birth || '').trim()
  if (!parent_name || !parent_email || !child_first || !dob) {
    return NextResponse.json({ error: 'Parent name, email, child name and date of birth are required.' }, { status: 400 })
  }

  const { data: existing } = await admin
    .from('children')
    .select('id')
    .eq('enquiry_prospect_id', prospect.id)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ ok: true, childId: existing.id, already: true })
  }

  const merged = childFormPrefill({
    ...prospect,
    parent_name,
    parent_email,
    parent_phone: String(body.parent_phone || prospect.parent_phone || ''),
    child_name: `${child_first} ${String(body.child_last || '').trim()}`.trim(),
    child_dob: dob,
    start_date: String(body.start_date || prospect.start_date || ''),
    days_needed: String(body.days_needed || prospect.days_needed || ''),
    hours_needed: String(body.hours_needed || prospect.hours_needed || ''),
    funding: String(body.funding || prospect.funding || ''),
  })
  const address = String(body.address || '').trim()
  const notes = [merged.notes, address ? `Address: ${address}` : ''].filter(Boolean).join('\n\n')
  const daily = settings?.day_rate != null ? Number(settings.day_rate) : 0

  const { data: child, error } = await admin
    .from('children')
    .insert({
      childminder_id: prospect.user_id,
      first_name: merged.first_name || child_first,
      last_name: merged.last_name || String(body.child_last || '').trim(),
      date_of_birth: dob,
      parent_name,
      parent_email,
      parent_phone: merged.parent_phone,
      daily_rate: daily,
      notes,
      is_active: true,
      hours_per_day: merged.hours_per_day ?? hoursPerDayFromText(String(body.hours_needed || '')),
      schedule_days: merged.schedule_days,
      schedule_note: merged.schedule_note,
      funding_type: merged.funding_type,
      funding_scheme: merged.funding_scheme,
      funded_hours_per_day: merged.funded_hours_per_day,
      funded_days: merged.funded_days,
      enquiry_prospect_id: prospect.id,
    })
    .select('id, first_name')
    .single()
  if (error || !child) {
    log.error('onboard_child_insert_failed', error, { prospect_id: prospect.id })
    return NextResponse.json({ error: 'Could not save the signup.' }, { status: 500 })
  }

  await admin
    .from('enquiry_prospects')
    .update({
      stage: 'started',
      parent_name,
      parent_email,
      parent_phone: merged.parent_phone,
      child_name: `${child.first_name} ${merged.last_name}`.trim(),
      child_dob: dob,
      updated_at: new Date().toISOString(),
    })
    .eq('id', prospect.id)

  const payee = await payeeBank(admin, String(prospect.user_id))
  if (payee.childminder_email) {
    const mail = childOnboardedEmail({
      displayName: settings?.display_name || payee.childminder_name,
      childName: child.first_name,
      parentName: parent_name,
      childId: child.id,
    })
    await sendEmail({ to: payee.childminder_email, subject: mail.subject, html: mail.html })
  }

  return NextResponse.json({ ok: true, childId: child.id })
}
