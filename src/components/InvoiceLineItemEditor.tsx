'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Pencil, Trash2, Plus, Check, X, Loader2,
  CalendarDays, UtensilsCrossed, Baby, Landmark,
  Car, Ticket, ShoppingBag, MoreHorizontal
} from 'lucide-react'

type LineItem = {
  id: string
  description: string
  quantity: number
  unit_price: number
  amount: number
  item_type?: string
}

const CUSTOM_CATEGORIES = [
  { key: 'outing',    label: 'Outing',          icon: Ticket,           emoji: '🎡', defaultDesc: 'Outing' },
  { key: 'group',     label: 'Toddler group',    icon: Baby,             emoji: '👶', defaultDesc: 'Toddler group' },
  { key: 'food',      label: 'Food & drink',     icon: UtensilsCrossed,  emoji: '🍎', defaultDesc: 'Food & drink' },
  { key: 'nappies',   label: 'Nappies',          icon: ShoppingBag,      emoji: '🧷', defaultDesc: 'Nappies & consumables' },
  { key: 'travel',    label: 'Travel',           icon: Car,              emoji: '🚗', defaultDesc: 'Travel' },
  { key: 'custom',    label: 'Other',            icon: MoreHorizontal,   emoji: '✏️', defaultDesc: '' },
]

function formatGBP(amount: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount)
}

export default function InvoiceLineItemEditor({
  invoiceId,
  initialItems,
  childDailyRate,
  childHalfDayRate,
  onSaved,
}: {
  invoiceId: string
  initialItems: LineItem[]
  childDailyRate: number
  childHalfDayRate: number | null
  onSaved: (items: LineItem[], newTotal: number) => void
}) {
  const supabase = createClient()
  const [items, setItems] = useState<LineItem[]>(initialItems.map(i => ({ ...i })))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBuf, setEditBuf] = useState<Partial<LineItem>>({})
  const [saving, setSaving] = useState(false)

  // Add care day form
  const [addingDay, setAddingDay] = useState(false)
  const [dayDate, setDayDate] = useState('')
  const [dayType, setDayType] = useState<'full' | 'half'>('full')

  // Add custom item form
  const [addingCustom, setAddingCustom] = useState(false)
  const [customCategory, setCustomCategory] = useState<string | null>(null)
  const [customDesc, setCustomDesc] = useState('')
  const [customQty, setCustomQty] = useState('1')
  const [customPrice, setCustomPrice] = useState('')

  const runningTotal = items.reduce((s, i) => s + Number(i.amount), 0)

  // ── Edit existing item ─────────────────────────────────
  function startEdit(item: LineItem) {
    setEditingId(item.id)
    setEditBuf({ description: item.description, quantity: item.quantity, unit_price: item.unit_price })
    setAddingDay(false)
    setAddingCustom(false)
  }

  function commitEdit(id: string) {
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i
      const qty = Number(editBuf.quantity) || i.quantity
      const price = Number(editBuf.unit_price) || i.unit_price
      return {
        ...i,
        description: editBuf.description || i.description,
        quantity: qty,
        unit_price: price,
        amount: qty * price,
      }
    }))
    setEditingId(null)
  }

  function deleteItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    if (editingId === id) setEditingId(null)
  }

  // ── Add care day ───────────────────────────────────────
  function addCareDay() {
    if (!dayDate) { toast.error('Pick a date'); return }
    const isHalf = dayType === 'half'
    const rate = isHalf ? (childHalfDayRate ?? childDailyRate / 2) : childDailyRate
    const label = isHalf ? 'Half day' : 'Full day'
    const dateStr = new Date(dayDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    const newItem: LineItem = {
      id: `new-${Date.now()}`,
      description: `${label} — ${dateStr}`,
      quantity: 1,
      unit_price: rate,
      amount: rate,
      item_type: isHalf ? 'half_day' : 'care_day',
    }
    setItems(prev => [...prev, newItem])
    setAddingDay(false)
    setDayDate('')
    setDayType('full')
  }

  // ── Add custom item ────────────────────────────────────
  function addCustomItem() {
    const cat = CUSTOM_CATEGORIES.find(c => c.key === customCategory)
    const desc = customDesc.trim() || cat?.defaultDesc || 'Custom item'
    const qty = Number(customQty) || 1
    const price = Number(customPrice)
    if (!price) { toast.error('Enter a price'); return }
    const newItem: LineItem = {
      id: `new-${Date.now()}`,
      description: cat?.emoji ? `${cat.emoji} ${desc}` : desc,
      quantity: qty,
      unit_price: price,
      amount: qty * price,
      item_type: customCategory || 'custom',
    }
    setItems(prev => [...prev, newItem])
    setAddingCustom(false)
    setCustomCategory(null)
    setCustomDesc('')
    setCustomQty('1')
    setCustomPrice('')
  }

  // ── Save all to DB ─────────────────────────────────────
  async function handleSave() {
    setSaving(true)

    // Delete all existing items then re-insert
    const { error: delErr } = await supabase
      .from('invoice_line_items')
      .delete()
      .eq('invoice_id', invoiceId)

    if (delErr) { toast.error('Failed to save'); setSaving(false); return }

    // Insert all current items
    const rows = items.map(i => ({
      invoice_id: invoiceId,
      description: i.description,
      quantity: i.quantity,
      unit_price: i.unit_price,
      amount: i.amount,
      // item_type column may not exist yet — omit if not supported
    }))

    const { data: inserted, error: insErr } = await supabase
      .from('invoice_line_items')
      .insert(rows)
      .select()

    if (insErr) { toast.error('Failed to save items'); setSaving(false); return }

    // Update invoice total
    const newTotal = items.reduce((s, i) => s + Number(i.amount), 0)
    const { error: totErr } = await supabase
      .from('invoices')
      .update({ total: newTotal, updated_at: new Date().toISOString() })
      .eq('id', invoiceId)

    if (totErr) { toast.error('Failed to update total'); setSaving(false); return }

    toast.success('Invoice updated')
    setSaving(false)
    onSaved(inserted || items, newTotal)
  }

  return (
    <div className="space-y-3">

      {/* Line items */}
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 overflow-hidden">
            {editingId === item.id ? (
              /* Inline edit */
              <div className="p-3 space-y-2">
                <Input
                  value={editBuf.description ?? ''}
                  onChange={e => setEditBuf(b => ({ ...b, description: e.target.value }))}
                  className="h-9 text-sm"
                  placeholder="Description"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-gray-500">Qty</Label>
                    <Input
                      type="number"
                      min="0.5"
                      step="0.5"
                      value={editBuf.quantity ?? ''}
                      onChange={e => setEditBuf(b => ({ ...b, quantity: Number(e.target.value) }))}
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Unit price (£)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editBuf.unit_price ?? ''}
                      onChange={e => setEditBuf(b => ({ ...b, unit_price: Number(e.target.value) }))}
                      className="h-9 text-sm font-mono"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-8 bg-emerald-600 hover:bg-emerald-700 text-xs" onClick={() => commitEdit(item.id)}>
                    <Check className="h-3.5 w-3.5 mr-1" /> Save
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setEditingId(null)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              /* Read row */
              <div className="flex items-center gap-2 px-3 py-2.5">
                <p className="flex-1 text-sm text-gray-700 truncate">{item.description}</p>
                <span className="text-sm font-semibold text-gray-900 flex-shrink-0">{formatGBP(Number(item.amount))}</span>
                <button onClick={() => startEdit(item)} className="text-gray-300 hover:text-emerald-600 transition-colors flex-shrink-0">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => deleteItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}

        {items.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-3">No line items — add some below</p>
        )}
      </div>

      {/* Running total */}
      <div className="flex justify-between items-center px-1 py-1">
        <span className="text-sm font-semibold text-gray-700">Running total</span>
        <span className="text-base font-bold text-emerald-600">{formatGBP(runningTotal)}</span>
      </div>

      <Separator />

      {/* Add care day */}
      {!addingCustom && (
        <div>
          {addingDay ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 space-y-3">
              <p className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> Add care day
              </p>
              <Input
                type="date"
                value={dayDate}
                onChange={e => setDayDate(e.target.value)}
                className="h-10"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setDayType('full')}
                  className={`h-10 rounded-lg text-sm font-medium border transition-all ${dayType === 'full' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'}`}
                >
                  Full day · {formatGBP(childDailyRate)}
                </button>
                <button
                  onClick={() => setDayType('half')}
                  className={`h-10 rounded-lg text-sm font-medium border transition-all ${dayType === 'half' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'}`}
                >
                  Half day · {formatGBP(childHalfDayRate ?? childDailyRate / 2)}
                </button>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700 text-xs" onClick={addCareDay}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add day
                </Button>
                <Button size="sm" variant="outline" className="h-9 text-xs" onClick={() => setAddingDay(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setAddingDay(true); setAddingCustom(false); setEditingId(null) }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-colors text-sm font-medium"
            >
              <CalendarDays className="h-4 w-4" />
              Add care day
            </button>
          )}
        </div>
      )}

      {/* Add custom item */}
      {!addingDay && (
        <div>
          {addingCustom ? (
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 space-y-3">
              <p className="text-sm font-semibold text-violet-800 flex items-center gap-1.5">
                <Plus className="h-4 w-4" /> Add item
              </p>
              {/* Category chips */}
              <div className="flex flex-wrap gap-1.5">
                {CUSTOM_CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => {
                      setCustomCategory(cat.key)
                      if (!customDesc) setCustomDesc(cat.defaultDesc)
                    }}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      customCategory === cat.key
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300'
                    }`}
                  >
                    {cat.emoji} {cat.label}
                  </button>
                ))}
              </div>
              <Input
                value={customDesc}
                onChange={e => setCustomDesc(e.target.value)}
                placeholder="Description"
                className="h-10 text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-gray-500">Qty</Label>
                  <Input
                    type="number"
                    min="1"
                    value={customQty}
                    onChange={e => setCustomQty(e.target.value)}
                    className="h-10 text-sm font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Price (£)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={customPrice}
                    onChange={e => setCustomPrice(e.target.value)}
                    placeholder="0.00"
                    className="h-10 text-sm font-mono"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 h-9 bg-violet-600 hover:bg-violet-700 text-xs" onClick={addCustomItem}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add item
                </Button>
                <Button size="sm" variant="outline" className="h-9 text-xs" onClick={() => { setAddingCustom(false); setCustomCategory(null) }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setAddingCustom(true); setAddingDay(false); setEditingId(null) }}
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed border-violet-300 text-violet-700 hover:bg-violet-50 transition-colors text-sm font-medium"
            >
              <Plus className="h-4 w-4" />
              Add outing, food, nappies &amp; more
            </button>
          )}
        </div>
      )}

      {/* Save */}
      <Button
        className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 font-semibold"
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : `Save changes · ${formatGBP(runningTotal)}`}
      </Button>

    </div>
  )
}
