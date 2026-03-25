import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/components/BottomNav'
import SideNav from '@/components/SideNav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <SideNav name={profile?.full_name || ''} />
      <main className="md:pl-60">
        <div className="max-w-6xl mx-auto px-4 pt-6 pb-24 md:pb-16 md:px-8">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  )
}
