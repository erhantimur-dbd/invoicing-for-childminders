import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { enquiriesActive } from '@/lib/enquiries/access'
import { googleAuthUrl, googleOAuthClient, googleRedirectUri } from '@/lib/integrations/google-oauth.mjs'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', request.url))

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('enquiries_status')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!enquiriesActive(sub)) {
    return NextResponse.redirect(new URL('/enquiries', request.url))
  }

  const { id } = googleOAuthClient()
  if (!id) {
    return NextResponse.json({ error: 'Google OAuth is not configured.' }, { status: 500 })
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
  const nonce = randomBytes(16).toString('hex')
  const state = `${user.id}.${nonce}`
  const url = googleAuthUrl({
    clientId: id,
    redirectUri: googleRedirectUri(origin.replace(/\/$/, '')),
    state,
  })
  const res = NextResponse.redirect(url)
  res.cookies.set('dottie_g_oauth', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 600,
  })
  return res
}
