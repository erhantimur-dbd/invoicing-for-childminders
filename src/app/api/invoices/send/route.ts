import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { format } from 'date-fns'

function formatGBP(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

export async function POST(request: NextRequest) {
  const { invoiceId } = await request.json()
  if (!invoiceId) return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const [{ data: invoice }, { data: profile }] = await Promise.all([
    supabase
      .from('invoices')
      .select('*, children(*), invoice_line_items(*)')
      .eq('id', invoiceId)
      .eq('childminder_id', user.id)
      .single(),
    supabase.from('profiles').select('*').eq('id', user.id).single(),
  ])

  if (!invoice || !profile) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const child = (invoice as any).children
  const items = (invoice as any).invoice_line_items || []

  if (!child?.parent_email) {
    return NextResponse.json({ error: 'No parent email on file' }, { status: 400 })
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey || resendKey.startsWith('re_YOUR')) {
    return NextResponse.json({ error: 'Resend API key not configured' }, { status: 500 })
  }

  const resend = new Resend(resendKey)
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'invoices@resend.dev'

  const itemsHtml = items.map((item: any) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;">${item.description}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;">${formatGBP(Number(item.unit_price))}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:600;">${formatGBP(Number(item.amount))}</td>
    </tr>
  `).join('')

  const bankHtml = child.bank_account_number ? `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-top:20px;">
      <p style="color:#166534;font-weight:600;margin:0 0 8px;">Bank transfer details</p>
      ${child.bank_name ? `<p style="margin:2px 0;font-size:14px;"><strong>Bank:</strong> ${child.bank_name}</p>` : ''}
      ${child.bank_account_name ? `<p style="margin:2px 0;font-size:14px;"><strong>Account name:</strong> ${child.bank_account_name}</p>` : ''}
      ${child.bank_sort_code ? `<p style="margin:2px 0;font-size:14px;"><strong>Sort code:</strong> ${child.bank_sort_code}</p>` : ''}
      ${child.bank_account_number ? `<p style="margin:2px 0;font-size:14px;"><strong>Account number:</strong> ${child.bank_account_number}</p>` : ''}
      <p style="margin:8px 0 0;font-size:14px;color:#6b7280;"><strong>Reference:</strong> ${invoice.invoice_number}</p>
    </div>
  ` : ''

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Invoice ${invoice.invoice_number}</title></head>
    <body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#111;">
      <div style="background:#059669;color:white;padding:24px;border-radius:12px;margin-bottom:24px;">
        <h1 style="margin:0;font-size:24px;">Invoice ${invoice.invoice_number}</h1>
        <p style="margin:4px 0 0;opacity:0.9;">${profile.full_name}</p>
      </div>
      <p>Dear ${child.parent_name},</p>
      <p>Please find your invoice for ${child.first_name}'s childcare below.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <thead>
          <tr style="background:#1f2937;color:white;">
            <th style="padding:10px 12px;text-align:left;border-radius:8px 0 0 0;">Description</th>
            <th style="padding:10px 12px;text-align:center;">Days</th>
            <th style="padding:10px 12px;text-align:right;">Rate</th>
            <th style="padding:10px 12px;text-align:right;border-radius:0 8px 0 0;">Amount</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div style="text-align:right;margin:16px 0;">
        <div style="display:inline-block;background:#059669;color:white;padding:12px 24px;border-radius:8px;">
          <strong style="font-size:18px;">Total: ${formatGBP(Number(invoice.total))}</strong>
        </div>
      </div>
      ${invoice.due_date ? `<p style="color:#b45309;font-weight:600;">Payment due by: ${format(new Date(invoice.due_date), 'd MMMM yyyy')}</p>` : ''}
      ${bankHtml}
      ${invoice.stripe_payment_link ? `
        <div style="margin-top:20px;text-align:center;">
          <a href="${invoice.stripe_payment_link}" style="background:#059669;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">
            Pay online now
          </a>
        </div>
      ` : ''}
      ${invoice.notes ? `<p style="margin-top:20px;padding:12px;background:#fffbeb;border-radius:8px;font-size:14px;">${invoice.notes}</p>` : ''}
      <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;">
      <p style="font-size:12px;color:#9ca3af;text-align:center;">
        ${profile.full_name} · ${profile.email} · ${profile.phone || ''}
      </p>
    </body>
    </html>
  `

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: child.parent_email,
    subject: `Invoice ${invoice.invoice_number} from ${profile.full_name} — ${formatGBP(Number(invoice.total))}`,
    html,
  })

  if (error) {
    console.error('Resend error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }

  // Mark as sent if draft
  if (invoice.status === 'draft') {
    await supabase
      .from('invoices')
      .update({ status: 'sent', updated_at: new Date().toISOString() })
      .eq('id', invoiceId)
  }

  return NextResponse.json({ success: true })
}
