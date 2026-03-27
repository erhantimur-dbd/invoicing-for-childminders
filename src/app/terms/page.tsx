import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms and conditions for using Dottie — invoicing software for UK childminders.',
  alternates: { canonical: 'https://www.dottie.cloud/terms' },
  robots: { index: true, follow: false },
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
  { id: 'agreement', label: 'Agreement to terms' },
  { id: 'the-service', label: 'The service' },
  { id: 'eligibility', label: 'Eligibility' },
  { id: 'account', label: 'Your account' },
  { id: 'subscription', label: 'Subscription and billing' },
  { id: 'free-trial', label: 'Free trial' },
  { id: 'cancellation', label: 'Cancellation and refunds' },
  { id: 'acceptable-use', label: 'Acceptable use' },
  { id: 'your-data', label: 'Your data' },
  { id: 'intellectual-property', label: 'Intellectual property' },
  { id: 'disclaimers', label: 'Disclaimers' },
  { id: 'liability', label: 'Limitation of liability' },
  { id: 'changes', label: 'Changes to terms' },
  { id: 'governing-law', label: 'Governing law' },
  { id: 'contact', label: 'Contact us' },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-16 sm:px-6">

        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium mb-6">
            ← Back to Dottie
          </Link>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Terms of Service</h1>
          <p className="mt-2 text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-sm text-emerald-800">
            Please read these terms carefully before using Dottie. By creating an account, you agree to be bound by them.
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

            <Section id="agreement" title="1. Agreement to terms">
              <P>
                These Terms of Service (&quot;Terms&quot;) govern your use of Dottie (&quot;Dottie&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;), available at <strong>www.dottie.cloud</strong> and associated applications.
              </P>
              <P>
                By creating an account or using the service, you agree to these Terms and our{' '}
                <Link href="/privacy" className="text-emerald-600 underline">Privacy Policy</Link>.
                If you do not agree, you must not use Dottie.
              </P>
            </Section>

            <Section id="the-service" title="2. The service">
              <P>
                Dottie is an invoicing and administration tool designed for UK childminders and childcare professionals. The service allows you to:
              </P>
              <Ul items={[
                'Create and manage child and parent records',
                'Automatically generate invoices based on care schedules',
                'Send invoices to parents by email',
                'Track childcare expenses',
                'Generate tax-year income and expense reports',
                'Manage bank account details for payment collection',
              ]} />
              <P>
                Dottie is a tool to assist with administration. It does not constitute financial, tax, or legal advice. You remain responsible for verifying the accuracy of all invoices, rates, and records before sending them to parents.
              </P>
            </Section>

            <Section id="eligibility" title="3. Eligibility">
              <P>You must be at least 18 years old to use Dottie. By creating an account, you confirm that:</P>
              <Ul items={[
                'You are 18 years of age or older',
                'You are a childminder, childcare provider, or otherwise authorised to process the data you enter',
                'You have the legal right to provide the data you enter about children and their parents or guardians',
                'You are located in the United Kingdom (our service is designed for UK childminders)',
              ]} />
            </Section>

            <Section id="account" title="4. Your account">
              <P>
                You are responsible for maintaining the security of your account credentials. Do not share your password with anyone. You are responsible for all activity that occurs under your account.
              </P>
              <P>
                Notify us immediately at{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-600 underline">{CONTACT_EMAIL}</a>{' '}
                if you believe your account has been compromised.
              </P>
              <P>
                We reserve the right to suspend or terminate accounts that violate these Terms, are suspected of fraudulent activity, or are otherwise used in a manner harmful to Dottie or its users.
              </P>
            </Section>

            <Section id="subscription" title="5. Subscription and billing">
              <P>After your free trial ends, continued access to Dottie requires an active subscription. We offer the following plans:</P>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white border border-gray-200">
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1">Starter</p>
                  <p className="text-sm text-gray-500 mb-2">Up to 5 children</p>
                  <p className="text-xl font-bold text-gray-900">£9.99<span className="text-sm font-normal text-gray-400">/month</span></p>
                  <p className="text-xs text-gray-500 mt-1">or £99/year · save 17%</p>
                </div>
                <div className="p-4 rounded-xl bg-white border-2 border-emerald-200">
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-1">Professional</p>
                  <p className="text-sm text-gray-500 mb-2">Up to 20 children</p>
                  <p className="text-xl font-bold text-gray-900">£19.99<span className="text-sm font-normal text-gray-400">/month</span></p>
                  <p className="text-xs text-gray-500 mt-1">or £199/year · save 17%</p>
                </div>
              </div>
              <P>For larger childminding settings requiring more than 20 children, please contact us about our Unlimited plan.</P>
              <P>
                Subscriptions are processed by Stripe. By subscribing, you authorise Stripe to charge your payment method on a recurring basis. Prices are displayed in GBP and include applicable taxes.
              </P>
              <P>
                We reserve the right to change pricing with at least 30 days&apos; notice. Price changes will not affect your current billing period.
              </P>
            </Section>

            <Section id="free-trial" title="6. Free trial">
              <P>
                New accounts receive a 7-day free trial with full access to all features. No payment method is required to start your trial.
              </P>
              <P>
                We reserve the right to modify or terminate free trial offers at any time. Only one free trial is permitted per person. Attempts to obtain multiple trials by creating multiple accounts are a violation of these Terms.
              </P>
            </Section>

            <Section id="cancellation" title="7. Cancellation and refunds">
              <P>
                You may cancel your subscription at any time from your account settings. Cancellation takes effect at the end of your current billing period — you retain full access until then.
              </P>
              <P>
                We do not offer refunds for partial billing periods. If you cancel an annual subscription early, you will retain access for the remainder of the paid year but will not receive a pro-rata refund.
              </P>
              <P>
                If your account is terminated by us for breach of these Terms, no refund will be issued.
              </P>
              <P>
                After cancellation or account deletion, your data is retained for 30 days in case you wish to reactivate. After 30 days, personal data is permanently deleted (invoice records may be retained as required by UK tax law — see our Privacy Policy).
              </P>
            </Section>

            <Section id="acceptable-use" title="8. Acceptable use">
              <P>You agree not to use Dottie to:</P>
              <Ul items={[
                'Enter false, fraudulent, or misleading information',
                'Create invoices for services not actually provided',
                'Store or process data you are not authorised to hold',
                'Attempt to gain unauthorised access to any part of the system',
                'Reverse-engineer, decompile, or copy any part of the service',
                'Use the service in any way that violates applicable UK law',
                'Harass, impersonate, or harm any person',
              ]} />
              <P>
                We reserve the right to investigate and take action (including account suspension) if we have reason to believe these terms are being violated.
              </P>
            </Section>

            <Section id="your-data" title="9. Your data">
              <P>
                You retain full ownership of the data you enter into Dottie — your profile, children&apos;s records, invoices, and expenses. We do not claim any rights over your data.
              </P>
              <P>
                You grant us a limited licence to store and process your data for the sole purpose of providing the service. This licence ends when you delete your account (subject to legal retention obligations).
              </P>
              <P>
                You are responsible for ensuring that the personal data you enter (particularly about children and their parents) is accurate and that you have the appropriate legal basis to process it. See our{' '}
                <Link href="/privacy" className="text-emerald-600 underline">Privacy Policy</Link> for full details.
              </P>
            </Section>

            <Section id="intellectual-property" title="10. Intellectual property">
              <P>
                All software, design, trademarks, and content that make up Dottie are owned by us or our licensors. These Terms do not grant you any rights to our intellectual property beyond the right to use the service as described.
              </P>
            </Section>

            <Section id="disclaimers" title="11. Disclaimers">
              <P>
                Dottie is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, express or implied. We do not warrant that the service will be uninterrupted, error-free, or completely secure.
              </P>
              <P>
                <strong>Dottie is not financial, tax, or legal advice.</strong> Invoice amounts, rates, and records are generated based on information you provide. You are responsible for verifying all figures before sending invoices to parents or submitting tax returns to HMRC.
              </P>
              <P>
                We are not responsible for any errors in invoices arising from incorrect data entered by you.
              </P>
            </Section>

            <Section id="liability" title="12. Limitation of liability">
              <P>
                To the maximum extent permitted by UK law, Dottie&apos;s total liability to you for any claim arising from use of the service is limited to the amount you paid us in the 3 months preceding the claim.
              </P>
              <P>We are not liable for:</P>
              <Ul items={[
                'Indirect, incidental, or consequential losses',
                'Loss of income or business arising from service downtime',
                'Errors or omissions in invoices based on data you provided',
                'Actions of third-party processors (Stripe, Resend, Supabase, Anthropic)',
                'Data loss caused by factors outside our reasonable control',
              ]} />
              <P>
                Nothing in these Terms limits our liability for death or personal injury caused by our negligence, or for fraudulent misrepresentation.
              </P>
            </Section>

            <Section id="changes" title="13. Changes to terms">
              <P>
                We may update these Terms from time to time. We will notify you by email or in-app notice at least 14 days before material changes take effect. Continued use of Dottie after changes come into effect constitutes acceptance of the revised Terms.
              </P>
              <P>
                If you do not agree to updated Terms, you may cancel your account before the changes take effect.
              </P>
            </Section>

            <Section id="governing-law" title="14. Governing law">
              <P>
                These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the courts of England and Wales, unless you are a consumer and applicable law gives you the right to bring proceedings in your local jurisdiction.
              </P>
            </Section>

            <Section id="contact" title="15. Contact us">
              <P>For questions about these Terms, please contact us:</P>
              <div className="p-5 rounded-xl bg-white border border-gray-200 space-y-1">
                <p className="font-semibold text-gray-900">Dottie</p>
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-600 underline block">{CONTACT_EMAIL}</a>
                <p className="text-gray-500">www.dottie.cloud</p>
              </div>
            </Section>

          </div>
        </div>
      </div>
    </div>
  )
}
