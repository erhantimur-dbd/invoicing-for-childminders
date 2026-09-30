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

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (subError) {
    console.error('Error fetching subscription:', subError)
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 })
  }

  const stripeCustomerId = subscription?.stripe_customer_id
  if (!stripeCustomerId) {
    return NextResponse.json(
      { error: 'No billing account found. Please subscribe first.' },
      { status: 400 }
    )
  }

  const Stripe = (await import('stripe')).default
  const stripe = new Stripe(stripeKey)

  const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${origin.replace(/\/$/, '')}/profile`,
  })

  return NextResponse.json({ url: portalSession.url })
}
