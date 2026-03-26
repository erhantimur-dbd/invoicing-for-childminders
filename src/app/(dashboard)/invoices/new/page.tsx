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
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, ChevronLeft, Plus, Trash2, CalendarDays, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Child } from '@/lib/types'

type ScheduleDay = { day: string; type: 'full' | 'half' }

type LineItem = {
  description: string
  care_date: string
  quantity: number
  unit_price: number
  amount: number
}

const DAY_NAME_MAP: Record<number, string> = {
  0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday',
}

function formatGBP(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

function todayStr() { return new Date().toISOString().split('T')[0] }

function addDays(dateStr: string, days: number) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function getChildSchedule(child: Child): ScheduleDay[] {
  try {
    const s = (child as any).schedule_days
    if (Array.isArray(s)) return s as ScheduleDay[]
    if (typeof s === 'string') return JSON.parse(s)
  } catch { }
  return []
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
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [useSchedule, setUseSchedule] = useState(true)

  useEffect(() => {
    supabase.from('children').select('*').eq('is_active', true).is('archived_at', null).order('first_name')
      .then(({ data }) => setChildren(data || []))
  }, [])

  function handleChildSelect(id: string) {
    setSelectedChildId(id)
    const child = children.find(c => c.id === id) || null
    setSelectedChild(child)
    setLineItems([])
    setRangeStart('')
    setRangeEnd('')
    // Auto-enable schedule mode if child has a schedule
    if (child) {
      const schedule = getChildSchedule(child)
      setUseSchedule(schedule.length > 0)
    }
  }

  // Generate line items from schedule for a date range
  function generateFromSchedule() {
    if (!rangeStart || !rangeEnd || !selectedChild) return
    const schedule = getChildSchedule(selectedChild)
    if (schedule.length === 0) {
      toast.info('No fixed schedule set — adding all weekdays')
      addAllWeekdays()
      return
    }

    const start = new Date(rangeStart + 'T00:00:00')
    const end = new Date(rangeEnd + 'T00:00:00')
    const items: LineItem[] = []
    const current = new Date(start)

    while (current <= end) {
      const dayName = DAY_NAME_MAP[current.getDay()]
      const scheduled = schedule.find(s => s.day === dayName)
      if (scheduled) {
        const isHalf = scheduled.type === 'half'
        const halfDayRate = (selectedChild as any).half_day_rate
        const rate = isHalf
          ? (halfDayRate ? Number(halfDayRate) : Number(selectedChild.daily_rate) / 2)
          : Number(selectedChild.daily_rate)
        const qty = isHalf ? 0.5 : 1
        items.push({
          description: `Childcare ${isHalf ? '(half day) ' : ''}— ${current.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`,
          care_date: current.toISOString().split('T')[0],
          quantity: qty,
          unit_price: isHalf ? Number(selectedChild.daily_rate) : rate,
          amount: rate,
        })
      }
      current.setDate(current.getDate() + 1)
    }

    if (items.length === 0) {
      toast.info('No scheduled days found in that date range')
      return
    }
    setLineItems(prev => [...prev, ...items])
    setRangeStart('')
    setRangeEnd('')
    toast.success(`Added ${items.length} day${items.length !== 1 ? 's' : ''} from schedule`)
  }

  // Fallback: add all weekdays in range
  function addAllWeekdays() {
    if (!rangeStart || !rangeEnd || !selectedChild) return
    const start = new Date(rangeStart + 'T00:00:00')
    const end = new Date(rangeEnd + 'T00:00:00')
    const items: LineItem[] = []
    const current = new Date(start)
    while (current <= end) {
      const day = current.getDay()
      if (day !== 0 && day !== 6) {
        items.push({
          description: `Childcare — ${current.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`,
          care_date: current.toISOString().split('T')[0],
          quantity: 1,
          unit_price: Number(selectedChild.daily_rate),
          amount: Number(selectedChild.daily_rate),
        })
      }
      current.setDate(current.getDate() + 1)
    }
    if (items.length === 0) { toast.info('No weekdays in that range'); return }
    setLineItems(prev => [...prev, ...items])
    setRangeStart('')
    setRangeEnd('')
  }

  function handleAddDays() {
    if (!rangeStart || !rangeEnd || !selectedChild) return
    const schedule = getChildSchedule(selectedChild)
    if (useSchedule && schedule.length > 0) {
      generateFromSchedule()
    } else {
      addAllWeekdays()
    }
  }

  function addBlankLine() {
    if (!selectedChild) return
    setLineItems(prev => [...prev, {
      description: '',
      care_date: todayStr(),
      quantity: 1,
      unit_price: Number(selectedChild.daily_rate),
      amount: Number(selectedChild.daily_rate),
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
    if (!selectedChildId) { toast.error('Please select a child'); return }
    if (lineItems.length === 0) { toast.error('Please add at least one line item'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: invNumber } = await supabase.rpc('get_next_invoice_number', { p_childminder_id: user.id })
    const { data: invoice, error: invError } = await supabase.from('invoices').insert({
      invoice_number: invNumber,
      childminder_id: user.id,
      child_id: selectedChildId,
      status,
      issue_date: issueDate,
      due_date: dueDate || null,
      subtotal: total,
      total,
      notes,
    }).select().single()

    if (invError || !invoice) { toast.error('Failed to create invoice'); setSaving(false); return }

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

    if (itemsError) { toast.error('Failed to save line items'); setSaving(false); return }
    toast.success(status === 'draft' ? 'Saved as draft' : 'Invoice created!')
    router.push(`/invoices/${invoice.id}`)
  }

  const childSchedule = selectedChild ? getChildSchedule(selectedChild) : []
  const hasSchedule = childSchedule.length > 0

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
        <CardContent className="space-y-3">
          <Select value={selectedChildId} onValueChange={(v) => v && handleChildSelect(v)}>
            <SelectTrigger className="h-12 text-base">
              <SelectValue placeholder="Choose a child...">
                {selectedChild
                  ? `${selectedChild.first_name} ${selectedChild.last_name} — ${formatGBP(Number(selectedChild.daily_rate))}/day`
                  : 'Choose a child...'}
              </SelectValue>
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
            <div className="bg-emerald-50 rounded-lg p-3 space-y-1">
              <p className="text-sm text-emerald-800 font-semibold">{selectedChild.first_name} {selectedChild.last_name}</p>
              <p className="text-xs text-emerald-600">{selectedChild.parent_name}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">
                  Full day: {formatGBP(Number(selectedChild.daily_rate))}
                </Badge>
                {(selectedChild as any).half_day_rate && (
                  <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-50 text-xs">
                    Half day: {formatGBP(Number((selectedChild as any).half_day_rate))}
                  </Badge>
                )}
                {hasSchedule && (
                  <Badge className="bg-purple-50 text-purple-700 hover:bg-purple-50 text-xs">
                    Fixed schedule · {childSchedule.length} day{childSchedule.length !== 1 ? 's' : ''}/week
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add days */}
      {selectedChild && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add care days</CardTitle>
            {hasSchedule && (
              <p className="text-xs text-purple-600 font-medium">
                Fixed schedule detected — days will be pre-filled automatically
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">From</Label>
                <Input type="date" value={rangeStart} onChange={e => setRangeStart(e.target.value)} className="h-12 text-base" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-gray-500">To</Label>
                <Input type="date" value={rangeEnd} onChange={e => setRangeEnd(e.target.value)} className="h-12 text-base" />
              </div>
            </div>

            {/* Mode toggle when schedule exists */}
            {hasSchedule && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setUseSchedule(true)}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all',
                    useSchedule ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-200 text-gray-500'
                  )}
                >
                  Use fixed schedule
                </button>
                <button
                  type="button"
                  onClick={() => setUseSchedule(false)}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all',
                    !useSchedule ? 'bg-gray-600 border-gray-600 text-white' : 'border-gray-200 text-gray-500'
                  )}
                >
                  All weekdays
                </button>
              </div>
            )}

            <Button
              type="button"
              variant="outline"
              className={cn('w-full h-11', hasSchedule && useSchedule ? 'border-purple-200 text-purple-700' : 'border-emerald-200 text-emerald-700')}
              onClick={handleAddDays}
              disabled={!rangeStart || !rangeEnd}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              {hasSchedule && useSchedule ? 'Add scheduled days' : 'Add weekdays'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Line items */}
      {lineItems.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Line items</CardTitle>
              <span className="text-xs text-gray-400">{lineItems.length} item{lineItems.length !== 1 ? 's' : ''}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {lineItems.map((item, idx) => (
              <div key={idx} className="border border-gray-100 rounded-xl p-3 space-y-2 bg-gray-50">
                <div className="flex items-start gap-2">
                  <Input
                    value={item.description}
                    onChange={e => updateLine(idx, 'description', e.target.value)}
                    placeholder="Description"
                    className="h-10 text-sm flex-1 bg-white"
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
                    <Label className="text-xs text-gray-500">Days / qty</Label>
                    <Input
                      type="number" min="0.5" step="0.5"
                      value={item.quantity}
                      onChange={e => updateLine(idx, 'quantity', e.target.value)}
                      className="h-10 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Rate (£)</Label>
                    <Input
                      type="number" min="0" step="0.50"
                      value={item.unit_price}
                      onChange={e => updateLine(idx, 'unit_price', e.target.value)}
                      className="h-10 text-sm bg-white"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Amount</Label>
                    <div className="h-10 flex items-center px-3 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-emerald-700">
                      {formatGBP(Number(item.amount))}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" className="w-full h-11 text-sm gap-2 border-dashed" onClick={addBlankLine}>
              <Plus className="h-4 w-4" /> Add extra line
            </Button>

            <div className="flex justify-between items-center pt-2 border-t border-gray-100">
              <span className="font-bold text-gray-900">Total</span>
              <span className="text-xl font-bold text-emerald-600">{formatGBP(total)}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedChild && lineItems.length === 0 && (
        <Button type="button" variant="outline" className="w-full h-11 text-sm gap-2 border-dashed" onClick={addBlankLine}>
          <Pencil className="h-4 w-4" /> Add line item manually
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
                <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="h-12 text-base" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Due date</Label>
                <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="h-12 text-base" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any notes for the parent..." className="text-base resize-none" rows={2} />
            </div>
          </CardContent>
        </Card>
      )}

      {selectedChild && (
        <div className="flex flex-col gap-3 pb-4">
          <Button
            className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
            onClick={() => handleSave('sent')}
            disabled={saving || lineItems.length === 0}
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : lineItems.length > 0 ? `Create invoice — ${formatGBP(total)}` : 'Add care days to create invoice'}
          </Button>
          <Button
            variant="outline"
            className="w-full h-12 text-base"
            onClick={() => handleSave('draft')}
            disabled={saving || lineItems.length === 0}
          >
            Save as draft
          </Button>
        </div>
      )}
    </div>
  )
}
