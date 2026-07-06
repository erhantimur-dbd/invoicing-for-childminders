import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'
import SideNav from '@/components/SideNav'
import TrialBanner from '@/components/TrialBanner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase.from('profiles').select('full_name').eq('id', user.id).single(),
    supabase.from('subscriptions').select('status, trial_end').eq('user_id', user.id).maybeSingle(),
  ])

  const trialDaysLeft = subscription?.trial_end
    ? Math.ceil((new Date(subscription.trial_end).getTime() - Date.now()) / 86_400_000)
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <SideNav name={profile?.full_name || ''} />
      <main className="md:pl-60">
        <div className="max-w-6xl mx-auto px-4 pt-6 pb-24 md:pb-16 md:px-8">
          <TrialBanner status={subscription?.status ?? null} daysLeft={trialDaysLeft} />
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
