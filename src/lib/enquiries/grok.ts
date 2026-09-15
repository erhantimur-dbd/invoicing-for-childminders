/**
 * Enquiry reply: logic writes the letter. AI only extracts leftover facts
 * from messy email. Metering still emits ai_usage on extract hops.
 */
import { completeChat } from '@/lib/ai/complete-chat'
import type { EnquiryKnowledge, EnquiryProspect, EnquirySettings, EnquiryVacancy } from './types'
import { extractFactsFromText, factsStillMissing, mergeProspectFacts } from './extract-facts.mjs'
import { assembleEnquiryLetter, letterFailsGuardrails } from './letter-template.mjs'
import { log } from '@/lib/log'

function parseJsonObject(text: string): Record<string, string> {
  const raw = String(text || '').trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end <= start) return {}
  try {
    const json = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(json)) {
      if (v != null && String(v).trim()) out[k] = String(v).trim()
    }
    return out
  } catch {
    return {}
  }
}

async function extractWithModel(parentMessage: string): Promise<Record<string, string>> {
  const { text } = await completeChat({
    purpose: 'enquiry_extract',
    temperature: 0,
    maxTokens: 250,
    messages: [
      {
        role: 'system',
        content:
          'Extract childcare enquiry facts. Return JSON only with keys parent_name, child_name, child_age_text, days_needed, hours_needed, start_date, funding. funding must be one of private, 3to4_universal, 3to4_working, 2yo_working, wp_under5, tfc, unknown. Use empty string when unknown. No other keys. No prose.',
      },
      { role: 'user', content: parentMessage.slice(0, 4000) },
    ],
  })
  return parseJsonObject(text)
}

export async function draftEnquiryReply(input: {
  settings: EnquirySettings
  vacancies: EnquiryVacancy[]
  knowledge: EnquiryKnowledge[]
  prospect: EnquiryProspect
  parentMessage?: string
}): Promise<{ body: string; model: string }> {
  const fromText = input.parentMessage ? extractFactsFromText(input.parentMessage) : {}
  let prospect = mergeProspectFacts(input.prospect, fromText)

  const missing = factsStillMissing(prospect)
  if (input.parentMessage && missing.length) {
    try {
      const fromModel = await extractWithModel(input.parentMessage)
      prospect = mergeProspectFacts(prospect, fromModel)
    } catch (err) {
      log.warn('enquiry_extract_failed', { error: err instanceof Error ? err.message : 'fail' })
    }
  }

  let body = assembleEnquiryLetter({
    prospect,
    settings: input.settings,
    vacancies: input.vacancies,
    parentMessage: input.parentMessage,
  })

  const check = letterFailsGuardrails(body, { settings: input.settings })
  if (!check.ok) {
    log.warn('enquiry_letter_guardrail', { reason: check.reason, leaks: check.leaks })
    body = assembleEnquiryLetter({
      prospect,
      settings: { ...input.settings, learned_nuances: [], template_opening: null, template_closing: null },
      vacancies: input.vacancies,
      parentMessage: input.parentMessage,
    })
  }

  return { body, model: 'template' }
}
