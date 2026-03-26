import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json(
      { error: 'Stripe is not configured', code: 'stripe_not_configured' },
      { status: 503 }
    )
  }

  // Authenticate user
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  // Parse body
  let plan: 'monthly' | 'annual'
  try {
    const body = await request.json()
    if (body.plan !== 'monthly' && body.plan !== 'annual') {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "monthly" or "annual".' },
        { status: 400 }
      )
    }
    plan = body.plan
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Resolve price ID
  const priceId =
    plan === 'monthly'
      ? process.env.STRIPE_MONTHLY_PRICE_ID
      : process.env.STRIPE_ANNUAL_PRICE_ID

  if (!priceId) {
    return NextResponse.json(
      { error: `Price ID for plan "${plan}" is not configured` },
      { status: 503 }
    )
  }

  // Lazy-import Stripe
  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(stripeKey)

  const origin = request.nextUrl.origin

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    subscription_data: {
      trial_period_days: 7,
      metadata: {
        user_id: user.id,
        plan,
      },
    },
    customer_email: user.email,
    metadata: {
      user_id: user.id,
      plan,
    },
    success_url: `${origin}/subscribe/success`,
    cancel_url: `${origin}/subscribe`,
  })

  return NextResponse.json({ url: session.url })
}
