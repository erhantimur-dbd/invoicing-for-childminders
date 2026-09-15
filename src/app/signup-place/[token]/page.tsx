'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'

type FormState = {
  parent_name: string
  parent_email: string
  parent_phone: string
  child_first: string
  child_last: string
  date_of_birth: string
  start_date: string
  days_needed: string
  hours_needed: string
  funding: string
  address: string
}

export default function SignupPlacePage() {
  const params = useParams()
  const token = String(params.token || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [style, setStyle] = useState<'simple' | 'comprehensive'>('simple')
  const [displayName, setDisplayName] = useState('')
  const [pack, setPack] = useState<{ file_name: string; url: string | null }[]>([])
  const [bank, setBank] = useState<{ bank_name?: string | null; account_name?: string | null; sort_code?: string | null; account_number?: string | null } | null>(null)
  const [policiesAccepted, setPoliciesAccepted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<FormState>({
    parent_name: '',
    parent_email: '',
    parent_phone: '',
    child_first: '',
    child_last: '',
    date_of_birth: '',
    start_date: '',
    days_needed: '',
    hours_needed: '',
    funding: '',
    address: '',
  })

  useEffect(() => {
    fetch(`/api/enquiries/onboard?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const d = await r.json()
        if (!r.ok) throw new Error(d.error || 'Could not open this form.')
        setStyle(d.style)
        setDisplayName(d.displayName || '')
        setPack(d.pack || [])
        setBank(d.bank)
        setForm((f) => ({ ...f, ...d.form }))
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not open this form.'))
      .finally(() => setLoading(false))
  }, [token])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/enquiries/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, ...form, policiesAccepted }),
    })
    const d = await res.json()
    setSaving(false)
    if (!res.ok) {
      setError(d.error || 'Could not save.')
      return
    }
    setDone(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (error && !form.parent_email && !done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <p className="text-gray-600 text-center max-w-md">{error}</p>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Thank you</h1>
          <p className="text-gray-600 text-sm">
            {displayName || 'Your childminder'} has your details. Invoices will be sent by email with bank transfer details — you do not pay through Dottie.
          </p>
        </div>
      </div>
    )
  }

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <form onSubmit={submit} className="max-w-lg mx-auto bg-white rounded-3xl border border-gray-100 p-6 space-y-5">
        <div>
          <p className="text-xs uppercase tracking-widest text-gray-400">Place offer</p>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            {displayName ? `Signup with ${displayName}` : 'Complete signup'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {style === 'comprehensive' ? 'Details, policies, and how invoices are paid.' : 'Parent and child details only.'}
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 space-y-1">
            <Label>Your name</Label>
            <Input required value={form.parent_name} onChange={(e) => set('parent_name', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input type="email" required value={form.parent_email} onChange={(e) => set('parent_email', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input value={form.parent_phone} onChange={(e) => set('parent_phone', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Child first name</Label>
            <Input required value={form.child_first} onChange={(e) => set('child_first', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Child last name</Label>
            <Input value={form.child_last} onChange={(e) => set('child_last', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Child date of birth</Label>
            <Input type="date" required value={form.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Start date</Label>
            <Input type="date" value={form.start_date} onChange={(e) => set('start_date', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Days needed</Label>
            <Input value={form.days_needed} onChange={(e) => set('days_needed', e.target.value)} placeholder="Mon, Tue, Wed" />
          </div>
          <div className="space-y-1">
            <Label>Hours</Label>
            <Input value={form.hours_needed} onChange={(e) => set('hours_needed', e.target.value)} placeholder="8am–6pm" />
          </div>
          <div className="sm:col-span-2 space-y-1">
            <Label>Address (optional)</Label>
            <Textarea rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} />
          </div>
        </div>

        {style === 'comprehensive' ? (
          <div className="space-y-3 rounded-2xl border border-gray-100 p-4">
            {pack.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-900">Policies and forms</p>
                <ul className="text-sm space-y-1">
                  {pack.map((f) => (
                    <li key={f.file_name}>
                      {f.url ? (
                        <a href={f.url} className="text-emerald-700 font-medium" target="_blank" rel="noreferrer">
                          {f.file_name}
                        </a>
                      ) : (
                        f.file_name
                      )}
                    </li>
                  ))}
                </ul>
                <label className="flex items-start gap-2 text-sm text-gray-700">
                  <input type="checkbox" className="mt-1" checked={policiesAccepted} onChange={(e) => setPoliciesAccepted(e.target.checked)} />
                  I have read the policies and forms.
                </label>
              </div>
            ) : null}
            {bank && (bank.sort_code || bank.account_number) ? (
              <div className="text-sm text-gray-700 space-y-1">
                <p className="font-semibold text-gray-900">How invoices are paid</p>
                <p>Bank transfer — you do not pay through Dottie.</p>
                {bank.account_name ? <p>Account name: {bank.account_name}</p> : null}
                {bank.bank_name ? <p>Bank: {bank.bank_name}</p> : null}
                {bank.sort_code ? <p>Sort code: {bank.sort_code}</p> : null}
                {bank.account_number ? <p>Account number: {bank.account_number}</p> : null}
              </div>
            ) : (
              <p className="text-sm text-gray-500">Invoices will include bank transfer details. You do not pay through Dottie.</p>
            )}
          </div>
        ) : null}

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <Button type="submit" className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit'}
        </Button>
      </form>
    </div>
  )
}
