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

export async function GET(request: NextRequest) {
  // Verify cron secret — Vercel sends this automatically; also checked manually
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

  const { dates: weekDates, start: weekStart, end: weekEnd } = getPreviousWeekDates()
  const bankHolidays = await fetchUKBankHolidays()

  // Get all childminders with onboarding completed
  const { data: profiles, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email')
    .eq('onboarding_completed', true)

  if (profileError || !profiles?.length) {
    return NextResponse.json({ message: 'No eligible childminders', week: weekStart })
  }

  const results = []

  for (const profile of profiles) {
    // Get children with schedules for this childminder
    const { data: childRows } = await supabaseAdmin
      .from('children')
      .select('id, first_name, last_name, parent_name, daily_rate, half_day_rate, schedule_days, schedule_note')
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
      schedule_days: Array.isArray(c.schedule_days) ? c.schedule_days : [],
      schedule_note: c.schedule_note || null,
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

    results.push({ childminder: profile.full_name || profile.email, created: created.length, skipped: skipped.length })
  }

  return NextResponse.json({ success: true, week: weekStart, results })
}

async function sendCronNotificationEmail(
  profile: { id: string; full_name: string; email: string },
  created: Array<{ child_name: string; total: number; agent_notes: string | null }>,
  skipped: Array<{ child_name: string; reason: string }>,
  weekStart: string,
  weekEnd: string
) {
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://invoicing-for-childminders.vercel.app'

  const weekLabel = `${new Date(weekStart + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${new Date(weekEnd + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
  const totalAmount = created.reduce((s, i) => s + i.total, 0)
  const firstName = profile.full_name?.split(' ')[0] || 'there'

  const createdRows = created.map(c =>
    `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${c.child_name}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;color:#059669">£${c.total.toFixed(2)}</td>${c.agent_notes ? `<td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#6b7280;font-size:12px">${c.agent_notes}</td>` : '<td></td>'}</tr>`
  ).join('')

  const skippedRows = skipped.length > 0
    ? `<p style="margin:24px 0 8px;font-weight:600;color:#374151">Skipped (${skipped.length})</p>
       <ul style="margin:0;padding-left:20px;color:#6b7280">
         ${skipped.map(s => `<li>${s.child_name} — ${s.reason}</li>`).join('')}
       </ul>`
    : ''

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'invoices@invoicing-for-childminders.vercel.app',
    to: profile.email,
    subject: `✨ ${created.length} draft invoice${created.length !== 1 ? 's' : ''} generated — w/c ${weekLabel}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 16px;color:#111827">
        <h2 style="margin:0 0 4px;font-size:22px">Weekly invoices generated</h2>
        <p style="margin:0 0 24px;color:#6b7280">Hi ${firstName}, here's a summary for w/c ${weekLabel}</p>

        <table style="width:100%;border-collapse:collapse;background:#f9fafb;border-radius:8px;overflow:hidden">
          <thead>
            <tr style="background:#ecfdf5">
              <th style="padding:10px 12px;text-align:left;font-size:13px;color:#065f46">Child</th>
              <th style="padding:10px 12px;text-align:right;font-size:13px;color:#065f46">Amount</th>
              <th style="padding:10px 12px;text-align:left;font-size:13px;color:#065f46">Notes</th>
            </tr>
          </thead>
          <tbody>${createdRows}</tbody>
          <tfoot>
            <tr style="background:#ecfdf5">
              <td style="padding:10px 12px;font-weight:700">Total</td>
              <td style="padding:10px 12px;text-align:right;font-weight:700;color:#059669">£${totalAmount.toFixed(2)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>

        ${skippedRows}

        <div style="margin-top:32px;text-align:center">
          <a href="${appUrl}/invoices" style="background:#059669;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px">
            Review & send drafts →
          </a>
        </div>

        <p style="margin-top:24px;font-size:12px;color:#9ca3af;text-align:center">
          These invoices are saved as drafts. Review them before sending to parents.
        </p>
      </div>
    `,
  })
}
