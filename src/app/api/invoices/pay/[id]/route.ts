import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { verifyInvoiceToken, createInvoiceToken } from '@/lib/invoiceToken'
import { verifyInvoicePaySig } from '@/lib/invoices/pay-sig.mjs'
import { log } from '@/lib/log'
import { accountCanCharge, stripeClient } from '@/lib/stripe/connect'

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key, { auth: { persistSession: false } })
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const url = new URL(request.url)
  const sig = url.searchParams.get('sig')
  const access = url.searchParams.get('access')
  const auth = request.headers.get('authorization') || ''
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const token = bearer || access || ''
  const allowed = (sig && verifyInvoicePaySig(id, sig)) || (token && verifyInvoiceToken(token, id))
  if (!allowed) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const stripeKey = process.env.STRIPE_SECRET_KEY
  const supabase = admin()
  if (!stripeKey || !supabase) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, invoice_number, total, status, childminder_id, children(parent_email, first_name)')
    .eq('id', id)
    .maybeSingle()
  if (!invoice || invoice.status === 'paid') {
    return NextResponse.redirect(new URL(`/invoice/${id}`, process.env.NEXT_PUBLIC_APP_URL || url.origin))
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('accept_online_payments, stripe_connect_account_id, stripe_connect_charges_enabled')
    .eq('id', invoice.childminder_id)
    .maybeSingle()
  if (!profile?.accept_online_payments || !profile.stripe_connect_account_id) {
    return NextResponse.json({ error: 'Online payments are not available for this invoice.' }, { status: 400 })
  }

  const stripe = stripeClient(stripeKey)
  let ready = Boolean(profile.stripe_connect_charges_enabled)
  try {
    ready = await accountCanCharge(stripe, profile.stripe_connect_account_id)
  } catch {
    // keep cached flag if Stripe is unreachable
  }
  if (!ready) {
    await supabase
      .from('profiles')
      .update({
        stripe_connect_charges_enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoice.childminder_id)
    return NextResponse.json({ error: 'Online payments are not available for this invoice.' }, { status: 400 })
  }

  const amount = Math.round(Number(invoice.total) * 100)
  if (!Number.isFinite(amount) || amount < 1) {
    return NextResponse.json({ error: 'Invalid amount.' }, { status: 400 })
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || url.origin
  const child = invoice.children as { parent_email?: string; first_name?: string } | null
  let viewToken = access || ''
  if (!viewToken) {
    try {
      viewToken = createInvoiceToken(invoice.id)
    } catch {
      viewToken = ''
    }
  }
  const accessQs = viewToken ? `&access=${encodeURIComponent(viewToken)}` : ''
  try {
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: 'gbp',
              unit_amount: amount,
              product_data: {
                name: `Invoice ${invoice.invoice_number}`,
                description: child?.first_name ? `Childcare for ${child.first_name}` : 'Childcare',
              },
            },
          },
        ],
        customer_email: child?.parent_email || undefined,
        client_reference_id: invoice.id,
        metadata: {
          invoice_id: invoice.id,
          dottie_kind: 'parent_invoice',
        },
        success_url: `${origin.replace(/\/$/, '')}/invoice/${invoice.id}?paid=1${accessQs}`,
        cancel_url: `${origin.replace(/\/$/, '')}/invoice/${invoice.id}${viewToken ? `?access=${encodeURIComponent(viewToken)}` : ''}`,
      },
      { stripeAccount: profile.stripe_connect_account_id },
    )
    if (!session.url) return NextResponse.json({ error: 'Could not start payment.' }, { status: 500 })
    return NextResponse.redirect(session.url)
  } catch (err) {
    log.error('parent_invoice_checkout_failed', err, { invoice_id: id })
    return NextResponse.json({ error: 'Could not start payment.' }, { status: 500 })
  }
}
