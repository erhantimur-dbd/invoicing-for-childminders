/**
 * Returns the authed user's subscription state.
 * Used by /subscribe and /subscribe/success to poll until the Stripe webhook lands.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .select(
      'status, plan, tier, trial_end, current_period_end, stripe_subscription_id, stripe_customer_id'
    )
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('me/subscription lookup failed:', error)
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 })
  }

  return NextResponse.json({ subscription: data ?? null })
}
