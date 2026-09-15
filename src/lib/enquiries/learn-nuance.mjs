import { sanitiseAccountGuardrails } from './guardrails.mjs'

export function nuancesFromDraft(body, displayName) {
  const name = String(displayName || '').trim()
  return String(body || '')
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => l !== name && !/^Hi\b/i.test(l))
    .filter((l) => !/^• /.test(l) && !/^\d+\./.test(l))
    .filter((l) => !/Which of those suits/i.test(l))
    .filter((l) => !/I do have a space|do not have a matching space|waitlist|day rate|Funded hours are a payment method|Thank you for getting in touch|A visit is the best next step|If you would like to visit/i.test(l))
    .map((l) => sanitiseAccountGuardrails(l))
    .filter((l) => l && l.length >= 20 && l.length <= 180)
    .slice(0, 3)
}

export function mergeNuances(existing, incoming) {
  const out = []
  const seen = new Set()
  for (const n of [...(incoming || []), ...(existing || [])]) {
    const t = sanitiseAccountGuardrails(n)
    const key = t.toLowerCase()
    if (!t || seen.has(key)) continue
    seen.add(key)
    out.push(t)
    if (out.length >= 10) break
  }
  return out
}
