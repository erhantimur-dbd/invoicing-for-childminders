import { NextRequest, NextResponse } from 'next/server'
import { format } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/resend'
import { paymentReceivedEmail } from '@/lib/email/templates'

export async function POST(request: NextRequest) {
  let body: { invoiceId?: string; paymentReference?: string; paymentMethod?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { invoiceId, paymentReference, paymentMethod } = body
  if (!invoiceId) return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const [{ data: invoice }, { data: profile }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, invoice_number, status, total, children(first_name, parent_name, parent_email)')
      .eq('id', invoiceId)
      .eq('childminder_id', user.id)
      .single(),
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
  ])

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (invoice.status === 'paid') {
    return NextResponse.json({ success: true, alreadyPaid: true })
  }

  const now = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: now,
      payment_method: paymentMethod === 'stripe' ? 'stripe' : 'bank_transfer',
      payment_reference: paymentReference || '',
      updated_at: now,
    })
    .eq('id', invoiceId)
    .eq('childminder_id', user.id)

  if (updateError) {
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 })
  }

  // Stop any active payment-chase reminder immediately (the cron would catch
  // it eventually, but there is no reason to leave it armed).
  await supabase
    .from('reminders')
    .update({ is_active: false })
    .eq('invoice_id', invoiceId)
    .eq('childminder_id', user.id)

  // Confirmation email to the parent — best-effort; marking paid succeeds
  // even if the email doesn't go out.
  const child = (invoice as unknown as {
    children: { first_name: string; parent_name: string; parent_email: string | null } | null
  }).children
  let emailSent = false
  if (child?.parent_email) {
    const { subject, html } = paymentReceivedEmail({
      parentName: child.parent_name || 'there',
      childFirstName: child.first_name,
      invoiceNumber: invoice.invoice_number,
      total: Number(invoice.total),
      paidDate: format(new Date(), 'd MMMM yyyy'),
      childminderName: profile?.full_name || 'your childminder',
    })
    const result = await sendEmail({ to: child.parent_email, subject, html })
    emailSent = result.success
  }

  return NextResponse.json({ success: true, paidAt: now, emailSent })
}
