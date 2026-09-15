import { nextVisitSlots, parseRequestedWeekdays } from './visit-policy.mjs'
import { sanitiseAccountGuardrails } from './guardrails.mjs'

const WEEKDAY_LONG = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
}

const FUNDING_LABELS = {
  private: 'privately funded places',
  '3to4_universal': 'universal 15 hours (3–4)',
  '3to4_working': 'working-parent 30 hours (3–4)',
  '2yo_disadvantaged': '2-year-old extra support hours',
  '2yo_working': 'working-parent hours for 2-year-olds',
  wp_under2: 'working-parent hours (9 months–2 years)',
  wp_under5: 'working-parent 30 hours (from 9 months)',
  tfc: 'Tax-Free Childcare',
  mixed: 'a mix of funded and private hours',
}

export function firstName(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  return text.split(/\s+/)[0]
}

export function fundingLabel(id) {
  if (!id || id === 'unknown') return null
  return FUNDING_LABELS[id] || null
}

export function weekdayList(ids) {
  return ids.map((id) => WEEKDAY_LONG[id]).filter(Boolean)
}

export const SCHEME_IDS = Object.keys(FUNDING_LABELS)

export function matchingVacancies(prospect, vacancies) {
  const days = parseRequestedWeekdays(prospect?.days_needed)
  const open = (vacancies || []).filter((v) => Number(v.remaining_places) > 0)
  if (!open.length) return []
  if (!days.length) return open
  return open.filter((v) => days.includes(v.weekday))
}

export function missingFactQuestions(prospect) {
  const q = []
  if (!prospect?.start_date) q.push('When would you like to start?')
  if (!prospect?.days_needed) q.push('Which days are you looking for?')
  if (!prospect?.hours_needed) q.push('What hours do you need?')
  if (!prospect?.funding || prospect.funding === 'unknown') {
    q.push('Will this be privately funded, or government-funded hours?')
  }
  return q.slice(0, 3)
}

function placeSentence(input) {
  const matches = matchingVacancies(input.prospect, input.vacancies)
  const matchedDays = weekdayList([...new Set(matches.map((v) => v.weekday))].sort((a, b) => a - b))
  const dayBit = matchedDays.length ? ` on ${matchedDays.join(', ')}` : ''
  if (matches.length) {
    return `I do have a space${dayBit}, so that could work.`
  }
  const requested = weekdayList(parseRequestedWeekdays(input.prospect?.days_needed))
  const requestedBit = requested.length ? ` on ${requested.join(', ')}` : ' for those days'
  if (input.settings?.offer_waitlist !== false) {
    return `I do not have a matching space${requestedBit} at the moment. I can add you to the waitlist if that would help.`
  }
  return `I do not have a matching space${requestedBit} at the moment.`
}

function feesSentence(input) {
  if (input.settings?.quote_fees_in_email === false) return ''
  const msg = String(input.parentMessage || '')
  const mentioned = /funded|30 hours|15 hours|fee|rate|cost|£/i.test(msg)
  if (!mentioned && input.settings?.quote_fees_in_email !== true) return ''
  const parts = []
  const label = fundingLabel(input.prospect?.funding)
  if (label) {
    parts.push(`I am set up for ${label}. Funded hours are a payment method — they do not automatically cover wraparound or consumables.`)
  } else if (mentioned) {
    parts.push('Funded hours are a payment method — they do not automatically cover wraparound or consumables.')
  }
  if (input.settings?.day_rate != null && input.settings.day_rate !== '') {
    parts.push(`My day rate is £${Number(input.settings.day_rate)} where funded hours do not cover the day.`)
  }
  return parts.join(' ')
}

function visitSentence(input, hasSpace) {
  if (!hasSpace) return ''
  const slots = nextVisitSlots(input.settings?.visiting_windows ?? [])
  if (!slots.length) {
    return 'If you would like to visit, tell me which evening works and I will confirm a time in my visiting hours.'
  }
  return `A visit is the best next step. I can offer:\n${slots.map((s) => `• ${s}`).join('\n')}\nWhich of those suits you?`
}

function personalisationLine(input) {
  const child = String(input.prospect?.child_name || '').trim()
  const age = String(input.prospect?.child_age_text || '').trim()
  const days = weekdayList(parseRequestedWeekdays(input.prospect?.days_needed))
  const bits = []
  if (child && age) bits.push(`${child} (${age})`)
  else if (child) bits.push(child)
  else if (age) bits.push(`your little one (${age})`)
  if (days.length) bits.push(`looking for ${days.join(', ')}`)
  if (!bits.length) return ''
  return `Thank you for getting in touch about ${bits.join(', ')}.`
}

function ofstedLine(settings) {
  if (!settings?.include_ofsted || !settings.ofsted_urn) return ''
  return `Ofsted URN ${settings.ofsted_urn}.`
}

export function assembleEnquiryLetter(input) {
  const name = String(input.settings?.display_name || 'Your childminder').trim()
  const parent = firstName(input.prospect?.parent_name) || 'there'
  const space = matchingVacancies(input.prospect, input.vacancies).length > 0

  const opening = sanitiseAccountGuardrails(input.settings?.template_opening)
  const closing = sanitiseAccountGuardrails(input.settings?.template_closing)
  const nuances = (input.settings?.learned_nuances || [])
    .map((n) => sanitiseAccountGuardrails(n))
    .filter(Boolean)
    .slice(0, 10)

  const blocks = [
    `Hi ${parent},`,
    opening || null,
    input.personalisation || personalisationLine(input) || null,
    placeSentence({ ...input, hasSpace: space }),
    feesSentence(input) || null,
    nuances[0] || null,
    visitSentence(input, space),
    missingFactQuestions(input.prospect).length
      ? missingFactQuestions(input.prospect).map((q, i) => `${i + 1}. ${q}`).join('\n')
      : null,
    closing || null,
    ofstedLine(input.settings),
    name,
  ].filter((b) => b && String(b).trim())

  return blocks.join('\n\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function letterFailsGuardrails(body, input) {
  const text = String(body || '')
  const leaks = SCHEME_IDS.filter((id) => id.length > 3 && text.includes(id))
  if (leaks.length) return { ok: false, reason: 'scheme_id', leaks }
  const slots = nextVisitSlots(input.settings?.visiting_windows ?? [])
  const dateHits = text.match(/\b\d{1,2} (January|February|March|April|May|June|July|August|September|October|November|December) \d{4}\b/g) || []
  const unexpected = dateHits.filter((d) => !slots.some((s) => s.includes(d)))
  if (unexpected.length) return { ok: false, reason: 'invented_date', leaks: unexpected }
  if (/\bassistant\b/i.test(text) && !/childminder/i.test(text)) {
    return { ok: false, reason: 'assistant', leaks: ['assistant'] }
  }
  return { ok: true, reason: null, leaks: [] }
}
