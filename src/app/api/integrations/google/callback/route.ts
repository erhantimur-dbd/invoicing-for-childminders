import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { encryptField } from '@/lib/crypto'
import { createClient } from '@/lib/supabase/server'
import { GOOGLE_SCOPES, googleOAuthClient, googleRedirectUri } from '@/lib/integrations/google-oauth.mjs'
import { exchangeGoogleCode } from '@/lib/integrations/google-token'
import { log } from '@/lib/log'

export async function GET(request: Request) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
  const fail = (reason: string) => {
    const url = new URL('/enquiries/setup', origin)
    url.searchParams.set('gmail', reason)
    return NextResponse.redirect(url)
  }

  const { id } = googleOAuthClient()
  if (!id) return fail('config')

  const incoming = new URL(request.url)
  const code = incoming.searchParams.get('code')
  const state = incoming.searchParams.get('state')
  if (!code || !state) return fail('denied')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL('/login', origin))

  const jar = await cookies()
  const expected = jar.get('dottie_g_oauth')?.value
  if (!expected || expected !== state || !state.startsWith(`${user.id}.`)) {
    return fail('state')
  }

  try {
    const tokens = await exchangeGoogleCode({
      code,
      redirectUri: googleRedirectUri(origin.replace(/\/$/, '')),
    })
    if (!tokens.refreshToken) return fail('no_refresh')
    const enc = encryptField(tokens.refreshToken)
    if (!enc) return fail('encrypt')

    const { error } = await supabase.from('enquiry_connections').upsert(
      {
        user_id: user.id,
        provider: 'google',
        kind: 'both',
        account_email: tokens.email,
        refresh_token_enc: enc,
        scopes: GOOGLE_SCOPES,
        status: 'active',
        last_error: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,provider' },
    )
    if (error) {
      log.error('google_connect_upsert_failed', error, { user_id: user.id })
      return fail('save')
    }
  } catch (err) {
    log.error('google_connect_failed', err, { user_id: user.id })
    return fail('token')
  }

  const res = NextResponse.redirect(new URL('/enquiries/setup?gmail=connected', origin))
  res.cookies.set('dottie_g_oauth', '', { path: '/', maxAge: 0 })
  return res
}
