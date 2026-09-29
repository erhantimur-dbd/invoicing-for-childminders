import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildAuthorizeUrl, isXeroConfigured } from '@/lib/xero/client'
import { randomBytes } from 'crypto'

export async function GET() {
  if (!isXeroConfigured()) {
    return NextResponse.json(
      {
        error:
          'Xero is not configured. Set XERO_CLIENT_ID, XERO_CLIENT_SECRET, and NEXT_PUBLIC_APP_URL.',
      },
      { status: 503 }
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const state = randomBytes(24).toString('hex')
  const response = NextResponse.redirect(buildAuthorizeUrl(state))
  response.cookies.set('xero_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  response.cookies.set('xero_oauth_uid', user.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  return response
}
