/**
 * Draft a parent-enquiry reply from the childminder's own answers.
 * Grok is primary. Silent Anthropic failover is on in production (Privacy
 * Soft CTA). Preview still requires ENQUIRIES_ANTHROPIC_FAILOVER=true.
 * Never invents places, fees, or Ofsted ratings.
 *
 * Successful drafts emit `ai_usage` from `completeChat` (rate card 2026-09-10.3).
 */
import { completeChat } from '@/lib/ai/complete-chat'
import type { EnquiryKnowledge, EnquiryProspect, EnquirySettings, EnquiryVacancy } from './types'
import { ENQUIRY_STAGE_LABELS, FUNDING_OPTIONS, WEEKDAYS } from './types'
import { parentBlockForModel } from './draft-prompt.mjs'
import { accountCustomisationBlock, adminSystemPrompt } from './guardrails.mjs'
import { nextVisitSlots } from './visit-policy.mjs'

function fundingLabel(id: string | null): string {
  if (!id) return 'not captured yet'
  return FUNDING_OPTIONS.find((f) => f.id === id)?.label ?? id
}

function vacancyLines(vacancies: EnquiryVacancy[]): string {
  if (!vacancies.length) return 'No spaces listed — do not offer a place. Offer a waitlist only.'
  return vacancies
    .filter((v) => v.remaining_places > 0)
    .map((v) => {
      const day = WEEKDAYS.find((d) => d.id === v.weekday)?.long ?? `day ${v.weekday}`
      const pay = [
        v.funded ? 'funded hours ok' : null,
        v.private ? 'private pay ok' : null,
      ]
        .filter(Boolean)
        .join(', ')
      return `- ${day} ${v.session} (${v.remaining_places} space${v.remaining_places === 1 ? '' : 's'}, ${pay})`
    })
    .join('\n')
}

function knowledgeLines(items: EnquiryKnowledge[]): string {
  if (!items.length) return 'No answers on file. Ask the parent to visit, and do not invent details.'
  return items
    .map((k) => {
      if (k.kind === 'faq') return `Q: ${k.question}\nA: ${k.answer}`
      if (k.kind === 'document') return `Starter pack file: ${k.file_name}`
      return `Note: ${k.answer}`
    })
    .join('\n\n')
}

export async function draftEnquiryReply(input: {
  settings: EnquirySettings
  vacancies: EnquiryVacancy[]
  knowledge: EnquiryKnowledge[]
  prospect: EnquiryProspect
  parentMessage?: string
}): Promise<{ body: string; model: string }> {
  const windows = (input.settings.visiting_windows ?? [])
    .map((w) => `${w.days.join(', ')} ${w.start}–${w.end} (${w.slot_minutes} min)`)
    .join('\n') || 'No visiting hours set — ask the parent for evenings that work and say you will confirm.'

  const slots = nextVisitSlots(input.settings.visiting_windows ?? [])
  const slotBlock = slots.length
    ? slots.map((s) => `- ${s}`).join('\n')
    : 'none listed. Do not invent a calendar date.'

  const name = input.settings.display_name || 'the childminder'
  const system = adminSystemPrompt(name)

  const user = `Setting
Name: ${name}
Ofsted: ${input.settings.ofsted_urn || 'not listed'}
Postcode: ${input.settings.postcode || 'not listed'}
Ages: ${input.settings.ages_from_months ?? '?'} months to ${input.settings.ages_to_years ?? '?'} years
Accepts funded hours: ${input.settings.accepts_funded ? 'yes' : 'no'}
Schemes: ${(input.settings.funding_schemes || []).join(', ') || 'not listed'}
Stretched hours: ${input.settings.stretched_hours ? 'yes' : 'no'}
Term-time only: ${input.settings.term_time_only ? 'yes' : 'no'}
Quote fees in email: ${input.settings.quote_fees_in_email ? 'yes' : 'no'}
Day rate: ${input.settings.day_rate ?? 'do not quote'}
Hourly rate: ${input.settings.hourly_rate ?? 'do not quote'}
Notes about the setting:
${input.settings.voice_notes || '(none)'}

Spaces
${vacancyLines(input.vacancies)}

Visiting hours
${windows}

Next visit slots (offer only these exact dates and times; do not invent others)
${slotBlock}

Your answers
${knowledgeLines(input.knowledge)}

${accountCustomisationBlock(input.settings.account_guardrails)}

${parentBlockForModel(
  {
    ...input.prospect,
    stageLabel: ENQUIRY_STAGE_LABELS[input.prospect.stage],
  },
  fundingLabel(input.prospect.funding),
)}

${input.parentMessage ? `Their latest message:\n${input.parentMessage}` : 'They have not sent a message in the app yet. Write a first reply that welcomes them and captures missing facts.'}`

  const { text, model } = await completeChat({
    purpose: 'enquiry_draft',
    temperature: 0.4,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  })

  return { body: text, model }
}
