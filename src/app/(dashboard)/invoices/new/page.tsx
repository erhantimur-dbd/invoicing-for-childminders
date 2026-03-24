'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, ChevronLeft, Plus, Trash2 } from 'lucide-react'
import type { Child } from '@/lib/types'

type LineItem = {
  description: string
  care_date: string
  quantity: number
  unit_price: number
  amount: number
}

function formatGBP(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export default function NewInvoicePage() {
  const router = useRouter()
  const supabase = createClient()
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChildId, setSelectedChildId] = useState('')
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [lineItems, setLineItems] = useState<LineItem[]>([])
  const [issueDate, setIssueDate] = useState(todayStr())
  const [dueDate, setDueDate] = useState(addDays(todayStr(), 14))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Date range quick-add
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')

  useEffect(() => {
    supabase
      .from('children')
      .select('*')
      .eq('is_active', true)
      .order('first_name')
      .then(({ data }) => setChildren(data || []))
  }, [])

  function handleChildSelect(id: string) {
    setSelectedChildId(id)
    const child = children.find(c => c.id === id) || null
    setSelectedChild(child)
    setLineItems([])
  }

  function addDayFromRange() {
    if (!rangeStart || !rangeEnd || !selectedChild) return
    const start = new Date(rangeStart)
    const end = new Date(rangeEnd)
    const items: LineItem[] = []
    const current = new Date(start)
    while (current <= end) {
      const day = current.getDay()
      // Mon-Fri only (0=Sun, 6=Sat)
      if (day !== 0 && day !== 6) {
        const dateStr = current.toISOString().split('T')[0]
        items.push({
          description: `Childcare - ${current.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`,
          care_date: dateStr,
          quantity: 1,
          unit_price: Number(selectedChild.daily_rate),
          amount: Number(selectedChild.daily_rate),
        })
      }
      current.setDate(current.getDate() + 1)
    }
    if (items.length === 0) {
      toast.info('No weekdays in that range')
      return
    }
    setLineItems(prev => [...prev, ...items])
    setRangeStart('')
    setRangeEnd('')
  }

  function addBlankLine() {
    setLineItems(prev => [...prev, {
      description: '',
      care_date: todayStr(),
      quantity: 1,
      unit_price: selectedChild ? Number(selectedChild.daily_rate) : 0,
      amount: selectedChild ? Number(selectedChild.daily_rate) : 0,
    }])
  }

  function updateLine(idx: number, field: keyof LineItem, value: string | number) {
    setLineItems(prev => prev.map((item, i) => {
      if (i !== idx) return item
      const updated = { ...item, [field]: value }
      if (field === 'quantity' || field === 'unit_price') {
        updated.amount = Number(updated.quantity) * Number(updated.unit_price)
      }
      return updated
    }))
  }

  function removeLine(idx: number) {
    setLineItems(prev => prev.filter((_, i) => i !== idx))
  }

  const total = lineItems.reduce((sum, item) => sum + Number(item.amount), 0)

  async function handleSave(status: 'draft' | 'sent') {
    if (!selectedChildId) {
      toast.error('Please select a child')
      return
    }
    if (lineItems.length === 0) {
      toast.error('Please add at least one line item')
      return
    }
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Get next invoice number
    const { data: invNumber } = await supabase
      .rpc('get_next_invoice_number', { p_childminder_id: user.id })

    // Create invoice
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .insert({
        invoice_number: invNumber,
        childminder_id: user.id,
        child_id: selectedChildId,
        status,
        issue_date: issueDate,
        due_date: dueDate || null,
        subtotal: total,
        total,
        notes,
      })
      .select()
      .single()

    if (invError || !invoice) {
      toast.error('Failed to create invoice')
      setSaving(false)
      return
    }

    // Insert line items
    const { error: itemsError } = await supabase.from('invoice_line_items').insert(
      lineItems.map(item => ({
        invoice_id: invoice.id,
        description: item.description,
        care_date: item.care_date || null,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        amount: Number(item.amount),
      }))
    )

    if (itemsError) {
      toast.error('Failed to save line items')
      setSaving(false)
      return
    }

    toast.success(status === 'draft' ? 'Invoice saved as draft' : 'Invoice created!')
    router.push(`/invoices/${invoice.id}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/invoices" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New invoice</h1>
          <p className="text-gray-500 text-sm">Fill in the details below</p>
        </div>
      </div>

      {/* Child selection */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select child</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedChildId} onValueChange={(v) => v && handleChildSelect(v)}>
            <SelectTrigger className="h-12 text-base">
              <SelectValue placeholder="Choose a child..." />
            </SelectTrigger>
            <SelectContent>
              {children.map(child => (
                <SelectItem key={child.id} value={child.id} className="text-base py-3">
                  {child.first_name} {child.last_name} — {formatGBP(Number(child.daily_rate))}/day
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {children.length === 0 && (
            <p className="text-sm text-amber-600">
              <Link href="/children/new" className="underline">Add a child first</Link> to create an invoice.
            </p>
          )}
          {selectedChild && (
            <div className="bg-emerald-50 rounded-lg p-3">
              <p className="text-sm text-emerald-800">
                <span className="font-medium">{selectedChild.parent_name}</span>
                {' · '}{formatGBP(Number(selectedChild.daily_rate))} per day
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Date range quick-add */}
      {selectedChild && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add care days</CardTitle>
            <p className="text-xs text-gray-500">Pick a date range to add weekdays automatically</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">From</Label>
                <Input
                  type="date"
                  value={rangeStart}
                  onChange={e => setRangeStart(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">To</Label>
                <Input
                  type="date"
                  value={rangeEnd}
                  onChange={e => setRangeEnd(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 border-emerald-200 text-emerald-700"
              onClick={addDayFromRange}
              disabled={!rangeStart || !rangeEnd}
            >
              Add weekdays
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Line items */}
      {lineItems.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Line items</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {lineItems.map((item, idx) => (
              <div key={idx} className="border border-gray-100 rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <Input
                    value={item.description}
                    onChange={e => updateLine(idx, 'description', e.target.value)}
                    placeholder="Description"
                    className="h-10 text-sm flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-red-400 hover:text-red-600 flex-shrink-0"
                    onClick={() => removeLine(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs text-gray-500">Days</Label>
                    <Input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={item.quantity}
                      onChange={e => updateLine(idx, 'quantity', e.target.value)}
                      className="h-10 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Rate (£)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.50"
                      value={item.unit_price}
                      onChange={e => updateLine(idx, 'unit_price', e.target.value)}
                      className="h-10 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Total</Label>
                    <div className="h-10 flex items-center px-3 bg-gray-50 rounded-md text-sm font-medium text-gray-700">
                      {formatGBP(Number(item.amount))}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              className="w-full h-11 text-sm gap-2"
              onClick={addBlankLine}
            >
              <Plus className="h-4 w-4" />
              Add line
            </Button>

            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <span className="font-bold text-gray-900">Total</span>
              <span className="text-xl font-bold text-emerald-600">{formatGBP(total)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedChild && lineItems.length === 0 && (
        <Button
          type="button"
          variant="outline"
          className="w-full h-11 text-sm gap-2"
          onClick={addBlankLine}
        >
          <Plus className="h-4 w-4" />
          Add line item manually
        </Button>
      )}

      {/* Invoice details */}
      {selectedChild && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Invoice details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Invoice date</Label>
                <Input
                  type="date"
                  value={issueDate}
                  onChange={e => setIssueDate(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Due date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="h-12 text-base"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any notes for the parent..."
                className="text-base resize-none"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {selectedChild && lineItems.length > 0 && (
        <div className="flex flex-col gap-3 pb-4">
          <Button
            className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
            onClick={() => handleSave('sent')}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : `Create & send — ${formatGBP(total)}`}
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 text-base"
            onClick={() => handleSave('draft')}
            disabled={saving}
          >
            Save as draft
          </Button>
        </div>
      )}
    </div>
  )
}
