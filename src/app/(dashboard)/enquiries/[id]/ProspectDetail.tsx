'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  ENQUIRY_STAGE_LABELS,
  ENQUIRY_STAGES,
  FUNDING_OPTIONS,
  type EnquiryMessage,
  type EnquiryProspect,
  type EnquiryStage,
  type EnquiryKnowledgePending,
} from '@/lib/enquiries/types'
import { addToInvoicingHref } from '@/lib/enquiries/prospect-to-child.mjs'
import { ESCALATE_LABELS } from '@/lib/enquiries/escalate.mjs'

export default function ProspectDetail({
  prospect: initial,
  messages: initialMessages,
  invoicingActive,
  pendingKnowledge: initialPending = [],
}: {
  prospect: EnquiryProspect
  messages: EnquiryMessage[]
  invoicingActive: boolean
  pendingKnowledge?: EnquiryKnowledgePending[]
}) {
  const router = useRouter()
  const supabase = createClient()
  const [prospect, setProspect] = useState(initial)
  const [messages, setMessages] = useState(initialMessages)
  const [drafting, setDrafting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lostReason, setLostReason] = useState(prospect.lost_reason || '')
  const [pending, setPending] = useState(initialPending)

  const latestInbound = [...messages].reverse().find((m) => m.direction === 'in')
  const latestDraft = [...messages].reverse().find((m) => m.direction === 'draft')

  async function savePatch(patch: Partial<EnquiryProspect>) {
    setSaving(true)
    const { error } = await supabase
      .from('enquiry_prospects')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', prospect.id)
    setSaving(false)
    if (error) {
      toast.error('Could not save.')
      return
    }
    setProspect({ ...prospect, ...patch })
    router.refresh()
  }

  async function setStage(stage: EnquiryStage) {
    await savePatch({
      stage,
      lost_reason: stage === 'lost' ? lostReason || 'Not going ahead' : prospect.lost_reason,
    })
    toast.success(ENQUIRY_STAGE_LABELS[stage])
  }

  async function draftReply() {
    setDrafting(true)
    try {
      const res = await fetch('/api/enquiries/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectId: prospect.id,
          parentMessage: latestInbound?.body,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Draft failed')
      setMessages((prev) => [...prev, data.draft])
      setProspect({
        ...prospect,
        stage: prospect.stage === 'new' ? 'chatting' : prospect.stage,
        needs_human: Boolean(data.needsHuman),
        escalate_reasons: data.escalateReasons || [],
      })
      toast.success(
        data.needsHuman
          ? 'Dottie needs you — she was not sure enough to send this.'
          : 'Draft ready — read it, then send from your own email.',
      )
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not draft a reply.')
    } finally {
      setDrafting(false)
    }
  }

  function mailtoDraft() {
    if (!latestDraft || !prospect.parent_email) return
    const subject = encodeURIComponent(`Your enquiry${prospect.child_name ? ` — ${prospect.child_name}` : ''}`)
    const body = encodeURIComponent(latestDraft.body)
    window.location.href = `mailto:${prospect.parent_email}?subject=${subject}&body=${body}`
  }

  async function copyDraft() {
    if (!latestDraft) return
    await navigator.clipboard.writeText(latestDraft.body)
    toast.success('Copied. Paste it into Gmail.')
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/enquiries" className="text-sm text-emerald-700 font-medium">← Parents</Link>
        <div className="flex flex-wrap items-start justify-between gap-3 mt-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">{prospect.parent_name || 'Parent'}</h1>
            <p className="text-gray-500 text-sm mt-1">
              {prospect.child_name ? `${prospect.child_name} · ` : ''}
              {ENQUIRY_STAGE_LABELS[prospect.stage]}
            </p>
          </div>
          <select
            className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm font-medium"
            value={prospect.stage}
            onChange={(e) => setStage(e.target.value as EnquiryStage)}
          >
            {ENQUIRY_STAGES.map((s) => (
              <option key={s} value={s}>{ENQUIRY_STAGE_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Email" value={prospect.parent_email} />
        <Field label="Phone" value={prospect.parent_phone} />
        <Field label="Age" value={prospect.child_age_text} />
        <Field label="Start date" value={prospect.start_date} />
        <Field label="Days" value={prospect.days_needed} />
        <Field
          label="Funding"
          value={FUNDING_OPTIONS.find((f) => f.id === prospect.funding)?.label ?? prospect.funding}
        />
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 space-y-3">
        <Label>Visit</Label>
        <Input
          type="datetime-local"
          value={prospect.visit_at ? prospect.visit_at.slice(0, 16) : ''}
          onChange={async (e) => {
            const visitAt = e.target.value ? new Date(e.target.value).toISOString() : null
            setSaving(true)
            const res = await fetch('/api/enquiries/visit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prospectId: prospect.id, visitAt }),
            })
            setSaving(false)
            if (!res.ok) {
              toast.error('Could not save the visit.')
              return
            }
            const data = await res.json()
            setProspect({
              ...prospect,
              visit_at: data.visit_at,
              stage: data.visit_at ? 'visit' : prospect.stage,
              calendar_event_id: data.calendar_event_id,
            })
            toast.success(data.calendar_event_id ? 'Visit saved on Google Calendar.' : 'Visit saved.')
          }}
        />
        <p className="text-xs text-gray-400">Saving a time puts it on your Google Calendar and invites the parent if we have their email.</p>
      </div>

      {prospect.needs_human ? (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-950 space-y-2">
          <p className="font-semibold">Dottie needs you</p>
          <p>She could not answer this with full confidence, so she did not send it.</p>
          <ul className="list-disc pl-5 space-y-1">
            {(prospect.escalate_reasons || []).map((r) => (
              <li key={r}>{(ESCALATE_LABELS as Record<string, string>)[r] || r}</li>
            ))}
          </ul>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => savePatch({ needs_human: false, escalate_reasons: [] })}
          >
            I&apos;ll take this
          </Button>
        </div>
      ) : null}

      {pending.length > 0 ? (
        <div className="rounded-2xl border border-emerald-100 bg-white p-4 space-y-4">
          <p className="font-semibold text-gray-900">Add to Your answers</p>
          <p className="text-sm text-gray-500">
            Dottie can remember this for next time. Approve only setting facts, never a child&apos;s health.
          </p>
          {pending.map((item) => (
            <PendingFactCard
              key={item.id}
              item={item}
              onDone={() => setPending(pending.filter((p) => p.id !== item.id))}
            />
          ))}
        </div>
      ) : null}

      {prospect.stage === 'lost' || prospect.stage === 'started' ? null : (
        <div className="flex flex-wrap gap-2">
          <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700" onClick={draftReply} disabled={drafting}>
            {drafting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Draft a reply
          </Button>
          <Button
            className="rounded-xl bg-emerald-700 hover:bg-emerald-800"
            disabled={saving}
            onClick={async () => {
              setSaving(true)
              const res = await fetch('/api/enquiries/close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prospectId: prospect.id, outcome: 'won' }),
              })
              const data = await res.json()
              setSaving(false)
              if (!res.ok) {
                toast.error(data.error || 'Could not send signup.')
                return
              }
              setProspect({ ...prospect, stage: 'accepted' })
              toast.success('Signup form emailed to the parent.')
            }}
          >
            Won / send signup
          </Button>
          <Button
            variant="outline"
            className="rounded-xl text-gray-700"
            disabled={saving}
            onClick={async () => {
              setSaving(true)
              const res = await fetch('/api/enquiries/close', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prospectId: prospect.id, outcome: 'lost', lostReason }),
              })
              setSaving(false)
              if (!res.ok) {
                toast.error('Could not close.')
                return
              }
              setProspect({ ...prospect, stage: 'lost' })
              toast.success('Marked as no interest.')
            }}
          >
            Lost / no interest
          </Button>
        </div>
      )}

      {prospect.stage === 'accepted' ? (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900 space-y-2">
          <p className="font-semibold">Waiting for the parent to complete signup</p>
          <p>They have a 7-day link. You can still add them yourself if they are already on roll.</p>
          <Link
            href={addToInvoicingHref({ invoicingActive, prospectId: prospect.id })}
            className="inline-flex items-center h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
          >
            Already on roll
          </Link>
        </div>
      ) : null}

      {prospect.stage === 'started' ? (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-950 space-y-2">
          <p className="font-semibold">Onboarded</p>
          <p>Dottie can raise invoices from their days and rates. Parents pay by bank transfer — not through Dottie.</p>
          <Link
            href="/invoices/new"
            className="inline-flex items-center h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
          >
            Create first invoice
          </Link>
        </div>
      ) : null}

      {latestDraft ? (
        <div className="rounded-2xl border border-emerald-100 bg-white p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Draft to send</p>
          <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">{latestDraft.body}</pre>
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="rounded-xl bg-emerald-600 hover:bg-emerald-700" onClick={copyDraft}>
              Copy
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={async () => {
                const res = await fetch('/api/enquiries/remember', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ prospectId: prospect.id, draftBody: latestDraft.body }),
                })
                const data = await res.json()
                if (!res.ok) {
                  toast.error(data.error || 'Could not save.')
                  return
                }
                toast.success(data.added ? 'Saved for next letters.' : 'Nothing extra to learn from this draft.')
              }}
            >
              Remember this wording
            </Button>
            {prospect.parent_email ? (
              <Button type="button" variant="outline" className="rounded-xl" onClick={mailtoDraft}>
                Open in email
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-gray-400">Read it before you send. Dottie writes from Your answers — she does not send this herself yet.</p>
        </div>
      ) : null}

      {latestInbound ? (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Their message</p>
          <p className="text-sm text-gray-800 whitespace-pre-wrap">{latestInbound.body}</p>
        </div>
      ) : null}

      {prospect.stage !== 'lost' ? (
        <div className="pt-4 border-t border-gray-100 space-y-2">
          <Label>Not going ahead?</Label>
          <Input value={lostReason} onChange={(e) => setLostReason(e.target.value)} placeholder="No space / chose a nursery / never replied" />
          <Button type="button" variant="outline" className="rounded-xl text-gray-600" onClick={() => setStage('lost')}>
            Mark not going ahead
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-sm text-gray-900 mt-0.5">{value || '—'}</p>
    </div>
  )
}

function PendingFactCard({
  item,
  onDone,
}: {
  item: EnquiryKnowledgePending
  onDone: () => void
}) {
  const [question, setQuestion] = useState(item.question)
  const [answer, setAnswer] = useState(item.suggested_answer || '')
  const [busy, setBusy] = useState(false)

  async function act(action: 'approve' | 'dismiss') {
    setBusy(true)
    const res = await fetch('/api/enquiries/knowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, action, question, answer }),
    })
    const data = await res.json()
    setBusy(false)
    if (!res.ok) {
      toast.error(data.error || 'Could not save.')
      return
    }
    toast.success(action === 'approve' ? 'Added to Your answers.' : 'Skipped.')
    onDone()
  }

  return (
    <div className="rounded-xl border border-gray-100 p-3 space-y-2">
      <Input value={question} onChange={(e) => setQuestion(e.target.value)} />
      <Textarea rows={2} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="Your answer" />
      <div className="flex gap-2">
        <Button type="button" className="rounded-xl bg-emerald-600 hover:bg-emerald-700" disabled={busy} onClick={() => act('approve')}>
          Add to Your answers
        </Button>
        <Button type="button" variant="outline" className="rounded-xl" disabled={busy} onClick={() => act('dismiss')}>
          Skip
        </Button>
      </div>
    </div>
  )
}
