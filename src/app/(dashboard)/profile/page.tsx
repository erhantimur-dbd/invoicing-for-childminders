'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Loader2, LogOut, User, MapPin } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/lib/types'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<Partial<Profile>>({
    full_name: '',
    email: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    postcode: '',
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) setProfile(data)
      setLoading(false)
    }
    load()
  }, [])

  function handleChange(field: keyof Profile, value: string) {
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
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)
    if (error) {
      toast.error('Failed to save profile')
    } else {
      toast.success('Profile saved')
      router.push('/dashboard')
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm">Your details appear on every invoice</p>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* Personal info */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-emerald-600" />
              Personal details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-sm font-medium">Full name</Label>
              <Input
                id="full_name"
                value={profile.full_name || ''}
                onChange={e => handleChange('full_name', e.target.value)}
                placeholder="Jane Smith"
                className="h-12 text-base"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                value={profile.email || ''}
                disabled
                className="h-12 text-base bg-gray-50"
              />
              <p className="text-xs text-gray-400">Email cannot be changed here</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-medium">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                value={profile.phone || ''}
                onChange={e => handleChange('phone', e.target.value)}
                placeholder="07700 900000"
                className="h-12 text-base"
              />
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-600" />
              Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address_line1" className="text-sm font-medium">Address line 1</Label>
              <Input
                id="address_line1"
                value={profile.address_line1 || ''}
                onChange={e => handleChange('address_line1', e.target.value)}
                placeholder="123 Main Street"
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_line2" className="text-sm font-medium">Address line 2 (optional)</Label>
              <Input
                id="address_line2"
                value={profile.address_line2 || ''}
                onChange={e => handleChange('address_line2', e.target.value)}
                placeholder="Apartment, suite, etc."
                className="h-12 text-base"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-medium">City / Town</Label>
                <Input
                  id="city"
                  value={profile.city || ''}
                  onChange={e => handleChange('city', e.target.value)}
                  placeholder="London"
                  className="h-12 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postcode" className="text-sm font-medium">Postcode</Label>
                <Input
                  id="postcode"
                  value={profile.postcode || ''}
                  onChange={e => handleChange('postcode', e.target.value)}
                  placeholder="SW1A 1AA"
                  className="h-12 text-base"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          type="submit"
          className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
          disabled={saving}
        >
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Save settings'}
        </Button>
      </form>

      <Separator />

      <Button
        variant="outline"
        className="w-full h-12 text-base text-red-600 border-red-200 hover:bg-red-50"
        onClick={handleLogout}
      >
        <LogOut className="h-5 w-5 mr-2" />
        Sign out
      </Button>
    </div>
  )
}
