import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { log } from '@/lib/log'
import { createConnectOnboardingLink, stripeClient } from '@/lib/stripe/connect'

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

  if (!profile?.stripe_connect_account_id || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.redirect(new URL('/profile?stripe=refresh', origin))
  }

  try {
    const stripe = stripeClient()
    const link = await createConnectOnboardingLink(stripe, profile.stripe_connect_account_id, origin)
    return NextResponse.redirect(link.url)
  } catch (err) {
    log.warn('stripe_connect_refresh_failed', { user_id: user.id })
    return NextResponse.redirect(new URL('/profile?stripe=refresh', origin))
  }
}
