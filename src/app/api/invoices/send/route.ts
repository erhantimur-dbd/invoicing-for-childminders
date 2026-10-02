import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { sendEmail } from '@/lib/email/resend'
import { isProductionEnv } from '@/lib/preview-guard'
import { decryptField } from '@/lib/crypto'
import { invoicePayHref } from '@/lib/invoices/pay-link.mjs'
import { createInvoicePaySig } from '@/lib/invoices/pay-sig.mjs'
import { invoiceSendEmail } from '@/lib/email/transactional'

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

  // Bank details on the children row may be encrypted (post-backfill).
  // Decrypt here, server-side, before injecting into the email.
  let payee = {
    bank_name: '',
    account_name: '',
    sort_code: '',
    account_number: '',
  }
  if (child?.bank_account_number) {
    payee = {
      bank_name: child.bank_name || '',
      account_name: child.bank_account_name || '',
      sort_code: decryptField(child.bank_sort_code) ?? '',
      account_number: decryptField(child.bank_account_number) ?? '',
    }
  } else if (profile.primary_bank_account_id) {
    const { data: bank } = await supabase
      .from('bank_accounts')
      .select('bank_name, account_name, sort_code, account_number')
      .eq('id', profile.primary_bank_account_id)
      .maybeSingle()
    if (bank) {
      payee = {
        bank_name: bank.bank_name || '',
        account_name: bank.account_name || '',
        sort_code: decryptField(bank.sort_code) ?? '',
        account_number: decryptField(bank.account_number) ?? '',
      }
    }
  }
  if (!payee.account_number && profile.default_bank_account_number) {
    payee = {
      bank_name: profile.default_bank_name || '',
      account_name: profile.default_bank_account_name || '',
      sort_code: decryptField(profile.default_bank_sort_code) ?? '',
      account_number: decryptField(profile.default_bank_account_number) ?? '',
    }
  }

  if (!child?.parent_email) {
    return NextResponse.json({ error: 'No parent email on file' }, { status: 400 })
  }

  const wouldDeliver = isProductionEnv() || Boolean(process.env.RESEND_TO_OVERRIDE?.trim())
  if (wouldDeliver) {
    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey || resendKey.startsWith('re_YOUR')) {
      return NextResponse.json({ error: 'Resend API key not configured' }, { status: 500 })
    }
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Go Dottie <hello@godottie.cloud>'

  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://www.godottie.cloud'
  const viewUrl = `${origin.replace(/\/$/, '')}/invoice/${invoice.id}`
  const connectReady = Boolean(profile.stripe_connect_charges_enabled && profile.stripe_connect_account_id)
  let sig: string | undefined
  if (connectReady) {
    try { sig = createInvoicePaySig(invoice.id) } catch { sig = undefined }
  }
  const payUrl = invoicePayHref({
    acceptOnlinePayments: Boolean(profile.accept_online_payments),
    payUrl: invoice.stripe_payment_link,
    status: invoice.status,
    connectReady: Boolean(connectReady && sig),
    invoiceId: invoice.id,
    origin,
    sig,
  })
  const mail = invoiceSendEmail({
    invoiceNumber: invoice.invoice_number,
    total: Number(invoice.total),
    dueLabel: invoice.due_date ? format(new Date(invoice.due_date), 'd MMMM yyyy') : null,
    parentName: child.parent_name || '',
    childFirstName: child.first_name || '',
    childminderName: profile.full_name || '',
    childminderEmail: profile.email || '',
    childminderPhone: profile.phone || '',
    items: items.map((item: { description?: string; quantity?: string | number; unit_price?: number; amount?: number }) => ({
      description: item.description || '',
      quantity: item.quantity ?? '',
      unitPrice: Number(item.unit_price),
      amount: Number(item.amount),
    })),
    bank: payee.account_number ? {
      bankName: payee.bank_name,
      accountName: payee.account_name,
      sortCode: payee.sort_code,
      accountNumber: payee.account_number,
    } : null,
    viewUrl,
    payUrl,
    notes: invoice.notes || null,
  })

  const sent = await sendEmail({
    from: fromEmail,
    to: child.parent_email,
    subject: mail.subject,
    html: mail.html,
  })

  if (!sent.success) {
    console.error('Resend error:', sent.error)
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
