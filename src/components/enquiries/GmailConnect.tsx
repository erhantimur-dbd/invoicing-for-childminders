'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
export default function GmailConnect({ inboundSlug }: { inboundSlug?: string | null }) {
  const supabase = createClient()
  const [email, setEmail] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase
      .from('enquiry_connections')
      .select('account_email, status, last_synced_at')
      .eq('provider', 'google')
      .maybeSingle()
      .then(({ data }) => {
        if (data?.status === 'active') setEmail(data.account_email)
        setStatus(data?.status ?? null)
      })
  }, [])

  async function disconnect() {
    setBusy(true)
    await fetch('/api/integrations/google/disconnect', { method: 'POST' })
    setEmail(null)
    setStatus('revoked')
    setBusy(false)
  }

  const slug = inboundSlug || 'your-name'
  const forward = `${slug}@enquiries.godottie.cloud`

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
      <p className="text-sm font-semibold text-gray-900">Gmail and Calendar</p>
      {email ? (
        <p className="text-sm text-gray-600">
          Connected as <span className="font-medium text-gray-900">{email}</span>
          {status === 'error' ? ' — needs reconnecting.' : '. New parent emails are drafted here. Visits go on this calendar.'}
        </p>
      ) : (
        <p className="text-sm text-gray-600">
          Connect Gmail so Dottie can read new parent emails and put agreed visits on your calendar. She still only sends a reply if you turn automatic send on.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <a
          href="/api/integrations/google/start"
          className="inline-flex items-center h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
        >
          {email ? 'Reconnect Gmail' : 'Connect Gmail'}
        </a>
        {email ? (
          <Button type="button" variant="outline" className="rounded-xl" disabled={busy} onClick={disconnect}>
            Disconnect
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-gray-400">
        Backup: forward parent emails to <span className="font-medium text-gray-600">{forward}</span>
      </p>
    </div>
  )
}
