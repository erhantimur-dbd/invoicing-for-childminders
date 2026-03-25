import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, ChevronRight, User } from 'lucide-react'

function formatGBP(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

export default async function ChildrenPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: children } = await supabase
    .from('children')
    .select('*')
    .eq('childminder_id', user.id)
    .order('first_name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Children</h1>
          <p className="text-gray-500 text-sm">{children?.length || 0} registered</p>
        </div>
        <Link href="/children/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700 h-12 px-4 rounded-xl gap-2">
            <Plus className="h-5 w-5" />
            Add child
          </Button>
        </Link>
      </div>

      {!children || children.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-50 rounded-full mb-4">
              <User className="h-8 w-8 text-emerald-600" />
            </div>
            <p className="text-gray-600 font-medium mb-1">No children yet</p>
            <p className="text-gray-400 text-sm mb-4">Add a child to start creating invoices</p>
            <Link href="/children/new">
              <Button className="bg-emerald-600 hover:bg-emerald-700">Add your first child</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {children.map((child) => (
            <Link key={child.id} href={`/children/${child.id}`}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer h-full hover:-translate-y-0.5">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-emerald-700 font-bold">
                        {child.first_name[0]}{child.last_name[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-semibold text-gray-900">
                          {child.first_name} {child.last_name}
                        </p>
                        {!child.is_active && (
                          <Badge className="bg-gray-100 text-gray-500 text-xs">Inactive</Badge>
                        )}
                      </div>
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
    </div>
  )
}
