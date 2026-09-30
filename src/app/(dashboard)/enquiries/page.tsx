import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ENQUIRY_STAGE_LABELS, type EnquiryMessage, type EnquiryProspect } from '@/lib/enquiries/types'
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
    .select('setup_completed_at, agent_paused, display_name, inbound_slug')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!settings?.setup_completed_at) redirect('/enquiries/setup')

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
          <h1 className="text-2xl font-bold text-gray-900">Enquiry inbox</h1>
          <p className="text-gray-500 text-sm mt-1">
            {settings.agent_paused
              ? 'Dottie is paused — she will not draft replies until you turn her back on.'
              : 'New parent emails from Gmail show up here. Dottie drafts a visit letter from Your answers.'}
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

      <GmailConnect inboundSlug={settings.inbound_slug} />

      {open.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-emerald-200 bg-white p-10 text-center">
          <p className="font-semibold text-gray-900 mb-2">
            {rows.length ? 'No open enquiries' : 'Inbox is empty'}
          </p>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
            Connect Gmail above, or tap Add a parent and paste a message. Dottie drafts a polite visit letter. Automatic send stays off until you turn it on in Your answers.
          </p>
          <Link href="/enquiries/new" className="text-emerald-700 font-semibold">
            Add a parent →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {open.map((p) => {
            const thread = messagesByProspect.get(p.id) ?? []
            const latest = thread[0]
            const status = inboxStatus(thread, p.stage)
            return (
              <div key={stage}>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">{ENQUIRY_STAGE_LABELS[stage]}</p>
                <div className="space-y-2">
                  {inStage.map((p) => (
                    <Link
                      key={p.id}
                      href={`/enquiries/${p.id}`}
                      className="block rounded-2xl border border-gray-100 bg-white p-4 hover:border-emerald-200 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {p.parent_name || 'Parent'}
                            {p.child_name ? <span className="text-gray-500 font-medium"> · {p.child_name}</span> : null}
                            {p.needs_human ? (
                              <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                                Needs you
                              </span>
                            ) : null}
                          </p>
                          <p className="text-sm text-gray-500 mt-0.5">
                            {[p.days_needed, p.start_date ? `from ${p.start_date}` : null, fundingLabel(p.funding)]
                              .filter(Boolean)
                              .join(' · ') || 'Details still coming in'}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 shrink-0">
                          {new Date(p.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </Link>
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
