'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Receipt, ChevronRight, ImageIcon } from 'lucide-react'
import { format } from 'date-fns'
import type { Expense } from '@/lib/types'
import { EXPENSE_CATEGORY_EMOJI } from '@/lib/types'

function formatGBP(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

const CATEGORY_COLOURS: Record<string, string> = {
  'Food & Drink': 'bg-orange-100 text-orange-700',
  'Outings & Trips': 'bg-purple-100 text-purple-700',
  "Children's Groups & Classes": 'bg-pink-100 text-pink-700',
  'Arts, Crafts & Activities': 'bg-yellow-100 text-yellow-700',
  'Books & Educational Materials': 'bg-blue-100 text-blue-700',
  'Toys & Play Equipment': 'bg-cyan-100 text-cyan-700',
  'Nappies & Consumables': 'bg-green-100 text-green-700',
  'Travel & Transport': 'bg-sky-100 text-sky-700',
  'Home & Premises': 'bg-stone-100 text-stone-700',
  'Clothing & Uniforms': 'bg-violet-100 text-violet-700',
  'Insurance & Professional Fees': 'bg-slate-100 text-slate-700',
  'First Aid & Medical': 'bg-red-100 text-red-700',
  'Office & Admin': 'bg-indigo-100 text-indigo-700',
  'Other': 'bg-gray-100 text-gray-600',
}

export default function ExpensesPage() {
  const supabase = createClient()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false })
      .then(({ data }) => {
        setExpenses(data || [])
        setLoading(false)
      })
  }, [])

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-500 text-sm">Track your business costs</p>
        </div>
        <Link href="/expenses/new">
          <Button className="bg-emerald-600 hover:bg-emerald-700 gap-2">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </Link>
      </div>

      {/* Total card */}
      {expenses.length > 0 && (
        <Card className="border-0 shadow-sm bg-gradient-to-r from-rose-500 to-rose-600 text-white">
          <CardContent className="p-5">
            <p className="text-rose-100 text-sm mb-1">Total expenses logged</p>
            <p className="text-3xl font-bold">{formatGBP(total)}</p>
            <p className="text-rose-100 text-xs mt-1">{expenses.length} record{expenses.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-20">
          <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No expenses yet</p>
          <p className="text-gray-400 text-sm mt-1">Log costs like supplies, food and outings</p>
          <Link href="/expenses/new">
            <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700 gap-2">
              <Plus className="h-4 w-4" /> Add first expense
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map(expense => (
            <Link key={expense.id} href={`/expenses/${expense.id}`}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Description row */}
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <p className="font-medium text-gray-900 truncate">{expense.description}</p>
                      {expense.receipt_url && (
                        <ImageIcon className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                      )}
                    </div>
                    {/* Merchant name if present */}
                    {expense.merchant_name && (
                      <p className="text-xs text-gray-400 truncate mb-0.5">{expense.merchant_name}</p>
                    )}
                    {/* Date and category row */}
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-400">
                        {format(new Date(expense.date), 'd MMM yyyy')}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${CATEGORY_COLOURS[expense.category] || CATEGORY_COLOURS['Other']}`}>
                        {EXPENSE_CATEGORY_EMOJI[expense.category] || '📦'} {expense.category}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <p className="font-bold text-rose-600">{formatGBP(Number(expense.amount))}</p>
                    <ChevronRight className="h-4 w-4 text-gray-300" />
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
