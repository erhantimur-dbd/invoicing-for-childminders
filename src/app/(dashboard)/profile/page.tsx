'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Loader2, LogOut, User, MapPin, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/lib/types'
import BankAccountsSection from '@/components/BankAccountsSection'

type ProfileForm = Partial<Profile>

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string>('')
  const [primaryBankId, setPrimaryBankId] = useState<string | null>(null)
  const [profile, setProfile] = useState<ProfileForm>({
    full_name: '',
    email: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postcode: '',
    ofsted_number: '',
    show_ofsted_on_invoice: false,
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        setPrimaryBankId(data.primary_bank_account_id ?? null)
      }
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function set(field: keyof ProfileForm, value: string | boolean) {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        phone: profile.phone,
        address_line1: profile.address_line1,
        address_line2: profile.address_line2,
        city: profile.city,
        postcode: profile.postcode,
        ofsted_number: profile.ofsted_number || null,
        show_ofsted_on_invoice: profile.show_ofsted_on_invoice ?? false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
    if (error) {
      toast.error('Failed to save settings')
    } else {
      toast.success('Settings saved')
    }
    setSaving(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Your details appear on every invoice</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">

        {/* ── Personal details ─────────────────────────────────── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-7 h-7 bg-emerald-100 rounded-lg flex items-center justify-center">
                <User className="h-4 w-4 text-emerald-600" />
              </div>
              Personal details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name" className="text-sm font-medium">Full name</Label>
                <Input
                  id="full_name"
                  value={profile.full_name || ''}
                  onChange={e => set('full_name', e.target.value)}
                  placeholder="Jane Smith"
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm font-medium">Phone number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone || ''}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="07700 900000"
                  className="h-11"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
              <Input
                id="email"
                value={profile.email || ''}
                disabled
                className="h-11 bg-gray-50 text-gray-400"
              />
              <p className="text-xs text-gray-400">Email cannot be changed here</p>
            </div>
          </CardContent>
        </Card>

        {/* ── Address ──────────────────────────────────────────── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-7 h-7 bg-sky-100 rounded-lg flex items-center justify-center">
                <MapPin className="h-4 w-4 text-sky-600" />
              </div>
              Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="address_line1" className="text-sm font-medium">Address line 1</Label>
              <Input
                id="address_line1"
                value={profile.address_line1 || ''}
                onChange={e => set('address_line1', e.target.value)}
                placeholder="123 Main Street"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address_line2" className="text-sm font-medium">
                Address line 2 <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Input
                id="address_line2"
                value={profile.address_line2 || ''}
                onChange={e => set('address_line2', e.target.value)}
                placeholder="Flat, suite, etc."
                className="h-11"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="city" className="text-sm font-medium">City / Town</Label>
                <Input
                  id="city"
                  value={profile.city || ''}
                  onChange={e => set('city', e.target.value)}
                  placeholder="London"
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="postcode" className="text-sm font-medium">Postcode</Label>
                <Input
                  id="postcode"
                  value={profile.postcode || ''}
                  onChange={e => set('postcode', e.target.value)}
                  placeholder="SW1A 1AA"
                  className="h-11"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Ofsted & invoicing ───────────────────────────────── */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-7 h-7 bg-amber-100 rounded-lg flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-amber-600" />
              </div>
              Ofsted &amp; invoicing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ofsted_number" className="text-sm font-medium">
                Ofsted registration number{' '}
                <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Input
                id="ofsted_number"
                value={profile.ofsted_number || ''}
                onChange={e => set('ofsted_number', e.target.value)}
                placeholder="EY123456"
                className="h-11 font-mono"
              />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3.5">
              <div>
                <p className="text-sm font-medium text-gray-900">Show Ofsted number on invoices</p>
                <p className="text-xs text-gray-400 mt-0.5">Displays your registration number on every invoice</p>
              </div>
              <Switch
                checked={profile.show_ofsted_on_invoice ?? false}
                onCheckedChange={v => set('show_ofsted_on_invoice', v)}
                disabled={!profile.ofsted_number}
              />
            </div>
            {!profile.ofsted_number && (
              <p className="text-xs text-gray-400">Enter your Ofsted number above to enable this toggle</p>
            )}
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm"
          disabled={saving}
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save settings'}
        </Button>
      </form>

      {/* ── Bank accounts ─────────────────────────────────────── */}
      {userId && (
        <BankAccountsSection userId={userId} initialPrimaryId={primaryBankId} />
      )}

      <Separator />

      <Button
        variant="outline"
        className="w-full h-12 text-base text-red-600 border-red-200 hover:bg-red-50 rounded-xl"
        onClick={handleLogout}
      >
        <LogOut className="h-5 w-5 mr-2" />
        Sign out
      </Button>
    </div>
  )
}
