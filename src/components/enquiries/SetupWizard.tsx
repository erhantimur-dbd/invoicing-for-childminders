'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Check, ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FUNDING_OPTIONS, WEEKDAYS, type VisitingWindow } from '@/lib/enquiries/types'
import { makeInboundSlug } from '@/lib/enquiries/slug'
import { DEFAULT_SEND_MODE, parseSendMode, type SendMode } from '@/lib/enquiries/send-mode'
import SendModeToggle from '@/components/enquiries/SendModeToggle'

const STEPS = ['About you', 'Spaces', 'Funding', 'Visits', 'Your answers', 'Sending']

type VacancyDraft = {
  weekday: number
  session: 'full'
  remaining_places: number
  funded: boolean
  private: boolean
  enabled: boolean
}

type FaqDraft = { question: string; answer: string }

function emptyVacancies(): VacancyDraft[] {
  return WEEKDAYS.map((d) => ({
    weekday: d.id,
    session: 'full' as const,
    remaining_places: 1,
    funded: true,
    private: true,
    enabled: false,
  }))
}

export default function SetupWizard() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [ofstedUrn, setOfstedUrn] = useState('')
  const [postcode, setPostcode] = useState('')
  const [agesFrom, setAgesFrom] = useState('9')
  const [agesTo, setAgesTo] = useState('5')
  const [voiceNotes, setVoiceNotes] = useState('')
  const [dayRate, setDayRate] = useState('')
  const [quoteFees, setQuoteFees] = useState(true)

  const [vacancies, setVacancies] = useState<VacancyDraft[]>(emptyVacancies)
  const [acceptsFunded, setAcceptsFunded] = useState(true)
  const [schemes, setSchemes] = useState<string[]>(['wp_under5', '3to4_working', '3to4_universal'])
  const [stretched, setStretched] = useState(false)
  const [termTimeOnly, setTermTimeOnly] = useState(false)

  const [tueEve, setTueEve] = useState(true)
  const [thuEve, setThuEve] = useState(true)
  const [satMorn, setSatMorn] = useState(false)
  const [visitStart, setVisitStart] = useState('18:30')
  const [visitEnd, setVisitEnd] = useState('19:30')

  const [faqs, setFaqs] = useState<FaqDraft[]>([
    { question: 'Do you do school drop-off / pick-up?', answer: '' },
    { question: 'Do you have pets?', answer: '' },
    { question: 'What do the children eat?', answer: '' },
  ])
  const [packNotes, setPackNotes] = useState('')
  const [sendMode, setSendMode] = useState<SendMode>(DEFAULT_SEND_MODE)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from('profiles').select('full_name, ofsted_number, postcode').eq('id', user.id).single()
      if (profile?.full_name) setDisplayName(profile.full_name)
      if (profile?.ofsted_number) setOfstedUrn(profile.ofsted_number)
      if (profile?.postcode) setPostcode(profile.postcode)

      const { data: settings } = await supabase.from('enquiry_settings').select('*').eq('user_id', user.id).maybeSingle()
      if (settings) {
        setDisplayName(settings.display_name || profile?.full_name || '')
        setOfstedUrn(settings.ofsted_urn || '')
        setPostcode(settings.postcode || '')
        if (settings.ages_from_months != null) setAgesFrom(String(settings.ages_from_months))
        if (settings.ages_to_years != null) setAgesTo(String(settings.ages_to_years))
        setVoiceNotes(settings.voice_notes || '')
        if (settings.day_rate != null) setDayRate(String(settings.day_rate))
        setQuoteFees(settings.quote_fees_in_email)
        setAcceptsFunded(settings.accepts_funded)
        setSchemes(settings.funding_schemes || [])
        setStretched(settings.stretched_hours)
        setTermTimeOnly(settings.term_time_only)
        setSendMode(parseSendMode(settings.send_mode))
      }

      const { data: vacRows } = await supabase.from('enquiry_vacancies').select('*').eq('user_id', user.id)
      if (vacRows?.length) {
        setVacancies((prev) =>
          prev.map((v) => {
            const match = vacRows.find((r) => r.weekday === v.weekday && r.session === 'full')
            if (!match) return v
            return {
              ...v,
              enabled: match.remaining_places > 0,
              remaining_places: match.remaining_places,
              funded: match.funded,
              private: match.private,
            }
          }),
        )
      }

      const { data: knowledge } = await supabase.from('enquiry_knowledge').select('*').eq('user_id', user.id)
      const existingFaqs = (knowledge || []).filter((k) => k.kind === 'faq')
      if (existingFaqs.length) {
        setFaqs(existingFaqs.map((k) => ({ question: k.question || '', answer: k.answer || '' })))
      }
      const note = (knowledge || []).find((k) => k.kind === 'note')
      if (note?.answer) setPackNotes(note.answer)

      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function toggleScheme(id: string) {
    setSchemes((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  async function save() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const windows: VisitingWindow[] = []
    const eveningDays: string[] = []
    if (tueEve) eveningDays.push('tuesday')
    if (thuEve) eveningDays.push('thursday')
    if (eveningDays.length) {
      windows.push({ days: eveningDays, start: visitStart, end: visitEnd, slot_minutes: 45 })
    }
    if (satMorn) {
      windows.push({ days: ['saturday'], start: '10:00', end: '12:00', slot_minutes: 45 })
    }

    const { error: settingsError } = await supabase.from('enquiry_settings').upsert({
      user_id: user.id,
      display_name: displayName.trim() || null,
      ofsted_urn: ofstedUrn.trim() || null,
      postcode: postcode.trim() || null,
      ages_from_months: Number(agesFrom) || null,
      ages_to_years: Number(agesTo) || null,
      voice_notes: voiceNotes.trim() || null,
      day_rate: dayRate ? Number(dayRate) : null,
      quote_fees_in_email: quoteFees,
      accepts_funded: acceptsFunded,
      funding_schemes: acceptsFunded ? schemes : [],
      stretched_hours: stretched,
      term_time_only: termTimeOnly,
      visiting_windows: windows,
      inbound_slug: makeInboundSlug(displayName, user.id),
      send_mode: sendMode,
      setup_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    if (settingsError) {
      toast.error('Could not save your setting. Try again.')
      setSaving(false)
      return
    }

    await supabase.from('enquiry_vacancies').delete().eq('user_id', user.id)
    const vacInserts = vacancies
      .filter((v) => v.enabled && v.remaining_places > 0)
      .map((v) => ({
        user_id: user.id,
        weekday: v.weekday,
        session: 'full',
        remaining_places: v.remaining_places,
        funded: v.funded,
        private: v.private,
      }))
    if (vacInserts.length) {
      const { error } = await supabase.from('enquiry_vacancies').insert(vacInserts)
      if (error) {
        toast.error('Saved your details, but spaces did not save.')
        setSaving(false)
        return
      }
    }

    await supabase.from('enquiry_knowledge').delete().eq('user_id', user.id)
    const knowledgeRows = [
      ...faqs
        .filter((f) => f.question.trim() && f.answer.trim())
        .map((f) => ({
          user_id: user.id,
          kind: 'faq' as const,
          question: f.question.trim(),
          answer: f.answer.trim(),
        })),
      ...(packNotes.trim()
        ? [{ user_id: user.id, kind: 'note' as const, question: 'Starter pack / how we start', answer: packNotes.trim() }]
        : []),
    ]
    if (knowledgeRows.length) {
      await supabase.from('enquiry_knowledge').insert(knowledgeRows)
    }

    toast.success('All set. New parents will show up here.')
    router.push('/enquiries')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-center gap-0 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold',
                  i < step ? 'bg-emerald-600 text-white' : i === step ? 'bg-emerald-600 text-white ring-4 ring-emerald-100' : 'bg-gray-100 text-gray-400',
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn('text-[11px] mt-1 hidden sm:block', i === step ? 'text-emerald-700 font-medium' : 'text-gray-400')}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && <div className={cn('h-0.5 w-6 sm:w-10 mx-1 mb-4', i < step ? 'bg-emerald-500' : 'bg-gray-200')} />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <section className="space-y-4">
          <h1 className="text-2xl font-extrabold text-gray-900">Tell Dottie about your setting</h1>
          <p className="text-gray-500 text-sm">This is how she introduces you to new parents. Use the name they already know.</p>
          <div className="space-y-1.5">
            <Label>Your name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Mary" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Ofsted number (optional)</Label>
              <Input value={ofstedUrn} onChange={(e) => setOfstedUrn(e.target.value)} placeholder="EY123456" />
            </div>
            <div className="space-y-1.5">
              <Label>Postcode</Label>
              <Input value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="N1 2AB" />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Youngest age (months)</Label>
              <Input type="number" min={0} value={agesFrom} onChange={(e) => setAgesFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Oldest age (years)</Label>
              <Input type="number" min={1} value={agesTo} onChange={(e) => setAgesTo(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Things parents always ask</Label>
            <Textarea
              rows={5}
              value={voiceNotes}
              onChange={(e) => setVoiceNotes(e.target.value)}
              placeholder="Home in a quiet street, garden, one dog (labrador), home-cooked meals, school run to St Mary's…"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Day rate (optional)</Label>
            <Input type="number" min={0} step="0.01" value={dayRate} onChange={(e) => setDayRate(e.target.value)} placeholder="65" />
            <label className="flex items-center gap-2 text-sm text-gray-600 pt-1">
              <input type="checkbox" checked={quoteFees} onChange={(e) => setQuoteFees(e.target.checked)} />
              Dottie may mention this rate in emails
            </label>
          </div>
        </section>
      )}

      {step === 1 && (
        <section className="space-y-4">
          <h1 className="text-2xl font-extrabold text-gray-900">Which days have space?</h1>
          <p className="text-gray-500 text-sm">Only tick days you could take a new child. Dottie will never offer a day you leave blank.</p>
          <div className="space-y-2">
            {vacancies.map((v, i) => {
              const day = WEEKDAYS.find((d) => d.id === v.weekday)!
              return (
                <div key={v.weekday} className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3">
                  <label className="flex items-center gap-2 font-semibold text-gray-800 w-20">
                    <input
                      type="checkbox"
                      checked={v.enabled}
                      onChange={(e) => {
                        const next = [...vacancies]
                        next[i] = { ...v, enabled: e.target.checked }
                        setVacancies(next)
                      }}
                    />
                    {day.label}
                  </label>
                  {v.enabled && (
                    <>
                      <label className="text-sm text-gray-600 flex items-center gap-2">
                        Spaces
                        <Input
                          className="w-16"
                          type="number"
                          min={1}
                          max={6}
                          value={v.remaining_places}
                          onChange={(e) => {
                            const next = [...vacancies]
                            next[i] = { ...v, remaining_places: Number(e.target.value) || 1 }
                            setVacancies(next)
                          }}
                        />
                      </label>
                      <label className="text-sm text-gray-600 flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={v.funded}
                          onChange={(e) => {
                            const next = [...vacancies]
                            next[i] = { ...v, funded: e.target.checked }
                            setVacancies(next)
                          }}
                        />
                        Funded
                      </label>
                      <label className="text-sm text-gray-600 flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={v.private}
                          onChange={(e) => {
                            const next = [...vacancies]
                            next[i] = { ...v, private: e.target.checked }
                            setVacancies(next)
                          }}
                        />
                        Private
                      </label>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <h1 className="text-2xl font-extrabold text-gray-900">Funded hours</h1>
          <p className="text-gray-500 text-sm">England only for now. Tick what you actually take — parents always ask this first.</p>
          <label className="flex items-center gap-2 font-medium text-gray-800">
            <input type="checkbox" checked={acceptsFunded} onChange={(e) => setAcceptsFunded(e.target.checked)} />
            I take government-funded hours
          </label>
          {acceptsFunded && (
            <div className="space-y-2">
              {FUNDING_OPTIONS.filter((o) => o.id !== 'unknown' && o.id !== 'private').map((o) => (
                <label key={o.id} className="flex items-start gap-2 text-sm text-gray-700">
                  <input className="mt-0.5" type="checkbox" checked={schemes.includes(o.id)} onChange={() => toggleScheme(o.id)} />
                  {o.label}
                </label>
              ))}
              <label className="flex items-center gap-2 text-sm text-gray-700 pt-2">
                <input type="checkbox" checked={stretched} onChange={(e) => setStretched(e.target.checked)} />
                I can stretch hours across the year
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={termTimeOnly} onChange={(e) => setTermTimeOnly(e.target.checked)} />
                Term-time only
              </label>
            </div>
          )}
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4">
          <h1 className="text-2xl font-extrabold text-gray-900">When can parents visit?</h1>
          <p className="text-gray-500 text-sm">Dottie only offers these times. Pick evenings after the children have gone home.</p>
          <label className="flex items-center gap-2 font-medium">
            <input type="checkbox" checked={tueEve} onChange={(e) => setTueEve(e.target.checked)} />
            Tuesday evening
          </label>
          <label className="flex items-center gap-2 font-medium">
            <input type="checkbox" checked={thuEve} onChange={(e) => setThuEve(e.target.checked)} />
            Thursday evening
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>From</Label>
              <Input type="time" value={visitStart} onChange={(e) => setVisitStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Until</Label>
              <Input type="time" value={visitEnd} onChange={(e) => setVisitEnd(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 font-medium">
            <input type="checkbox" checked={satMorn} onChange={(e) => setSatMorn(e.target.checked)} />
            Saturday morning 10:00–12:00
          </label>
        </section>
      )}

      {step === 4 && (
        <section className="space-y-4">
          <h1 className="text-2xl font-extrabold text-gray-900">Your answers</h1>
          <p className="text-gray-500 text-sm">
            Dottie only uses what you write here. If you leave an answer blank, she will say she will check with you.
          </p>
          {faqs.map((f, i) => (
            <div key={i} className="rounded-2xl border border-gray-100 bg-white p-4 space-y-2">
              <div className="flex items-start gap-2">
                <Input
                  value={f.question}
                  onChange={(e) => {
                    const next = [...faqs]
                    next[i] = { ...f, question: e.target.value }
                    setFaqs(next)
                  }}
                  placeholder="Question parents ask"
                />
                <button
                  type="button"
                  className="p-2 text-gray-400 hover:text-red-500"
                  onClick={() => setFaqs(faqs.filter((_, j) => j !== i))}
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <Textarea
                rows={2}
                value={f.answer}
                onChange={(e) => {
                  const next = [...faqs]
                  next[i] = { ...f, answer: e.target.value }
                  setFaqs(next)
                }}
                placeholder="Your answer"
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => setFaqs([...faqs, { question: '', answer: '' }])}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add a question
          </Button>
          <div className="space-y-1.5 pt-4">
            <Label>What you send when they want to start</Label>
            <Textarea
              rows={4}
              value={packNotes}
              onChange={(e) => setPackNotes(e.target.value)}
              placeholder="I email my parent contract, child information form, and privacy notice. Settling-in is two mornings in the first week."
            />
            <p className="text-xs text-gray-400">You can attach the real PDFs later. For now, tell Dottie what the pack includes.</p>
          </div>
        </section>
      )}

      {step === 5 && (
        <section className="space-y-4">
          <h1 className="text-2xl font-extrabold text-gray-900">How should Dottie send?</h1>
          <p className="text-gray-500 text-sm">
            You can change this later on the Parents page. Auto-send is the default. Draft &amp; approve stays available. Pause always stops drafts and sends.
          </p>
          <SendModeToggle value={sendMode} onChange={setSendMode} />
        </section>
      )}

      <div className="flex items-center justify-between mt-8">
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" className="rounded-xl bg-emerald-600 hover:bg-emerald-700" onClick={() => setStep((s) => s + 1)}>
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            type="button"
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
            disabled={saving}
            onClick={save}
          >
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Save and go to Parents
          </Button>
        )}
      </div>
    </div>
  )
}
