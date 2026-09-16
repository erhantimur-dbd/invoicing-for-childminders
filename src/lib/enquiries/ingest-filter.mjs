const NOREPLY = /noreply|no-reply|no_reply|mailer-daemon|notifications@|bounce@|donotreply/i

export function parseFromHeader(raw) {
  const text = String(raw || '').trim()
  const angle = text.match(/^(.*)<([^>]+)>\s*$/)
  if (angle) {
    return { name: angle[1].replace(/["']/g, '').trim() || null, email: angle[2].trim().toLowerCase() }
  }
  if (text.includes('@')) return { name: null, email: text.toLowerCase() }
  return { name: text || null, email: null }
}

export function sameEmail(a, b) {
  if (!a || !b) return false
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase()
}

export function headerMap(headers) {
  const map = {}
  if (!headers) return map
  if (Array.isArray(headers)) {
    for (const h of headers) {
      if (h?.name) map[String(h.name).toLowerCase()] = String(h.value || '')
    }
    return map
  }
  for (const [k, v] of Object.entries(headers)) {
    map[String(k).toLowerCase()] = String(v || '')
  }
  return map
}

/** Keep likely parent mail; skip newsletters, self, sent, and no-reply. */
export function shouldIngestMessage(input) {
  const from = parseFromHeader(input.from)
  if (!from.email) return false
  if (sameEmail(from.email, input.connectedEmail)) return false
  if (NOREPLY.test(from.email)) return false
  const labels = input.labelIds || []
  if (labels.includes('SENT') || labels.includes('SPAM') || labels.includes('TRASH')) return false
  const headers = headerMap(input.headers)
  if (headers['list-unsubscribe']) return false
  return true
}

export function inboundSlugFromRecipient(to, domain = 'enquiries.godottie.cloud') {
  const raw = String(to || '')
  const emails = raw.match(/[a-z0-9._+-]+@[a-z0-9.-]+/gi) || []
  const hit = emails.find((e) => e.toLowerCase().endsWith(`@${domain}`))
  if (!hit) return null
  return hit.split('@')[0].toLowerCase()
}
