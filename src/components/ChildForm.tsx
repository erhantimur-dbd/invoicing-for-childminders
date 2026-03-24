'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Loader2, User, Phone, Landmark, Baby } from 'lucide-react'
import type { Child } from '@/lib/types'

type ChildFormData = Omit<Child, 'id' | 'childminder_id' | 'created_at' | 'updated_at'>

const emptyForm: ChildFormData = {
  first_name: '',
  last_name: '',
  date_of_birth: null,
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
}

type Props = {
  child?: Child
  mode: 'new' | 'edit'
}

export default function ChildForm({ child, mode }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
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
    } : emptyForm
  )

  function set(field: keyof ChildFormData, value: string | number | boolean | null) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (mode === 'new') {
      const { error } = await supabase.from('children').insert({
        ...form,
        daily_rate: Number(form.daily_rate),
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
        .update({ ...form, daily_rate: Number(form.daily_rate), updated_at: new Date().toISOString() })
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
            <Label className="text-sm font-medium">Date of birth (optional)</Label>
            <Input
              type="date"
              value={form.date_of_birth || ''}
              onChange={e => set('date_of_birth', e.target.value || null)}
              className="h-12 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Daily rate (£)</Label>
            <Input
              type="number"
              min="0"
              step="0.50"
              value={form.daily_rate || ''}
              onChange={e => set('daily_rate', e.target.value)}
              placeholder="45.00"
              className="h-12 text-base"
              required
            />
          </div>
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
