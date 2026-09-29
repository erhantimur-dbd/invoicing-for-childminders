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

  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('status, plan, trial_end, current_period_end, stripe_subscription_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Error fetching subscription:', error)
    return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 })
  }

  return NextResponse.json({
    subscription: subscription
      ? {
          status: subscription.status ?? null,
          plan: subscription.plan ?? null,
          trial_end: subscription.trial_end ?? null,
          current_period_end: subscription.current_period_end ?? null,
          stripe_subscription_id: subscription.stripe_subscription_id ?? null,
        }
      : null,
  })
}
