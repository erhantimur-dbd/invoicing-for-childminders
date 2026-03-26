import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
    }
  )
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: import('stripe').Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Webhook signature verification failed:', message)
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 })
  }

  const supabase = createServiceClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as import('stripe').Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        const plan = session.metadata?.plan

        if (!userId) {
          console.warn('checkout.session.completed: no user_id in metadata')
          break
        }

        await supabase
          .from('subscriptions')
          .upsert(
            {
              user_id: userId,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              status: 'active',
              plan: plan ?? null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          )
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any
        const stripeCustomerId = subscription.customer as string

        const currentPeriodEnd =
          typeof subscription.current_period_end === 'number'
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null

        await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_end: currentPeriodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', stripeCustomerId)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any
        const stripeCustomerId = subscription.customer as string

        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', stripeCustomerId)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as import('stripe').Stripe.Invoice
        const stripeCustomerId = invoice.customer as string

        await supabase
          .from('subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', stripeCustomerId)
        break
      }

      default:
        // Unhandled event type — not an error
        break
    }
  } catch (err) {
    console.error(`Error processing webhook event ${event.type}:`, err)
    // Still return 200 to prevent Stripe from retrying for DB errors
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
