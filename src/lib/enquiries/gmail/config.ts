export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
] as const

export const OAUTH_STATE_COOKIE = 'dottie_gmail_oauth'
export const OAUTH_STATE_MAX_AGE = 10 * 60

export function gmailOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET)
}

export function gmailRedirectUri(): string {
  if (process.env.GOOGLE_OAUTH_REDIRECT_URI) return process.env.GOOGLE_OAUTH_REDIRECT_URI
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.godottie.cloud').replace(/\/$/, '')
  return `${appUrl}/api/enquiries/gmail/callback`
}

export function googleAuthUrl(params: {
  state: string
  codeChallenge: string
}): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', process.env.GOOGLE_OAUTH_CLIENT_ID || '')
  url.searchParams.set('redirect_uri', gmailRedirectUri())
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', GMAIL_SCOPES.join(' '))
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('include_granted_scopes', 'false')
  url.searchParams.set('state', params.state)
  url.searchParams.set('code_challenge', params.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}
