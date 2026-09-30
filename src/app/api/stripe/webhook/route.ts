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

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })
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

  // Idempotency: Stripe retries with the same event.id.
  const { error: idemErr } = await supabase
    .from('stripe_events')
    .insert({ event_id: event.id, event_type: event.type })

  if (idemErr) {
    // 23505 = unique_violation → already processed
    if ((idemErr as { code?: string }).code === '23505') {
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 })
    }
    // 42P01 = undefined_table → migration missing; fail-open with a warning
    if ((idemErr as { code?: string }).code !== '42P01') {
      console.error('stripe_events insert failed:', idemErr)
    } else {
      console.warn('stripe_events table missing — webhook idempotency disabled')
    }
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        // Attach Stripe IDs only. Status / trial_end / period end come from
        // customer.subscription.created|updated (source of truth).
        const session = event.data.object as import('stripe').Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        const plan = session.metadata?.plan
        const tier = session.metadata?.tier
        const planLabel = tier && plan ? `${tier}_${plan}` : (plan ?? null)

        if (!userId) {
          console.warn('checkout.session.completed: no user_id in metadata')
          break
        }

        const patch: Record<string, unknown> = {
          user_id: userId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          plan: planLabel,
          updated_at: new Date().toISOString(),
        }
        if (tier === 'starter' || tier === 'professional' || tier === 'enterprise') {
          patch.tier = tier
        }

        await supabase.from('subscriptions').upsert(patch, { onConflict: 'user_id' })
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as unknown as {
          customer: string
          status: string
          trial_end: number | null
          current_period_end: number | null
          metadata?: { user_id?: string; plan?: string; tier?: string }
        }
        const stripeCustomerId = subscription.customer

        const trialEnd =
          typeof subscription.trial_end === 'number'
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null
        const currentPeriodEnd =
          typeof subscription.current_period_end === 'number'
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null

        const update: Record<string, unknown> = {
          status: subscription.status,
          trial_end: trialEnd,
          current_period_end: currentPeriodEnd,
          updated_at: new Date().toISOString(),
        }

        const metaTier = subscription.metadata?.tier
        if (metaTier === 'starter' || metaTier === 'professional' || metaTier === 'enterprise') {
          update.tier = metaTier
        }
        const metaPlan = subscription.metadata?.plan
        if (metaTier && metaPlan) {
          update.plan = `${metaTier}_${metaPlan}`
        } else if (metaPlan) {
          update.plan = metaPlan
        }

        const { data: updated, error: updateError } = await supabase
          .from('subscriptions')
          .update(update)
          .eq('stripe_customer_id', stripeCustomerId)
          .select('user_id')

        // If checkout.session.completed hasn't landed yet, upsert via metadata.
        if ((!updated || updated.length === 0) && subscription.metadata?.user_id) {
          await supabase.from('subscriptions').upsert(
            {
              user_id: subscription.metadata.user_id,
              stripe_customer_id: stripeCustomerId,
              ...update,
            },
            { onConflict: 'user_id' }
          )
        } else if (updateError) {
          console.error('subscription update failed:', updateError)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as { customer: string }
        const stripeCustomerId = subscription.customer

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
        break
    }
  } catch (err) {
    console.error(`Error processing webhook event ${event.type}:`, err)
    // Still return 200 to prevent Stripe from retrying for DB errors after
    // we've claimed the event id. Re-processing would be blocked by idempotency.
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
