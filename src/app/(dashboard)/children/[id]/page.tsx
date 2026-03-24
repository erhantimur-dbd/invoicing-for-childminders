import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import ChildForm from '@/components/ChildForm'

export default async function EditChildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: child } = await supabase
    .from('children')
    .select('*')
    .eq('id', id)
    .eq('childminder_id', user.id)
    .single()

  if (!child) notFound()

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/children" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {child.first_name} {child.last_name}
          </h1>
          <p className="text-gray-500 text-sm">Edit child details</p>
        </div>
      </div>
      <ChildForm mode="edit" child={child} />
    </div>
  )
}
