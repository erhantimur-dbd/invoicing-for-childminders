import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminSideNav from './AdminSideNav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 min-h-screen bg-slate-900 flex flex-col fixed top-0 left-0 z-30">
        <div className="px-6 py-5 border-b border-slate-700">
          <span className="text-white font-semibold text-base leading-tight block">
            Dottie Admin
          </span>
          <span className="text-slate-400 text-xs mt-0.5 block">Internal Operations</span>
        </div>
        <AdminSideNav />
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col ml-64">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-20">
          <span className="font-semibold text-gray-800 text-sm">Admin Portal</span>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="text-emerald-700 text-xs font-semibold">
                {(profile.full_name ?? 'A').charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-sm text-gray-600">{profile.full_name ?? user.email}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  )
}
