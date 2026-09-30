'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Gift } from 'lucide-react'

/**
 * Admin-only control to grant a trial to a qualified client by email.
 * Trials are not auto-granted on signup; this is how a specific account is
 * enabled after a demo / qualification chat.
 */
export default function GrantTrialForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [days, setDays] = useState('14')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { toast.error("Enter the client's email"); return }
    setSaving(true)
    try {
      const res = await fetch('/api/admin/grant-trial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), days: Number(days) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(`${days}-day trial granted to ${data.name || data.email}`)
      setEmail('')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to grant trial')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        <p className="text-sm font-semibold text-emerald-900">Grant a trial to a qualified client</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="client@example.com"
          className="flex-1 h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          autoComplete="off"
        />
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={90}
            value={days}
            onChange={e => setDays(e.target.value)}
            className="w-20 h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="Trial length in days"
          />
          <span className="text-sm text-gray-500">days</span>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Grant trial'}
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        The account must already exist (they&apos;ve signed up). This sets a trialing subscription so they can access the app without paying until the trial ends.
      </p>
    </form>
  )
}
