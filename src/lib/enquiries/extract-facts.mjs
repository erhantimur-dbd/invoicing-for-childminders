import { parseRequestedWeekdays } from './visit-policy.mjs'

const DAY_SHORT = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri' }

export function formatDaysNeeded(ids) {
  return ids.map((id) => DAY_SHORT[id]).filter(Boolean).join(', ')
}

export function extractFactsFromText(raw) {
  const text = String(raw || '')
  const out = {}

  const child =
    text.match(/\b(?:daughter|son|child)\s+([A-Z][a-z]+)\b/) ||
    text.match(/\bfor\s+([A-Z][a-z]+)\s+who\b/) ||
    text.match(/\b([A-Z][a-z]+)\s+who is\b/)
  if (child) out.child_name = child[1]

  const age = text.match(/\b(\d{1,2}\s+(?:months?|years?|yrs?))\b/i)
  if (age) out.child_age_text = age[1].toLowerCase().replace(/\s+yrs?/, ' years')

  const days = parseRequestedWeekdays(text)
  if (days.length) out.days_needed = formatDaysNeeded(days)

  const hours = text.match(/\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*[–-]\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i)
  if (hours) out.hours_needed = `${hours[1].replace(/\s+/g, '')}–${hours[2].replace(/\s+/g, '')}`

  if (/\b30\s*hours?\b/i.test(text) && /funded|government|working[- ]parent/i.test(text)) {
    out.funding = /2[- ]?year|2yo/i.test(text) ? '2yo_working' : 'wp_under5'
  } else if (/\b15\s*hours?\b/i.test(text) && /funded|government/i.test(text)) {
    out.funding = '3to4_universal'
  } else if (/tax[- ]free/i.test(text)) {
    out.funding = 'tfc'
  } else if (/private(ly)? funded/i.test(text)) {
    out.funding = 'private'
  }

  const iso = text.match(/\b(20\d{2}-\d{2}-\d{2})\b/)
  if (iso) out.start_date = iso[1]
  else if (/\bfrom october\b/i.test(text) || /\bin october\b/i.test(text)) {
    const y = new Date().getFullYear()
    out.start_month = 'october'
  }

  const signOff = text.trim().match(/\b([A-Z][a-z]{1,20})\s*$/)
  if (signOff && !/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|October|November|December|January|February|March|April|May|June|July|August|September)$/.test(signOff[1])) {
    out.parent_name = signOff[1]
  }

  return out
}

export function mergeProspectFacts(prospect, extracted) {
  const next = { ...prospect }
  for (const [k, v] of Object.entries(extracted || {})) {
    if (k === 'start_month') continue
    if (v && (!next[k] || next[k] === 'unknown')) next[k] = v
  }
  return next
}

export function factsStillMissing(prospect) {
  const missing = []
  if (!prospect?.parent_name) missing.push('parent_name')
  if (!prospect?.child_name) missing.push('child_name')
  if (!prospect?.days_needed) missing.push('days_needed')
  if (!prospect?.hours_needed) missing.push('hours_needed')
  if (!prospect?.start_date) missing.push('start_date')
  if (!prospect?.funding || prospect.funding === 'unknown') missing.push('funding')
  return missing
}
