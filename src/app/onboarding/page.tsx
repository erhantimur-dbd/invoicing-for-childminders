'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, ChevronRight, ChevronLeft, Check, Plus, Trash2, User, MapPin, Landmark, Users, Calendar, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

type ScheduleDay = { day: string; type: 'full' | 'half' }

type ChildDraft = {
  id: string // temp local id
  first_name: string
  last_name: string
  date_of_birth: string
  parent_name: string
  parent_email: string
  parent_phone: string
  daily_rate: string
  half_day_rate: string
  notes: string
  use_default_bank: boolean
  bank_name: string
  bank_account_name: string
  bank_sort_code: string
  bank_account_number: string
  // schedule
  has_schedule: boolean
  schedule_days: ScheduleDay[]
  schedule_note: string
}

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri',
}

function emptyChild(id: string): ChildDraft {
  return {
    id, first_name: '', last_name: '', date_of_birth: '', parent_name: '',
    parent_email: '', parent_phone: '', daily_rate: '', half_day_rate: '',
    notes: '', use_default_bank: true, bank_name: '', bank_account_name: '',
    bank_sort_code: '', bank_account_number: '', has_schedule: false,
    schedule_days: [], schedule_note: '',
  }
}

// ─── Step indicator ──────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Your details', icon: User },
  { label: 'Bank details', icon: Landmark },
  { label: 'Children', icon: Users },
  { label: 'Schedules', icon: Calendar },
]

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((s, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all',
                done ? 'bg-emerald-600 text-white' :
                active ? 'bg-emerald-600 text-white ring-4 ring-emerald-100' :
                'bg-gray-100 text-gray-400'
              )}>
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn(
                'text-xs mt-1 font-medium hidden sm:block',
                active ? 'text-emerald-700' : done ? 'text-emerald-500' : 'text-gray-400'
              )}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                'h-0.5 w-8 sm:w-12 mx-1 mb-4 transition-all',
                done ? 'bg-emerald-500' : 'bg-gray-200'
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main wizard ─────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState('')

  // Step 1 — profile
  const [profile, setProfile] = useState({
    full_name: '', phone: '',
    address_line1: '', address_line2: '', city: '', postcode: '',
  })

  // Step 2 — default bank
  const [bank, setBank] = useState({
    default_bank_name: '', default_bank_account_name: '',
    default_bank_sort_code: '', default_bank_account_number: '',
  })

  // Step 3 — children
  const [children, setChildren] = useState<ChildDraft[]>([emptyChild('1')])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile({
          full_name: data.full_name || '',
          phone: data.phone || '',
          address_line1: data.address_line1 || '',
          address_line2: data.address_line2 || '',
          city: data.city || '',
          postcode: data.postcode || '',
        })
        setBank({
          default_bank_name: data.default_bank_name || '',
          default_bank_account_name: data.default_bank_account_name || '',
          default_bank_sort_code: data.default_bank_sort_code || '',
          default_bank_account_number: data.default_bank_account_number || '',
        })
      }
    }
    load()
  }, [])

  // ── Step savers ─────────────────────────────────────────────

  async function saveStep1() {
    setSaving(true)
    const { error } = await supabase.from('profiles')
      .update({ ...profile, updated_at: new Date().toISOString() })
      .eq('id', userId)
    setSaving(false)
    if (error) { toast.error('Could not save details'); return false }
    return true
  }

  async function saveStep2() {
    setSaving(true)
    // Save to legacy profile columns for backward compat
    await supabase.from('profiles')
      .update({ ...bank, updated_at: new Date().toISOString() })
      .eq('id', userId)

    // Also save into bank_accounts table (upsert based on childminder + nickname)
    if (bank.default_bank_account_number) {
      // Check if one already exists
      const { data: existing } = await supabase
        .from('bank_accounts')
        .select('id')
        .eq('childminder_id', userId)
        .limit(1)
        .single()

      if (existing) {
        // Update the first account
        await supabase.from('bank_accounts').update({
          bank_name: bank.default_bank_name || '',
          account_name: bank.default_bank_account_name || '',
          sort_code: bank.default_bank_sort_code || '',
          account_number: bank.default_bank_account_number || '',
          updated_at: new Date().toISOString(),
        }).eq('id', existing.id)
      } else {
        // Insert new and set as primary
        const { data: newBank } = await supabase.from('bank_accounts').insert({
          childminder_id: userId,
          nickname: 'Default',
          bank_name: bank.default_bank_name || '',
          account_name: bank.default_bank_account_name || '',
          sort_code: bank.default_bank_sort_code || '',
          account_number: bank.default_bank_account_number || '',
        }).select().single()
        if (newBank) {
          await supabase.from('profiles')
            .update({ primary_bank_account_id: newBank.id })
            .eq('id', userId)
        }
      }
    }

    setSaving(false)
    return true
  }

  async function saveStep3AndComplete() {
    setSaving(true)

    // Filter out empty children
    const validChildren = children.filter(c => c.first_name.trim() && c.parent_email.trim())

    for (const child of validChildren) {
      const bankFields = child.use_default_bank
        ? { bank_name: bank.default_bank_name, bank_account_name: bank.default_bank_account_name, bank_sort_code: bank.default_bank_sort_code, bank_account_number: bank.default_bank_account_number }
        : { bank_name: child.bank_name, bank_account_name: child.bank_account_name, bank_sort_code: child.bank_sort_code, bank_account_number: child.bank_account_number }

      const { error } = await supabase.from('children').insert({
        childminder_id: userId,
        first_name: child.first_name.trim(),
        last_name: child.last_name.trim(),
        date_of_birth: child.date_of_birth || null,
        parent_name: child.parent_name.trim(),
        parent_email: child.parent_email.trim(),
        parent_phone: child.parent_phone.trim(),
        daily_rate: parseFloat(child.daily_rate) || 0,
        half_day_rate: child.half_day_rate ? parseFloat(child.half_day_rate) : null,
        notes: child.notes.trim(),
        schedule_days: child.has_schedule ? child.schedule_days : [],
        schedule_note: child.schedule_note.trim(),
        ...bankFields,
      })
      if (error) { toast.error(`Failed to save ${child.first_name}`); setSaving(false); return false }
    }

    // Mark onboarding complete
    await supabase.from('profiles')
      .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
      .eq('id', userId)

    setSaving(false)
    return true
  }

  // ── Navigation ──────────────────────────────────────────────

  async function handleNext() {
    if (step === 0) {
      if (!profile.full_name.trim()) { toast.error('Please enter your name'); return }
      const ok = await saveStep1()
      if (!ok) return
    }
    if (step === 1) {
      const ok = await saveStep2()
      if (!ok) return
    }
    // Step 2 (children) just moves to step 3 (schedules) — saving happens at finish
    setStep(s => s + 1)
  }

  async function handleSkip() {
    if (step === 3) {
      // Finishing from schedules step — save what we have
      await saveStep3AndComplete()
      router.push('/dashboard')
      return
    }
    if (step === 2) {
      // Skip children step — go to schedules (which will be empty)
      setStep(3)
      return
    }
    setStep(s => s + 1)
  }

  async function handleFinish() {
    const ok = await saveStep3AndComplete()
    if (!ok) return
    toast.success('Setup complete! Welcome.')
    router.push('/dashboard')
  }

  // ── Child helpers ───────────────────────────────────────────

  function updateChild(id: string, field: keyof ChildDraft, value: any) {
    setChildren(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))
  }

  function addChild() {
    setChildren(prev => [...prev, emptyChild(Date.now().toString())])
  }

  function removeChild(id: string) {
    if (children.length === 1) return
    setChildren(prev => prev.filter(c => c.id !== id))
  }

  function toggleScheduleDay(childId: string, day: string) {
    setChildren(prev => prev.map(c => {
      if (c.id !== childId) return c
      const exists = c.schedule_days.find(d => d.day === day)
      if (exists) {
        return { ...c, schedule_days: c.schedule_days.filter(d => d.day !== day) }
      } else {
        return { ...c, schedule_days: [...c.schedule_days, { day, type: 'full' }] }
      }
    }))
  }

  function setScheduleDayType(childId: string, day: string, type: 'full' | 'half') {
    setChildren(prev => prev.map(c => {
      if (c.id !== childId) return c
      return { ...c, schedule_days: c.schedule_days.map(d => d.day === day ? { ...d, type } : d) }
    }))
  }

  function calcWeeklyCost(child: ChildDraft) {
    if (!child.has_schedule) return 0
    return child.schedule_days.reduce((sum, d) => {
      const rate = d.type === 'half'
        ? (parseFloat(child.half_day_rate) || parseFloat(child.daily_rate) / 2 || 0)
        : (parseFloat(child.daily_rate) || 0)
      return sum + rate
    }, 0)
  }

  // ── Render ──────────────────────────────────────────────────

  const childrenWithSchedules = children.filter(c => c.first_name.trim() && c.has_schedule)

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-600 rounded-2xl mb-3">
          <span className="text-white text-xl font-bold">C</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Let's get you set up</h1>
        <p className="text-gray-500 text-sm mt-1">Takes about 2 minutes</p>
      </div>

      <StepIndicator current={step} />

      {/* ── STEP 0: Your details ─────────────────────────────── */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="text-center mb-2">
            <h2 className="text-lg font-semibold text-gray-900">Your details</h2>
            <p className="text-sm text-gray-500">These appear on every invoice you send</p>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Full name <span className="text-red-500">*</span></Label>
                <Input value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} placeholder="Jane Smith" className="h-12 text-base" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Phone number</Label>
                <Input type="tel" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="07700 900000" className="h-12 text-base" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Address line 1</Label>
                <Input value={profile.address_line1} onChange={e => setProfile(p => ({ ...p, address_line1: e.target.value }))} placeholder="123 Main Street" className="h-12 text-base" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Address line 2 <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input value={profile.address_line2} onChange={e => setProfile(p => ({ ...p, address_line2: e.target.value }))} placeholder="Flat 2" className="h-12 text-base" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Town / City</Label>
                  <Input value={profile.city} onChange={e => setProfile(p => ({ ...p, city: e.target.value }))} placeholder="London" className="h-12 text-base" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Postcode</Label>
                  <Input value={profile.postcode} onChange={e => setProfile(p => ({ ...p, postcode: e.target.value }))} placeholder="SW1A 1AA" className="h-12 text-base" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── STEP 1: Bank details ─────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="text-center mb-2">
            <h2 className="text-lg font-semibold text-gray-900">Your bank details</h2>
            <p className="text-sm text-gray-500">Shown on invoices so parents know where to pay</p>
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Bank name</Label>
                <Input value={bank.default_bank_name} onChange={e => setBank(b => ({ ...b, default_bank_name: e.target.value }))} placeholder="Barclays" className="h-12 text-base" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Account name</Label>
                <Input value={bank.default_bank_account_name} onChange={e => setBank(b => ({ ...b, default_bank_account_name: e.target.value }))} placeholder="Jane Smith" className="h-12 text-base" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sort code</Label>
                  <Input value={bank.default_bank_sort_code} onChange={e => setBank(b => ({ ...b, default_bank_sort_code: e.target.value }))} placeholder="00-00-00" className="h-12 text-base" maxLength={8} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Account number</Label>
                  <Input value={bank.default_bank_account_number} onChange={e => setBank(b => ({ ...b, default_bank_account_number: e.target.value }))} placeholder="12345678" className="h-12 text-base" maxLength={8} />
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex gap-2">
            <div className="text-emerald-600 text-lg mt-0.5">ℹ</div>
            <p className="text-xs text-emerald-800">These will be applied to all children automatically. You can set different details per child later if needed.</p>
          </div>
        </div>
      )}

      {/* ── STEP 2: Children ─────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="text-center mb-2">
            <h2 className="text-lg font-semibold text-gray-900">Add the children you look after</h2>
            <p className="text-sm text-gray-500">You can add more at any time</p>
          </div>

          {children.map((child, idx) => (
            <Card key={child.id} className="border-0 shadow-sm">
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-emerald-700">Child {idx + 1}</p>
                  {children.length > 1 && (
                    <button onClick={() => removeChild(child.id)} className="text-red-400 hover:text-red-600 p-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Child name */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">First name <span className="text-red-500">*</span></Label>
                    <Input value={child.first_name} onChange={e => updateChild(child.id, 'first_name', e.target.value)} placeholder="Emma" className="h-11 text-base" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Last name</Label>
                    <Input value={child.last_name} onChange={e => updateChild(child.id, 'last_name', e.target.value)} placeholder="Smith" className="h-11 text-base" />
                  </div>
                </div>

                {/* Parent */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Parent / guardian name <span className="text-red-500">*</span></Label>
                  <Input value={child.parent_name} onChange={e => updateChild(child.id, 'parent_name', e.target.value)} placeholder="John & Sarah Smith" className="h-11 text-base" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Parent email <span className="text-red-500">*</span></Label>
                  <Input type="email" value={child.parent_email} onChange={e => updateChild(child.id, 'parent_email', e.target.value)} placeholder="parents@email.com" className="h-11 text-base" />
                </div>

                {/* Rates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Full day rate (£)</Label>
                    <Input type="number" min="0" step="0.50" value={child.daily_rate} onChange={e => updateChild(child.id, 'daily_rate', e.target.value)} placeholder="45.00" className="h-11 text-base" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Half day rate (£)</Label>
                    <Input type="number" min="0" step="0.50" value={child.half_day_rate} onChange={e => updateChild(child.id, 'half_day_rate', e.target.value)} placeholder="25.00" className="h-11 text-base" />
                  </div>
                </div>

                {/* Different bank toggle */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => updateChild(child.id, 'use_default_bank', !child.use_default_bank)}
                    className="flex items-center gap-2 text-sm text-emerald-700 font-medium"
                  >
                    <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center', child.use_default_bank ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300')}>
                      {child.use_default_bank && <Check className="h-3 w-3 text-white" />}
                    </div>
                    Use my default bank details
                  </button>
                  {!child.use_default_bank && (
                    <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded-lg">
                      <Input value={child.bank_name} onChange={e => updateChild(child.id, 'bank_name', e.target.value)} placeholder="Bank name" className="h-11 text-base" />
                      <Input value={child.bank_account_name} onChange={e => updateChild(child.id, 'bank_account_name', e.target.value)} placeholder="Account name" className="h-11 text-base" />
                      <div className="grid grid-cols-2 gap-2">
                        <Input value={child.bank_sort_code} onChange={e => updateChild(child.id, 'bank_sort_code', e.target.value)} placeholder="Sort code" className="h-11 text-base" maxLength={8} />
                        <Input value={child.bank_account_number} onChange={e => updateChild(child.id, 'bank_account_number', e.target.value)} placeholder="Acc number" className="h-11 text-base" maxLength={8} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Fixed schedule toggle */}
                <div className="pt-1 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => updateChild(child.id, 'has_schedule', !child.has_schedule)}
                    className="flex items-center gap-2 text-sm text-emerald-700 font-medium mt-3"
                  >
                    <div className={cn('w-4 h-4 rounded border-2 flex items-center justify-center', child.has_schedule ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300')}>
                      {child.has_schedule && <Check className="h-3 w-3 text-white" />}
                    </div>
                    {child.first_name ? `${child.first_name} has` : 'They have'} a fixed weekly schedule
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button
            type="button"
            variant="outline"
            className="w-full h-12 border-dashed border-emerald-300 text-emerald-700 gap-2"
            onClick={addChild}
          >
            <Plus className="h-4 w-4" />
            Add another child
          </Button>
        </div>
      )}

      {/* ── STEP 3: Schedules ────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="text-center mb-2">
            <h2 className="text-lg font-semibold text-gray-900">Fixed weekly schedules</h2>
            <p className="text-sm text-gray-500">Set which days each child attends. Invoices will be pre-filled automatically.</p>
          </div>

          {childrenWithSchedules.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-10 text-center">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No fixed schedules to set up.</p>
                <p className="text-gray-400 text-xs mt-1">You can add schedules any time from the Children section.</p>
              </CardContent>
            </Card>
          ) : (
            childrenWithSchedules.map(child => (
              <Card key={child.id} className="border-0 shadow-sm">
                <CardContent className="pt-4 space-y-4">
                  <div>
                    <p className="font-semibold text-gray-900">{child.first_name} {child.last_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Select which days and full or half day</p>
                  </div>

                  {/* Day grid */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {DAYS.map(day => {
                      const selected = child.schedule_days.find(d => d.day === day)
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => toggleScheduleDay(child.id, day)}
                          className={cn(
                            'rounded-xl py-2 text-xs font-bold transition-all border-2',
                            selected
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'bg-gray-50 border-gray-100 text-gray-400 hover:border-emerald-200'
                          )}
                        >
                          {DAY_LABELS[day]}
                        </button>
                      )
                    })}
                  </div>

                  {/* Full / Half selector for each selected day */}
                  {child.schedule_days.length > 0 && (
                    <div className="space-y-2 bg-gray-50 rounded-xl p-3">
                      {child.schedule_days.map(sd => (
                        <div key={sd.day} className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700 capitalize w-24">{sd.day}</span>
                          <div className="flex gap-1">
                            {(['full', 'half'] as const).map(type => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => setScheduleDayType(child.id, sd.day, type)}
                                className={cn(
                                  'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                                  sd.type === type
                                    ? 'bg-emerald-600 border-emerald-600 text-white'
                                    : 'bg-white border-gray-200 text-gray-500 hover:border-emerald-300'
                                )}
                              >
                                {type === 'full' ? 'Full day' : 'Half day'}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Weekly cost preview */}
                  {child.schedule_days.length > 0 && (
                    <div className="bg-emerald-50 rounded-xl p-3 flex items-center justify-between">
                      <span className="text-sm text-emerald-700 font-medium">Weekly total</span>
                      <span className="text-base font-bold text-emerald-700">
                        £{calcWeeklyCost(child).toFixed(2)}
                      </span>
                    </div>
                  )}

                  {/* Schedule notes */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Schedule notes <span className="text-gray-400 font-normal">(optional)</span></Label>
                    <Textarea
                      value={child.schedule_note}
                      onChange={e => updateChild(child.id, 'schedule_note', e.target.value)}
                      placeholder="e.g. Term time only, not August"
                      className="text-base resize-none"
                      rows={2}
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ── Navigation buttons ───────────────────────────────── */}
      <div className="mt-6 space-y-3">
        {step === 3 ? (
          <Button
            className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
            onClick={handleFinish}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <>All done — take me to my dashboard <ChevronRight className="h-5 w-5 ml-1" /></>
            )}
          </Button>
        ) : (
          <Button
            className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
            onClick={handleNext}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : (
              <>Continue <ChevronRight className="h-5 w-5 ml-1" /></>
            )}
          </Button>
        )}

        <div className="flex gap-3">
          {step > 0 && (
            <Button
              variant="outline"
              className="flex-1 h-11"
              onClick={() => setStep(s => s - 1)}
              disabled={saving}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          )}
          <Button
            variant="ghost"
            className={cn('h-11 text-gray-400 gap-1', step > 0 ? 'flex-1' : 'w-full')}
            onClick={handleSkip}
            disabled={saving}
          >
            <SkipForward className="h-4 w-4" />
            {step === 3 ? 'Skip schedules' : 'Skip for now'}
          </Button>
        </div>
      </div>

      {/* Step counter */}
      <p className="text-center text-xs text-gray-400 mt-4">Step {step + 1} of {STEPS.length}</p>
    </div>
  )
}
