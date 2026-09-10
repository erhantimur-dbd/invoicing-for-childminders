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
} from '@/lib/enquiries/types'
import type { SendMode } from '@/lib/enquiries/send-mode'
import { alreadyRepliedToLatestInbound, isOpenDraft, replySubject } from '@/lib/enquiries/inbox'

export default function ProspectDetail({
  prospect: initial,
  messages: initialMessages,
  agentPaused,
  sendMode,
  gmailConnected,
  gmailEmail,
}: {
  prospect: EnquiryProspect
  messages: EnquiryMessage[]
  agentPaused: boolean
  sendMode: SendMode
  gmailConnected: boolean
  gmailEmail: string | null
}) {
  const router = useRouter()
  const supabase = createClient()
  const [prospect, setProspect] = useState(initial)
  const [messages, setMessages] = useState(initialMessages)
  const [drafting, setDrafting] = useState(false)
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lostReason, setLostReason] = useState(prospect.lost_reason || '')
  const [draftBody, setDraftBody] = useState(() => {
    const draft = [...initialMessages].reverse().find(isOpenDraft)
    return draft?.body || ''
  })
  const [draftSubject, setDraftSubject] = useState(() => {
    const inbound = [...initialMessages].reverse().find((m) => m.direction === 'in')
    return replySubject(inbound?.subject, initial.child_name)
  })

  const latestInbound = [...messages].reverse().find((m) => m.direction === 'in')
  const latestDraft = [...messages].reverse().find(isOpenDraft)
  const alreadyReplied = alreadyRepliedToLatestInbound(messages)
  const thread = messages.filter((m) => m.direction !== 'draft' || isOpenDraft(m))

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
      if (prospect.stage === 'new') setProspect({ ...prospect, stage: 'chatting' })
      if (data.sent) {
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== data.draft?.id),
          {
            ...data.draft,
            id: data.sent.gmailMessageId || `out-${Date.now()}`,
            direction: 'out',
            status: 'auto_sent',
            from_address: gmailEmail,
            to_address: prospect.parent_email,
          },
        ])
        setDraftBody('')
        toast.success('Drafted and sent from Gmail (auto-send is on).')
        router.refresh()
      } else {
        setMessages((prev) => [...prev, data.draft])
        setDraftBody(data.draft.body)
        toast.success('Draft ready — read it, then approve to send from Gmail.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not draft a reply.')
    } finally {
      setDrafting(false)
    }
  }

  async function copyDraft() {
    if (!draftBody) return
    await navigator.clipboard.writeText(draftBody)
    toast.success('Copied.')
  }

  async function approveAndSend() {
    if (!latestDraft) return
    setSending(true)
    try {
      const res = await fetch('/api/enquiries/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prospectId: prospect.id,
          draftId: latestDraft.id,
          body: draftBody,
          subject: draftSubject,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Send failed')
      setMessages((prev) => [
        ...prev.map((m) => (m.id === latestDraft.id ? { ...m, status: 'approved', body: draftBody } : m)),
        {
          ...latestDraft,
          id: `out-${data.gmailMessageId || Date.now()}`,
          direction: 'out',
          status: 'sent',
          body: draftBody,
          subject: draftSubject,
          from_address: null,
          to_address: prospect.parent_email,
        },
      ])
      toast.success(
        sendMode === 'auto'
          ? 'Sent from your Gmail.'
          : 'Sent from your Gmail. Dottie will not send again unless you approve.',
      )
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send that reply.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/enquiries" className="text-sm text-emerald-700 font-medium">← Inbox</Link>
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
          onChange={(e) => savePatch({ visit_at: e.target.value ? new Date(e.target.value).toISOString() : null, stage: e.target.value ? 'visit' : prospect.stage })}
        />
        <p className="text-xs text-gray-400">Google Calendar booking comes next. For now, put the time you agreed.</p>
      </div>

      {agentPaused ? (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
          Dottie is paused. Turn her back on from the Parents inbox to read Gmail, draft, or send.
        </div>
      ) : sendMode === 'auto' ? (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-sm text-emerald-900">
          Auto-send is on. Replies go out as {gmailEmail || 'you'} on the real Gmail thread. You can still approve leftover drafts here.
        </div>
      ) : (
        <div className="rounded-2xl bg-sky-50 border border-sky-100 p-4 text-sm text-sky-900">
          Draft &amp; approve is on. Dottie writes the reply here; nothing sends until you tap Approve. Sends as {gmailEmail || 'you'} on the real Gmail thread.
        </div>
      )}

      {prospect.stage === 'lost' || prospect.stage === 'started' ? null : (
        <div className="flex flex-wrap gap-2">
          <Button
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
            onClick={draftReply}
            disabled={drafting || agentPaused || (sendMode === 'auto' && alreadyReplied && !latestDraft)}
          >
            {drafting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {sendMode === 'auto' && alreadyReplied && !latestDraft ? 'Sent from Gmail' : 'Draft a reply'}
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={() => setStage('ready')} disabled={saving}>
            They want to start
          </Button>
          <Button variant="outline" className="rounded-xl" onClick={() => setStage('started')} disabled={saving}>
            They&apos;ve started
          </Button>
        </div>
      )}

      {prospect.stage === 'ready' ? (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
          Send the contract and starter pack from this thread (as you, via Gmail). Then mark They&apos;ve started when the child is on roll — Dottie Invoicing can take it from there.
        </div>
      ) : null}

      {latestDraft ? (
        <div className="rounded-2xl border border-emerald-100 bg-white p-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Draft to approve</p>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input value={draftSubject} onChange={(e) => setDraftSubject(e.target.value)} />
          </div>
          <Textarea rows={12} value={draftBody} onChange={(e) => setDraftBody(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
              onClick={approveAndSend}
              disabled={sending || agentPaused || !gmailConnected || !prospect.parent_email}
            >
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Approve and send from Gmail
            </Button>
            <Button type="button" variant="outline" className="rounded-xl" onClick={copyDraft}>
              Copy
            </Button>
          </div>
          <p className="text-xs text-gray-400">
            {gmailConnected
              ? `Sends as ${gmailEmail} on the Gmail thread — not from a Dottie address.`
              : 'Connect Gmail on the inbox so Dottie can send as you on the real thread.'}
          </p>
        </div>
      ) : null}

      {thread.length ? (
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Thread</p>
          {thread.map((m) => (
            <div
              key={m.id}
              className={`rounded-2xl p-4 ${
                m.direction === 'in'
                  ? 'border border-gray-100 bg-gray-50'
                  : m.direction === 'draft'
                    ? 'border border-emerald-100 bg-white'
                    : 'border border-emerald-50 bg-emerald-50/60'
              }`}
            >
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                {m.direction === 'in'
                  ? 'Parent'
                  : m.direction === 'draft'
                    ? 'Draft'
                    : m.status === 'auto_sent'
                      ? 'Sent as you · Gmail'
                      : 'Sent as you · Gmail'}
              </p>
              {m.subject ? <p className="text-sm font-medium text-gray-700 mb-1">{m.subject}</p> : null}
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{m.body}</p>
            </div>
          ))}
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
