const DAY_ALIASES = {
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
  sun: 7,
  sunday: 7,
}

const WEEKDAY_LONG = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
}

export function parseRequestedWeekdays(daysNeeded) {
  if (!daysNeeded) return []
  const text = daysNeeded.toLowerCase()
  const found = new Set()
  for (const [alias, id] of Object.entries(DAY_ALIASES)) {
    const re = new RegExp(`\\b${alias}\\b`, 'i')
    if (re.test(text)) found.add(id)
  }
  const range = text.match(/\b([a-z]+)\s*(?:to|–|-)\s*([a-z]+)\b/i)
  if (range) {
    const a = DAY_ALIASES[range[1]]
    const b = DAY_ALIASES[range[2]]
    if (a && b) {
      const lo = Math.min(a, b)
      const hi = Math.max(a, b)
      for (let i = lo; i <= hi; i++) found.add(i)
    }
  }
  return [...found].sort((a, b) => a - b)
}

function fundingFits(prospect, vacancy) {
  const funding = (prospect.funding || '').toLowerCase()
  if (!funding || funding === 'unknown') return true
  if (funding === 'private') return vacancy.private
  return vacancy.funded
}

export function coerceVisitPolicy(value) {
  return value === 'accept_all' ? 'accept_all' : 'match_vacancy'
}

function formatClock(hm) {
  const [hStr, mStr] = String(hm || '18:00').split(':')
  let h = Number(hStr)
  const m = Number(mStr) || 0
  if (!Number.isFinite(h)) h = 18
  const suffix = h >= 12 ? 'pm' : 'am'
  const h12 = ((h + 11) % 12) + 1
  return `${h12}:${String(m).padStart(2, '0')}${suffix}`
}

function londonParts(date) {
  const dtf = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const map = {}
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== 'literal') map[p.type] = p.value
  }
  return map
}

/** Next N visit offers as London wall-clock strings. Never invents dates. */
export function nextVisitSlots(windows, from = new Date(), count = 2) {
  const out = []
  if (!Array.isArray(windows) || windows.length === 0 || count < 1) return out
  const now = londonParts(from)
  const nowMinutes = Number(now.hour) * 60 + Number(now.minute)

  for (let offset = 0; offset < 28 && out.length < count; offset++) {
    const cursor = new Date(from.getTime() + offset * 86400000)
    const parts = londonParts(cursor)
    const weekday = String(parts.weekday || '').toLowerCase()
    for (const w of windows) {
      const days = (w.days || []).map((d) => String(d).toLowerCase())
      if (!days.includes(weekday)) continue
      const [h, m] = String(w.start || '18:00').split(':').map(Number)
      const startMin = (Number(h) || 0) * 60 + (Number(m) || 0)
      if (offset === 0 && startMin <= nowMinutes) continue
      out.push(`${parts.weekday} ${parts.day} ${parts.month} ${parts.year} at ${formatClock(w.start)}`)
      if (out.length >= count) return out
    }
  }
  return out
}

export function decideVisit(input) {
  if (!input.hasVisitingWindows) {
    return {
      mayBook: false,
      reason: 'no_windows',
      summary: 'No visiting hours set. Do not offer a calendar slot. Ask for evenings and say the childminder will confirm.',
    }
  }

  const days = parseRequestedWeekdays(input.prospect.days_needed)
  const hasHours = Boolean(input.prospect.hours_needed && String(input.prospect.hours_needed).trim())
  const hasStart = Boolean(input.prospect.start_date)

  if (input.policy === 'accept_all') {
    if (!days.length || !hasHours || !hasStart) {
      return {
        mayBook: false,
        reason: 'missing_facts',
        summary: 'Accept-all policy, but start date, days, or hours are missing. Ask those three, then book a Gmail slot in visiting hours. Do not mention Outlook or Apple Calendar.',
      }
    }
    return {
      mayBook: true,
      reason: 'accept_all',
      summary: 'Accept-all policy. Facts are in. Offer two Gmail slots inside visiting hours. Qualification happens in person. Do not mention Outlook or Apple Calendar.',
    }
  }

  const open = (input.vacancies || []).filter((v) => v.remaining_places > 0)
  if (!open.length) {
    return {
      mayBook: false,
      reason: 'no_space',
      summary: 'Match-vacancy policy and no remaining places. Be kind, offer a waitlist, and do not offer a calendar slot.',
    }
  }

  if (!days.length || !hasHours) {
    return {
      mayBook: false,
      reason: 'missing_facts',
      summary: 'Match-vacancy policy. Days or hours are missing. Ask at most those questions. Do not book Gmail until the request can be matched to a listed space.',
    }
  }

  const matched = open.filter((v) => days.includes(v.weekday) && fundingFits(input.prospect, v))
  if (!matched.length) {
    const names = days.map((id) => WEEKDAY_LONG[id]).filter(Boolean).join(', ')
    return {
      mayBook: false,
      reason: 'no_space',
      summary: `Match-vacancy policy. No listed space for ${names || 'the days asked'}. Offer a waitlist. Do not offer a Gmail slot.`,
    }
  }

  return {
    mayBook: true,
    reason: 'match',
    summary: 'Match-vacancy policy. Request fits a listed space. Offer two Gmail slots inside visiting hours. Do not mention Outlook or Apple Calendar.',
  }
}
