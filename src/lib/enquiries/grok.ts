/**
 * Grok (xAI) drafts a parent-enquiry reply from the childminder's own answers.
 * Never invents places, fees, or Ofsted ratings.
 */
import OpenAI from 'openai'
import type { EnquiryKnowledge, EnquiryProspect, EnquirySettings, EnquiryVacancy } from './types'
import { ENQUIRY_STAGE_LABELS, FUNDING_OPTIONS, WEEKDAYS } from './types'

const MODEL = 'grok-4.6'

function client(): OpenAI | null {
  const key = process.env.XAI_API_KEY
  if (!key) return null
  return new OpenAI({ apiKey: key, baseURL: 'https://api.x.ai/v1' })
}

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
  const grok = client()
  if (!grok) {
    throw new Error('Dottie is not connected to Grok yet. Add XAI_API_KEY.')
  }

  const windows = (input.settings.visiting_windows ?? [])
    .map((w) => `${w.days.join(', ')} ${w.start}–${w.end} (${w.slot_minutes} min)`)
    .join('\n') || 'No visiting hours set — ask the parent for evenings that work and say you will confirm.'

  const name = input.settings.display_name || 'the childminder'
  const system = `You are ${name}'s assistant, writing an email to a parent who enquired about a childminding place in England.

Voice: warm, plain English, short paragraphs, like a real childminder on her phone in the evening. No corporate sales language. No emojis unless the childminder's notes use them.

Hard rules:
- Only use facts from the setting notes, answers, and spaces below. If you do not know, say you will check with ${name}.
- Never invent Ofsted ratings, availability, fees, or other children's names.
- Never give medical, legal, or safeguarding advice.
- Funded hours (15/30) are not automatically free wraparound. Consumables may be extra. Do not promise "free childcare".
- If there is no matching space, be kind and offer a waitlist. Do not pretend a place exists.
- Ask at most three questions if facts are missing: start date, days/hours, funding (private / 15 hours / 30 hours).
- If visiting hours exist and the parent looks like a fit, offer two concrete visit slots inside those hours.
- Sign off as ${name}'s assistant. If asked whether you are a person, be honest: you help ${name} reply while they are with the children.
- Do not include a subject line. Write the email body only.`

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

Your answers
${knowledgeLines(input.knowledge)}

This parent
Stage: ${ENQUIRY_STAGE_LABELS[input.prospect.stage]}
Parent: ${input.prospect.parent_name || 'unknown'} <${input.prospect.parent_email || 'no email'}>
Child: ${input.prospect.child_name || 'unknown'} (${input.prospect.child_age_text || input.prospect.child_dob || 'age unknown'})
Start date: ${input.prospect.start_date || 'unknown'}
Days: ${input.prospect.days_needed || 'unknown'}
Hours: ${input.prospect.hours_needed || 'unknown'}
Funding: ${fundingLabel(input.prospect.funding)}
Extra needs they mentioned: ${input.prospect.sen_notes || 'none'}

${input.parentMessage ? `Their latest message:\n${input.parentMessage}` : 'They have not sent a message in the app yet. Write a first reply that welcomes them and captures missing facts.'}`

  const resp = await grok.chat.completions.create({
    model: MODEL,
    temperature: 0.4,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
  })

  const body = resp.choices[0]?.message?.content?.trim()
  if (!body) throw new Error('Grok returned an empty reply.')
  return { body, model: MODEL }
}
