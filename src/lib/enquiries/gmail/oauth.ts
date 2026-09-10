import { createHash, randomBytes } from 'crypto'
import { GMAIL_SCOPES, googleAuthUrl } from './config'

export type GoogleTokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in?: number
  scope?: string
  token_type?: string
}

export function createPkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  return { verifier, challenge }
}

export function createOAuthState(userId: string): string {
  return `${userId}.${randomBytes(16).toString('hex')}`
}

export function parseOAuthState(state: string | null): { userId: string } | null {
  if (!state) return null
  const dot = state.indexOf('.')
  if (dot < 1) return null
  return { userId: state.slice(0, dot) }
}

export function authorizeUrl(state: string, codeChallenge: string): string {
  return googleAuthUrl({ state, codeChallenge })
}

async function tokenRequest(body: URLSearchParams): Promise<GoogleTokenResponse> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth is not configured. Set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET.')
  }
  body.set('client_id', clientId)
  body.set('client_secret', clientSecret)

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = (await res.json()) as GoogleTokenResponse & { error?: string; error_description?: string }
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || 'Google did not return an access token.')
  }
  return json
}

export async function exchangeCode(code: string, codeVerifier: string, redirectUri: string): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    code,
    code_verifier: codeVerifier,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })
  return tokenRequest(body)
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })
  return tokenRequest(body)
}

export async function revokeGoogleToken(token: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  }).catch(() => undefined)
}

export function scopesFromToken(token: GoogleTokenResponse): string {
  return token.scope || GMAIL_SCOPES.join(' ')
}

export function expiryFromToken(token: GoogleTokenResponse): string {
  const seconds = token.expires_in && token.expires_in > 0 ? token.expires_in : 3500
  return new Date(Date.now() + seconds * 1000).toISOString()
}
