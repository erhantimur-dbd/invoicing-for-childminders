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
        <div className="space-y-2">
          {children.map((child) => (
            <Link key={child.id} href={`/children/${child.id}`}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-emerald-700 font-bold text-sm">
                        {child.first_name[0]}{child.last_name[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900">
                        {child.first_name} {child.last_name}
                      </p>
                      <p className="text-gray-500 text-sm truncate">{child.parent_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="font-bold text-gray-900 text-sm">{formatGBP(Number(child.daily_rate))}</p>
                        <p className="text-xs text-gray-400">per day</p>
                      </div>
                      {!child.is_active && (
                        <Badge className="bg-gray-100 text-gray-500">Inactive</Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
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
