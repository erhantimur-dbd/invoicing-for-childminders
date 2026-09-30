import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Plan = 'monthly' | 'annual'
type Tier = 'starter' | 'professional'

/**
 * Resolve the Stripe price ID for a (tier, plan) pair.
 *
 * Preferred env vars:
 *   STRIPE_STARTER_MONTHLY_PRICE_ID, STRIPE_STARTER_ANNUAL_PRICE_ID,
 *   STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID, STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID
 *
 * Legacy fallback: STRIPE_MONTHLY_PRICE_ID / STRIPE_ANNUAL_PRICE_ID
 * (both tiers resolve to the same price — log a warning).
 */
function resolvePriceId(tier: Tier, plan: Plan): string | null {
  const tierSpecific = process.env[`STRIPE_${tier.toUpperCase()}_${plan.toUpperCase()}_PRICE_ID`]
  if (tierSpecific) return tierSpecific

  const legacy =
    plan === 'monthly'
      ? process.env.STRIPE_MONTHLY_PRICE_ID
      : process.env.STRIPE_ANNUAL_PRICE_ID

  if (legacy) {
    console.warn(
      `stripe_price_id_legacy_fallback: ${tier}/${plan} — set STRIPE_STARTER_* and STRIPE_PROFESSIONAL_* price IDs`
    )
    return legacy
  }
  return null
}

export async function POST(request: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json(
      { error: 'Stripe is not configured', code: 'stripe_not_configured' },
      { status: 503 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  let plan: Plan
  let tier: Tier
  try {
    const body = await request.json()
    if (body.plan !== 'monthly' && body.plan !== 'annual') {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "monthly" or "annual".' },
        { status: 400 }
      )
    }
    if (body.tier !== 'starter' && body.tier !== 'professional') {
      return NextResponse.json(
        { error: 'Invalid tier. Must be "starter" or "professional".' },
        { status: 400 }
      )
    }
    plan = body.plan
    tier = body.tier
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const priceId = resolvePriceId(tier, plan)
  if (!priceId) {
    return NextResponse.json(
      {
        error: `Price ID for ${tier} ${plan} is not configured`,
        code: 'stripe_not_configured',
      },
      { status: 503 }
    )
  }

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(stripeKey)

  // Pin redirects to the configured app URL — request.nextUrl.origin is
  // attacker-controllable via Host header on some edge setups.
  const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

  // Reuse an existing Stripe customer if we already have one.
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const sessionParams: import('stripe').Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      // No free trial by default — checkout charges immediately. Discretionary
      // trials are granted via /api/admin/grant-trial after a demo.
      metadata: { user_id: user.id, plan, tier },
    },
    metadata: { user_id: user.id, plan, tier },
    success_url: `${origin.replace(/\/$/, '')}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin.replace(/\/$/, '')}/subscribe`,
  }

  if (existingSub?.stripe_customer_id) {
    sessionParams.customer = existingSub.stripe_customer_id
  } else {
    sessionParams.customer_email = user.email
  }

  const session = await stripe.checkout.sessions.create(sessionParams)

  return NextResponse.json({ url: session.url })
}
