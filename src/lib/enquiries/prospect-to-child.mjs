import { parseRequestedWeekdays } from './visit-policy.mjs'

const WEEKDAY_KEYS = {
  1: 'monday',
  2: 'tuesday',
  3: 'wednesday',
  4: 'thursday',
  5: 'friday',
}

/** Enquiry funding ids that map onto invoice funding_type + scheme. */
const FUNDING_MAP = {
  '3to4_universal': { funding_type: '15', funding_scheme: '3to4_universal' },
  '3to4_working': { funding_type: '30', funding_scheme: '3to4_working' },
  '2yo_disadvantaged': { funding_type: '15', funding_scheme: '2yo_disadvantaged' },
  '2yo_working': { funding_type: '15', funding_scheme: '2yo_working' },
  wp_under2: { funding_type: '15', funding_scheme: 'wp_under2' },
  wp_under5: { funding_type: '30', funding_scheme: 'wp_under5' },
}

const FUNDING_NOTE = {
  tfc: 'Enquiry funding: Tax-Free Childcare',
  mixed: 'Enquiry funding: mix of funded and private — set the split on this form',
  unknown: 'Enquiry funding: not confirmed yet',
}

export function splitChildName(childName) {
  const text = String(childName || '').trim().replace(/\s+/g, ' ')
  if (!text) return { first: '', last: '' }
  const space = text.indexOf(' ')
  if (space === -1) return { first: text, last: '' }
  return { first: text.slice(0, space), last: text.slice(space + 1) }
}

export function isoDate(value) {
  if (!value) return ''
  const text = String(value).trim()
  const day = text.match(/^(\d{4}-\d{2}-\d{2})/)
  if (day) return day[1]
  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toISOString().slice(0, 10)
}

/** @returns {{ day: string, type: 'full' }[]} */
export function scheduleDaysFromProspect(daysNeeded) {
  return parseRequestedWeekdays(daysNeeded)
    .map((id) => WEEKDAY_KEYS[id])
    .filter(Boolean)
    .map((day) => ({ day, type: /** @type {'full'} */ ('full') }))
}

/**
 * Hours-per-day for invoicing. "30 hours" on an enquiry usually means weekly
 * funded hours, not a 30-hour day — those stay in notes.
 */
export function hoursPerDayFromText(hoursNeeded) {
  if (!hoursNeeded) return null
  const text = String(hoursNeeded).trim()
  const range = text.match(
    /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:to|–|-|until)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i,
  )
  if (range) {
    const start = toHours(range[1], range[2], range[3])
    let end = toHours(range[4], range[5], range[6])
    if (!range[3] && !range[6] && end <= start) end += 12
    const diff = end - start
    if (diff > 0 && diff <= 14) return roundHalf(diff)
  }
  const perDay = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\s*(?:a|per|\/)\s*day/i)
  if (perDay) {
    const n = Number(perDay[1])
    if (n > 0 && n <= 14) return n
  }
  const bare = text.match(/^(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)?$/i)
  if (bare) {
    const n = Number(bare[1])
    if (n > 0 && n <= 12) return n
  }
  return null
}

export function fundingFromEnquiry(fundingId) {
  const id = String(fundingId || '').trim()
  return FUNDING_MAP[id] || { funding_type: 'none', funding_scheme: null }
}

export function fundedHoursPerDay(fundingType, dayCount) {
  if (fundingType !== '15' && fundingType !== '30') return null
  const weekly = fundingType === '30' ? 30 : 15
  const n = dayCount > 0 ? dayCount : 5
  return roundHalf(weekly / n)
}

export function notesFromProspect(prospect) {
  const lines = []
  const sen = String(prospect?.sen_notes || '').trim()
  if (sen) lines.push(sen)
  const start = String(prospect?.start_date || '').trim()
  if (start) lines.push(`Start date: ${start}`)
  const code = String(prospect?.eligibility_code || '').trim()
  if (code) lines.push(`Eligibility code: ${code}`)
  const fundingNote = FUNDING_NOTE[String(prospect?.funding || '').trim()]
  if (fundingNote) lines.push(fundingNote)
  const extra = String(prospect?.notes || '').trim()
  if (extra) lines.push(extra)
  const hours = String(prospect?.hours_needed || '').trim()
  if (hours && hoursPerDayFromText(hours) == null) {
    lines.push(`Hours requested: ${hours}`)
  }
  const days = String(prospect?.days_needed || '').trim()
  if (days && scheduleDaysFromProspect(days).length === 0) {
    lines.push(`Days requested: ${days}`)
  }
  return lines.join('\n\n')
}

export function childFormPrefill(prospect) {
  const name = splitChildName(prospect?.child_name)
  const schedule_days = scheduleDaysFromProspect(prospect?.days_needed)
  const hours_per_day = hoursPerDayFromText(prospect?.hours_needed)
  const funding = fundingFromEnquiry(prospect?.funding)
  const funded_hours_per_day = fundedHoursPerDay(funding.funding_type, schedule_days.length)
  let cappedFunded = funded_hours_per_day
  if (cappedFunded != null && hours_per_day != null && cappedFunded > hours_per_day) {
    cappedFunded = hours_per_day
  }
  const funded_days =
    funding.funding_type !== 'none' && schedule_days.length
      ? schedule_days.map((d) => d.day)
      : null
  const stretched = prospect?.stretched
    ? 'Stretched / term-time hours as discussed on the enquiry.'
    : null

  return {
    first_name: name.first,
    last_name: name.last,
    date_of_birth: isoDate(prospect?.child_dob),
    parent_name: prospect?.parent_name || '',
    parent_email: prospect?.parent_email || '',
    parent_phone: prospect?.parent_phone || '',
    daily_rate: 0,
    half_day_rate: null,
    hourly_rate: null,
    hours_per_day,
    notes: notesFromProspect(prospect),
    schedule_days: schedule_days.length ? schedule_days : null,
    schedule_note: stretched,
    funding_type: funding.funding_type,
    funding_scheme: funding.funding_scheme,
    funded_hours_per_day: cappedFunded,
    funded_days,
    enquiry_prospect_id: prospect?.id || null,
  }
}

export function addToInvoicingHref({ invoicingActive, prospectId }) {
  const childPath = `/children/new?from=prospect&id=${encodeURIComponent(prospectId)}`
  if (invoicingActive) return childPath
  return `/subscribe?product=invoicing&next=${encodeURIComponent(childPath)}`
}

function toHours(hourStr, minuteStr, mer) {
  let h = Number(hourStr)
  const m = minuteStr ? Number(minuteStr) / 60 : 0
  const meridem = mer ? mer.toLowerCase() : ''
  if (meridem === 'pm' && h < 12) h += 12
  if (meridem === 'am' && h === 12) h = 0
  return h + m
}

function roundHalf(n) {
  return Math.round(n * 2) / 2
}
