import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about Dottie — invoicing software for UK childminders. Answers on pricing, invoicing, security, and more.',
  alternates: { canonical: 'https://www.dottie.cloud/faq' },
  openGraph: {
    title: 'FAQ — Dottie',
    description: 'Answers to the most common questions about Dottie for childminders.',
    url: 'https://www.dottie.cloud/faq',
  },
}

const CATEGORIES = [
  {
    id: 'about',
    label: 'About Dottie',
    icon: '💜',
    questions: [
      {
        q: 'What is Dottie?',
        a: "Dottie is invoicing on autopilot for UK childminders and childcare professionals. We handle the scheduling, invoice generation, expense tracking, and payment chasing — so you can focus on the children in your care, not the paperwork.",
      },
      {
        q: 'Who is Dottie built for?',
        a: "Dottie is built specifically for UK childminders and childcare providers — sole traders who look after children in their own homes. Whether you have 1 child or 20, Dottie is designed to fit the way you work.",
      },
      {
        q: 'Do I need to be tech-savvy to use it?',
        a: "Not at all. Dottie is designed to be as simple as possible. Set up your children's details once and Dottie does the rest automatically. If you can use a smartphone, you can use Dottie.",
      },
      {
        q: 'Is Dottie only for childminders, or can other childcare providers use it?',
        a: "Dottie works for any UK childcare professional — registered childminders, nannies, au pairs, and small nursery settings. The core features (invoicing, expenses, reports) are useful for anyone charging parents for childcare.",
      },
    ],
  },
  {
    id: 'getting-started',
    label: 'Getting started',
    icon: '🚀',
    questions: [
      {
        q: 'How do I get started?',
        a: "Sign up for a free 7-day trial — no credit card required. You'll be guided through a quick setup: add your details, bank account, and the children you look after. Your first invoices will be ready automatically from there.",
      },
      {
        q: 'How long does setup take?',
        a: "Most childminders are fully set up in under 5 minutes. You'll add your profile, bank details, and children's schedules — Dottie handles everything else.",
      },
      {
        q: 'Can I import data from a spreadsheet or another app?',
        a: "Not automatically yet — you'll add children one by one during setup. It's quick to do and you only ever need to do it once.",
      },
      {
        q: 'Do parents need to create an account?',
        a: "No. Parents receive invoice links by email. To view an invoice (including your bank details), they verify their identity using their child's date of birth — no account needed.",
      },
    ],
  },
  {
    id: 'invoicing',
    label: 'Invoicing',
    icon: '📄',
    questions: [
      {
        q: 'How does auto-invoice generation work?',
        a: "You set each child's schedule and rates once, then choose how often to generate invoices — weekly, fortnightly, or monthly. You configure this during onboarding and can update it any time in Settings. At your chosen interval, Dottie automatically creates draft invoices for each child. They appear in your invoices list for you to review, approve, and send to parents in one tap.",
      },
      {
        q: 'Can I change my invoice generation schedule?',
        a: "Yes, any time. Head to Settings and update your invoice generation frequency — weekly, fortnightly, or monthly. Changes take effect from your next invoice run. You can also generate invoices manually at any time if you need a one-off.",
      },
      {
        q: 'Can I edit an invoice before sending?',
        a: "Yes. Every auto-generated invoice is a draft first. You can add extra line items (trips, activities, nappies, etc.), adjust amounts, or add notes before sending.",
      },
      {
        q: 'Can I create a one-off invoice?',
        a: "Absolutely. As well as the auto-generated schedule invoices, you can create manual invoices at any time — useful for one-off sessions, holiday cover, or extras.",
      },
      {
        q: 'What do invoices look like?',
        a: "Invoices are clean, professional PDF documents with your name, address, Ofsted number (if you choose), the child's care details, line items, total, and your bank details. Parents can view them in a browser or download as PDF.",
      },
      {
        q: 'Can I send invoices by email?',
        a: "Yes. With one tap, Dottie sends the invoice directly to the parent's email address. The email includes a link to view the invoice online and download it as PDF.",
      },
      {
        q: 'Can parents pay online through Dottie?',
        a: "Online card payments via Stripe are on our roadmap. Currently, invoices show your bank details so parents can pay by bank transfer — the most common method for UK childminders.",
      },
      {
        q: 'Can I charge hourly, as well as full-day and half-day rates?',
        a: "Yes. Each child can have a daily rate, half-day rate, and/or hourly rate. If you use an hourly rate, you can also set the hours per day to calculate weekly totals automatically.",
      },
    ],
  },
  {
    id: 'pricing',
    label: 'Plans & pricing',
    icon: '💳',
    questions: [
      {
        q: 'How much does Dottie cost?',
        a: "Dottie has two plans: Starter (up to 5 children) at £9.99/month or £99/year, and Professional (up to 20 children) at £19.99/month or £199/year. For larger settings, contact us about our Unlimited plan. All plans include auto-invoicing, PDF invoices, expense tracking, and tax year reports.",
      },
      {
        q: 'Is there a free trial?',
        a: "Yes — every new account gets a 7-day free trial with full access to all features. No credit card required.",
      },
      {
        q: 'What happens when my trial ends?',
        a: "You'll be prompted to choose a plan. If you don't subscribe, access to the app pauses — but your data is safely stored for 30 days in case you return.",
      },
      {
        q: 'Can I cancel at any time?',
        a: "Yes. Cancel from your account settings at any time. You keep full access until the end of your current billing period — no questions asked.",
      },
      {
        q: 'Do you offer refunds?',
        a: "We don't offer refunds for partial billing periods. If you cancel an annual plan early, you retain access for the remainder of the year. If something goes wrong on our side, we'll always make it right — just get in touch.",
      },
      {
        q: 'Can I switch between monthly and annual billing?',
        a: "Yes. You can switch billing periods from your account settings. Switching to annual billing takes effect at your next renewal date.",
      },
      {
        q: 'What if I need more than 20 children?',
        a: "Get in touch at support@dottie.cloud and we'll set you up on our Unlimited plan with custom pricing for your setting.",
      },
    ],
  },
  {
    id: 'expenses',
    label: 'Expenses & reports',
    icon: '📊',
    questions: [
      {
        q: 'Can I track my childminding expenses?',
        a: "Yes. Dottie includes a full expense tracker where you can log costs by category (food & drink, outings, arts & crafts, nappies, etc.), upload receipts, and even use AI to extract details from a photo of a receipt.",
      },
      {
        q: 'Can I use AI to scan receipts?',
        a: "Yes. Take a photo of a receipt and Dottie's AI will extract the merchant name, date, and amount automatically — saving you the manual entry.",
      },
      {
        q: 'Does Dottie produce tax year reports?',
        a: "Yes. The Reports section shows your income and expenses broken down by tax year, ready to hand to your accountant or use for your Self Assessment return. You can export as PDF.",
      },
      {
        q: 'Is Dottie a replacement for an accountant?',
        a: "Dottie makes it much easier to keep your records in order, but it's not a substitute for professional tax advice. Think of it as a very well-organised filing system that saves your accountant time — and saves you money.",
      },
    ],
  },
  {
    id: 'security',
    label: 'Security & privacy',
    icon: '🔒',
    questions: [
      {
        q: 'Is my data secure?',
        a: "Yes. All data is encrypted in transit (TLS 1.2+) and at rest (AES-256). Row-level security means your data is completely isolated from other users — nobody else can see your records. Bank details are further protected by a date-of-birth verification step for parent access.",
      },
      {
        q: 'Is Dottie GDPR compliant?',
        a: "Yes. Dottie is fully compliant with UK GDPR and the Data Protection Act 2018. All data is stored in UK/EU data centres. We have a full Privacy Policy you can read at dottie.cloud/privacy.",
      },
      {
        q: "How is children's data protected?",
        a: "Children's data is entered by you and used solely to provide the invoicing service. Dates of birth are used only to verify parent identity when accessing an invoice. We don't share children's data with third parties beyond the sub-processors needed to run the service (Supabase, Stripe, Resend).",
      },
      {
        q: 'How do parents securely access invoices?',
        a: "Parents click the invoice link in their email, then verify their identity by entering their child's date of birth. This protects your bank details from being visible to anyone who happens to get the link.",
      },
      {
        q: 'Where is my data stored?',
        a: "Your data is stored in UK/EU data centres via Supabase. It is never transferred outside the UK/EU without appropriate safeguards (Standard Contractual Clauses apply for Anthropic's AI features).",
      },
    ],
  },
]

export default function FaqPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6">

        {/* Header */}
        <div className="text-center mb-12">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium mb-6">
            ← Back to Dottie
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Frequently asked questions</h1>
          <p className="mt-3 text-gray-500 text-lg">Everything you need to know about Dottie.</p>
          <p className="mt-2 text-gray-400 text-sm">
            Can&apos;t find what you&apos;re looking for?{' '}
            <Link href="/support" className="text-emerald-600 underline underline-offset-2 hover:text-emerald-700">
              Contact us
            </Link>
          </p>
        </div>

        {/* Category jump links */}
        <div className="flex flex-wrap gap-2 mb-10 justify-center">
          {CATEGORIES.map(cat => (
            <a
              key={cat.id}
              href={`#${cat.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-sm text-gray-600 hover:border-emerald-400 hover:text-emerald-700 transition-colors shadow-sm"
            >
              <span>{cat.icon}</span>
              {cat.label}
            </a>
          ))}
        </div>

        {/* Categories */}
        <div className="space-y-12">
          {CATEGORIES.map(cat => (
            <section key={cat.id} id={cat.id} className="scroll-mt-8">
              <div className="flex items-center gap-3 mb-5">
                <span className="text-2xl">{cat.icon}</span>
                <h2 className="text-xl font-bold text-gray-900">{cat.label}</h2>
              </div>

              <div className="space-y-2">
                {cat.questions.map((item, i) => (
                  <details
                    key={i}
                    className="group bg-white border border-gray-200 rounded-xl overflow-hidden"
                  >
                    <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                      <span>{item.q}</span>
                      <svg
                        className="flex-shrink-0 w-4 h-4 text-gray-400 transition-transform duration-200 group-open:rotate-180"
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </summary>
                    <div className="px-5 pb-4 pt-1 text-sm text-gray-600 leading-relaxed border-t border-gray-100">
                      {item.a}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-sky-500 p-8 text-center text-white">
          <h2 className="text-xl font-bold mb-2">Still have questions?</h2>
          <p className="text-white/80 text-sm mb-5">I'm here to help — just drop me a message.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/support"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-emerald-700 font-semibold text-sm hover:bg-emerald-50 transition-colors shadow-md"
            >
              Contact us
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border-2 border-white/40 text-white font-semibold text-sm hover:bg-white/10 transition-colors"
            >
              Start free trial
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
