import ExpenseForm from '@/components/ExpenseForm'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default function NewExpensePage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/expenses" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Add expense</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Log a business cost</p>
        </div>
      </div>
      <ExpenseForm mode="new" />
    </div>
  )
}
