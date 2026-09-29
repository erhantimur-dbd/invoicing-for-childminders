import { NextRequest, NextResponse } from 'next/server'
import {
  exchangeCodeForTokens,
  fetchTenantConnections,
  isXeroConfigured,
  upsertXeroConnection,
} from '@/lib/xero/client'

function appUrl(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || ''
  return `${base}${path}`
}

export async function GET(request: NextRequest) {
  if (!isXeroConfigured()) {
    return NextResponse.redirect(appUrl('/profile?xero=error&reason=not_configured'))
  }

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      appUrl(`/profile?xero=error&reason=${encodeURIComponent(error)}`)
    )
  }

  const expectedState = request.cookies.get('xero_oauth_state')?.value
  const userId = request.cookies.get('xero_oauth_uid')?.value

  if (!code || !state || !expectedState || state !== expectedState || !userId) {
    return NextResponse.redirect(appUrl('/profile?xero=error&reason=invalid_state'))
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    const tenants = await fetchTenantConnections(tokens.access_token)
    const org = tenants.find(t => t.tenantType === 'ORGANISATION') || tenants[0]
    if (!org) {
      return NextResponse.redirect(appUrl('/profile?xero=error&reason=no_tenant'))
    }

    await upsertXeroConnection({
      userId,
      tenantId: org.tenantId,
      tenantName: org.tenantName,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      scopes: tokens.scope,
    })

    const response = NextResponse.redirect(appUrl('/profile?xero=connected'))
    response.cookies.set('xero_oauth_state', '', { path: '/', maxAge: 0 })
    response.cookies.set('xero_oauth_uid', '', { path: '/', maxAge: 0 })
    return response
  } catch (err) {
    console.error('Xero OAuth callback failed', err)
    return NextResponse.redirect(appUrl('/profile?xero=error&reason=token_exchange'))
  }
}
