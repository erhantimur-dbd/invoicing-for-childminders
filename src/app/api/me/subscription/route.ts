/**
 * Returns the authed user's subscription state. Used by the post-Stripe
 * success page to poll until the webhook lands and the row is updated.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data } = await supabase
    .from('subscriptions')
    .select('status, plan, trial_end, current_period_end, stripe_subscription_id, enquiries_status, enquiries_plan, enquiries_stripe_subscription_id, enquiries_current_period_end')
    .eq('user_id', user.id)
    .maybeSingle()

  return NextResponse.json({
    subscription: data ?? null,
  })
}
