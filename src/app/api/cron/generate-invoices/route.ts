import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  runInvoiceAgent,
  buildFallbackDecisions,
  fetchUKBankHolidays,
  getPreviousWeekDates,
  type AgentChild,
} from '@/lib/agent/invoice-agent'
import { persistInvoices } from '@/lib/agent/create-invoices'
import { markOverdueInvoices } from '@/lib/cron/overdue'
import { sendDueReminders } from '@/lib/cron/reminders'
import { sendEmail } from '@/lib/email/resend'
import { log } from '@/lib/log'
import { accountAllowlistGate } from '@/lib/preview-guard'
import { weeklyDraftDigestEmail } from '@/lib/email/transactional'

export async function GET(request: NextRequest) {
  // Verify cron secret — Vercel sends this as Authorization: Bearer <CRON_SECRET>.
  // Hard-fail if the secret isn't configured: an unauthenticated cron endpoint
  // is a public job-runner anyone can trigger.
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const gate = accountAllowlistGate()
  if (!gate.allow) {
    log.warn('cron_skipped_non_production', { path: '/api/cron/generate-invoices', skipped: 'allowlist empty' })
    return NextResponse.json({ skipped: 'allowlist empty' })
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { persistSession: false } }
  )

  // These two run every tick, regardless of whose invoice-generation day it
  // is — overdue marking and reminder chasing are hourly jobs in their own
  // right and must not be skipped by the generation early-returns below.
  const overdue = await markOverdueInvoices(supabaseAdmin)
  const reminders = await sendDueReminders(supabaseAdmin)

  const { dates: weekDates, start: weekStart, end: weekEnd } = getPreviousWeekDates()
  const bankHolidays = await fetchUKBankHolidays()

  // Get all childminders with onboarding completed
  let profileQuery = supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, invoice_frequency, invoice_day, invoice_hour, invoice_last_generated_at')
    .eq('onboarding_completed', true)
  if (gate.ids) profileQuery = profileQuery.in('id', gate.ids)

  const { data: profiles, error: profileError } = await profileQuery

  if (profileError || !profiles?.length) {
    return NextResponse.json({ message: 'No eligible childminders', week: weekStart, overdue, reminders })
  }

  // Determine today's day name and current hour (UTC)
  const now = new Date()
  const todayDayName = now.toLocaleDateString('en-GB', { weekday: 'long' }).toLowerCase()
  const currentHour = now.getUTCHours()

  const results = []

  for (const profile of profiles) {
    // Check if today is this user's invoice generation day and hour
    const userDay = profile.invoice_day || 'sunday'
    const userFreq = profile.invoice_frequency || 'weekly'
    const userHour = profile.invoice_hour ?? 7

    if (todayDayName !== userDay) continue // Not this user's day
    if (currentHour !== userHour) continue // Not this user's hour

    // For fortnightly: skip if generated less than 12 days ago
    if (userFreq === 'fortnightly' && profile.invoice_last_generated_at) {
      const daysSinceLast = Math.floor((Date.now() - new Date(profile.invoice_last_generated_at).getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceLast < 12) continue
    }

    // For monthly: skip if generated less than 26 days ago
    if (userFreq === 'monthly' && profile.invoice_last_generated_at) {
      const daysSinceLast = Math.floor((Date.now() - new Date(profile.invoice_last_generated_at).getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceLast < 26) continue
    }
    // Get children with schedules for this childminder
    const { data: childRows } = await supabaseAdmin
      .from('children')
      .select('id, first_name, last_name, parent_name, daily_rate, half_day_rate, hourly_rate, hours_per_day, schedule_days, schedule_note, funding_type, funding_scheme, funded_hours_per_day, funded_days')
      .eq('childminder_id', profile.id)
      .eq('is_active', true)
      .is('archived_at', null)
      .not('schedule_days', 'eq', '[]')
      .not('schedule_days', 'is', null)

    if (!childRows?.length) continue

    const children: AgentChild[] = childRows.map(c => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
      parent_name: c.parent_name,
      daily_rate: Number(c.daily_rate),
      half_day_rate: c.half_day_rate ? Number(c.half_day_rate) : null,
      hourly_rate: c.hourly_rate ? Number(c.hourly_rate) : null,
      hours_per_day: c.hours_per_day ? Number(c.hours_per_day) : null,
      schedule_days: Array.isArray(c.schedule_days) ? c.schedule_days : [],
      schedule_note: c.schedule_note || null,
      funding_type: c.funding_type || 'none',
      funding_scheme: c.funding_scheme || null,
      funded_hours_per_day: c.funded_hours_per_day ? Number(c.funded_hours_per_day) : null,
      funded_days: Array.isArray(c.funded_days) ? c.funded_days : null,
    }))

    const childNameMap = Object.fromEntries(
      children.map(c => [c.id, `${c.first_name} ${c.last_name}`])
    )

    // Run agent
    let decisions
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        decisions = await runInvoiceAgent(children, weekDates, bankHolidays)
      } catch {
        decisions = buildFallbackDecisions(children, weekDates, bankHolidays)
      }
    } else {
      decisions = buildFallbackDecisions(children, weekDates, bankHolidays)
    }

    // Persist invoices
    const { created, skipped } = await persistInvoices(
      decisions,
      profile.id,
      childNameMap,
      'cron',
      weekStart,
      weekEnd,
      serviceRoleKey
    )

    // Send notification email if invoices were created
    if (created.length > 0 && process.env.RESEND_API_KEY) {
      await sendCronNotificationEmail(profile, created, skipped, weekStart, weekEnd)
    }

    // Update last generated timestamp
    if (created.length > 0) {
      await supabaseAdmin
        .from('profiles')
        .update({ invoice_last_generated_at: new Date().toISOString() })
        .eq('id', profile.id)
    }

    results.push({ childminder: profile.full_name || profile.email, created: created.length, skipped: skipped.length })
  }

  return NextResponse.json({ success: true, week: weekStart, results, overdue, reminders })
}

async function sendCronNotificationEmail(
  profile: { id: string; full_name: string; email: string },
  created: Array<{ child_name: string; total: number; agent_notes: string | null }>,
  skipped: Array<{ child_name: string; reason: string }>,
  weekStart: string,
  weekEnd: string
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.godottie.cloud'

  const weekLabel = `${new Date(weekStart + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(weekEnd + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
  const firstName = profile.full_name?.split(' ')[0] || 'there'

  const mail = weeklyDraftDigestEmail({
    firstName,
    weekLabel,
    created,
    skipped,
    invoicesUrl: `${appUrl}/invoices`,
  })

  await sendEmail({
    from: process.env.RESEND_FROM_EMAIL || 'Go Dottie <invoices@godottie.cloud>',
    to: profile.email,
    subject: mail.subject,
    html: mail.html,
  })
}
