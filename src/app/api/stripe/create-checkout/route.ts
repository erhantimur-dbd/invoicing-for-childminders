import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/log'

type Plan = 'monthly' | 'annual'
type Tier = 'starter' | 'professional'

/**
 * Resolve the Stripe price ID for a (tier, plan) pair.
 *
 * New env vars (4): STRIPE_STARTER_MONTHLY_PRICE_ID, STRIPE_STARTER_ANNUAL_PRICE_ID,
 *                   STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID, STRIPE_PROFESSIONAL_ANNUAL_PRICE_ID
 *
 * Legacy fallback (2): STRIPE_MONTHLY_PRICE_ID / STRIPE_ANNUAL_PRICE_ID — used only
 * when the new tier-specific vars are not configured. Logs a warning if the
 * legacy fallback is hit, since it means Starter and Professional resolve to
 * the same price.
 */
function resolvePriceId(tier: Tier, plan: Plan): string | null {
  const tierKey = tier.toUpperCase()
  const planKey = plan.toUpperCase()
  const tierSpecific = process.env[`STRIPE_${tierKey}_${planKey}_PRICE_ID`]
  if (tierSpecific) return tierSpecific

  const legacy = plan === 'monthly'
    ? process.env.STRIPE_MONTHLY_PRICE_ID
    : process.env.STRIPE_ANNUAL_PRICE_ID
  if (legacy) {
    log.warn('stripe_price_id_legacy_fallback', {
      tier,
      plan,
      hint: 'Set STRIPE_STARTER_*_PRICE_ID and STRIPE_PROFESSIONAL_*_PRICE_ID — both tiers currently resolve to the same price.',
    })
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

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
      { error: `Price ID for ${tier} ${plan} is not configured`, code: 'stripe_not_configured' },
      { status: 503 }
    )
  }

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(stripeKey)

  // Pin Stripe redirect URLs to the configured app URL — `request.nextUrl.origin`
  // is attacker-controllable via Host header on Vercel.
  const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      // No free trial by default — checkout charges immediately. Trials are
      // granted manually to qualified clients (see /api/admin/grant-trial).
      metadata: { user_id: user.id, plan, tier },
    },
    customer_email: user.email,
    metadata: { user_id: user.id, plan, tier },
    // Pass the Checkout session id so the success page can poll until the
    // webhook lands.
    success_url: `${origin}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/subscribe`,
  })

  return NextResponse.json({ url: session.url })
}
