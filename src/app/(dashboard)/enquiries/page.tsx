import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ENQUIRY_STAGE_LABELS, ENQUIRY_STAGES, FUNDING_OPTIONS, type EnquiryMessage, type EnquiryProspect } from '@/lib/enquiries/types'
import { parseSendMode } from '@/lib/enquiries/send-mode'
import { inboxStatus, snippet } from '@/lib/enquiries/inbox'
import { Plus, Settings2 } from 'lucide-react'
import GmailConnect from '@/components/enquiries/GmailConnect'

const STATUS_TONE: Record<string, string> = {
  needs_approval: 'bg-amber-50 text-amber-800',
  waiting: 'bg-sky-50 text-sky-800',
  sent: 'bg-emerald-50 text-emerald-800',
  new: 'bg-gray-100 text-gray-600',
  stage: 'bg-gray-100 text-gray-600',
}

function fundingLabel(id: string | null) {
  if (!id) return null
  return FUNDING_OPTIONS.find((f) => f.id === id)?.label ?? id
}

export default async function EnquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ gmail?: string }>
}) {
  const { gmail } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: settings } = await supabase
    .from('enquiry_settings')
    .select('setup_completed_at, agent_paused, display_name, inbound_slug, send_mode')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!settings?.setup_completed_at) redirect('/enquiries/setup')

  const sendMode = parseSendMode(settings.send_mode)

  const [{ data: prospects }, { data: messageRows }, { data: gmailAccount }] = await Promise.all([
    supabase
      .from('enquiry_prospects')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false }),
    supabase
      .from('enquiry_messages')
      .select('prospect_id, direction, status, body, subject, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('enquiry_gmail_accounts')
      .select('email')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const rows = (prospects ?? []) as EnquiryProspect[]
  const open = rows.filter((p) => p.stage !== 'started' && p.stage !== 'lost')
  const messagesByProspect = new Map<string, EnquiryMessage[]>()
  for (const raw of messageRows ?? []) {
    const list = messagesByProspect.get(raw.prospect_id) ?? []
    list.push(raw as EnquiryMessage)
    messagesByProspect.set(raw.prospect_id, list)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New parents</h1>
          <p className="text-gray-500 text-sm mt-1">
            {settings.agent_paused
              ? 'Dottie is paused — she will not read Gmail, draft, or send until you turn her back on.'
              : sendMode === 'auto'
                ? 'New parent emails from Gmail show up here. Auto-send is on: Dottie replies on the real Gmail thread.'
                : 'New parent emails from Gmail show up here. Draft & approve is on — nothing sends until you tap Approve.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/enquiries/setup"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <Settings2 className="h-4 w-4" />
            Your answers
          </Link>
          <Link
            href="/enquiries/new"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Add a parent
          </Link>
        </div>
      </div>

      <GmailConnect
        initialPaused={Boolean(settings.agent_paused)}
        initialSendMode={sendMode}
        gmailResult={gmail}
      />

      {open.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-emerald-200 bg-white p-10 text-center">
          <p className="font-semibold text-gray-900 mb-2">No one waiting</p>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
            {settings.agent_paused
              ? 'Dottie is paused, so she is not checking Gmail. Turn her back on when you want new parent emails to land here.'
              : gmailAccount?.email
                ? 'Label parent emails Enquiries or New parent in Gmail. Dottie only saves classified enquiry threads — receipts and personal mail are never stored.'
                : 'Connect Gmail above, or tap Add a parent and paste a message. Go Dottie drafts a polite visit letter and, with Auto-send on, sends it from your Gmail.'}
          </p>
          <Link href="/enquiries/new" className="text-emerald-700 font-semibold">
            Add the first parent →
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {ENQUIRY_STAGES.filter((s) => s !== 'started' && s !== 'lost').map((stage) => {
            const inStage = rows.filter((p) => p.stage === stage)
            if (!inStage.length) return null
            return (
              <div key={stage}>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">{ENQUIRY_STAGE_LABELS[stage]}</p>
                <div className="space-y-2">
                  {inStage.map((p) => {
                    const thread = messagesByProspect.get(p.id) ?? []
                    const latest = thread[0]
                    const status = inboxStatus(thread, p.stage)
                    return (
                      <Link
                        key={p.id}
                        href={`/enquiries/${p.id}`}
                        className="block rounded-2xl border border-gray-100 bg-white p-4 hover:border-emerald-200 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900">
                              {p.parent_name || 'Parent'}
                              {p.child_name ? <span className="text-gray-500 font-medium"> · {p.child_name}</span> : null}
                              {p.needs_human ? (
                                <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                                  Needs you
                                </span>
                              ) : null}
                            </p>
                            <p className="text-sm text-gray-500 mt-0.5 truncate">
                              {snippet(latest?.body || latest?.subject) !== 'No message yet'
                                ? snippet(latest?.body || latest?.subject)
                                : [p.days_needed, p.start_date ? `from ${p.start_date}` : null, fundingLabel(p.funding)]
                                  .filter(Boolean)
                                  .join(' · ') || 'Details still coming in'}
                            </p>
                          </div>
                          <div className="shrink-0 text-right space-y-1">
                            <span className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_TONE[status.key]}`}>
                              {status.label}
                            </span>
                            <p className="text-xs text-gray-400">
                              {new Date(p.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </p>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {rows.some((p) => p.stage === 'started' || p.stage === 'lost') ? (
        <details className="text-sm text-gray-500">
          <summary className="cursor-pointer font-medium">Started and not going ahead</summary>
          <div className="mt-3 space-y-2">
            {rows
              .filter((p) => p.stage === 'started' || p.stage === 'lost')
              .map((p) => (
                <Link key={p.id} href={`/enquiries/${p.id}`} className="block text-gray-600 hover:text-emerald-700">
                  {p.parent_name || 'Parent'} — {ENQUIRY_STAGE_LABELS[p.stage]}
                </Link>
              ))}
          </div>
        </details>
      ) : null}
    </div>
  )
}
