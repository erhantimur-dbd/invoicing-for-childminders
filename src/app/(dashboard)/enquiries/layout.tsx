import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { enquiriesActive } from '@/lib/enquiries/access'
import EnquiriesPaywall from '@/components/enquiries/EnquiriesPaywall'
import { readPaidSignupOpen } from '@/lib/paid-signup-render'

export default async function EnquiriesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('enquiries_status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!enquiriesActive(sub)) return <EnquiriesPaywall paymentsOpen={await readPaidSignupOpen()} />

  return <>{children}</>
}
