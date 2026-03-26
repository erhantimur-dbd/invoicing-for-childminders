import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, ChevronRight, User, Archive } from 'lucide-react'
import UnarchiveButton from '@/components/UnarchiveButton'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

function formatGBP(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

export default async function ChildrenPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  const showHistory = tab === 'history'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: allChildren } = await supabase
    .from('children')
    .select('*')
    .eq('childminder_id', user.id)
    .order('first_name')

  const active = (allChildren || []).filter(c => !c.archived_at)
  const archived = (allChildren || []).filter(c => !!c.archived_at)
  const displayed = showHistory ? archived : active

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Children</h1>
          <p className="text-gray-500 text-sm">
            {showHistory
              ? `${archived.length} archived`
              : `${active.length} active`}
          </p>
        </div>
        {!showHistory && (
          <Link href="/children/new">
            <Button className="bg-emerald-600 hover:bg-emerald-700 h-10 px-4 rounded-xl gap-2 text-sm font-medium shadow-sm">
              <Plus className="h-4 w-4" />
              Add child
            </Button>
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <Link
          href="/children"
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            !showHistory
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          Active
          {active.length > 0 && (
            <span className={cn(
              'ml-2 text-xs px-1.5 py-0.5 rounded-full font-semibold',
              !showHistory ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'
            )}>
              {active.length}
            </span>
          )}
        </Link>
        <Link
          href="/children?tab=history"
          className={cn(
            'px-4 py-2 rounded-lg text-sm font-medium transition-all',
            showHistory
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          )}
        >
          History
          {archived.length > 0 && (
            <span className={cn(
              'ml-2 text-xs px-1.5 py-0.5 rounded-full font-semibold',
              showHistory ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-500'
            )}>
              {archived.length}
            </span>
          )}
        </Link>
      </div>

      {/* Empty state */}
      {displayed.length === 0 && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-14 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 rounded-2xl mb-4">
              {showHistory
                ? <Archive className="h-7 w-7 text-gray-400" />
                : <User className="h-7 w-7 text-emerald-600" />
              }
            </div>
            {showHistory ? (
              <>
                <p className="text-gray-600 font-medium mb-1">No archived children</p>
                <p className="text-gray-400 text-sm">Children you archive will appear here</p>
              </>
            ) : (
              <>
                <p className="text-gray-600 font-medium mb-1">No children yet</p>
                <p className="text-gray-400 text-sm mb-4">Add a child to start creating invoices</p>
                <Link href="/children/new">
                  <Button className="bg-emerald-600 hover:bg-emerald-700">Add your first child</Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Active children grid */}
      {!showHistory && displayed.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayed.map((child) => (
            <Link key={child.id} href={`/children/${child.id}`}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer h-full hover:-translate-y-0.5">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-emerald-700 font-bold text-sm">
                        {child.first_name[0]}{child.last_name[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 mb-0.5">
                        {child.first_name} {child.last_name}
                      </p>
                      <p className="text-gray-500 text-sm truncate">{child.parent_name}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{formatGBP(Number(child.daily_rate))}</p>
                          <p className="text-xs text-gray-400">per day</p>
                        </div>
                        {(child as any).schedule_days?.length > 0 && (
                          <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                            {(child as any).schedule_days.length}d/week
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Archived children list */}
      {showHistory && displayed.length > 0 && (
        <div className="space-y-2">
          {displayed.map((child) => (
            <Card key={child.id} className="border-0 shadow-sm opacity-75 hover:opacity-100 transition-opacity">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-500 font-semibold text-sm">
                      {child.first_name[0]}{child.last_name[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-700">
                      {child.first_name} {child.last_name}
                    </p>
                    <p className="text-gray-400 text-xs truncate">{child.parent_name}</p>
                    {child.archived_at && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Archived {format(new Date(child.archived_at), 'd MMM yyyy')}
                      </p>
                    )}
                  </div>
                  <UnarchiveButton
                    childId={child.id}
                    childName={`${child.first_name} ${child.last_name}`}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

    </div>
  )
}
