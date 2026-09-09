'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Loader2, Mail, Pause, Play } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DEFAULT_ENQUIRY_LABELS } from '@/lib/enquiries/gmail/filters'

type Status = {
  configured: boolean
  connected: boolean
  paused: boolean
  gmailLabel: string
  watchedLabels: string[]
  account: { email: string; last_sync_at: string | null; last_error: string | null } | null
  labels: { id: string; name: string }[]
}

export default function GmailConnect({
  initialPaused,
  gmailResult,
}: {
  initialPaused: boolean
  gmailResult?: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [paused, setPaused] = useState(initialPaused)
  const [label, setLabel] = useState('')
  const [savingLabel, setSavingLabel] = useState(false)

  async function load() {
    const res = await fetch('/api/enquiries/gmail/status')
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Could not check Gmail.')
    setStatus(data)
    setPaused(Boolean(data.paused))
    setLabel(data.gmailLabel || '')
    return data as Status
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await load()
        if (cancelled) return
        if (gmailResult === 'connected') {
          toast.success('Gmail connected. Checking for parent emails…')
          await runSync()
        } else if (gmailResult === 'error') {
          toast.error('Gmail did not connect. Try again, or check the Google consent screen.')
        } else if (data.connected) {
          const last = data.account?.last_sync_at ? new Date(data.account.last_sync_at).getTime() : 0
          if (Date.now() - last > 5 * 60 * 1000) {
            await runSync()
          }
        }
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Could not check Gmail.')
      } finally {
        if (!cancelled) setLoading(false)
        if (gmailResult) {
          router.replace('/enquiries')
        }
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function runSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/enquiries/gmail/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not read Gmail.')
      const created = Number(data.createdProspects || 0)
      const messages = Number(data.newMessages || 0)
      if (created || messages) {
        toast.success(
          created
            ? `${created} new parent${created === 1 ? '' : 's'} from Gmail.`
            : `${messages} new message${messages === 1 ? '' : 's'} from Gmail.`,
        )
        router.refresh()
      } else {
        toast('No new parent emails. Label them Enquiries or New parent in Gmail.')
      }
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not read Gmail.')
    } finally {
      setSyncing(false)
    }
  }

  async function togglePause(next: boolean) {
    setPaused(next)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase
      .from('enquiry_settings')
      .update({ agent_paused: next, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
    if (error) {
      setPaused(!next)
      toast.error('Could not update pause.')
      return
    }
    toast.success(next ? 'Dottie is paused. She will not draft or send.' : 'Dottie is back on.')
    router.refresh()
  }

  async function saveLabel() {
    setSavingLabel(true)
    try {
      const res = await fetch('/api/enquiries/gmail/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gmailLabel: label }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save that label.')
      toast.success('Watching that Gmail label.')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save that label.')
    } finally {
      setSavingLabel(false)
    }
  }

  async function disconnect() {
    const res = await fetch('/api/enquiries/gmail/disconnect', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || 'Could not disconnect.')
      return
    }
    toast.success('Gmail disconnected.')
    await load()
    router.refresh()
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white p-4 flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking Gmail…
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-emerald-100 bg-white p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <Mail className="h-4 w-4 text-emerald-700" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Gmail</p>
            {status?.connected ? (
              <p className="text-sm text-gray-500">
                Reading enquiry labels from {status.account?.email}. Dottie never sends until you approve.
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                Connect Gmail so parent emails land here. We only look for enquiry labels and clear parent messages — not the whole inbox.
              </p>
            )}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 shrink-0">
          {paused ? <Pause className="h-3.5 w-3.5 text-amber-600" /> : <Play className="h-3.5 w-3.5 text-emerald-600" />}
          {paused ? 'Paused' : 'Drafting on'}
          <Switch checked={!paused} onCheckedChange={(on) => togglePause(!on)} />
        </label>
      </div>

      {!status?.configured ? (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
          Gmail connect is waiting on Google OAuth env vars (client id, secret, redirect URI).
        </p>
      ) : status.connected ? (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
              onClick={runSync}
              disabled={syncing}
            >
              {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Check Gmail
            </Button>
            <Button type="button" variant="outline" className="rounded-xl" onClick={disconnect}>
              Disconnect
            </Button>
          </div>
          <div className="grid sm:grid-cols-[1fr_auto] gap-2 items-end">
            <div className="space-y-1">
              <p className="text-xs font-medium text-gray-500">Extra Gmail label to watch</p>
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Enquiries"
                list="dottie-gmail-labels"
              />
              <datalist id="dottie-gmail-labels">
                {status.labels.map((l) => (
                  <option key={l.id} value={l.name} />
                ))}
              </datalist>
            </div>
            <Button type="button" variant="outline" className="rounded-xl" onClick={saveLabel} disabled={savingLabel}>
              Save label
            </Button>
          </div>
          <p className="text-xs text-gray-400">
            Dottie polls Gmail when you open this page, when you tap Check, and every few minutes — no Pub/Sub required. Always watching: {DEFAULT_ENQUIRY_LABELS.join(', ')}. Receipts and newsletters are ignored.
            {status.account?.last_sync_at
              ? ` Last check ${new Date(status.account.last_sync_at).toLocaleString('en-GB')}.`
              : ''}
            {status.account?.last_error ? ` Last error: ${status.account.last_error}` : ''}
          </p>
        </div>
      ) : (
        <Button
          type="button"
          className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
          onClick={() => {
            window.location.href = '/api/enquiries/gmail/connect'
          }}
        >
          Connect Gmail
        </Button>
      )}
    </div>
  )
}
