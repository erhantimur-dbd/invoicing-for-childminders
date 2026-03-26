'use client'

import { useState, useEffect } from 'react'
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
import { Loader2, Receipt, Camera, Sparkles } from 'lucide-react'
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_EMOJI, type Expense } from '@/lib/types'
import ReceiptUploader from './ReceiptUploader'

type Props = {
  mode: 'new' | 'edit'
  expense?: Expense | null
}

function todayStr() { return new Date().toISOString().split('T')[0] }

// Shimmer placeholder used while AI is extracting
function ShimmerField() {
  return (
    <div className="h-12 rounded-md bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" />
  )
}

// Small badge shown next to labels for AI-suggested fields
function AiBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
      <Sparkles className="h-3 w-3" /> AI suggested
    </span>
  )
}

export default function ExpenseForm({ mode, expense }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [saving, setSaving] = useState(false)
  const [date, setDate] = useState(expense?.date || todayStr())
  const [description, setDescription] = useState(expense?.description || '')
  const [category, setCategory] = useState(expense?.category || 'Other')
  const [amount, setAmount] = useState(expense?.amount?.toString() || '')
  const [notes, setNotes] = useState(expense?.notes || '')

  // Receipt + AI state
  const [receiptUrl, setReceiptUrl] = useState<string | null>(expense?.receipt_url ?? null)
  const [merchantName, setMerchantName] = useState(expense?.merchant_name || '')
  const [aiExtracted, setAiExtracted] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [aiFields, setAiFields] = useState<Set<string>>(new Set())

  // Resolve user id for ReceiptUploader + fetch autocomplete data
  const [userId, setUserId] = useState<string>('')
  const [pastMerchants, setPastMerchants] = useState<string[]>([])
  const [pastDescriptions, setPastDescriptions] = useState<string[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setUserId(data.user.id)
      // Fetch past merchants and descriptions for autocomplete
      const { data: rows } = await supabase
        .from('expenses')
        .select('merchant_name, description')
        .eq('childminder_id', data.user.id)
        .not('merchant_name', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200)
      if (rows) {
        const merchants = [...new Set(rows.map(r => r.merchant_name).filter(Boolean) as string[])]
        const descriptions = [...new Set(rows.map(r => r.description).filter(Boolean) as string[])]
        setPastMerchants(merchants)
        setPastDescriptions(descriptions)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleExtracted(data: {
    amount?: number
    date?: string
    merchant_name?: string
    description?: string
    category?: string
  }) {
    setExtracting(false)
    const newAiFields = new Set<string>()
    if (data.amount !== undefined) { setAmount(String(data.amount)); newAiFields.add('amount') }
    if (data.date) { setDate(data.date); newAiFields.add('date') }
    if (data.merchant_name) { setMerchantName(data.merchant_name); newAiFields.add('merchant_name') }
    if (data.description) { setDescription(data.description); newAiFields.add('description') }
    if (data.category && (EXPENSE_CATEGORIES as readonly string[]).includes(data.category)) {
      setCategory(data.category)
      newAiFields.add('category')
    }
    setAiExtracted(true)
    setAiFields(newAiFields)
  }

  // Mark a field as manually edited (remove AI badge)
  function clearAiField(field: string) {
    setAiFields(prev => {
      const next = new Set(prev)
      next.delete(field)
      return next
    })
  }

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
      receipt_url: receiptUrl || null,
      merchant_name: merchantName || null,
      ai_extracted: aiExtracted,
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

      {/* ── Receipt capture card ──────────────────────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="h-4 w-4 text-emerald-600" />
            Receipt
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReceiptUploader
            userId={userId}
            existingUrl={receiptUrl}
            onUpload={url => setReceiptUrl(url || null)}
            onExtracting={() => setExtracting(true)}
            onExtracted={handleExtracted}
          />
        </CardContent>
      </Card>

      {/* ── Expense details card ──────────────────────────────────────────── */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4 text-emerald-600" />
            Expense details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Date */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Date</Label>
              {aiFields.has('date') && <AiBadge />}
            </div>
            {extracting ? <ShimmerField /> : (
              <Input
                type="date"
                value={date}
                onChange={e => { setDate(e.target.value); clearAiField('date') }}
                className="h-12 text-base"
                required
              />
            )}
          </div>

          {/* Merchant name */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Merchant</Label>
              {aiFields.has('merchant_name') && <AiBadge />}
            </div>
            {extracting ? <ShimmerField /> : (
              <>
                <datalist id="merchants-list">
                  {pastMerchants.map(m => <option key={m} value={m} />)}
                </datalist>
                <Input
                  list="merchants-list"
                  value={merchantName}
                  onChange={e => { setMerchantName(e.target.value); clearAiField('merchant_name') }}
                  placeholder="e.g. Hobbycraft, Tesco"
                  className="h-12 text-base"
                  autoComplete="off"
                />
              </>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Description</Label>
              {aiFields.has('description') && <AiBadge />}
            </div>
            {extracting ? <ShimmerField /> : (
              <>
                <datalist id="descriptions-list">
                  {pastDescriptions.map(d => <option key={d} value={d} />)}
                </datalist>
                <Input
                  list="descriptions-list"
                  value={description}
                  onChange={e => { setDescription(e.target.value); clearAiField('description') }}
                  placeholder="e.g. Art supplies from Hobbycraft"
                  className="h-12 text-base"
                  autoComplete="off"
                  required
                />
              </>
            )}
          </div>

          {/* Category + Amount */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Category</Label>
                {aiFields.has('category') && <AiBadge />}
              </div>
              {extracting ? <ShimmerField /> : (
                <Select
                  value={category}
                  onValueChange={v => { if (v) { setCategory(v); clearAiField('category') } }}
                >
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {EXPENSE_CATEGORY_EMOJI[cat]} {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Amount (£)</Label>
                {aiFields.has('amount') && <AiBadge />}
              </div>
              {extracting ? <ShimmerField /> : (
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={e => { setAmount(e.target.value); clearAiField('amount') }}
                  placeholder="0.00"
                  className="h-12 text-base"
                  required
                />
              )}
            </div>
          </div>

          {/* Notes */}
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

      <Button
        type="submit"
        className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
        disabled={saving || extracting}
      >
        {saving
          ? <Loader2 className="h-5 w-5 animate-spin" />
          : mode === 'new' ? 'Save expense' : 'Update expense'
        }
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
