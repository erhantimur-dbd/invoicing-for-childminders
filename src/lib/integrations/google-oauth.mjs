export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
export const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
export const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

// Gmail connect lives at /api/enquiries/gmail and requests only
// gmail.readonly + gmail.send. This client is the leftover token helper
// for an optional Calendar visit flag. It must not ask for mailbox or calendar scopes.
export const GOOGLE_SCOPES = [
  'openid',
  'email',
]

export function googleOAuthClient() {
  const id = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_OAUTH_CLIENT_ID || ''
  const secret = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_OAUTH_CLIENT_SECRET || ''
  return { id, secret }
}

export function googleRedirectUri(origin) {
  return `${origin}/api/enquiries/gmail/callback`
}

export function googleAuthUrl({ clientId, redirectUri, state }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  })
  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}
