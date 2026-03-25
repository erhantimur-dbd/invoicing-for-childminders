'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Loader2, Receipt } from 'lucide-react'
import { EXPENSE_CATEGORIES, type Expense } from '@/lib/types'

type Props = {
  mode: 'new' | 'edit'
  expense?: Expense | null
}

function todayStr() { return new Date().toISOString().split('T')[0] }

export default function ExpenseForm({ mode, expense }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [date, setDate] = useState(expense?.date || todayStr())
  const [description, setDescription] = useState(expense?.description || '')
  const [category, setCategory] = useState(expense?.category || 'Other')
  const [amount, setAmount] = useState(expense?.amount?.toString() || '')
  const [notes, setNotes] = useState(expense?.notes || '')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!amount || Number(amount) <= 0) { toast.error('Enter a valid amount'); return }
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      date,
      description,
      category,
      amount: Number(amount),
      notes: notes || null,
      updated_at: new Date().toISOString(),
    }

    if (mode === 'new') {
      const { error } = await supabase.from('expenses').insert({ ...payload, childminder_id: user.id })
      if (error) { toast.error('Failed to save expense'); setSaving(false); return }
      toast.success('Expense added')
    } else {
      const { error } = await supabase.from('expenses').update(payload).eq('id', expense!.id)
      if (error) { toast.error('Failed to update expense'); setSaving(false); return }
      toast.success('Expense updated')
    }
    router.push('/expenses')
  }

  async function handleDelete() {
    if (!expense) return
    if (!confirm('Delete this expense? This cannot be undone.')) return
    const { error } = await supabase.from('expenses').delete().eq('id', expense.id)
    if (error) { toast.error('Failed to delete'); return }
    toast.success('Expense deleted')
    router.push('/expenses')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4 text-emerald-600" />
            Expense details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Date</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-12 text-base" required />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Description</Label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Art supplies from Hobbycraft"
              className="h-12 text-base"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Category</Label>
              <Select value={category} onValueChange={v => v && setCategory(v)}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Amount (£)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="h-12 text-base"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any additional details..."
              className="text-base resize-none"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700" disabled={saving}>
        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === 'new' ? 'Save expense' : 'Update expense'}
      </Button>

      {mode === 'edit' && (
        <>
          <Separator />
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 text-base text-red-600 border-red-200 hover:bg-red-50"
            onClick={handleDelete}
          >
            Delete expense
          </Button>
        </>
      )}
    </form>
  )
}
