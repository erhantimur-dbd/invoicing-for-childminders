import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Support & Help',
  description: 'Get help with Dottie. Contact our support team or browse frequently asked questions about invoicing for childminders.',
  alternates: { canonical: 'https://www.dottie.cloud/support' },
  openGraph: {
    title: 'Support & Help — Dottie',
    description: 'Get help with Dottie. Contact our support team or browse our FAQ.',
    url: 'https://www.dottie.cloud/support',
  },
}

const SUPPORT_EMAIL = 'support@dottie.cloud'

const FAQ_ITEMS = [
  {
    question: 'How does auto-invoice generation work?',
    answer:
      "Every Sunday at 7am, our system automatically creates draft invoices for each child based on their fixed weekly schedule. You'll see them appear in your invoices list marked as 'Draft' — review them, make any changes, and send to parents when you're ready.",
  },
  {
    question: 'Is there a free trial?',
    answer:
      'Yes! Every new account gets a 7-day free trial with full access to all features. No credit card required to start.',
  },
  {
    question: 'How much does it cost?',
    answer:
      'Dottie has two plans: Starter (up to 5 children) at £9.99/month or £99/year, and Professional (up to 20 children) at £19.99/month or £199/year. For unlimited children, contact us at support@dottie.cloud. All plans include auto-invoice generation, PDF invoices, expense tracking, and tax year reports.',
  },
  {
    question: 'Is my data secure?',
    answer:
      "Absolutely. Your data is protected with row-level security — meaning your data is completely isolated from other users. Bank details are stored encrypted. We're GDPR compliant and all data is stored in the UK/EU.",
  },
  {
    question: 'Can I cancel at any time?',
    answer:
      "Yes, you can cancel your subscription at any time from your account settings. You'll keep access until the end of your billing period.",
  },
  {
    question: 'What happens when my trial ends?',
    answer:
      "You'll be prompted to choose a plan. If you don't subscribe, you'll lose access to the app but your data is safely stored for 30 days in case you return.",
  },
  {
    question: 'Do you support childminders with multiple children?',
    answer:
      "Yes! There's no limit on the number of children you can add. Each child can have their own schedule, rates, and parent contact details.",
  },
  {
    question: 'Can I export my invoices as PDF?',
    answer:
      'Yes, every invoice can be printed or saved as a PDF directly from the app. Invoices are formatted to A4 for professional presentation.',
  },
  {
    question: 'What is Dottie?',
    answer:
      'Dottie is invoicing on autopilot for childcare professionals. We built it from scratch for UK childminders — so you can spend less time on admin and more time with the children in your care.',
  },
]

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-16 sm:px-6">

        {/* ── Header ── */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            We&apos;re here to help
          </h1>
          <p className="mt-3 text-lg text-gray-500">
            Get in touch or find answers in our FAQ
          </p>
        </div>

        {/* ── Contact card ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-10">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
              {/* Mail icon — inline SVG to avoid client-side import */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
                aria-hidden="true"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="M2 7l10 7 10-7" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900">Email support</h2>
              <p className="mt-1 text-sm text-gray-500">
                We aim to respond within 24 hours on business days.
              </p>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="mt-4 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                Send us an email
              </a>
              <p className="mt-3 text-xs text-gray-400">
                For urgent billing queries, please include your account email in the message.
              </p>
            </div>
          </div>
        </div>

        {/* ── FAQ section ── */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-5">
            Frequently Asked Questions
          </h2>

          <div className="space-y-2">
            {FAQ_ITEMS.map((item, index) => (
              <details
                key={index}
                className="group bg-white border border-gray-200 rounded-xl overflow-hidden"
              >
                <summary
                  className="
                    flex items-center justify-between gap-4
                    px-5 py-4 cursor-pointer
                    text-sm font-medium text-gray-800
                    hover:bg-gray-50 transition-colors
                    list-none
                    [&::-webkit-details-marker]:hidden
                  "
                >
                  <span>{item.question}</span>
                  {/* Chevron — rotates when open */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="flex-shrink-0 w-4 h-4 text-gray-400 transition-transform duration-200 group-open:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden="true"
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

        {/* ── Bottom CTA ── */}
        <div className="mt-14 text-center">
          <p className="text-gray-500 text-sm">
            Still can&apos;t find what you&apos;re looking for?
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-2 inline-block text-emerald-600 hover:text-emerald-700 font-medium text-sm underline underline-offset-2 transition-colors"
          >
            {SUPPORT_EMAIL}
          </a>
        </div>

      </div>
    </div>
  )
}
