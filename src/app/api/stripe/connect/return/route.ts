import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/log'
import { accountCanCharge, stripeClient } from '@/lib/stripe/connect'

export async function GET(request: Request) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', origin))

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_connect_account_id')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.stripe_connect_account_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = stripeClient()
      const ready = await accountCanCharge(stripe, profile.stripe_connect_account_id)
      await supabase
        .from('profiles')
        .update({
          stripe_connect_charges_enabled: ready,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
      const dest = ready ? '/profile?stripe=connected' : '/profile?stripe=pending'
      return NextResponse.redirect(new URL(dest, origin))
    } catch (err) {
      log.warn('stripe_connect_return_retrieve_failed', { user_id: user.id })
    }
  }

  return NextResponse.redirect(new URL('/profile?stripe=connected', origin))
}
