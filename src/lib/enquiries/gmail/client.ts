import type { GmailPayload } from './parse'

export type GmailLabel = { id: string; name: string; type?: string }

export type GmailMessage = {
  id: string
  threadId: string
  labelIds?: string[]
  snippet?: string
  payload?: GmailPayload
  internalDate?: string
}

export type GmailProfile = {
  emailAddress?: string
  historyId?: string
}

class GmailApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function gmailJson<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new GmailApiError(res.status, text.slice(0, 400) || `Gmail API ${res.status}`)
  }
  if (res.status === 204) return {} as T
  return (await res.json()) as T
}

export async function getProfile(accessToken: string): Promise<GmailProfile> {
  return gmailJson<GmailProfile>(accessToken, 'users/me/profile')
}

export async function listLabels(accessToken: string): Promise<GmailLabel[]> {
  const data = await gmailJson<{ labels?: GmailLabel[] }>(accessToken, 'users/me/labels')
  return data.labels ?? []
}

export async function listMessageRefs(
  accessToken: string,
  query: string,
  maxResults = 40,
): Promise<{ id: string; threadId: string }[]> {
  const params = new URLSearchParams({
    q: query,
    maxResults: String(maxResults),
  })
  const data = await gmailJson<{ messages?: { id?: string; threadId?: string }[] }>(
    accessToken,
    `users/me/messages?${params}`,
  )
  return (data.messages ?? []).flatMap((m) =>
    m.id && m.threadId ? [{ id: m.id, threadId: m.threadId }] : [],
  )
}

export async function getMessage(
  accessToken: string,
  messageId: string,
  format: 'metadata' | 'full' = 'full',
): Promise<GmailMessage> {
  const params = new URLSearchParams({ format })
  if (format === 'metadata') {
    for (const header of [
      'From',
      'To',
      'Subject',
      'Date',
      'Message-ID',
      'List-Unsubscribe',
      'Precedence',
      'Auto-Submitted',
    ]) {
      params.append('metadataHeaders', header)
    }
  }
  return gmailJson<GmailMessage>(
    accessToken,
    `users/me/messages/${encodeURIComponent(messageId)}?${params}`,
  )
}

export async function sendRawMessage(
  accessToken: string,
  raw: string,
  threadId?: string | null,
): Promise<{ id: string; threadId: string }> {
  return gmailJson<{ id: string; threadId: string }>(accessToken, 'users/me/messages/send', {
    method: 'POST',
    body: JSON.stringify(threadId ? { raw, threadId } : { raw }),
  })
}

export { GmailApiError }
