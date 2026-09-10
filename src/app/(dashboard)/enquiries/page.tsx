import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ENQUIRY_STAGE_LABELS, ENQUIRY_STAGES, FUNDING_OPTIONS, type EnquiryProspect } from '@/lib/enquiries/types'
import { Plus, Settings2 } from 'lucide-react'

function fundingLabel(id: string | null) {
  if (!id) return null
  return FUNDING_OPTIONS.find((f) => f.id === id)?.label ?? id
}

export default async function EnquiriesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: settings } = await supabase
    .from('enquiry_settings')
    .select('setup_completed_at, agent_paused, display_name')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!settings?.setup_completed_at) redirect('/enquiries/setup')

  const { data: prospects } = await supabase
    .from('enquiry_prospects')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  const rows = (prospects ?? []) as EnquiryProspect[]
  const open = rows.filter((p) => p.stage !== 'started' && p.stage !== 'lost')

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New parents</h1>
          <p className="text-gray-500 text-sm mt-1">
            {settings.agent_paused
              ? 'Dottie is paused — she will not draft replies until you turn her back on.'
              : 'Add a parent who emailed you. Dottie can draft the reply from your answers.'}
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

      {open.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-emerald-200 bg-white p-10 text-center">
          <p className="font-semibold text-gray-900 mb-2">No one waiting</p>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
            When a parent emails about a place, tap Add a parent, paste their message, and let Dottie draft the reply. Connecting Gmail so this happens by itself comes next.
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
