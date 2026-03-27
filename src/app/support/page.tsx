'use client'

import Link from 'next/link'
import { useState } from 'react'

const SUPPORT_EMAIL = 'support@dottie.cloud'

const FAQ_ITEMS = [
  {
    question: 'How does auto-invoice generation work?',
    answer:
      "You choose when invoices generate — weekly, fortnightly, or monthly. Set your schedule during onboarding or update it any time in Settings. At your chosen time, Dottie automatically creates draft invoices for each child based on their schedule and rates. They appear in your invoices list marked as 'Draft' — review them, make any changes, and send to parents when you're ready.",
  },
  {
    question: 'Is there a free trial?',
    answer:
      'Yes! Every new account gets a 7-day free trial with full access to all features. No credit card required to start.',
  },
  {
    question: 'How much does it cost?',
    answer:
      'Dottie has two plans: Starter (up to 5 children) at £9.99/month or £99/year, and Professional (up to 20 children) at £19.99/month or £199/year. For unlimited children, contact us. All plans include auto-invoice generation, PDF invoices, expense tracking, and tax year reports.',
  },
  {
    question: 'Is my data secure?',
    answer:
      "Absolutely. Your data is protected with row-level security — completely isolated from other users. Bank details are stored encrypted. We're GDPR compliant and all data is stored in the UK/EU.",
  },
  {
    question: 'Can I cancel at any time?',
    answer:
      "Yes, cancel your subscription any time from your account settings. You'll keep full access until the end of your billing period.",
  },
  {
    question: 'What happens when my trial ends?',
    answer:
      "You'll be prompted to choose a plan. If you don't subscribe, access to the app pauses — but your data is safely stored for 30 days in case you return.",
  },
  {
    question: 'Do you support childminders with multiple children?',
    answer:
      "Yes! The Starter plan supports up to 5 children, and the Professional plan supports up to 20 children. For larger settings, get in touch about our Unlimited plan. Each child can have their own schedule, rates, and parent contact details.",
  },
  {
    question: 'Can I export my invoices as PDF?',
    answer:
      'Yes, every invoice can be printed or saved as a PDF directly from the app. Invoices are formatted to A4 for professional presentation.',
  },
]

const SUBJECTS = [
  'General question',
  'Billing & subscription',
  'Technical issue',
  'Feature request',
  'Account & data',
  'Other',
]

export default function SupportPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '', website: '' })
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function update(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('sending')
    setErrorMsg('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Something went wrong. Please try again.')
        setStatus('error')
        return
      }
      setStatus('sent')
      setForm({ name: '', email: '', subject: '', message: '', website: '' })
    } catch {
      setErrorMsg('Could not send message. Please email us directly at ' + SUPPORT_EMAIL)
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6">

        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium mb-6">
            ← Back to Dottie
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">We&apos;re here to help</h1>
          <p className="mt-3 text-lg text-gray-500">Send us a message or browse our FAQ below.</p>
        </div>

        {/* Contact form */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-10">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Send a message</h2>
          <p className="text-sm text-gray-500 mb-6">We aim to respond within 24 hours on business days.</p>

          {status === 'sent' ? (
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-6 text-center">
              <div className="text-3xl mb-3">💚</div>
              <h3 className="font-semibold text-emerald-900 text-base mb-1">Message sent!</h3>
              <p className="text-emerald-700 text-sm">Thanks for getting in touch. I'll get back to you soon.</p>
              <button
                onClick={() => setStatus('idle')}
                className="mt-4 text-sm text-emerald-600 underline hover:text-emerald-700"
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Honeypot — hidden from humans, bots fill it in */}
              <input
                type="text"
                name="website"
                value={form.website}
                onChange={e => update('website', e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}
              />

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={e => update('name', e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={e => update('email', e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select
                  value={form.subject}
                  onChange={e => update('subject', e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent bg-white text-gray-700"
                >
                  <option value="">Select a topic…</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={5}
                  value={form.message}
                  onChange={e => update('message', e.target.value)}
                  placeholder="Tell me how I can help…"
                  maxLength={2000}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">{form.message.length}/2000</p>
              </div>

              {status === 'error' && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {status === 'sending' ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending…
                  </>
                ) : 'Send message'}
              </button>
            </form>
          )}
        </div>

        {/* FAQ section */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-semibold text-gray-900">Frequently asked questions</h2>
            <Link href="/faq" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
              See all FAQs →
            </Link>
          </div>

          <div className="space-y-2">
            {FAQ_ITEMS.map((item, index) => (
              <details
                key={index}
                className="group bg-white border border-gray-200 rounded-xl overflow-hidden"
              >
                <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                  <span>{item.question}</span>
                  <svg
                    className="flex-shrink-0 w-4 h-4 text-gray-400 transition-transform duration-200 group-open:rotate-180"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-5 pb-4 pt-1 text-sm text-gray-600 leading-relaxed border-t border-gray-100">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Bottom direct email fallback */}
        <div className="mt-10 text-center">
          <p className="text-gray-500 text-sm">
            Prefer to email directly?{' '}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-emerald-600 hover:text-emerald-700 font-medium underline underline-offset-2 transition-colors"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>

      </div>
    </div>
  )
}
