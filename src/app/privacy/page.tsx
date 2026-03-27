import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Dottie',
  description: 'How Dottie collects, uses, and protects your personal data.',
}

const LAST_UPDATED = '27 March 2026'
const CONTACT_EMAIL = 'support@dottie.cloud'

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">{title}</h2>
      <div className="space-y-4 text-gray-600 text-sm leading-relaxed">{children}</div>
    </section>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p>{children}</p>
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul className="list-disc list-inside space-y-1.5 pl-2">
      {items.map((item, i) => <li key={i}>{item}</li>)}
    </ul>
  )
}

const TOC = [
  { id: 'who-we-are', label: 'Who we are' },
  { id: 'data-we-collect', label: 'Data we collect' },
  { id: 'how-we-use-your-data', label: 'How we use your data' },
  { id: 'lawful-basis', label: 'Lawful basis for processing' },
  { id: 'third-party-processors', label: 'Third-party processors' },
  { id: 'childrens-data', label: "Children's data" },
  { id: 'data-retention', label: 'Data retention' },
  { id: 'your-rights', label: 'Your rights' },
  { id: 'cookies', label: 'Cookies' },
  { id: 'security', label: 'Security' },
  { id: 'changes', label: 'Changes to this policy' },
  { id: 'contact', label: 'Contact us' },
]

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6">

        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium mb-6">
            ← Back to Dottie
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="mt-2 text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-800">
            We've written this policy in plain English. We want you to understand exactly what we do with your data — and why.
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-12">

          {/* Table of contents */}
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Contents</p>
              <nav className="space-y-1">
                {TOC.map(item => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className="block text-sm text-gray-500 hover:text-emerald-600 py-1 transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content */}
          <div className="space-y-10">

            <Section id="who-we-are" title="1. Who we are">
              <P>
                Dottie (&quot;Dottie&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is an invoicing and business management tool built specifically for UK childminders and childcare professionals. Our service is available at <strong>www.dottie.cloud</strong>.
              </P>
              <P>
                We are the data controller for the personal data you provide to us. If you have any questions about this policy or how we handle your data, please contact us at{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-600 underline">{CONTACT_EMAIL}</a>.
              </P>
            </Section>

            <Section id="data-we-collect" title="2. Data we collect">
              <P>We collect the following categories of personal data:</P>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-white border border-gray-200">
                  <p className="font-semibold text-gray-800 mb-2">Account & profile data</p>
                  <Ul items={[
                    'Full name and email address',
                    'Phone number',
                    'Home or business address (including postcode)',
                    'Ofsted registration number (optional)',
                  ]} />
                </div>

                <div className="p-4 rounded-xl bg-white border border-gray-200">
                  <p className="font-semibold text-gray-800 mb-2">Financial data</p>
                  <Ul items={[
                    'Bank account name, sort code, and account number (for inclusion on invoices you send to parents)',
                    'Subscription payment details (processed by Stripe — we do not store raw card numbers)',
                  ]} />
                </div>

                <div className="p-4 rounded-xl bg-white border border-gray-200">
                  <p className="font-semibold text-gray-800 mb-2">Children&apos;s data (entered by you)</p>
                  <Ul items={[
                    "Child's first and last name",
                    "Child's date of birth (used to verify parent identity when accessing invoices)",
                    "Parent or guardian name, email address, and phone number",
                    "Care schedule (days and session types)",
                    "Childcare rates",
                    'Any notes you choose to add',
                  ]} />
                </div>

                <div className="p-4 rounded-xl bg-white border border-gray-200">
                  <p className="font-semibold text-gray-800 mb-2">Usage and technical data</p>
                  <Ul items={[
                    'Log data (browser type, IP address, pages visited) — retained for security purposes',
                    'Authentication tokens managed by Supabase',
                  ]} />
                </div>
              </div>

              <P>
                We collect only what is necessary to provide the service. We do not collect sensitive special-category data beyond children&apos;s dates of birth, which are used solely for invoice access verification.
              </P>
            </Section>

            <Section id="how-we-use-your-data" title="3. How we use your data">
              <Ul items={[
                'To create and manage your account',
                'To generate, store, and send invoices on your behalf',
                'To display your bank details on invoices you send to parents',
                'To allow parents to securely access their child\'s invoices (using DOB as verification)',
                'To process subscription payments via Stripe',
                'To send transactional emails (welcome, trial reminders, payment confirmations) via Resend',
                'To generate draft invoices using AI assistance (Anthropic Claude) — see Third-party Processors',
                'To provide expense tracking and tax-year reports',
                'To respond to support requests',
                'To comply with our legal obligations',
              ]} />
            </Section>

            <Section id="lawful-basis" title="4. Lawful basis for processing">
              <P>Under UK GDPR, we rely on the following lawful bases:</P>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-4 py-2 border border-gray-200 font-semibold text-gray-700">Processing activity</th>
                      <th className="text-left px-4 py-2 border border-gray-200 font-semibold text-gray-700">Lawful basis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Providing the invoicing service', 'Contract (Article 6(1)(b))'],
                      ['Processing subscription payments', 'Contract (Article 6(1)(b))'],
                      ['Sending transactional emails', 'Contract (Article 6(1)(b))'],
                      ['Security monitoring and fraud prevention', 'Legitimate interests (Article 6(1)(f))'],
                      ['Complying with tax/legal obligations', 'Legal obligation (Article 6(1)(c))'],
                    ].map(([activity, basis]) => (
                      <tr key={activity} className="border-b border-gray-100">
                        <td className="px-4 py-2 border border-gray-200">{activity}</td>
                        <td className="px-4 py-2 border border-gray-200 text-emerald-700 font-medium">{basis}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <P>
                Children&apos;s dates of birth are processed under contract (necessary to provide invoice verification) and legitimate interests (preventing unauthorised access to financial documents).
              </P>
            </Section>

            <Section id="third-party-processors" title="5. Third-party processors">
              <P>
                We use the following sub-processors to provide our service. Each is bound by their own privacy policies and, where applicable, Data Processing Agreements (DPAs):
              </P>
              <div className="space-y-3">
                {[
                  {
                    name: 'Supabase',
                    role: 'Database, authentication, and file storage',
                    location: 'EU/UK',
                    link: 'https://supabase.com/privacy',
                  },
                  {
                    name: 'Stripe',
                    role: 'Subscription payment processing',
                    location: 'EU/UK',
                    link: 'https://stripe.com/gb/privacy',
                  },
                  {
                    name: 'Resend',
                    role: 'Transactional email delivery',
                    location: 'EU',
                    link: 'https://resend.com/legal/privacy-policy',
                  },
                  {
                    name: 'Anthropic (Claude AI)',
                    role: 'AI-assisted invoice generation. When invoices are auto-generated, schedule and rate data is sent to Anthropic\'s API. No child names or contact details are included in these requests.',
                    location: 'USA (Standard Contractual Clauses apply)',
                    link: 'https://www.anthropic.com/privacy',
                  },
                ].map(p => (
                  <div key={p.name} className="p-4 rounded-xl bg-white border border-gray-200">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <span className="font-semibold text-gray-800">{p.name}</span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{p.location}</span>
                    </div>
                    <p className="text-sm text-gray-600">{p.role}</p>
                  </div>
                ))}
              </div>
              <P>
                We do not sell your data to third parties. We do not use your data for advertising or profiling.
              </P>
            </Section>

            <Section id="childrens-data" title="6. Children's data">
              <P>
                As a childminder, you enter data about the children in your care. This data belongs to you and is used solely to provide the invoicing service. We act as your data processor for this information — you are the data controller for the children&apos;s data.
              </P>
              <P>
                By using Dottie, you confirm that you have appropriate consent or another lawful basis (such as the performance of a contract with the child&apos;s parent/guardian) to enter and process this data within the app.
              </P>
              <P>
                We store children&apos;s dates of birth for the sole purpose of verifying parent identity when they access an invoice. This verification step protects your bank details from unauthorised access.
              </P>
              <P>
                We do not share children&apos;s data with any third party other than the sub-processors listed above, and only to the extent necessary to deliver the service.
              </P>
            </Section>

            <Section id="data-retention" title="7. Data retention">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left px-4 py-2 border border-gray-200 font-semibold text-gray-700">Data type</th>
                      <th className="text-left px-4 py-2 border border-gray-200 font-semibold text-gray-700">Retention period</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Active account data', 'For the duration of your subscription'],
                      ['Data after account cancellation', '30 days (then permanently deleted)'],
                      ['Invoice records', '6 years (UK tax law requirement)'],
                      ['Payment records (Stripe)', 'As required by financial regulations'],
                      ['Security/access logs', '90 days'],
                    ].map(([type, period]) => (
                      <tr key={type} className="border-b border-gray-100">
                        <td className="px-4 py-2 border border-gray-200">{type}</td>
                        <td className="px-4 py-2 border border-gray-200 font-medium text-gray-700">{period}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <P>
                Invoice records are retained for 6 years in accordance with HMRC requirements for self-employed income records. All other personal data is deleted within 30 days of account closure.
              </P>
            </Section>

            <Section id="your-rights" title="8. Your rights">
              <P>Under UK GDPR, you have the following rights. To exercise any of them, email us at{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-600 underline">{CONTACT_EMAIL}</a>.
                We will respond within 30 days.
              </P>
              <div className="space-y-3">
                {[
                  { right: 'Right of access', desc: 'Request a copy of all personal data we hold about you.' },
                  { right: 'Right to rectification', desc: 'Ask us to correct inaccurate or incomplete data.' },
                  { right: 'Right to erasure', desc: 'Request deletion of your personal data (the "right to be forgotten"). Note: invoice records may be retained as required by law.' },
                  { right: 'Right to data portability', desc: 'Request your data in a structured, machine-readable format (JSON or CSV).' },
                  { right: 'Right to restrict processing', desc: 'Ask us to pause processing your data in certain circumstances.' },
                  { right: 'Right to object', desc: 'Object to processing based on legitimate interests.' },
                  { right: 'Right to withdraw consent', desc: 'Where we rely on consent, you can withdraw it at any time.' },
                ].map(item => (
                  <div key={item.right} className="flex gap-3 p-4 rounded-xl bg-white border border-gray-200">
                    <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>
                    <div>
                      <span className="font-semibold text-gray-800">{item.right}: </span>
                      <span className="text-gray-600">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
              <P>
                You also have the right to lodge a complaint with the UK Information Commissioner&apos;s Office (ICO) at{' '}
                <span className="font-medium">ico.org.uk</span> or by calling <span className="font-medium">0303 123 1113</span>.
              </P>
            </Section>

            <Section id="cookies" title="9. Cookies">
              <P>
                We use only essential cookies required for the service to function. These include session authentication cookies managed by Supabase. We do not use advertising cookies, analytics cookies, or any third-party tracking.
              </P>
              <P>
                Essential cookies cannot be disabled as they are necessary for you to log in and use the app. No cookie consent banner is shown because we do not use non-essential cookies.
              </P>
            </Section>

            <Section id="security" title="10. Security">
              <Ul items={[
                'All data is encrypted in transit using TLS 1.2+',
                'Data at rest is encrypted using AES-256 (managed by Supabase)',
                'Row-level security ensures your data is isolated from other users',
                'Bank details on invoices are protected by a date-of-birth verification step for parent access',
                'We perform regular security reviews',
                'Access to production systems is restricted and logged',
              ]} />
              <P>
                While we take all reasonable precautions, no internet service is completely secure. If you believe your account has been compromised, contact us immediately at{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-600 underline">{CONTACT_EMAIL}</a>.
              </P>
            </Section>

            <Section id="changes" title="11. Changes to this policy">
              <P>
                We may update this Privacy Policy from time to time. We will notify you of significant changes by email or by displaying a notice in the app. The &quot;Last updated&quot; date at the top of this page reflects the most recent revision.
              </P>
              <P>
                Continued use of Dottie after a change is posted constitutes your acceptance of the updated policy.
              </P>
            </Section>

            <Section id="contact" title="12. Contact us">
              <P>
                For any questions, requests to exercise your rights, or data concerns, please contact us:
              </P>
              <div className="p-5 rounded-xl bg-white border border-gray-200 space-y-1">
                <p className="font-semibold text-gray-900">Dottie</p>
                <p>
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-600 underline">{CONTACT_EMAIL}</a>
                </p>
                <p className="text-gray-500">www.dottie.cloud</p>
              </div>
              <P>
                If you are not satisfied with our response, you have the right to complain to the ICO at{' '}
                <span className="font-medium">ico.org.uk</span>.
              </P>
            </Section>

          </div>
        </div>
      </div>
    </div>
  )
}
