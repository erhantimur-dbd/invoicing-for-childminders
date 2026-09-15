import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/log'
import {
  accountCanCharge,
  createChildminderConnectAccount,
  createConnectOnboardingLink,
  stripeClient,
} from '@/lib/stripe/connect'

export async function POST() {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_connect_account_id, email, full_name')
    .eq('id', user.id)
    .maybeSingle()

  const origin = process.env.NEXT_PUBLIC_APP_URL || 'https://www.godottie.cloud'
  const stripe = stripeClient(stripeKey)

  try {
    let accountId = profile?.stripe_connect_account_id || null
    if (!accountId) {
      const account = await createChildminderConnectAccount(stripe, {
        email: user.email || profile?.email,
        name: profile?.full_name,
        userId: user.id,
      })
      accountId = account.id
      const { error } = await supabase
        .from('profiles')
        .update({
          stripe_connect_account_id: accountId,
          stripe_connect_charges_enabled: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
      if (error) {
        log.error('stripe_connect_profile_save_failed', error, { user_id: user.id })
        return NextResponse.json({ error: 'Could not save Stripe account.' }, { status: 500 })
      }
    }

    const ready = await accountCanCharge(stripe, accountId)
    if (ready) {
      await supabase
        .from('profiles')
        .update({
          stripe_connect_charges_enabled: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
      return NextResponse.json({ url: 'https://dashboard.stripe.com', ready: true })
    }

    const link = await createConnectOnboardingLink(stripe, accountId, origin)
    return NextResponse.json({ url: link.url, ready: false })
  } catch (err) {
    log.error('stripe_connect_start_failed', err, { user_id: user.id })
    return NextResponse.json(
      { error: 'Could not start Stripe Connect. Enable Connect in your Stripe Dashboard, then try again.' },
      { status: 500 },
    )
  }
}
