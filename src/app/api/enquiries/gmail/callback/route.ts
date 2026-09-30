import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { requireEnquiriesUser } from '@/lib/enquiries/require'
import { OAUTH_STATE_COOKIE, gmailRedirectUri } from '@/lib/enquiries/gmail/config'
import { exchangeCode, parseOAuthState } from '@/lib/enquiries/gmail/oauth'
import { loadGmailAccount, upsertGmailAccount } from '@/lib/enquiries/gmail/tokens'
import { log } from '@/lib/log'

function appOrigin(request: Request): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || new URL(request.url).origin
}

function bounce(request: Request, query: string) {
  return NextResponse.redirect(`${appOrigin(request)}/enquiries?${query}`)
}

export async function GET(request: Request) {
  const auth = await requireEnquiriesUser()
  if ('error' in auth) {
    return bounce(request, 'gmail=error&reason=signed_out')
  }

  const url = new URL(request.url)
  const errorParam = url.searchParams.get('error')
  if (errorParam) {
    return bounce(request, `gmail=error&reason=${encodeURIComponent(errorParam)}`)
  }

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const parsed = parseOAuthState(state)
  if (!code || !parsed || parsed.userId !== auth.user.id) {
    return bounce(request, 'gmail=error&reason=bad_state')
  }

  const cookieStore = await cookies()
  const raw = cookieStore.get(OAUTH_STATE_COOKIE)?.value
  let verifier = ''
  try {
    const stored = raw ? (JSON.parse(raw) as { state?: string; verifier?: string; userId?: string }) : null
    if (!stored?.verifier || stored.state !== state || stored.userId !== auth.user.id) {
      return bounce(request, 'gmail=error&reason=bad_state')
    }
    verifier = stored.verifier
  } catch {
    return bounce(request, 'gmail=error&reason=bad_state')
  }

  try {
    const previous = await loadGmailAccount(auth.supabase, auth.user.id)
    const token = await exchangeCode(code, verifier, gmailRedirectUri())
    await upsertGmailAccount(auth.supabase, auth.user.id, token, previous?.refresh_token_enc)
  } catch (err) {
    log.error('enquiry_gmail_oauth_failed', err, { user_id: auth.user.id })
    const clear = bounce(request, 'gmail=error&reason=token')
    clear.cookies.set(OAUTH_STATE_COOKIE, '', { path: '/', maxAge: 0 })
    return clear
  }

  const res = bounce(request, 'gmail=connected')
  res.cookies.set(OAUTH_STATE_COOKIE, '', { path: '/', maxAge: 0 })
  return res
}
