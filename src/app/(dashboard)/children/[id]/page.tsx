import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import ChildForm from '@/components/ChildForm'
import ArchiveChildButton from '@/components/ArchiveChildButton'
import { Separator } from '@/components/ui/separator'

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

  const isArchived = !!child.archived_at

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/children" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {child.first_name} {child.last_name}
            </h1>
            {isArchived && (
              <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Archived</span>
            )}
          </div>
          <p className="text-gray-500 text-sm">
            {isArchived ? 'Archived child — view only' : 'Edit child details'}
          </p>
        </div>
      </div>

      {!isArchived && <ChildForm mode="edit" child={child} />}

      {isArchived && (
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-5 text-sm text-gray-500">
          This child is archived. Restore them to make edits or create invoices for them.
        </div>
      )}

      {!isArchived && (
        <>
          <Separator className="my-2" />
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-0.5">Danger zone</p>
            <ArchiveChildButton
              childId={child.id}
              childName={`${child.first_name} ${child.last_name}`}
            />
          </div>
        </>
      )}
    </div>
  )
}
