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

export type GmailThread = {
  id: string
  historyId?: string
  messages?: GmailMessage[]
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

export async function listThreadIds(
  accessToken: string,
  query: string,
  maxResults = 40,
): Promise<string[]> {
  const params = new URLSearchParams({
    q: query,
    maxResults: String(maxResults),
  })
  const data = await gmailJson<{ threads?: { id: string }[] }>(
    accessToken,
    `users/me/threads?${params}`,
  )
  return (data.threads ?? []).map((t) => t.id)
}

export async function getThread(accessToken: string, threadId: string): Promise<GmailThread> {
  const params = new URLSearchParams({ format: 'full' })
  return gmailJson<GmailThread>(accessToken, `users/me/threads/${encodeURIComponent(threadId)}?${params}`)
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
