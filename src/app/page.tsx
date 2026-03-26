import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-sky-500 shadow-md">
              <span className="text-white text-base font-extrabold leading-none">EI</span>
            </span>
            <span className="text-gray-900 font-bold text-lg tracking-tight hidden sm:block">
              Easy Invoicing
            </span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-emerald-600 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-emerald-600 transition-colors">Pricing</a>
            <a href="#security" className="hover:text-emerald-600 transition-colors">Support</a>
            <Link href="/login" className="hover:text-emerald-600 transition-colors">Sign in</Link>
          </div>

          {/* CTA */}
          <Link
            href="/signup"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md shadow-emerald-200 transition-all active:scale-95"
          >
            Start free trial
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-500 to-sky-500 pt-16 pb-24 sm:pt-24 sm:pb-32">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
          {/* Copy */}
          <div className="text-white">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white/90 text-xs font-semibold tracking-wide uppercase mb-6 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
              New invoices every Sunday · Auto-generated
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-6">
              Invoicing on <span className="text-emerald-100">autopilot</span> for childcare professionals
            </h1>
            <p className="text-lg sm:text-xl text-white/85 leading-relaxed mb-8 max-w-lg">
              Set up your children&apos;s schedules once. Invoices generate automatically every week, ready for you to review and approve.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-7 py-4 rounded-2xl bg-white text-emerald-700 font-bold text-base shadow-xl shadow-black/20 hover:bg-emerald-50 transition-all active:scale-95"
              >
                Start your free 7-day trial
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center px-7 py-4 rounded-2xl border-2 border-white/40 text-white font-semibold text-base hover:bg-white/10 transition-all"
              >
                See how it works ↓
              </a>
            </div>

            <p className="text-white/70 text-sm">
              No credit card required &middot; Cancel anytime &middot; 7 days free
            </p>
          </div>

          {/* Floating invoice card mockup */}
          <div className="hidden lg:flex justify-center">
            <div className="relative">
              {/* Shadow card behind */}
              <div className="absolute top-4 left-4 w-full h-full bg-white/20 rounded-3xl" />
              {/* Main card */}
              <div className="relative bg-white rounded-3xl shadow-2xl shadow-black/30 p-6 w-80 text-sm">
                {/* Invoice header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">Invoice</div>
                    <div className="text-gray-900 font-bold text-base">#INV-2025-047</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                    Auto-generated
                  </span>
                </div>

                <div className="h-px bg-gray-100 mb-4" />

                {/* Child details */}
                <div className="mb-4">
                  <div className="text-xs text-gray-400 font-medium mb-2">CHILD</div>
                  <div className="font-semibold text-gray-900">Olivia Bennett</div>
                  <div className="text-gray-500 text-xs">Week: 6–10 Jan 2025</div>
                </div>

                {/* Line items */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mon · Full day</span>
                    <span className="font-medium text-gray-900">£55.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tue · Full day</span>
                    <span className="font-medium text-gray-900">£55.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Wed · Half day</span>
                    <span className="font-medium text-gray-900">£27.50</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Thu · Full day</span>
                    <span className="font-medium text-gray-900">£55.00</span>
                  </div>
                </div>

                <div className="h-px bg-gray-100 mb-3" />

                <div className="flex justify-between font-bold text-gray-900 text-base">
                  <span>Total</span>
                  <span>£192.50</span>
                </div>

                <div className="mt-4 flex gap-2">
                  <button className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold">
                    Approve &amp; Send
                  </button>
                  <button className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold">
                    Edit
                  </button>
                </div>
              </div>

              {/* Badge */}
              <div className="absolute -top-3 -right-3 bg-sky-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                ✨ Auto-created Sunday 7am
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <section className="bg-gray-50 border-b border-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="text-center text-gray-500 text-sm font-medium mb-6 uppercase tracking-wider">
            Designed exclusively for UK childminders &amp; childcare providers
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: '🛡️', title: 'Bank-grade security', desc: 'Your data is encrypted and stored securely at all times.' },
              { icon: '🔒', title: 'GDPR compliant', desc: 'Built with UK data protection regulations in mind.' },
              { icon: '⭐', title: 'Trusted by childminders', desc: 'Designed specifically for the needs of UK childcare professionals.' },
            ].map((item) => (
              <div key={item.title} className="flex flex-col items-center text-center gap-2">
                <span className="text-3xl">{item.icon}</span>
                <span className="font-semibold text-gray-900 text-sm">{item.title}</span>
                <span className="text-gray-500 text-sm leading-snug">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-20 sm:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Everything you need, nothing you don&apos;t
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Built from scratch for UK childminders — no bloat, no confusion, just tools that actually help.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* HERO feature — spans full width */}
            <div className="sm:col-span-2 lg:col-span-3 relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-sky-500 p-8 text-white shadow-xl shadow-emerald-200/40">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-3xl">🤖</span>
                  <span className="px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wide">
                    Hero Feature
                  </span>
                </div>
                <h3 className="text-2xl font-extrabold mb-2">Auto-generate invoices</h3>
                <p className="text-white/85 text-base max-w-2xl leading-relaxed">
                  Invoices generate every Sunday based on your children&apos;s fixed schedules. Review, approve, and send — or let them go automatically. No manual entry, no forgotten invoices, no stress.
                </p>
              </div>
            </div>

            {/* Regular feature cards */}
            {[
              { icon: '📅', title: 'Fixed schedule support', desc: 'Set Mon–Fri schedules with full or half days. The app calculates everything for you.' },
              { icon: '🔒', title: 'Bank-grade security', desc: 'Your bank details and children\'s data are encrypted and protected. Built for professionals who handle sensitive information.' },
              { icon: '📊', title: 'Tax year reports', desc: 'HMRC-ready income summaries and expense reports at the click of a button.' },
              { icon: '💸', title: 'Expense tracking', desc: 'Log childcare expenses by category. Export for your accountant.' },
              { icon: '📄', title: 'PDF-ready invoices', desc: 'Professional, print-ready A4 invoices sent directly to parents.' },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group rounded-3xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-100/40 p-6 transition-all duration-200"
              >
                <span className="text-3xl mb-4 block">{feature.icon}</span>
                <h3 className="font-bold text-gray-900 text-base mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Up and running in minutes
            </h2>
            <p className="text-gray-500 text-lg">
              Three simple steps and your invoicing is on autopilot.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                icon: '👧',
                title: 'Add your children',
                desc: 'Enter each child\'s details, weekly schedule, and parent contact info. Takes under 5 minutes.',
              },
              {
                step: '2',
                icon: '⚡',
                title: 'Invoices generate automatically',
                desc: 'Every Sunday at 7am, invoices are created for the upcoming week based on each child\'s schedule.',
              },
              {
                step: '3',
                icon: '✉️',
                title: 'Review, approve & send',
                desc: 'Check your drafts, make any adjustments, and send to parents in one tap.',
              },
            ].map((item, i) => (
              <div key={item.step} className="relative text-center">
                {/* Connector line */}
                {i < 2 && (
                  <div className="hidden sm:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-emerald-100" />
                )}
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-500 text-white text-2xl shadow-lg shadow-emerald-200/50 mb-4 mx-auto">
                  {item.icon}
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-extrabold flex items-center justify-center">
                    {item.step}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 text-base mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-20 sm:py-28 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-gray-500 text-lg">
              One plan, two billing options. Start free — no credit card needed.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Monthly */}
            <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-md">
              <div className="mb-6">
                <div className="text-gray-500 text-sm font-medium mb-1">Monthly</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900">£4.99</span>
                  <span className="text-gray-400 text-sm">/month</span>
                </div>
                <p className="text-gray-400 text-sm mt-1">Billed monthly, cancel anytime</p>
              </div>

              <ul className="space-y-3 mb-8">
                {[
                  'Unlimited children',
                  'Auto-generate invoices',
                  'PDF invoices',
                  'Expense tracking',
                  'Tax year reports',
                  '7-day free trial',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className="block w-full text-center py-3 rounded-2xl border-2 border-emerald-600 text-emerald-700 font-bold hover:bg-emerald-50 transition-colors"
              >
                Start free trial
              </Link>
            </div>

            {/* Annual — highlighted */}
            <div className="relative rounded-3xl border-2 border-emerald-500 bg-white p-8 shadow-xl shadow-emerald-100/50">
              {/* Badge */}
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="px-4 py-1.5 rounded-full bg-sky-500 text-white text-xs font-extrabold shadow-md whitespace-nowrap">
                  Save 10% · Best value
                </span>
              </div>

              <div className="mb-6">
                <div className="text-gray-500 text-sm font-medium mb-1">Annual</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900">£54</span>
                  <span className="text-gray-400 text-sm">/year</span>
                </div>
                <p className="text-gray-400 text-sm mt-1">Equivalent to £4.50/month</p>
              </div>

              <ul className="space-y-3 mb-8">
                {[
                  'Unlimited children',
                  'Auto-generate invoices',
                  'PDF invoices',
                  'Expense tracking',
                  'Tax year reports',
                  '7-day free trial',
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className="block w-full text-center py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-200 transition-colors"
              >
                Start free trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECURITY ── */}
      <section id="security" className="py-20 sm:py-28 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            Your data is safe with us
          </h2>
          <p className="text-gray-500 text-lg mb-12">
            We treat your data — and your children&apos;s data — with the highest level of care and protection.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            {[
              { icon: '🔐', title: 'End-to-end encryption', desc: 'All data is encrypted in transit and at rest using industry-standard AES-256.' },
              { icon: '🏛️', title: 'Row-level data isolation', desc: 'Your data is isolated at the database level. No user can access another\'s records.' },
              { icon: '📋', title: 'GDPR compliant', desc: 'Fully compliant with UK GDPR and the Data Protection Act 2018.' },
              { icon: '🇬🇧', title: 'UK-based data', desc: 'Your data is stored in UK/EU data centres, never transferred outside.' },
              { icon: '🏦', title: 'Secure bank detail storage', desc: 'Banking information is stored with vault-level encryption, never exposed in plain text.' },
              { icon: '🔄', title: 'Automatic backups', desc: 'Daily encrypted backups ensure your data is never lost.' },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 p-5 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <span className="text-2xl flex-shrink-0 mt-0.5">{item.icon}</span>
                <div>
                  <div className="font-semibold text-gray-900 text-sm mb-1">{item.title}</div>
                  <div className="text-gray-500 text-sm leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-sky-500 p-12 text-center text-white shadow-2xl shadow-emerald-200/50">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 leading-tight">
                Ready to take the admin out of childminding?
              </h2>
              <p className="text-white/85 text-lg mb-8 max-w-lg mx-auto">
                Start your free 7-day trial today. No credit card required.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-white text-emerald-700 font-extrabold text-lg shadow-xl shadow-black/20 hover:bg-emerald-50 transition-all active:scale-95"
              >
                Get started free →
              </Link>
              <p className="text-white/60 text-sm mt-4">7 days free · No credit card · Cancel anytime</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 text-gray-400 py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8 mb-10">
            {/* Logo + tagline */}
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-sky-500">
                  <span className="text-white text-sm font-extrabold">EI</span>
                </span>
                <span className="text-white font-bold text-base">Easy Invoicing</span>
              </div>
              <p className="text-gray-500 text-sm">Part of the <span className="text-sky-400 font-medium">Dottie OS</span> ecosystem</p>
            </div>

            {/* Nav */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
              <a href="#security" className="hover:text-white transition-colors">Support</a>
              <Link href="/login" className="hover:text-white transition-colors">Sign in</Link>
              <Link href="/signup" className="hover:text-white transition-colors">Sign up</Link>
            </div>
          </div>

          <div className="h-px bg-gray-800 mb-6" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm">
            <p>&copy; 2025 Easy Invoicing. All rights reserved.</p>
            <div className="flex gap-5">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
