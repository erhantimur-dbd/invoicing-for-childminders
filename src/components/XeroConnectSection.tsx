'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Link2, Unlink, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

type Status = {
  configured: boolean
  connected: boolean
  tenantName: string | null
  connectedAt: string | null
}

type Props = {
  /** Optional tax-year range for one-click sync from Settings */
  defaultStart?: string
  defaultEnd?: string
  defaultBasis?: 'cash' | 'accrual'
}

export default function XeroConnectSection({
  defaultStart,
  defaultEnd,
  defaultBasis = 'cash',
}: Props) {
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  async function loadStatus() {
    try {
      const res = await fetch('/api/xero/status')
      if (!res.ok) throw new Error('Failed to load Xero status')
      setStatus(await res.json())
    } catch {
      setStatus({ configured: false, connected: false, tenantName: null, connectedAt: null })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
    const params = new URLSearchParams(window.location.search)
    const flag = params.get('xero')
    if (flag === 'connected') {
      toast.success('Xero connected')
    } else if (flag === 'error') {
      toast.error(`Xero connection failed (${params.get('reason') || 'unknown'})`)
    }
  }, [])

  async function disconnect() {
    setBusy(true)
    try {
      const res = await fetch('/api/xero/disconnect', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Disconnect failed')
      }
      toast.success('Xero disconnected')
      await loadStatus()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Disconnect failed')
    } finally {
      setBusy(false)
    }
  }

  async function syncNow() {
    if (!defaultStart || !defaultEnd) {
      toast.message('Open Reports to sync a tax year')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/xero/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start: defaultStart,
          end: defaultEnd,
          basis: defaultBasis,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Sync failed')
      const msg = `Synced ${data.invoicesSynced} invoices, ${data.expensesSynced} expenses` +
        (data.invoicesSkipped + data.expensesSkipped
          ? ` (${data.invoicesSkipped + data.expensesSkipped} already synced)`
          : '')
      if (data.errors?.length) {
        toast.warning(`${msg}. ${data.errors.length} error(s) — check console.`)
        console.warn('Xero sync errors', data.errors)
      } else {
        toast.success(msg)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="w-7 h-7 bg-sky-100 rounded-lg flex items-center justify-center">
            <Link2 className="h-4 w-4 text-sky-600" />
          </div>
          Xero Connect
        </CardTitle>
        <p className="text-xs text-gray-500 mt-1">
          One-way sync: push unpaid/paid invoices and expenses to Xero as drafts. Review in Xero before approving.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking connection…
          </div>
        ) : !status?.configured ? (
          <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
            Xero OAuth is not configured on this server yet. Add{' '}
            <code className="text-xs">XERO_CLIENT_ID</code>,{' '}
            <code className="text-xs">XERO_CLIENT_SECRET</code>, and{' '}
            <code className="text-xs">NEXT_PUBLIC_APP_URL</code>.
          </p>
        ) : status.connected ? (
          <>
            <div className="rounded-xl bg-emerald-50 px-4 py-3">
              <p className="text-sm font-medium text-emerald-800">
                Connected{status.tenantName ? ` to ${status.tenantName}` : ''}
              </p>
              {status.connectedAt && (
                <p className="text-xs text-emerald-600 mt-0.5">
                  Since {new Date(status.connectedAt).toLocaleDateString('en-GB')}
                </p>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              {defaultStart && defaultEnd && (
                <Button
                  type="button"
                  className="flex-1 h-11 bg-sky-600 hover:bg-sky-700"
                  disabled={busy}
                  onClick={syncNow}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Sync current tax year
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-11 text-red-600 border-red-200 hover:bg-red-50"
                disabled={busy}
                onClick={disconnect}
              >
                <Unlink className="h-4 w-4 mr-2" />
                Disconnect
              </Button>
            </div>
          </>
        ) : (
          <Button
            type="button"
            className="w-full h-11 bg-sky-600 hover:bg-sky-700"
            onClick={() => {
              window.location.href = '/api/xero/connect'
            }}
          >
            <Link2 className="h-4 w-4 mr-2" />
            Connect Xero
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
