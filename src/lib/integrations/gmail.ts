import { googleAccessToken } from './google-token'
import { headerMap } from '@/lib/enquiries/ingest-filter.mjs'

export type GmailListed = {
  id: string
  threadId?: string
  labelIds: string[]
  from: string
  to: string
  subject: string
  headers: Record<string, string>
  body: string
}

function decodeBody(data?: string) {
  if (!data) return ''
  const padded = data.replace(/-/g, '+').replace(/_/g, '/')
  try {
    return Buffer.from(padded, 'base64').toString('utf8')
  } catch {
    return ''
  }
}

function walkParts(payload: { mimeType?: string; body?: { data?: string }; parts?: unknown[] } | undefined): string {
  if (!payload) return ''
  if (payload.mimeType === 'text/plain' && payload.body?.data) return decodeBody(payload.body.data)
  const parts = Array.isArray(payload.parts) ? payload.parts : []
  for (const part of parts) {
    const text = walkParts(part as { mimeType?: string; body?: { data?: string }; parts?: unknown[] })
    if (text) return text
  }
  if (payload.body?.data) return decodeBody(payload.body.data)
  return ''
}

export async function listRecentInbox(refreshToken: string, doFetch: typeof fetch = fetch): Promise<GmailListed[]> {
  const access = await googleAccessToken(refreshToken, doFetch)
  const listUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=25&q=' + encodeURIComponent('in:inbox newer_than:3d -in:chats')
  const listRes = await doFetch(listUrl, { headers: { Authorization: `Bearer ${access}` } })
  if (!listRes.ok) throw new Error('gmail_list_failed')
  const listJson = (await listRes.json()) as { messages?: { id: string }[] }
  const ids = (listJson.messages ?? []).map((m) => m.id)
  const out: GmailListed[] = []
  for (const id of ids) {
    const msgRes = await doFetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, {
      headers: { Authorization: `Bearer ${access}` },
    })
    if (!msgRes.ok) continue
    const msg = (await msgRes.json()) as {
      id: string
      threadId?: string
      labelIds?: string[]
      payload?: { headers?: { name: string; value: string }[]; mimeType?: string; body?: { data?: string }; parts?: unknown[] }
    }
    const headers = headerMap(msg.payload?.headers) as Record<string, string>
    out.push({
      id: msg.id,
      threadId: msg.threadId,
      labelIds: msg.labelIds ?? [],
      from: headers.from || '',
      to: headers.to || '',
      subject: headers.subject || '',
      headers,
      body: walkParts(msg.payload).slice(0, 8000),
    })
  }
  return out
}
