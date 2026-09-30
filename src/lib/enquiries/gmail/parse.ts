export type GmailHeader = { name?: string; value?: string }

export type GmailPayload = {
  mimeType?: string
  filename?: string
  body?: { data?: string; size?: number }
  parts?: GmailPayload[]
  headers?: GmailHeader[]
}

export type ParsedMail = {
  from: string
  to: string
  subject: string
  date: string
  rfcMessageId: string
  body: string
  headers: Record<string, string>
}

const MAX_BODY = 20_000

export function decodeB64Url(data: string): string {
  const padded = data.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(padded, 'base64').toString('utf8')
}

export function headerMap(headers: GmailHeader[] | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  for (const h of headers ?? []) {
    if (!h.name || h.value == null) continue
    const key = h.name.toLowerCase()
    out[key] = out[key] ? `${out[key]}, ${h.value}` : h.value
  }
  return out
}

export function parseFrom(from: string): { name: string | null; email: string | null } {
  const trimmed = from.trim()
  if (!trimmed) return { name: null, email: null }
  const angle = trimmed.match(/^(.*)<([^>]+)>\s*$/)
  if (angle) {
    const name = angle[1].replace(/^["']|["']$/g, '').trim()
    return { name: name || null, email: angle[2].trim().toLowerCase() }
  }
  if (trimmed.includes('@')) return { name: null, email: trimmed.toLowerCase() }
  return { name: trimmed, email: null }
}

function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function walkParts(payload: GmailPayload | undefined, acc: { text: string[]; html: string[] }) {
  if (!payload) return
  const mime = (payload.mimeType || '').toLowerCase()
  if (payload.body?.data) {
    const decoded = decodeB64Url(payload.body.data)
    if (mime === 'text/plain') acc.text.push(decoded)
    else if (mime === 'text/html') acc.html.push(decoded)
    else if (!mime.startsWith('multipart/') && !acc.text.length && !acc.html.length) {
      acc.text.push(decoded)
    }
  }
  for (const part of payload.parts ?? []) walkParts(part, acc)
}

export function extractBody(payload: GmailPayload | undefined): string {
  const acc = { text: [] as string[], html: [] as string[] }
  walkParts(payload, acc)
  const raw = acc.text.join('\n\n').trim() || htmlToText(acc.html.join('\n'))
  if (raw.length <= MAX_BODY) return raw
  return `${raw.slice(0, MAX_BODY)}\n\n[Message trimmed]`
}

export function parseGmailMessage(payload: GmailPayload | undefined): ParsedMail {
  const headers = headerMap(payload?.headers)
  return {
    from: headers.from || '',
    to: headers.to || '',
    subject: headers.subject || '',
    date: headers.date || '',
    rfcMessageId: headers['message-id'] || '',
    body: extractBody(payload),
    headers,
  }
}

export function encodeRfc2822(input: {
  from: string
  to: string
  subject: string
  body: string
  inReplyTo?: string | null
  references?: string | null
}): string {
  const encodedSubject = /[^\x20-\x7E]/.test(input.subject)
    ? `=?UTF-8?B?${Buffer.from(input.subject, 'utf8').toString('base64')}?=`
    : input.subject.replace(/\r?\n/g, ' ')

  const lines = [
    `From: ${input.from}`,
    `To: ${input.to}`,
    `Subject: ${encodedSubject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
  ]
  if (input.inReplyTo) lines.push(`In-Reply-To: ${input.inReplyTo}`)
  if (input.references) lines.push(`References: ${input.references}`)
  lines.push('')
  lines.push(Buffer.from(input.body, 'utf8').toString('base64'))
  return lines.join('\r\n')
}

export function toGmailRaw(rfc2822: string): string {
  return Buffer.from(rfc2822, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}
