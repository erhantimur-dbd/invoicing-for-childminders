import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { readdirSync } from 'fs'
import { join } from 'path'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import HeroVisual from '@/components/HeroVisual'
import MobileNav from '@/components/MobileNav'
import {
  FileText, Receipt, CalendarDays, ShieldCheck, Banknote, Sparkles,
  BarChart3, Baby, ClipboardCheck, Wallet, PiggyBank, CheckCircle2,
} from 'lucide-react'

// Faint, scattered line-icons that form a subtle pattern behind the hero —
// replaces the old emoji jumble with a consistent, on-brand icon set.
const heroIcons = [
  { Icon: FileText,      size: 56, style: { top: '6%',  left: '3%',   transform: 'rotate(-15deg)' } },
  { Icon: Banknote,      size: 34, style: { top: '18%', left: '8%',   transform: 'rotate(10deg)'  } },
  { Icon: ShieldCheck,   size: 44, style: { top: '3%',  left: '14%',  transform: 'rotate(-5deg)'  } },
  { Icon: CalendarDays,  size: 60, style: { top: '4%',  right: '4%',  transform: 'rotate(12deg)'  } },
  { Icon: Sparkles,      size: 32, style: { top: '20%', right: '10%', transform: 'rotate(-18deg)' } },
  { Icon: BarChart3,     size: 52, style: { top: '8%',  right: '18%', transform: 'rotate(6deg)'   } },
  { Icon: Receipt,       size: 42, style: { top: '42%', left: '2%',   transform: 'rotate(-22deg)' } },
  { Icon: Sparkles,      size: 32, style: { top: '58%', left: '7%',   transform: 'rotate(14deg)'  } },
  { Icon: Baby,          size: 34, style: { top: '38%', right: '3%',  transform: 'rotate(20deg)'  } },
  { Icon: PiggyBank,     size: 52, style: { top: '55%', right: '8%',  transform: 'rotate(-10deg)' } },
  { Icon: BarChart3,     size: 42, style: { bottom: '10%', left: '5%',  transform: 'rotate(18deg)'  } },
  { Icon: Wallet,        size: 34, style: { bottom: '5%',  left: '15%', transform: 'rotate(-8deg)'  } },
  { Icon: ClipboardCheck, size: 52, style: { bottom: '12%', right: '5%',  transform: 'rotate(-14deg)' } },
  { Icon: CalendarDays,  size: 34, style: { bottom: '6%',  right: '16%', transform: 'rotate(9deg)'   } },
  { Icon: FileText,      size: 42, style: { bottom: '18%', right: '22%', transform: 'rotate(-20deg)' } },
]

// Look for a real testimonial photo dropped into /public (e.g. mary.jpg).
// Falls back to the initial avatar if no file is present, so the page never
// shows a broken image.
function findTestimonialPhoto(): string | null {
  try {
    const file = readdirSync(join(process.cwd(), 'public')).find((f) =>
      /^mary\.(jpe?g|png|webp|avif)$/i.test(f)
    )
    return file ? `/${file}` : null
  } catch {
    return null
  }
}

export const metadata: Metadata = {
  title: 'Automated Invoicing for UK Childminders',
  alternates: { canonical: 'https://www.godottie.cloud' },
  openGraph: {
    title: 'Dottie | Automated Invoicing for UK Childminders',
    description: 'Invoicing on autopilot for UK childminders. Set up once, invoices generate automatically.',
    url: 'https://www.godottie.cloud',
    type: 'website',
  },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Dottie',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: 'https://www.godottie.cloud',
  description: 'Invoicing on autopilot for UK childminders. Auto-generate invoices, track expenses, and manage payments.',
  offers: [
    {
      '@type': 'Offer',
      name: 'Starter',
      price: '9.99',
      priceCurrency: 'GBP',
      billingIncrement: 'P1M',
      description: 'Up to 5 children',
    },
    {
      '@type': 'Offer',
      name: 'Professional',
      price: '19.99',
      priceCurrency: 'GBP',
      billingIncrement: 'P1M',
      description: 'Up to 20 children',
    },
  ],
  publisher: {
    '@type': 'Organization',
    name: 'Dottie',
    url: 'https://www.godottie.cloud',
    email: 'hello@godottie.cloud',
  },
}

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) redirect('/dashboard')

  const maryPhoto = findTestimonialPhoto()

  return (
    <div className="min-h-screen bg-[#fdf8f1] font-sans overflow-x-hidden">

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-amber-400 shadow-md">
              <span className="text-white text-base font-extrabold leading-none">D.</span>
            </span>
            <div>
              <p className="text-gray-900 font-bold text-base sm:text-lg tracking-tight leading-tight">Dottie</p>
              <p className="text-gray-400 text-xs leading-tight">Invoicing simplified.</p>
            </div>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-emerald-600 transition-colors">Features</a>
            <a href="#pricing" className="hover:text-emerald-600 transition-colors">Pricing</a>
            <Link href="/guides/funded-hours/2026-invoice-rules" className="hover:text-emerald-600 transition-colors">2026 invoice rules</Link>
            <Link href="/support" className="hover:text-emerald-600 transition-colors">Support</Link>
            <Link href="/login" className="hover:text-emerald-600 transition-colors">Sign in</Link>
          </div>

          {/* CTA — hidden on mobile, shown on md+ */}
          <Link
            href="/signup"
            className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md shadow-emerald-200 transition-all active:scale-95"
          >
            Start free trial
          </Link>

          {/* Mobile hamburger */}
          <MobileNav />
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-500 to-amber-400 pt-16 pb-24 sm:pt-24 sm:pb-32">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        {/* Scattered floating line-icons — a subtle, consistent pattern */}
        <div className="absolute inset-0 pointer-events-none select-none overflow-hidden" aria-hidden="true">
          {heroIcons.map(({ Icon, size, style }, i) => (
            <Icon
              key={i}
              className="absolute text-white/20"
              strokeWidth={1.5}
              size={size}
              style={style}
            />
          ))}
        </div>

        {/* Organic wave divider — flows the hero into the cream section below */}
        <div className="absolute -bottom-px left-0 right-0 leading-[0] pointer-events-none" aria-hidden="true">
          <svg viewBox="0 0 1440 90" preserveAspectRatio="none" className="w-full h-[45px] sm:h-[70px]" fill="#f7eede">
            <path d="M0,48 C240,90 480,86 720,54 C960,22 1200,26 1440,52 L1440,90 L0,90 Z" />
          </svg>
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
          {/* Copy */}
          <div className="text-white">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 text-white text-xs font-semibold tracking-wide mb-5">
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.5} />
              No credit card needed to start
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-6">
              Invoicing on autopilot for <span className="text-emerald-100">UK childminders</span>
            </h1>
            <p className="text-lg sm:text-xl text-white/85 leading-relaxed mb-8 max-w-lg">
              Set up your children&apos;s schedules once. Invoices generate automatically, ready for you to review and approve.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-7 py-4 rounded-2xl bg-white text-emerald-700 font-bold text-base shadow-xl shadow-black/20 hover:bg-emerald-50 transition-all active:scale-95"
              >
                Start free trial
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center px-7 py-4 rounded-2xl border-2 border-white/40 text-white font-semibold text-base hover:bg-white/10 transition-all"
              >
                See how it works ↓
              </a>
            </div>

            <p className="text-white/70 text-sm">
              No credit card &middot; Cancel anytime &middot; 7 days completely free
            </p>
          </div>

          {/* Right column: animated WhatsApp chat + invoice card */}
          <HeroVisual />
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <section className="bg-[#f7eede] border-b border-amber-100/60 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <p className="text-center text-gray-500 text-sm font-medium mb-6 uppercase tracking-wider">
            Designed exclusively for UK childminders &amp; childcare providers
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { icon: '🛡️', title: 'Encrypted, UK-hosted', desc: 'TLS 1.2+ in transit, AES-256 at rest, on UK/EU infrastructure.' },
              { icon: '🔒', title: 'UK GDPR compliant', desc: 'Built around the UK GDPR and Data Protection Act 2018.' },
              { icon: '📋', title: 'Ready for the 2026 invoice rules', desc: 'Funded vs. paid hours, food, consumables, and activities itemised separately — as required from January 2026.' },
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
            <div className="sm:col-span-2 lg:col-span-3 relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-amber-400 p-8 text-white shadow-xl shadow-emerald-200/40">
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
                  Set your children&apos;s schedules once and choose when invoices generate — weekly, fortnightly, whenever suits you. They arrive ready to review and approve. No manual entry, no forgotten invoices, no stress.
                </p>
              </div>
            </div>

            {/* Regular feature cards */}
            {[
              { icon: '📅', title: 'Fixed schedule support', desc: 'Set Mon–Fri schedules with full or half days. The app calculates everything for you.' },
              { icon: '🏛️', title: 'Funded hours done right', desc: 'Tracks 15h and 30h entitlements — including the September 2025 expansion to 9-month-olds — and itemises funded vs. paid hours on every invoice.' },
              { icon: '📋', title: '2026 invoice rules ready', desc: 'Funded hours, additional paid hours, food, consumables, and activities itemised separately — exactly as required from January 2026.' },
              { icon: '📊', title: 'Tax year reports', desc: 'Income summaries and expense reports lined up to your accountant\'s self-assessment workflow.' },
              { icon: '💸', title: 'Expense tracking', desc: 'Log childcare expenses by HMRC-friendly category. Snap a receipt — AI fills in the rest.' },
              { icon: '📄', title: 'PDF-ready invoices', desc: 'Professional, print-ready A4 invoices sent directly to parents.' },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group rounded-3xl border border-amber-100/70 bg-[#fbf4ea] hover:bg-white hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-100/40 p-6 transition-all duration-200"
              >
                <span className="text-3xl mb-4 block">{feature.icon}</span>
                <h3 className="font-bold text-gray-900 text-base mb-2">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIAL ── */}
      <section className="py-20 sm:py-24 bg-gradient-to-br from-emerald-50 via-[#fdf8f1] to-amber-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="text-emerald-600 font-semibold text-sm uppercase tracking-widest mb-2">Real childminders. Real results.</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
              From admin overload to paid by lunch
            </h2>
          </div>

          <div className="relative bg-white rounded-3xl shadow-xl shadow-emerald-100/60 border border-emerald-100 p-8 sm:p-10">
            {/* Quote mark */}
            <div className="absolute -top-5 left-10 text-7xl text-emerald-200 font-serif leading-none select-none" aria-hidden="true">&ldquo;</div>

            {/* Stars */}
            <div className="flex gap-1 mb-5">
              {[1,2,3,4,5].map(i => (
                <svg key={i} className="w-5 h-5 text-amber-400 fill-current" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>

            {/* Quote */}
            <blockquote className="text-gray-800 text-lg sm:text-xl leading-relaxed font-medium italic mb-8">
              &ldquo;I set my invoices to generate on Sunday morning, and by the time I&apos;ve had my coffee they&apos;re sitting there ready for me. One tap to approve, one tap to send — and most Sundays I&apos;ve been paid before lunch. I genuinely don&apos;t know how I managed before this.&rdquo;
            </blockquote>

            {/* Attribution */}
            <div className="flex items-center gap-4">
              {maryPhoto ? (
                <Image
                  src={maryPhoto}
                  alt="Mary, registered childminder in Islington"
                  width={96}
                  height={96}
                  className="w-12 h-12 rounded-full object-cover shadow-md flex-shrink-0 ring-2 ring-white"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-amber-400 flex items-center justify-center shadow-md flex-shrink-0">
                  <span className="text-white font-extrabold text-lg">M</span>
                </div>
              )}
              <div>
                <p className="font-bold text-gray-900">Mary T.</p>
                <p className="text-gray-500 text-sm">Registered Childminder · Islington, London</p>
              </div>
              <div className="ml-auto hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-full px-4 py-2">
                <span className="text-emerald-600 text-xs font-bold">Paid by Sunday afternoon</span>
                <span className="text-lg">💸</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-20 sm:py-28 bg-gradient-to-b from-[#fdf8f1] to-white">
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
                desc: 'Choose your own schedule — invoices are created automatically based on each child\'s hours and rates, exactly when you want them.',
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
                <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-amber-400 text-white text-2xl shadow-lg shadow-emerald-200/50 mb-4 mx-auto">
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-gray-500 text-lg">
              Pick the plan that fits your childminding practice. Start free — no credit card needed.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {/* Starter */}
            <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-md flex flex-col">
              <div className="mb-6">
                <div className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-2">Starter</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900">£9.99</span>
                  <span className="text-gray-400 text-sm">/month</span>
                </div>
                <p className="text-gray-400 text-sm mt-1">or £99/year · save 17%</p>
                <p className="text-gray-500 text-sm font-medium mt-3">Up to 5 children</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {['Up to 5 children', 'Auto-generate invoices', 'Funded hours tracking', 'PDF invoices', 'Expense tracking', 'Tax year reports', '7-day free trial'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="block w-full text-center py-3 rounded-2xl border-2 border-emerald-600 text-emerald-700 font-bold hover:bg-emerald-50 transition-colors">
                Start free trial
              </Link>
            </div>

            {/* Professional — highlighted */}
            <div className="relative rounded-3xl border-2 border-emerald-500 bg-white p-8 shadow-xl shadow-emerald-100/50 flex flex-col">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="px-4 py-1.5 rounded-full bg-amber-400 text-amber-950 text-xs font-extrabold shadow-md whitespace-nowrap">
                  Most popular
                </span>
              </div>
              <div className="mb-6">
                <div className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-2">Professional</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900">£19.99</span>
                  <span className="text-gray-400 text-sm">/month</span>
                </div>
                <p className="text-gray-400 text-sm mt-1">or £199/year · save 17%</p>
                <p className="text-gray-500 text-sm font-medium mt-3">Up to 20 children</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {['Up to 20 children', 'Auto-generate invoices', 'Funded hours tracking', 'PDF invoices', 'Expense tracking', 'Tax year reports', '7-day free trial'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="block w-full text-center py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-200 transition-colors">
                Start free trial
              </Link>
            </div>

            {/* Unlimited */}
            <div className="rounded-3xl border border-amber-100 bg-[#fbf4ea] p-8 shadow-md flex flex-col">
              <div className="mb-6">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Unlimited</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-gray-900">Get in touch</span>
                </div>
                <p className="text-gray-400 text-sm mt-1">Custom pricing for larger settings</p>
                <p className="text-gray-500 text-sm font-medium mt-3">Unlimited children</p>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {['Unlimited children', 'Auto-generate invoices', 'Funded hours tracking', 'PDF invoices', 'Expense tracking', 'Tax year reports', 'Priority support'].map(f => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-xs font-bold">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="mailto:support@godottie.cloud?subject=Unlimited plan enquiry"
                className="block w-full text-center py-3 rounded-2xl border-2 border-slate-300 text-slate-700 font-bold hover:bg-white transition-colors"
              >
                Contact us →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECURITY ── */}
      <section id="security" className="py-20 sm:py-28 bg-[#f7eede]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-4">
            Your data is safe with us
          </h2>
          <p className="text-gray-500 text-lg mb-12">
            We treat your data — and your children&apos;s data — with the highest level of care and protection.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
            {[
              { icon: '🔐', title: 'Encrypted in transit and at rest', desc: 'All traffic is over TLS 1.2+. Data at rest is AES-256 encrypted on managed Postgres.' },
              { icon: '🏛️', title: 'Row-level data isolation', desc: 'Postgres row-level security keeps every childminder\'s data separated at the database — no user can read another\'s records.' },
              { icon: '📋', title: 'UK GDPR compliant', desc: 'Built around the UK GDPR and Data Protection Act 2018. See our privacy policy for the full sub-processor list.' },
              { icon: '🇬🇧', title: 'UK/EU data residency', desc: 'Your data is stored in UK/EU data centres. International transfers (e.g. AI features) are covered by Standard Contractual Clauses.' },
              { icon: '🏦', title: 'Bank details only shown to verified parents', desc: 'Parents must verify their child\'s date of birth before any invoice — including your bank details — is shown.' },
              { icon: '🔄', title: 'Daily automated backups', desc: 'Point-in-time recovery and daily encrypted backups via Supabase.' },
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
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-600 to-amber-400 p-12 text-center text-white shadow-2xl shadow-emerald-200/50">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/4" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 leading-tight">
                Ready to take the admin out of childminding?
              </h2>
              <p className="text-white/85 text-lg mb-8 max-w-lg mx-auto">
                Sign up, look around, and only add a card when you&apos;re sure.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-white text-emerald-700 font-extrabold text-lg shadow-xl shadow-black/20 hover:bg-emerald-50 transition-all active:scale-95"
              >
                Start free trial →
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
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-amber-400">
                  <span className="text-white text-sm font-extrabold">D.</span>
                </span>
                <span className="text-white font-bold text-base">Dottie</span>
              </div>
              <p className="text-gray-500 text-sm"><span className="text-amber-300 font-medium">www.godottie.cloud</span></p>
            </div>

            {/* Nav */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
              <Link href="/support" className="hover:text-white transition-colors">Support</Link>
              <Link href="/faq" className="hover:text-white transition-colors">FAQ</Link>
              <Link href="/login" className="hover:text-white transition-colors">Sign in</Link>
              <Link href="/signup" className="hover:text-white transition-colors">Sign up</Link>
            </div>
          </div>

          <div className="h-px bg-gray-800 mb-6" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-sm">
            <p>&copy; 2026 Dottie. All rights reserved.</p>
            <div className="flex gap-5">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
