import type { EnquiryMessage, EnquiryStage } from './types'

export type InboxStatus = {
  key: 'new' | 'needs_approval' | 'waiting' | 'sent' | 'stage'
  label: string
}

export function isOpenDraft(m: EnquiryMessage) {
  return m.direction === 'draft' && m.status !== 'approved' && m.status !== 'auto_sent'
}

function newestFirst(messages: EnquiryMessage[]) {
  return [...messages].sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0))
}

export function inboxStatus(messages: EnquiryMessage[], stage: EnquiryStage): InboxStatus {
  const ordered = newestFirst(messages)
  const openDraft = ordered.find(isOpenDraft)
  if (openDraft) return { key: 'needs_approval', label: 'Needs approval' }

  const lastVisible = ordered.find((m) => m.direction !== 'draft')
  if (!lastVisible) return { key: 'new', label: 'New' }
  if (lastVisible.direction === 'out') return { key: 'sent', label: 'Sent from Gmail' }
  if (lastVisible.direction === 'in') return { key: 'waiting', label: 'Parent wrote' }
  return { key: 'stage', label: stage }
}

export function snippet(text: string | null | undefined, max = 90): string {
  const clean = (text || '').replace(/\s+/g, ' ').trim()
  if (!clean) return 'No message yet'
  return clean.length > max ? `${clean.slice(0, max)}…` : clean
}

export function replySubject(existing: string | null | undefined, childName?: string | null): string {
  const raw = (existing || '').trim()
  if (raw) return /^re:/i.test(raw) ? raw : `Re: ${raw}`
  return `Your enquiry${childName ? ` — ${childName}` : ''}`
}
