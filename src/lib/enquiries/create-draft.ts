import type { SupabaseClient } from '@supabase/supabase-js'
import { draftEnquiryReply } from '@/lib/enquiries/grok'
import { AGENT_PAUSED_MESSAGE, isAgentPaused } from '@/lib/enquiries/pause'
import type { EnquiryKnowledge, EnquiryMessage, EnquiryProspect, EnquirySettings, EnquiryVacancy } from '@/lib/enquiries/types'

export async function createEnquiryDraft(
  supabase: SupabaseClient,
  userId: string,
  prospectId: string,
  parentMessage?: string,
): Promise<EnquiryMessage> {
  const [{ data: settings }, { data: vacancies }, { data: knowledge }, { data: prospect }] = await Promise.all([
    supabase.from('enquiry_settings').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('enquiry_vacancies').select('*').eq('user_id', userId),
    supabase.from('enquiry_knowledge').select('*').eq('user_id', userId),
    supabase.from('enquiry_prospects').select('*').eq('id', prospectId).eq('user_id', userId).maybeSingle(),
  ])

  if (!prospect) throw new Error('Parent not found.')
  if (!settings) throw new Error('Finish the short setup first.')
  if (isAgentPaused(settings)) throw new Error(AGENT_PAUSED_MESSAGE)

  const { body, model } = await draftEnquiryReply({
    settings: settings as EnquirySettings,
    vacancies: (vacancies ?? []) as EnquiryVacancy[],
    knowledge: (knowledge ?? []) as EnquiryKnowledge[],
    prospect: prospect as EnquiryProspect,
    parentMessage,
  })

  const { data: saved, error } = await supabase
    .from('enquiry_messages')
    .insert({
      prospect_id: prospectId,
      user_id: userId,
      direction: 'draft',
      body,
      to_address: prospect.parent_email,
      status: 'draft',
      model,
    })
    .select('*')
    .single()

  if (error || !saved) throw error ?? new Error('Could not save the draft.')

  await supabase
    .from('enquiry_prospects')
    .update({
      stage: prospect.stage === 'new' ? 'chatting' : prospect.stage,
      updated_at: new Date().toISOString(),
    })
    .eq('id', prospectId)

  return saved as EnquiryMessage
}
