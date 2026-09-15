import { matchingVacancies } from './letter-template.mjs'
import { nextVisitSlots, parseRequestedWeekdays } from './visit-policy.mjs'

export const ESCALATE_LABELS = {
  extra_needs: 'They mentioned extra needs or health — you should reply.',
  sen_notes: 'Extra-needs notes are on file — you should reply.',
  days_unknown: 'Dottie does not know which days they need, so she cannot confirm a space.',
  partial_vacancy: 'They asked for days you only partly cover. You should decide what to offer.',
  age_outside: 'The child may be outside the ages you listed.',
  unanswered_question: 'They asked something that is not in Your answers.',
  funded_not_accepted: 'They asked about funded hours and you have said you do not take them.',
  no_visit_windows: 'You have a space but no visiting hours, so Dottie cannot offer a visit.',
  facts_from_model: 'Some details were guessed from messy wording. Check before you send.',
  parent_name_unknown: 'Dottie does not have the parent’s name for certain.',
}

const EXTRA_NEEDS = /\b(sen|allerg(?:y|ies|ic)|medical|autism|adhd|disabilit|special needs?|epipen|inhaler|nut-free|wheelchair)\b/i

const ASK_HINTS = [
  { re: /school\s*(run|drop|pick)/i, key: 'school_run', needles: ['school', 'drop-off', 'pick-up', 'pickup'] },
  { re: /\bpets?\b|\bdog\b|\bcat\b/i, key: 'pets', needles: ['pet', 'dog', 'cat'] },
  { re: /\b(eat|meals?|food|menu)\b/i, key: 'food', needles: ['eat', 'meal', 'food', 'menu'] },
  { re: /\bweekend\b|\bsaturday\b|\bsunday\b/i, key: 'weekend', needles: ['weekend', 'saturday', 'sunday'] },
  { re: /\bovernight\b/i, key: 'overnight', needles: ['overnight'] },
]

export function parseAgeMonths(ageText) {
  const text = String(ageText || '').toLowerCase()
  const months = text.match(/(\d{1,2})\s*months?/)
  if (months) return Number(months[1])
  const years = text.match(/(\d{1,2})\s*(years?|yrs?)/)
  if (years) return Number(years[1]) * 12
  return null
}

function knowledgeCovers(knowledge, needles) {
  const blob = (knowledge || [])
    .map((k) => `${k.question || ''} ${k.answer || ''}`)
    .join(' ')
    .toLowerCase()
  return needles.some((n) => blob.includes(n))
}

export function decideHumanEscalation(input) {
  const reasons = []
  const msg = String(input.parentMessage || '')
  const prospect = input.prospect || {}
  const settings = input.settings || {}
  const vacancies = input.vacancies || []
  const knowledge = input.knowledge || []

  if (input.usedAiExtract) reasons.push('facts_from_model')
  if (prospect.sen_notes) reasons.push('sen_notes')
  if (EXTRA_NEEDS.test(msg) || EXTRA_NEEDS.test(String(prospect.sen_notes || ''))) {
    reasons.push('extra_needs')
  }

  const requested = parseRequestedWeekdays(prospect.days_needed)
  if (!requested.length) reasons.push('days_unknown')

  const matches = matchingVacancies(prospect, vacancies)
  if (requested.length && matches.length) {
    const covered = new Set(matches.map((v) => v.weekday))
    if (requested.some((d) => !covered.has(d))) reasons.push('partial_vacancy')
  }

  const ageMonths = parseAgeMonths(prospect.child_age_text)
  if (ageMonths != null) {
    if (settings.ages_from_months != null && ageMonths < Number(settings.ages_from_months)) {
      reasons.push('age_outside')
    }
    if (settings.ages_to_years != null && ageMonths > Number(settings.ages_to_years) * 12) {
      reasons.push('age_outside')
    }
  }

  for (const hint of ASK_HINTS) {
    if (hint.re.test(msg) && !knowledgeCovers(knowledge, hint.needles)) {
      reasons.push('unanswered_question')
      break
    }
  }

  if (settings.accepts_funded === false && /funded|30 hours|15 hours/i.test(msg)) {
    reasons.push('funded_not_accepted')
  }

  const slots = nextVisitSlots(settings.visiting_windows || [])
  if (matches.length && !slots.length) reasons.push('no_visit_windows')

  if (!prospect.parent_name) reasons.push('parent_name_unknown')

  const unique = [...new Set(reasons)]
  return {
    confident: unique.length === 0,
    reasons: unique,
    labels: unique.map((r) => ESCALATE_LABELS[r] || r),
  }
}
