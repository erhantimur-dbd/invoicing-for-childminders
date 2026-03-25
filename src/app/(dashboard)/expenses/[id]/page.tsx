import { createClient } from '@/lib/supabase/server'
import ExpenseForm from '@/components/ExpenseForm'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function EditExpensePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: expense } = await supabase.from('expenses').select('*').eq('id', id).single()

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/expenses" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Edit expense</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Update this record</p>
        </div>
      </div>
      <ExpenseForm mode="edit" expense={expense} />
    </div>
  )
}
