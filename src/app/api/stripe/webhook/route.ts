import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { log } from '@/lib/log'

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
    log.error('stripe_webhook_secret_missing', new Error('STRIPE_WEBHOOK_SECRET not set'))
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
    log.error('stripe_webhook_signature_invalid', err)
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Idempotency: Stripe retries failed deliveries with the same event.id.
  // We claim it via insert-with-unique-constraint; a duplicate is a no-op.
  const { error: idemErr } = await supabase
    .from('stripe_events')
    .insert({ event_id: event.id, event_type: event.type })
  if (idemErr) {
    // 23505 = unique_violation → already processed → ack and exit.
    if ((idemErr as { code?: string }).code === '23505') {
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 })
    }
    // 42P01 = table missing → migration not applied. Log and continue (fail-open).
    if ((idemErr as { code?: string }).code !== '42P01') {
      log.error('stripe_events_insert_failed', idemErr, { event_id: event.id, event_type: event.type })
    } else {
      log.warn('stripe_events_table_missing', { hint: 'apply 20260506 migration' })
    }
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        // Attach Stripe customer + subscription IDs to the user's row.
        // Status comes from customer.subscription.created/updated — do not
        // hardcode 'active' here (invoicing trials still exist for admin grants).
        const session = event.data.object as import('stripe').Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        const plan = session.metadata?.plan
        const tier = session.metadata?.tier
        const product = session.metadata?.product ?? 'invoicing'
        const planTier = tier && plan ? `${tier}_${plan}` : (plan ?? null)

        if (!userId) {
          log.warn('stripe_checkout_missing_user_id', { event_id: event.id, session_id: session.id })
          break
        }

        const now = new Date().toISOString()
        const customerId = session.customer as string
        const stripeSubId = session.subscription as string

        const { data: existingRow } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('user_id', userId)
          .maybeSingle()

        if (product === 'enquiries') {
          const patch = {
            stripe_customer_id: customerId,
            enquiries_stripe_subscription_id: stripeSubId,
            enquiries_plan: plan ?? 'monthly',
            updated_at: now,
          }
          if (existingRow) {
            await supabase.from('subscriptions').update(patch).eq('user_id', userId)
          } else {
            await supabase.from('subscriptions').insert({ user_id: userId, ...patch })
          }
        } else {
          await supabase
            .from('subscriptions')
            .upsert(
              {
                user_id: userId,
                stripe_customer_id: customerId,
                stripe_subscription_id: stripeSubId,
                plan: planTier,
                updated_at: now,
              },
              { onConflict: 'user_id' },
            )
        }
        break
      }

      case 'customer.subscription.trial_will_end': {
        // Stripe fires this 3 days before the trial converts to a paid sub.
        // We use it for the retention reminder email.
        const subscription = event.data.object as unknown as {
          customer: string
          trial_end: number | null
          metadata?: Record<string, string>
        }
        if (subscription.metadata?.product === 'enquiries') break
        const trialEndIso = typeof subscription.trial_end === 'number'
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null
        if (!trialEndIso) break

        // Find the user from the customer id.
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('user_id')
          .eq('stripe_customer_id', subscription.customer)
          .maybeSingle()
        if (!sub?.user_id) break

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', sub.user_id)
          .single()
        if (!profile?.email) break

        const trialEndDate = new Date(trialEndIso)
        const daysLeft = Math.max(1, Math.ceil((trialEndDate.getTime() - Date.now()) / 86_400_000))
        const trialEndLabel = trialEndDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

        try {
          const { trialExpiringEmail } = await import('@/lib/email/templates')
          const { sendEmail } = await import('@/lib/email/resend')
          const { subject, html } = trialExpiringEmail({
            name: profile.full_name || profile.email,
            daysLeft,
            trialEnd: trialEndLabel,
          })
          await sendEmail({ to: profile.email, subject, html })
          log.info('trial_ending_email_sent', { user_id: sub.user_id, days_left: daysLeft })
        } catch (err) {
          log.error('trial_ending_email_failed', err, { user_id: sub.user_id })
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        // Source of truth for status. A customer can have invoicing AND
        // enquiries as two Stripe subscriptions — never copy enquiries status
        // onto the invoicing columns.
        const subscription = event.data.object as unknown as {
          id: string
          customer: string
          status: string
          trial_end: number | null
          current_period_end: number | null
          metadata?: Record<string, string>
        }
        const stripeCustomerId = subscription.customer
        const currentPeriodEnd = typeof subscription.current_period_end === 'number'
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null
        const now = new Date().toISOString()

        const { data: row } = await supabase
          .from('subscriptions')
          .select('enquiries_stripe_subscription_id, stripe_subscription_id')
          .eq('stripe_customer_id', stripeCustomerId)
          .maybeSingle()

        const isEnquiries =
          subscription.metadata?.product === 'enquiries' ||
          row?.enquiries_stripe_subscription_id === subscription.id

        if (isEnquiries) {
          await supabase
            .from('subscriptions')
            .update({
              enquiries_status: subscription.status,
              enquiries_current_period_end: currentPeriodEnd,
              enquiries_stripe_subscription_id: subscription.id,
              updated_at: now,
            })
            .eq('stripe_customer_id', stripeCustomerId)
        } else {
          const trialEnd = typeof subscription.trial_end === 'number'
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null
          await supabase
            .from('subscriptions')
            .update({
              status: subscription.status,
              trial_end: trialEnd,
              current_period_end: currentPeriodEnd,
              updated_at: now,
            })
            .eq('stripe_customer_id', stripeCustomerId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as {
          id: string
          customer: string
          metadata?: Record<string, string>
        }
        const stripeCustomerId = subscription.customer
        const { data: row } = await supabase
          .from('subscriptions')
          .select('enquiries_stripe_subscription_id')
          .eq('stripe_customer_id', stripeCustomerId)
          .maybeSingle()

        const isEnquiries =
          subscription.metadata?.product === 'enquiries' ||
          row?.enquiries_stripe_subscription_id === subscription.id

        if (isEnquiries) {
          await supabase
            .from('subscriptions')
            .update({
              enquiries_status: 'canceled',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_customer_id', stripeCustomerId)
        } else {
          await supabase
            .from('subscriptions')
            .update({
              status: 'canceled',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_customer_id', stripeCustomerId)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as import('stripe').Stripe.Invoice & {
          subscription?: string | { id?: string } | null
          parent?: { subscription_details?: { subscription?: string } }
        }
        const stripeCustomerId = invoice.customer as string
        const subRef = invoice.subscription ?? invoice.parent?.subscription_details?.subscription
        const stripeSubId = typeof subRef === 'string' ? subRef : subRef?.id

        const { data: row } = await supabase
          .from('subscriptions')
          .select('enquiries_stripe_subscription_id')
          .eq('stripe_customer_id', stripeCustomerId)
          .maybeSingle()

        if (stripeSubId && row?.enquiries_stripe_subscription_id === stripeSubId) {
          await supabase
            .from('subscriptions')
            .update({
              enquiries_status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_customer_id', stripeCustomerId)
        } else if (stripeSubId) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_customer_id', stripeCustomerId)
        }
        break
      }

      default:
        // Unhandled event type — not an error
        break
    }
  } catch (err) {
    log.error('stripe_webhook_processing_failed', err, { event_id: event.id, event_type: event.type })
    // Still return 200 to prevent Stripe from retrying for DB errors
  }

  return NextResponse.json({ received: true }, { status: 200 })
}
