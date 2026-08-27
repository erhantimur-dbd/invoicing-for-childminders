'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { FUNDING_OPTIONS } from '@/lib/enquiries/types'

export default function NewProspectPage() {
  const router = useRouter()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [parentName, setParentName] = useState('')
  const [parentEmail, setParentEmail] = useState('')
  const [parentPhone, setParentPhone] = useState('')
  const [childName, setChildName] = useState('')
  const [childAge, setChildAge] = useState('')
  const [startDate, setStartDate] = useState('')
  const [daysNeeded, setDaysNeeded] = useState('')
  const [funding, setFunding] = useState('unknown')
  const [message, setMessage] = useState('')
  const [source, setSource] = useState('email')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('enquiry_prospects')
      .insert({
        user_id: user.id,
        parent_name: parentName.trim() || null,
        parent_email: parentEmail.trim() || null,
        parent_phone: parentPhone.trim() || null,
        child_name: childName.trim() || null,
        child_age_text: childAge.trim() || null,
        start_date: startDate || null,
        days_needed: daysNeeded.trim() || null,
        funding,
        source,
        notes: null,
      })
      .select('id')
      .single()

    if (error || !data) {
      toast.error('Could not save this parent. Try again.')
      setSaving(false)
      return
    }

    if (message.trim()) {
      await supabase.from('enquiry_messages').insert({
        prospect_id: data.id,
        user_id: user.id,
        direction: 'in',
        body: message.trim(),
        from_address: parentEmail.trim() || null,
        status: 'logged',
      })
    }

    toast.success('Saved. You can draft a reply next.')
    router.push(`/enquiries/${data.id}`)
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
      <div>
        <Link href="/enquiries" className="text-sm text-emerald-700 font-medium">← Parents</Link>
        <h1 className="text-2xl font-extrabold text-gray-900 mt-3">Add a parent</h1>
        <p className="text-gray-500 text-sm mt-1">Copy what you know from their email. Blank is fine — Dottie will ask.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Parent name</Label>
          <Input value={parentName} onChange={(e) => setParentName(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Child&apos;s name</Label>
          <Input value={childName} onChange={(e) => setChildName(e.target.value)} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Age</Label>
          <Input value={childAge} onChange={(e) => setChildAge(e.target.value)} placeholder="14 months" />
        </div>
        <div className="space-y-1.5">
          <Label>Start date</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Days they want</Label>
        <Input value={daysNeeded} onChange={(e) => setDaysNeeded(e.target.value)} placeholder="Mon, Tue, Wed" />
      </div>
      <div className="space-y-1.5">
        <Label>Funding</Label>
        <select
          className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm"
          value={funding}
          onChange={(e) => setFunding(e.target.value)}
        >
          {FUNDING_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Where they found you</Label>
        <select
          className="w-full h-10 rounded-md border border-input bg-transparent px-3 text-sm"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="email">Email</option>
          <option value="childcare.co.uk">childcare.co.uk</option>
          <option value="facebook">Facebook</option>
          <option value="word_of_mouth">Word of mouth</option>
          <option value="other">Other</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Their message (paste it)</Label>
        <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Hi, I saw you have a space…" />
      </div>
      <Button type="submit" disabled={saving} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
        Save parent
      </Button>
    </form>
  )
}
