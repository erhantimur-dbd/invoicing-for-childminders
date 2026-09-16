import type { SupabaseClient } from '@supabase/supabase-js'
import { loadEnquiryAgentsPolicy } from './agents-policy.mjs'
import { proposeKnowledgeFromEscalation } from './learn-knowledge.mjs'

export async function persistLearningProposals(input: {
  supabase: SupabaseClient
  userId: string
  prospectId: string
  reasons: string[]
  parentMessage?: string
  knowledge: { question?: string | null; answer?: string | null }[]
  voiceNotes?: string | null
}) {
  const policy = loadEnquiryAgentsPolicy()
  const proposals = proposeKnowledgeFromEscalation({
    reasons: input.reasons,
    parentMessage: input.parentMessage,
    knowledge: input.knowledge,
    voiceNotes: input.voiceNotes,
  }, policy)
  if (!proposals.length) return []

  const { count } = await input.supabase
    .from('enquiry_knowledge_pending')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', input.userId)
    .eq('status', 'pending')
  if ((count || 0) >= policy.max_pending_per_account) return []

  const saved = []
  for (const p of proposals) {
    const row = {
      user_id: input.userId,
      prospect_id: input.prospectId,
      reason: p.reason,
      topic: p.topic,
      question: p.question,
      suggested_answer: p.suggested_answer,
      status: p.auto_apply ? 'approved' : 'pending',
    }
    const { data: existing } = await input.supabase
      .from('enquiry_knowledge_pending')
      .select('id')
      .eq('user_id', input.userId)
      .eq('topic', p.topic)
      .eq('status', 'pending')
      .maybeSingle()
    if (existing) continue
    const { data, error } = await input.supabase
      .from('enquiry_knowledge_pending')
      .insert(row)
      .select('*')
      .maybeSingle()
    if (error || !data) continue
    if (p.auto_apply) {
      await input.supabase.from('enquiry_knowledge').insert({
        user_id: input.userId,
        kind: 'faq',
        question: p.question,
        answer: p.suggested_answer || p.question,
      })
    }
    saved.push(data)
  }
  return saved
}
