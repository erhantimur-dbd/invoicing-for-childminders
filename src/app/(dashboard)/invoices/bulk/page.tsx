'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  ChevronLeft,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Calendar,
  Zap,
} from 'lucide-react'
import { getPreviousWeekDates } from '@/lib/agent/invoice-agent'
import type { AgentDecision } from '@/lib/agent/invoice-agent'

type PreviewState = 'idle' | 'loading' | 'ready'
type GenerateState = 'idle' | 'loading' | 'done'

type DecisionWithChild = AgentDecision & {
  child_name: string
  parent_name: string
  selected: boolean
}

function formatGBP(n: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n)
}

function formatDateShort(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export default function BulkInvoicePage() {
  const router = useRouter()
  const supabase = createClient()

  const prevWeek = getPreviousWeekDates()
  const [weekStart, setWeekStart] = useState(prevWeek.start)
  const [weekEnd, setWeekEnd] = useState(prevWeek.end)

  const [previewState, setPreviewState] = useState<PreviewState>('idle')
  const [generateState, setGenerateState] = useState<GenerateState>('idle')
  const [decisions, setDecisions] = useState<DecisionWithChild[]>([])
  const [createdCount, setCreatedCount] = useState(0)
  const [skippedSummary, setSkippedSummary] = useState<{ child_name: string; reason: string }[]>([])
  const [childNameMap, setChildNameMap] = useState<Record<string, { name: string; parent: string }>>({})

  // Fetch child name map on mount
  useEffect(() => {
    supabase
      .from('children')
      .select('id, first_name, last_name, parent_name')
      .eq('is_active', true)
      .then(({ data }) => {
        if (!data) return
        const map: Record<string, { name: string; parent: string }> = {}
        data.forEach(c => {
          map[c.id] = { name: `${c.first_name} ${c.last_name}`, parent: c.parent_name }
        })
        setChildNameMap(map)
      })
  }, [])

  async function handlePreview() {
    setPreviewState('loading')
    setDecisions([])

    try {
      const res = await fetch('/api/agent/invoice-decisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start: weekStart, week_end: weekEnd }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Failed to generate preview')
        setPreviewState('idle')
        return
      }

      const data = await res.json()

      if (!data.decisions?.length) {
        toast.info('No children with fixed schedules found')
        setPreviewState('idle')
        return
      }

      const enriched: DecisionWithChild[] = data.decisions.map((d: AgentDecision) => ({
        ...d,
        child_name: childNameMap[d.child_id]?.name || 'Unknown',
        parent_name: childNameMap[d.child_id]?.parent || '',
        selected: d.generate,
      }))

      setDecisions(enriched)
      setPreviewState('ready')

      const toGenerate = enriched.filter(d => d.generate).length
      const toSkip = enriched.filter(d => !d.generate).length
      toast.success(`Preview ready — ${toGenerate} invoice${toGenerate !== 1 ? 's' : ''} to create${toSkip > 0 ? `, ${toSkip} skipped by AI` : ''}`)
    } catch {
      toast.error('Something went wrong generating the preview')
      setPreviewState('idle')
    }
  }

  async function handleGenerate() {
    const selected = decisions.filter(d => d.selected && d.generate)
    if (!selected.length) {
      toast.error('No invoices selected to generate')
      return
    }

    setGenerateState('loading')

    try {
      const res = await fetch('/api/invoices/bulk-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decisions: selected,
          week_start: weekStart,
          week_end: weekEnd,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Failed to create invoices')
        setGenerateState('idle')
        return
      }

      const data = await res.json()
      setCreatedCount(data.created?.length || 0)
      setSkippedSummary(data.skipped || [])
      setGenerateState('done')
      toast.success(`${data.created?.length} draft invoice${data.created?.length !== 1 ? 's' : ''} created!`)
    } catch {
      toast.error('Something went wrong creating invoices')
      setGenerateState('idle')
    }
  }

  function toggleDecision(childId: string) {
    setDecisions(prev => prev.map(d =>
      d.child_id === childId ? { ...d, selected: !d.selected } : d
    ))
  }

  const selectedTotal = decisions
    .filter(d => d.selected && d.generate)
    .reduce((s, d) => s + d.week_total, 0)
  const selectedCount = decisions.filter(d => d.selected && d.generate).length

  // Done state
  if (generateState === 'done') {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/invoices" className="text-gray-400 hover:text-gray-600">
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Invoices generated</h1>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center space-y-2">
          <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
          <p className="text-xl font-bold text-emerald-800">{createdCount} draft invoice{createdCount !== 1 ? 's' : ''} created</p>
          <p className="text-sm text-emerald-600">Review and send them to parents from the invoices screen</p>
        </div>

        {skippedSummary.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500 font-medium">Skipped</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {skippedSummary.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-600"><span className="font-medium text-gray-900">{s.child_name}</span> — {s.reason}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Button
          className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
          onClick={() => router.push('/invoices')}
        >
          View draft invoices
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/invoices" className="text-gray-400 hover:text-gray-600">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Generate invoices</h1>
          <p className="text-sm text-gray-500">AI-powered bulk invoice creation</p>
        </div>
      </div>

      {/* AI badge */}
      <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-xl p-3">
        <Sparkles className="h-4 w-4 text-purple-600 flex-shrink-0" />
        <p className="text-xs text-purple-700">
          Claude AI checks for UK bank holidays and term-time schedules before generating each invoice
        </p>
      </div>

      {/* Week picker */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-600" />
            Invoice period
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Week start (Mon)</Label>
              <Input
                type="date"
                value={weekStart}
                onChange={e => { setWeekStart(e.target.value); setPreviewState('idle'); setDecisions([]) }}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Week end (Fri)</Label>
              <Input
                type="date"
                value={weekEnd}
                onChange={e => { setWeekEnd(e.target.value); setPreviewState('idle'); setDecisions([]) }}
                className="h-12 text-base"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400">
            Defaults to last week: {formatDateShort(prevWeek.start)} – {formatDateShort(prevWeek.end)}
          </p>
        </CardContent>
      </Card>

      {/* Preview button */}
      {previewState !== 'ready' && (
        <Button
          className="w-full h-12 text-base bg-purple-600 hover:bg-purple-700"
          onClick={handlePreview}
          disabled={previewState === 'loading' || !weekStart || !weekEnd}
        >
          {previewState === 'loading' ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              AI is checking schedules…
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5 mr-2" />
              Preview invoices
            </>
          )}
        </Button>
      )}

      {/* Preview results */}
      {previewState === 'ready' && decisions.length > 0 && (
        <>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Invoice preview</CardTitle>
                <span className="text-xs text-gray-400">{selectedCount} selected</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {decisions.map(d => (
                <button
                  key={d.child_id}
                  type="button"
                  onClick={() => d.generate && toggleDecision(d.child_id)}
                  className={`w-full text-left rounded-xl p-3 border-2 transition-all ${
                    !d.generate
                      ? 'border-gray-100 bg-gray-50 opacity-60 cursor-default'
                      : d.selected
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      {d.generate ? (
                        d.selected
                          ? <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                          : <div className="h-5 w-5 rounded-full border-2 border-gray-300 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-gray-900 truncate">{d.child_name}</p>
                        <p className="text-xs text-gray-500 truncate">{d.parent_name}</p>
                        {d.generate && d.line_items.length > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            {d.line_items.length} day{d.line_items.length !== 1 ? 's' : ''}
                            {d.line_items.some(l => l.quantity === 0.5) ? ' (inc. half days)' : ''}
                          </p>
                        )}
                        {!d.generate && d.skip_reason && (
                          <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {d.skip_reason}
                          </p>
                        )}
                        {d.agent_notes && (
                          <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            {d.agent_notes}
                          </p>
                        )}
                      </div>
                    </div>
                    {d.generate && (
                      <span className="font-bold text-emerald-600 text-sm flex-shrink-0">
                        {formatGBP(d.week_total)}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Summary + generate */}
          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">{selectedCount} invoice{selectedCount !== 1 ? 's' : ''}</p>
              <p className="text-xs text-gray-500">tap to deselect any</p>
            </div>
            <p className="text-xl font-bold text-emerald-600">{formatGBP(selectedTotal)}</p>
          </div>

          <div className="flex flex-col gap-3 pb-4">
            <Button
              className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
              onClick={handleGenerate}
              disabled={generateState === 'loading' || selectedCount === 0}
            >
              {generateState === 'loading' ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Creating invoices…
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5 mr-2" />
                  Generate {selectedCount} draft invoice{selectedCount !== 1 ? 's' : ''} — {formatGBP(selectedTotal)}
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full h-11 text-sm"
              onClick={() => { setPreviewState('idle'); setDecisions([]) }}
              disabled={generateState === 'loading'}
            >
              Change dates
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
