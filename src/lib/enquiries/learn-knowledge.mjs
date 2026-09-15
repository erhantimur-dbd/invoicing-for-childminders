import { loadEnquiryAgentsPolicy, mayLearnFromReasons } from './agents-policy.mjs'

export const LEARN_TOPICS = [
  { topic: 'school_run', re: /school\s*(run|drop|pick)/i, question: 'Do you do school drop-off / pick-up?', needles: ['school', 'drop-off', 'pick-up', 'pickup'] },
  { topic: 'pets', re: /\bpets?\b|\bdog\b|\bcat\b|\blabrador\b/i, question: 'Do you have pets?', needles: ['pet', 'dog', 'cat', 'labrador'] },
  { topic: 'food', re: /\b(eat|meals?|food|menu)\b/i, question: 'What do the children eat?', needles: ['eat', 'meal', 'food', 'menu'] },
  { topic: 'weekend', re: /\bweekend\b|\bsaturday\b|\bsunday\b/i, question: 'Do you offer weekend care?', needles: ['weekend', 'saturday', 'sunday'] },
  { topic: 'overnight', re: /\bovernight\b/i, question: 'Do you offer overnight care?', needles: ['overnight'] },
]

function blob(knowledge) {
  return (knowledge || [])
    .map((k) => `${k.question || ''} ${k.answer || ''}`)
    .join(' ')
    .toLowerCase()
}

function suggestedAnswer(topic, knowledge, voiceNotes) {
  const notes = String(voiceNotes || '')
  if (notes && topic.needles.some((n) => notes.toLowerCase().includes(n))) {
    const sentence = notes.split(/[.?\n]/).map((s) => s.trim()).find((s) => topic.needles.some((n) => s.toLowerCase().includes(n)))
    if (sentence) return sentence
  }
  const faq = (knowledge || []).find((k) => topic.re.test(`${k.question || ''} ${k.answer || ''}`))
  return faq?.answer?.trim() || ''
}

export function proposeKnowledgeFromEscalation(input, policy = loadEnquiryAgentsPolicy()) {
  const reasons = input.reasons || []
  if (!mayLearnFromReasons(policy, reasons)) return []
  const msg = String(input.parentMessage || '')
  const out = []
  for (const topic of LEARN_TOPICS) {
    if (!topic.re.test(msg)) continue
    const already = (input.knowledge || []).some((k) => topic.re.test(`${k.question || ''} ${k.answer || ''}`))
    if (already) continue
    out.push({
      topic: topic.topic,
      reason: 'unanswered_question',
      question: topic.question,
      suggested_answer: suggestedAnswer(topic, input.knowledge, input.voiceNotes),
      auto_apply: Boolean(policy.auto_apply_safe && policy.safe_topics.includes(topic.topic) && !policy.require_approval),
    })
  }
  return out
}
