import type { ParentLetter } from './pack-email'
import type { SendEmailResult } from '@/lib/email/resend'
import { googleOAuthClient } from '@/lib/integrations/google-oauth.mjs'

export const GMAIL_TOKEN_URL = 'https://oauth2.googleapis.com/token'
export const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send'

type FetchLike = typeof fetch

/** Explicit arg, then GMAIL_REFRESH_TOKEN. Empty/null falls through. */
export function resolveGmailRefreshToken(explicit?: string | null): string | null {
  const fromArg = typeof explicit === 'string' ? explicit.trim() : ''
  if (fromArg) return fromArg
  const fromEnv = process.env.GMAIL_REFRESH_TOKEN?.trim()
  if (fromEnv) return fromEnv
  return null
}

export function gmailTokenFromSession(session?: { provider_refresh_token?: string | null } | null): string | null {
  return resolveGmailRefreshToken(session?.provider_refresh_token ?? null)
}

export function gmailRfc822(letter: ParentLetter): string {
  const to = letter.to
  const subject = letter.subject.replace(/\r?\n/g, ' ')
  const body = letter.text || letter.html.replace(/<[^>]+>/g, ' ')
  return [
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    body,
  ].join('\r\n')
}

export async function sendViaGmail(
  letter: ParentLetter,
  refreshToken?: string | null,
  deps?: { fetch?: FetchLike },
): Promise<SendEmailResult & { channel: 'gmail' }> {
  const { id: clientId, secret: clientSecret } = googleOAuthClient()
  if (!clientId || !clientSecret) {
    return { success: false, error: 'gmail_not_connected', channel: 'gmail' }
  }
  const token = resolveGmailRefreshToken(refreshToken)
  if (!token) {
    return { success: false, error: 'gmail_not_connected', channel: 'gmail' }
  }

  const doFetch = deps?.fetch ?? fetch

  const tokenRes = await doFetch(GMAIL_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: token,
      grant_type: 'refresh_token',
    }),
  })
  if (!tokenRes.ok) {
    return { success: false, error: 'gmail_token_failed', channel: 'gmail' }
  }
  const tokenJson = (await tokenRes.json()) as { access_token?: string }
  if (!tokenJson.access_token) {
    return { success: false, error: 'gmail_token_failed', channel: 'gmail' }
  }

  const raw = Buffer.from(gmailRfc822(letter), 'utf8').toString('base64url')
  const sendRes = await doFetch(GMAIL_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  })
  if (!sendRes.ok) {
    return { success: false, error: 'gmail_send_failed', channel: 'gmail' }
  }
  const sent = (await sendRes.json()) as { id?: string }
  return { success: true, id: sent.id, channel: 'gmail' }
}
