import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ProspectDetail from './ProspectDetail'
import { invoicingActive } from '@/lib/enquiries/access'
import type { EnquiryMessage, EnquiryProspect } from '@/lib/enquiries/types'

export default async function ProspectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: prospect } = await supabase
    .from('enquiry_prospects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!prospect) notFound()

  const [{ data: messages }, { data: sub }] = await Promise.all([
    supabase
      .from('enquiry_messages')
      .select('*')
      .eq('prospect_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('subscriptions')
      .select('status, trial_end, enquiries_status')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  return (
    <ProspectDetail
      prospect={prospect as EnquiryProspect}
      messages={(messages ?? []) as EnquiryMessage[]}
      invoicingActive={invoicingActive(sub)}
    />
  )
}
