import { googleOAuthClient, GOOGLE_TOKEN_URL, GOOGLE_USERINFO_URL } from './google-oauth.mjs'

export async function googleAccessToken(refreshToken: string, doFetch: typeof fetch = fetch) {
  const { id, secret } = googleOAuthClient()
  if (!id || !secret) throw new Error('google_oauth_not_configured')
  const res = await doFetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: id,
      client_secret: secret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) throw new Error('google_token_failed')
  const json = (await res.json()) as { access_token?: string }
  if (!json.access_token) throw new Error('google_token_failed')
  return json.access_token
}

export async function exchangeGoogleCode(input: {
  code: string
  redirectUri: string
  doFetch?: typeof fetch
}) {
  const { id, secret } = googleOAuthClient()
  if (!id || !secret) throw new Error('google_oauth_not_configured')
  const doFetch = input.doFetch ?? fetch
  const res = await doFetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: id,
      client_secret: secret,
      code: input.code,
      grant_type: 'authorization_code',
      redirect_uri: input.redirectUri,
    }),
  })
  if (!res.ok) throw new Error('google_code_failed')
  const json = (await res.json()) as { refresh_token?: string; access_token?: string }
  if (!json.access_token) throw new Error('google_code_failed')
  let email: string | null = null
  if (json.access_token) {
    const me = await doFetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${json.access_token}` },
    })
    if (me.ok) {
      const profile = (await me.json()) as { email?: string }
      email = profile.email ?? null
    }
  }
  return { refreshToken: json.refresh_token ?? null, accessToken: json.access_token, email }
}
