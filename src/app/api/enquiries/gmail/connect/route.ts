import { NextResponse } from 'next/server'
import { requireEnquiriesUser } from '@/lib/enquiries/require'
import {
  GMAIL_SCOPES,
  OAUTH_STATE_COOKIE,
  OAUTH_STATE_MAX_AGE,
  gmailOAuthConfigured,
  gmailRedirectUri,
} from '@/lib/enquiries/gmail/config'
import { authorizeUrl, createOAuthState, createPkce } from '@/lib/enquiries/gmail/oauth'

export async function GET() {
  const auth = await requireEnquiriesUser()
  if ('error' in auth) return auth.error

  if (!gmailOAuthConfigured()) {
    return NextResponse.json(
      { error: 'Gmail is not configured yet. Add GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.' },
      { status: 503 },
    )
  }

  const state = createOAuthState(auth.user.id)
  const pkce = createPkce()
  const url = authorizeUrl(state, pkce.challenge)

  const res = NextResponse.redirect(url)
  res.cookies.set(
    OAUTH_STATE_COOKIE,
    JSON.stringify({
      state,
      verifier: pkce.verifier,
      userId: auth.user.id,
      redirectUri: gmailRedirectUri(),
      scopes: GMAIL_SCOPES,
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: OAUTH_STATE_MAX_AGE,
    },
  )
  return res
}
