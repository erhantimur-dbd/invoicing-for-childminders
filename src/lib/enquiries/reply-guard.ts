import type { SupabaseClient } from '@supabase/supabase-js'

export const ALREADY_REPLIED_MESSAGE = 'Already sent a reply to this parent message from Gmail.'

export async function latestInboundCreatedAt(
  supabase: SupabaseClient,
  userId: string,
  prospectId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('enquiry_messages')
    .select('created_at')
    .eq('user_id', userId)
    .eq('prospect_id', prospectId)
    .eq('direction', 'in')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data?.created_at ?? null
}

export async function hasOutboundSince(
  supabase: SupabaseClient,
  userId: string,
  prospectId: string,
  since: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('enquiry_messages')
    .select('id')
    .eq('user_id', userId)
    .eq('prospect_id', prospectId)
    .eq('direction', 'out')
    .gte('created_at', since)
    .limit(1)
    .maybeSingle()
  return Boolean(data)
}
