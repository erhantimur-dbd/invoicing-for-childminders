'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, User, Phone, Landmark, Baby, Calendar } from 'lucide-react'
import type { Child, FundingType } from '@/lib/types'

type SavedBank = {
  label: string
  bank_name: string
  bank_account_name: string
  bank_sort_code: string
  bank_account_number: string
}

type ScheduleDay = { day: string; type: 'full' | 'half' }

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
}

type ChildFormData = Omit<Child, 'id' | 'childminder_id' | 'created_at' | 'updated_at' | 'archived_at'>

const emptyForm: ChildFormData = {
  first_name: '',
  last_name: '',
  date_of_birth: '',
  parent_name: '',
  parent_email: '',
  parent_phone: '',
  daily_rate: 0,
  bank_account_name: '',
  bank_sort_code: '',
  bank_account_number: '',
  bank_name: '',
  notes: '',
  is_active: true,
  half_day_rate: null,
  hourly_rate: null,
  hours_per_day: null,
  schedule_days: null,
  schedule_note: null,
  funding_type: 'none' as FundingType,
  funded_hours_per_day: null,
  funded_days: null,
}

type Props = {
  child?: Child
  mode: 'new' | 'edit'
}

export default function ChildForm({ child, mode }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [savedBanks, setSavedBanks] = useState<SavedBank[]>([])

  useEffect(() => {
    async function loadSavedBanks() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const banks: SavedBank[] = []
      const seen = new Set<string>()

      // Default bank from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('default_bank_name, default_bank_account_name, default_bank_sort_code, default_bank_account_number')
        .eq('id', user.id)
        .single()

      if (profile?.default_bank_account_number) {
        const key = profile.default_bank_account_number
        seen.add(key)
        banks.push({
          label: `${profile.default_bank_account_name} (${profile.default_bank_name || 'Default'})`,
          bank_name: profile.default_bank_name || '',
          bank_account_name: profile.default_bank_account_name || '',
          bank_sort_code: profile.default_bank_sort_code || '',
          bank_account_number: profile.default_bank_account_number,
        })
      }

      // Bank details from existing children
      const { data: children } = await supabase
        .from('children')
        .select('bank_name, bank_account_name, bank_sort_code, bank_account_number')
        .eq('childminder_id', user.id)
        .not('bank_account_number', 'is', null)

      for (const c of children || []) {
        if (!c.bank_account_number || seen.has(c.bank_account_number)) continue
        seen.add(c.bank_account_number)
        banks.push({
          label: `${c.bank_account_name} (${c.bank_name || 'saved'})`,
          bank_name: c.bank_name || '',
          bank_account_name: c.bank_account_name || '',
          bank_sort_code: c.bank_sort_code || '',
          bank_account_number: c.bank_account_number,
        })
      }

      setSavedBanks(banks)
    }
    loadSavedBanks()
  }, [])

  const [hasSchedule, setHasSchedule] = useState(
    !!(child?.schedule_days && child.schedule_days.length > 0)
  )
  const [form, setForm] = useState<ChildFormData>(
    child ? {
      first_name: child.first_name,
      last_name: child.last_name,
      date_of_birth: child.date_of_birth,
      parent_name: child.parent_name,
      parent_email: child.parent_email,
      parent_phone: child.parent_phone,
      daily_rate: child.daily_rate,
      bank_account_name: child.bank_account_name,
      bank_sort_code: child.bank_sort_code,
      bank_account_number: child.bank_account_number,
      bank_name: child.bank_name,
      notes: child.notes,
      is_active: child.is_active,
      half_day_rate: child.half_day_rate,
      hourly_rate: child.hourly_rate,
      hours_per_day: child.hours_per_day,
      schedule_days: child.schedule_days,
      schedule_note: child.schedule_note,
      funding_type: child.funding_type || 'none',
      funded_hours_per_day: child.funded_hours_per_day,
      funded_days: child.funded_days,
    } : emptyForm
  )

  function set(field: keyof ChildFormData, value: string | number | boolean | null | ScheduleDay[] | string[]) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleScheduleDay(day: string) {
    const current: ScheduleDay[] = form.schedule_days || []
    const exists = current.find(d => d.day === day)
    if (exists) {
      set('schedule_days', current.filter(d => d.day !== day))
    } else {
      set('schedule_days', [...current, { day, type: 'full' }])
    }
  }

  function setDayType(day: string, type: 'full' | 'half') {
    const current: ScheduleDay[] = form.schedule_days || []
    set('schedule_days', current.map(d => d.day === day ? { ...d, type } : d))
  }

  function getScheduledDay(day: string): ScheduleDay | undefined {
    return (form.schedule_days || []).find(d => d.day === day)
  }

  function weeklyTotal() {
    const days = form.schedule_days || []
    return days.reduce((sum, d) => {
      if (d.type === 'half') {
        const halfRate = form.half_day_rate || (Number(form.daily_rate) / 2)
        return sum + halfRate
      }
      if (form.hourly_rate && form.hours_per_day && !form.daily_rate) {
        return sum + (Number(form.hourly_rate) * Number(form.hours_per_day))
      }
      return sum + Number(form.daily_rate)
    }, 0)
  }

  const [rateError, setRateError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // At least one rate must be set
    if (!form.daily_rate && !form.half_day_rate && !form.hourly_rate) {
      setRateError('Please enter at least one rate — daily, half day, or hourly.')
      return
    }
    // Funded children need an hourly rate for splitting funded vs private hours
    if (form.funding_type !== 'none' && !form.hourly_rate) {
      setRateError('Children with government funding need an hourly rate to split funded and private hours on invoices.')
      return
    }
    if (form.funding_type !== 'none' && !form.funded_hours_per_day) {
      setRateError('Please set the funded hours per day.')
      return
    }
    setRateError('')

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      ...form,
      daily_rate: form.daily_rate ? Number(form.daily_rate) : null,
      half_day_rate: form.half_day_rate ? Number(form.half_day_rate) : null,
      hourly_rate: form.hourly_rate ? Number(form.hourly_rate) : null,
      hours_per_day: form.hours_per_day ? Number(form.hours_per_day) : null,
      schedule_days: hasSchedule ? (form.schedule_days || []) : [],
      schedule_note: hasSchedule ? form.schedule_note : null,
      funding_type: form.funding_type,
      funded_hours_per_day: form.funding_type !== 'none' ? (form.funded_hours_per_day ? Number(form.funded_hours_per_day) : null) : null,
      funded_days: form.funding_type !== 'none' ? (form.funded_days || null) : null,
    }

    if (mode === 'new') {
      const { error } = await supabase.from('children').insert({
        ...payload,
        childminder_id: user.id,
      })
      if (error) {
        toast.error('Failed to add child')
        setSaving(false)
        return
      }
      toast.success(`${form.first_name} added!`)
      router.push('/children')
    } else {
      const { error } = await supabase
        .from('children')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', child!.id)
      if (error) {
        toast.error('Failed to update child')
        setSaving(false)
        return
      }
      toast.success('Changes saved')
      router.push('/children')
    }
  }

  async function handleDelete() {
    if (!child) return
    if (!confirm(`Remove ${child.first_name} ${child.last_name}? This cannot be undone.`)) return
    const { error } = await supabase.from('children').delete().eq('id', child.id)
    if (error) {
      toast.error('Failed to remove child')
      return
    }
    toast.success('Child removed')
    router.push('/children')
  }

  const scheduledDays = form.schedule_days || []

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Child details */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Baby className="h-4 w-4 text-emerald-600" />
            Child details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">First name</Label>
              <Input
                value={form.first_name}
                onChange={e => set('first_name', e.target.value)}
                placeholder="Emma"
                className="h-12 text-base"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Last name</Label>
              <Input
                value={form.last_name}
                onChange={e => set('last_name', e.target.value)}
                placeholder="Smith"
                className="h-12 text-base"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Date of birth
              <span className="text-red-500 ml-0.5">*</span>
            </Label>
            <Input
              type="date"
              value={form.date_of_birth || ''}
              onChange={e => set('date_of_birth', e.target.value || null)}
              className="h-12 text-base"
              required
            />
            <p className="text-xs text-gray-400">Used by parents to securely access their invoice</p>
          </div>
          {/* Government-funded hours */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Government-funded hours</Label>
            <p className="text-xs text-gray-500">If this child receives free entitlement hours, invoices will show funded hours separately at no charge (per DfE guidance).</p>
            <div className="flex gap-2">
              {([['none', 'None'], ['15', '15 hrs/week'], ['30', '30 hrs/week']] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => set('funding_type', value)}
                  className={`flex-1 h-10 rounded-lg text-sm font-medium transition-colors ${
                    form.funding_type === value
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {form.funding_type !== 'none' && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Funded hours per day</Label>
                <Input
                  type="number"
                  min="0.5"
                  max="10"
                  step="0.5"
                  value={form.funded_hours_per_day || ''}
                  onChange={e => set('funded_hours_per_day', e.target.value ? Number(e.target.value) : null)}
                  placeholder="e.g. 5 or 6"
                  className="h-12 text-base max-w-[160px]"
                />
                {form.funded_hours_per_day && form.funded_days && form.funded_days.length > 0 && (
                  <p className="text-xs text-gray-400">
                    {Number(form.funded_hours_per_day) * form.funded_days.length} funded hrs/week across {form.funded_days.length} day{form.funded_days.length > 1 ? 's' : ''}
                    {Number(form.funded_hours_per_day) * form.funded_days.length > Number(form.funding_type) && (
                      <span className="text-amber-600 font-medium ml-1">
                        (exceeds {form.funding_type}hr entitlement cap)
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Which days are funded?</Label>
                <p className="text-xs text-gray-500">Select the specific days covered by government funding</p>
                <div className="flex gap-2">
                  {DAYS.map(day => {
                    const isScheduled = (form.schedule_days || []).some(d => d.day === day)
                    const isFunded = (form.funded_days || []).includes(day)
                    if (!isScheduled) return null
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const current = form.funded_days || []
                          if (isFunded) {
                            set('funded_days', current.filter(d => d !== day))
                          } else {
                            set('funded_days', [...current, day])
                          }
                        }}
                        className={`flex-1 h-10 rounded-lg text-sm font-medium transition-colors ${
                          isFunded
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {DAY_LABELS[day]}
                      </button>
                    )
                  })}
                </div>
                {(!form.schedule_days || form.schedule_days.length === 0) && (
                  <p className="text-xs text-amber-600">Set up a fixed schedule below first, then come back to select which days are funded.</p>
                )}
              </div>
            </>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Daily rate (£) <span className="text-gray-400 font-normal text-xs">(optional)</span>
              </Label>
              <Input
                type="number"
                min="0"
                step="0.50"
                value={form.daily_rate || ''}
                onChange={e => { set('daily_rate', e.target.value ? Number(e.target.value) : 0); setRateError('') }}
                placeholder="45.00"
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Half day rate (£) <span className="text-gray-400 font-normal text-xs">(optional)</span>
              </Label>
              <Input
                type="number"
                min="0"
                step="0.50"
                value={form.half_day_rate || ''}
                onChange={e => { set('half_day_rate', e.target.value ? Number(e.target.value) : null); setRateError('') }}
                placeholder="25.00"
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Hourly rate (£) <span className="text-gray-400 font-normal text-xs">(optional)</span>
              </Label>
              <Input
                type="number"
                min="0"
                step="0.50"
                value={form.hourly_rate || ''}
                onChange={e => { set('hourly_rate', e.target.value ? Number(e.target.value) : null); setRateError('') }}
                placeholder="6.00"
                className="h-12 text-base"
              />
            </div>
          </div>
          {/* Hours per day — shown when hourly rate is set */}
          {form.hourly_rate ? (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Hours per day
                <span className="text-gray-400 font-normal text-xs ml-1">(used to calculate scheduled hours)</span>
              </Label>
              <Input
                type="number"
                min="0.5"
                max="24"
                step="0.5"
                value={form.hours_per_day || ''}
                onChange={e => set('hours_per_day', e.target.value ? Number(e.target.value) : null)}
                placeholder="8"
                className="h-12 text-base max-w-[140px]"
              />
              {form.hours_per_day && form.hourly_rate && (
                <p className="text-xs text-gray-400">
                  Daily equivalent: £{(Number(form.hourly_rate) * Number(form.hours_per_day)).toFixed(2)}
                </p>
              )}
            </div>
          ) : null}
          {form.funding_type !== 'none' && !form.hourly_rate && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-700 font-medium">
                An hourly rate is required for children with funded hours — it&apos;s used to calculate private hours on invoices.
              </p>
            </div>
          )}

          {form.funding_type !== 'none' && form.hourly_rate && form.funded_hours_per_day && form.funded_days && form.funded_days.length > 0 && (
            <div className="bg-green-50 rounded-lg p-3 space-y-1">
              <p className="text-xs text-green-700 font-medium">Weekly invoice breakdown:</p>
              <p className="text-xs text-green-600">
                Funded: {(Number(form.funded_hours_per_day) * form.funded_days.length).toFixed(1)} hrs @ FREE (term time only — 38 weeks/year)
              </p>
              <p className="text-xs text-green-600">
                Private: billed at £{Number(form.hourly_rate).toFixed(2)}/hr for any additional hours
              </p>
            </div>
          )}

          {rateError && (
            <p className="text-sm text-red-600 font-medium">{rateError}</p>
          )}
        </CardContent>
      </Card>

      {/* Fixed schedule */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-600" />
            Fixed weekly schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">Has fixed schedule</p>
              <p className="text-xs text-gray-500">Pre-fills invoice dates automatically</p>
            </div>
            <Switch
              checked={hasSchedule}
              onCheckedChange={val => {
                setHasSchedule(val)
                if (!val) set('schedule_days', [])
              }}
            />
          </div>

          {hasSchedule && (
            <>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Select days</Label>
                <div className="flex gap-2">
                  {DAYS.map(day => {
                    const scheduled = getScheduledDay(day)
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleScheduleDay(day)}
                        className={`flex-1 h-10 rounded-lg text-sm font-medium transition-colors ${
                          scheduled
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {DAY_LABELS[day]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {scheduledDays.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Full or half day?</Label>
                  <div className="space-y-2">
                    {scheduledDays.map(sd => (
                      <div key={sd.day} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                        <span className="text-sm font-medium capitalize">{sd.day}</span>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setDayType(sd.day, 'full')}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              sd.type === 'full'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white border border-gray-200 text-gray-600'
                            }`}
                          >
                            Full
                          </button>
                          <button
                            type="button"
                            onClick={() => setDayType(sd.day, 'half')}
                            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              sd.type === 'half'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white border border-gray-200 text-gray-600'
                            }`}
                          >
                            Half
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3">
                    <p className="text-xs text-emerald-700 font-medium">
                      Weekly total: £{weeklyTotal().toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-sm font-medium">Schedule notes (optional)</Label>
                <Textarea
                  value={form.schedule_note || ''}
                  onChange={e => set('schedule_note', e.target.value || null)}
                  placeholder="e.g. Term time only, or any exceptions..."
                  className="text-base resize-none"
                  rows={2}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>


      {/* Parent details */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-emerald-600" />
            Parent / guardian details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Parent name(s)</Label>
            <Input
              value={form.parent_name}
              onChange={e => set('parent_name', e.target.value)}
              placeholder="John & Sarah Smith"
              className="h-12 text-base"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Parent email</Label>
            <Input
              type="email"
              value={form.parent_email}
              onChange={e => set('parent_email', e.target.value)}
              placeholder="parents@example.com"
              className="h-12 text-base"
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Parent phone (optional)</Label>
            <Input
              type="tel"
              value={form.parent_phone}
              onChange={e => set('parent_phone', e.target.value)}
              placeholder="07700 900000"
              className="h-12 text-base"
            />
          </div>
        </CardContent>
      </Card>

      {/* Bank details */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Landmark className="h-4 w-4 text-emerald-600" />
            Payment details for this child
          </CardTitle>
          <p className="text-xs text-gray-500">These bank details will appear on invoices for {form.first_name || 'this child'}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {savedBanks.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Use saved account</Label>
              <Select onValueChange={v => {
                const bank = savedBanks.find(b => b.bank_account_number === v)
                if (bank) {
                  set('bank_name', bank.bank_name)
                  set('bank_account_name', bank.bank_account_name)
                  set('bank_sort_code', bank.bank_sort_code)
                  set('bank_account_number', bank.bank_account_number)
                }
              }}>
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Pick a saved account…" />
                </SelectTrigger>
                <SelectContent>
                  {savedBanks.map(b => (
                    <SelectItem key={b.bank_account_number} value={b.bank_account_number}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Bank name</Label>
            <Input
              value={form.bank_name}
              onChange={e => set('bank_name', e.target.value)}
              placeholder="Barclays"
              className="h-12 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Account name</Label>
            <Input
              value={form.bank_account_name}
              onChange={e => set('bank_account_name', e.target.value)}
              placeholder="Jane Smith"
              className="h-12 text-base"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sort code</Label>
              <Input
                value={form.bank_sort_code}
                onChange={e => set('bank_sort_code', e.target.value)}
                placeholder="00-00-00"
                className="h-12 text-base"
                maxLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Account number</Label>
              <Input
                value={form.bank_account_number}
                onChange={e => set('bank_account_number', e.target.value)}
                placeholder="12345678"
                className="h-12 text-base"
                maxLength={8}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes + active */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="h-4 w-4 text-emerald-600" />
            Additional info
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Notes (optional)</Label>
            <Textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Any additional notes about this child..."
              className="text-base resize-none"
              rows={3}
            />
          </div>
          {mode === 'edit' && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Active</p>
                <p className="text-xs text-gray-500">Inactive children are hidden from invoice creation</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={val => set('is_active', val)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        type="submit"
        className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
        disabled={saving}
      >
        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === 'new' ? 'Add child' : 'Save changes'}
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
            Remove child
          </Button>
        </>
      )}
    </form>
  )
}
