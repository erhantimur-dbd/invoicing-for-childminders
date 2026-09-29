import { createServiceClient } from '@/lib/supabase/service'

export const XERO_AUTHORIZE_URL = 'https://login.xero.com/identity/connect/authorize'
export const XERO_TOKEN_URL = 'https://identity.xero.com/connect/token'
export const XERO_CONNECTIONS_URL = 'https://api.xero.com/connections'
export const XERO_API_BASE = 'https://api.xero.com/api.xro/2.0'

/** Granular scopes for apps created after March 2026. */
export const XERO_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
  'accounting.contacts',
  'accounting.invoices',
].join(' ')

export type XeroConnection = {
  user_id: string
  tenant_id: string
  tenant_name: string | null
  access_token: string
  refresh_token: string
  expires_at: string
  scopes: string | null
  connected_at: string
  updated_at: string
}

export function isXeroConfigured(): boolean {
  return Boolean(
    process.env.XERO_CLIENT_ID &&
      process.env.XERO_CLIENT_SECRET &&
      process.env.NEXT_PUBLIC_APP_URL
  )
}

export function getXeroRedirectUri(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  if (!base) throw new Error('NEXT_PUBLIC_APP_URL is not configured')
  return `${base}/api/xero/callback`
}

export function buildAuthorizeUrl(state: string): string {
  const clientId = process.env.XERO_CLIENT_ID
  if (!clientId) throw new Error('XERO_CLIENT_ID is not configured')

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: getXeroRedirectUri(),
    scope: XERO_SCOPES,
    state,
  })
  return `${XERO_AUTHORIZE_URL}?${params.toString()}`
}

type TokenResponse = {
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
  scope?: string
}

async function exchangeToken(body: URLSearchParams): Promise<TokenResponse> {
  const clientId = process.env.XERO_CLIENT_ID
  const clientSecret = process.env.XERO_CLIENT_SECRET
  if (!clientId || !clientSecret) throw new Error('Xero OAuth is not configured')

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch(XERO_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Xero token exchange failed (${res.status}): ${text}`)
  }
  return res.json()
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  return exchangeToken(
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: getXeroRedirectUri(),
    })
  )
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  return exchangeToken(
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    })
  )
}

export type XeroTenantConnection = {
  id: string
  tenantId: string
  tenantType: string
  tenantName: string
  createdDateUtc: string
}

export async function fetchTenantConnections(accessToken: string): Promise<XeroTenantConnection[]> {
  const res = await fetch(XERO_CONNECTIONS_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Xero connections failed (${res.status}): ${text}`)
  }
  return res.json()
}

export async function upsertXeroConnection(opts: {
  userId: string
  tenantId: string
  tenantName: string | null
  accessToken: string
  refreshToken: string
  expiresIn: number
  scopes?: string
}): Promise<void> {
  const service = createServiceClient()
  const expiresAt = new Date(Date.now() + opts.expiresIn * 1000).toISOString()
  const { error } = await service.from('xero_connections').upsert(
    {
      user_id: opts.userId,
      tenant_id: opts.tenantId,
      tenant_name: opts.tenantName,
      access_token: opts.accessToken,
      refresh_token: opts.refreshToken,
      expires_at: expiresAt,
      scopes: opts.scopes || XERO_SCOPES,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )
  if (error) throw new Error(`Failed to store Xero connection: ${error.message}`)
}

export async function getXeroConnection(userId: string): Promise<XeroConnection | null> {
  const service = createServiceClient()
  const { data, error } = await service
    .from('xero_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw new Error(`Failed to load Xero connection: ${error.message}`)
  return data as XeroConnection | null
}

export async function deleteXeroConnection(userId: string): Promise<void> {
  const service = createServiceClient()
  const conn = await getXeroConnection(userId)
  if (conn) {
    // Best-effort revoke: Xero DELETE uses the connection id from /connections
    try {
      const tenants = await fetchTenantConnections(conn.access_token)
      const match = tenants.find(t => t.tenantId === conn.tenant_id)
      if (match?.id) {
        await fetch(`${XERO_CONNECTIONS_URL}/${match.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${conn.access_token}` },
        })
      }
    } catch {
      // ignore revoke errors — local disconnect still proceeds
    }
  }
  const { error } = await service.from('xero_connections').delete().eq('user_id', userId)
  if (error) throw new Error(`Failed to disconnect Xero: ${error.message}`)
}

/** Returns a connection with a non-expired access token (refreshes if needed). */
export async function getValidAccessToken(userId: string): Promise<{
  accessToken: string
  tenantId: string
  tenantName: string | null
}> {
  const conn = await getXeroConnection(userId)
  if (!conn) throw new Error('Xero is not connected')

  const expiresAt = new Date(conn.expires_at).getTime()
  const needsRefresh = expiresAt - Date.now() < 60_000

  if (!needsRefresh) {
    return {
      accessToken: conn.access_token,
      tenantId: conn.tenant_id,
      tenantName: conn.tenant_name,
    }
  }

  const tokens = await refreshAccessToken(conn.refresh_token)
  await upsertXeroConnection({
    userId,
    tenantId: conn.tenant_id,
    tenantName: conn.tenant_name,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresIn: tokens.expires_in,
    scopes: tokens.scope || conn.scopes || undefined,
  })

  return {
    accessToken: tokens.access_token,
    tenantId: conn.tenant_id,
    tenantName: conn.tenant_name,
  }
}

export async function xeroApi<T = unknown>(
  accessToken: string,
  tenantId: string,
  path: string,
  init?: RequestInit & { idempotencyKey?: string }
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    'xero-tenant-id': tenantId,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  }
  if (init?.idempotencyKey) {
    headers['Idempotency-Key'] = init.idempotencyKey.slice(0, 128)
  }

  const res = await fetch(`${XERO_API_BASE}${path}`, {
    ...init,
    headers,
  })

  const text = await res.text()
  let json: unknown = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }

  if (!res.ok) {
    throw new Error(
      `Xero API ${path} failed (${res.status}): ${typeof json === 'object' ? JSON.stringify(json) : text}`
    )
  }
  return json as T
}

/** Map display tax names (CSV) to Xero API TaxType codes. */
export function toXeroApiTaxType(displayOrCode: string): string {
  const v = displayOrCode.trim().toLowerCase()
  if (!v || v === 'no vat' || v === 'none' || v === 'notax' || v === 'no tax') return 'NONE'
  // Pass through known codes / custom org rates as-is
  return displayOrCode.trim()
}

/** Xero invoice Date fields accept YYYY-MM-DD. */
export function toXeroApiDate(isoOrDate: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(isoOrDate)) return isoOrDate.slice(0, 10)
  const d = new Date(isoOrDate)
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10)
  return d.toISOString().slice(0, 10)
}
