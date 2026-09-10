import type { SupabaseClient } from '@supabase/supabase-js'
import { format } from 'date-fns'
import { sendEmail } from '@/lib/email/resend'
import { paymentReminderEmail } from '@/lib/email/templates'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.godottie.cloud'

// Safety cap per cron run — keeps a single tick well inside Vercel's function
// window and Resend's rate limits.
const MAX_SENDS_PER_RUN = 100

type DueReminder = {
  id: string
  childminder_id: string
  frequency_days: number
  invoices: {
    id: string
    invoice_number: string
    status: string
    due_date: string | null
    total: number
    stripe_payment_link: string | null
    children: {
      first_name: string
      parent_name: string
      parent_email: string | null
    } | null
  } | null
}

/**
 * Send payment-chase emails for every active reminder whose next_send_at has
 * passed. The invoice detail UI arms reminders with
 * next_send_at = due_date + frequency_days, and this re-arms them another
 * frequency_days out after each send.
 *
 * next_send_at is advanced BEFORE the email goes out so an overlapping cron
 * run can't double-send; a failed send is picked up again next cycle at most
 * one interval late.
 */
export async function sendDueReminders(
  supabaseAdmin: SupabaseClient
): Promise<{ sent: number; deactivated: number; failed: number }> {
  const nowIso = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('reminders')
    .select(
      'id, childminder_id, frequency_days, invoices!inner(id, invoice_number, status, due_date, total, stripe_payment_link, children(first_name, parent_name, parent_email))'
    )
    .eq('is_active', true)
    .lte('next_send_at', nowIso)
    .limit(MAX_SENDS_PER_RUN)

  if (error) {
    console.error('[cron/reminders] failed to fetch due reminders:', error.message)
    return { sent: 0, deactivated: 0, failed: 0 }
  }

  const due = (data ?? []) as unknown as DueReminder[]
  if (!due.length) return { sent: 0, deactivated: 0, failed: 0 }

  // Batch-resolve childminder display names for the "on behalf of" line.
  const childminderIds = [...new Set(due.map(r => r.childminder_id))]
  const { data: profileRows } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name')
    .in('id', childminderIds)
  const nameById = new Map(
    (profileRows ?? []).map(p => [p.id as string, (p.full_name as string) || ''])
  )

  let sent = 0
  let deactivated = 0
  let failed = 0

  for (const reminder of due) {
    const invoice = reminder.invoices
    const child = invoice?.children

    // Paid/draft invoices or missing parent email → stop chasing for good.
    const chaseable = invoice && (invoice.status === 'sent' || invoice.status === 'overdue')
    if (!chaseable || !child?.parent_email) {
      await supabaseAdmin
        .from('reminders')
        .update({ is_active: false })
        .eq('id', reminder.id)
      deactivated++
      continue
    }

    // Re-arm before sending so overlapping runs can't double-send.
    const frequencyDays = reminder.frequency_days > 0 ? reminder.frequency_days : 7
    const nextSendAt = new Date()
    nextSendAt.setDate(nextSendAt.getDate() + frequencyDays)
    const { error: rearmError } = await supabaseAdmin
      .from('reminders')
      .update({ last_sent_at: nowIso, next_send_at: nextSendAt.toISOString() })
      .eq('id', reminder.id)
      .eq('is_active', true)
    if (rearmError) {
      failed++
      continue
    }

    const { subject, html } = paymentReminderEmail({
      parentName: child.parent_name || 'there',
      childFirstName: child.first_name,
      invoiceNumber: invoice.invoice_number,
      total: Number(invoice.total),
      dueDate: invoice.due_date
        ? format(new Date(invoice.due_date), 'd MMMM yyyy')
        : null,
      publicUrl: `${APP_URL}/invoice/${invoice.id}`,
      payUrl: invoice.stripe_payment_link || null,
      overdue: invoice.status === 'overdue',
      childminderName: nameById.get(reminder.childminder_id) || 'your childminder',
    })

    const result = await sendEmail({ to: child.parent_email, subject, html })
    if (result.success) sent++
    else failed++
  }

  return { sent, deactivated, failed }
}
