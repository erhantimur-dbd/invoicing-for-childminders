import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeKey || stripeKey.startsWith('sk_test_YOUR')) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  // Lazy import to avoid build-time initialisation
  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(stripeKey)

  let event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
    const session = event.data.object as any
    const invoiceId = session.metadata?.invoice_id

    if (invoiceId) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_method: 'stripe',
          payment_reference: session.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId)
    }
  }

  return NextResponse.json({ received: true })
}
