import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/log'
import {
  resolveEnquiriesPriceId,
  resolveInvoicingPriceId,
  type BillingPlan,
  type CheckoutProduct,
  type InvoicingTier,
} from '@/lib/stripe/prices'

export async function POST(request: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json(
      { error: 'Stripe is not configured', code: 'stripe_not_configured' },
      { status: 503 },
    )
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let plan: BillingPlan
  let product: CheckoutProduct = 'invoicing'
  let tier: InvoicingTier | null = null
  try {
    const body = await request.json()
    if (body.plan !== 'monthly' && body.plan !== 'annual') {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "monthly" or "annual".' },
        { status: 400 },
      )
    }
    plan = body.plan
    if (body.product === 'enquiries') {
      product = 'enquiries'
    } else {
      if (body.tier !== 'starter' && body.tier !== 'professional') {
        return NextResponse.json(
          { error: 'Invalid tier. Must be "starter" or "professional".' },
          { status: 400 },
        )
      }
      tier = body.tier
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const priceId = product === 'enquiries'
    ? resolveEnquiriesPriceId(plan)
    : resolveInvoicingPriceId(tier!, plan)

  if (!priceId) {
    return NextResponse.json(
      { error: `Price ID for ${product} ${plan} is not configured`, code: 'stripe_not_configured' },
      { status: 503 },
    )
  }

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(stripeKey)

  const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id, enquiries_status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (product === 'enquiries' && existing?.enquiries_status === 'active') {
    return NextResponse.json(
      { error: 'Enquiries is already on your account.' },
      { status: 409 },
    )
  }

  const metadata: Record<string, string> = {
    user_id: user.id,
    plan,
    product,
  }
  if (tier) metadata.tier = tier

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata,
    },
    ...(existing?.stripe_customer_id
      ? { customer: existing.stripe_customer_id }
      : { customer_email: user.email }),
    metadata,
    success_url: `${origin}/subscribe/success?session_id={CHECKOUT_SESSION_ID}&product=${product}`,
    cancel_url: `${origin}/subscribe${product === 'enquiries' ? '?product=enquiries' : ''}`,
  })

  log.info('stripe_checkout_created', { user_id: user.id, product, plan, tier })

  return NextResponse.json({ url: session.url })
}
