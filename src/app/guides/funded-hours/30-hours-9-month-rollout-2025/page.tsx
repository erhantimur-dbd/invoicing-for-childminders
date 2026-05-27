import Link from 'next/link'
import type { Metadata } from 'next'

const URL = 'https://www.godottie.cloud/guides/funded-hours/30-hours-9-month-rollout-2025'

export const metadata: Metadata = {
  title: '30 funded hours from 9 months — the September 2025 rollout explained',
  description:
    'From September 2025, eligible working parents in England can claim 30 funded childcare hours per week from when their child is 9 months old. Eligibility, what childminders need to know, and how to invoice for it.',
  alternates: { canonical: URL },
  openGraph: {
    title: '30 funded hours from 9 months — September 2025 rollout',
    description:
      'How the September 2025 funded-hours expansion works and what UK childminders need to do.',
    url: URL,
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: '30 funded hours from 9 months — Sept 2025 rollout',
    description: 'Eligibility, dates, and how childminders should invoice.',
  },
}

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Who is eligible for the 30 funded hours from 9 months?',
    a: 'Working parents (and their partner, if they have one) where each is generally expected to earn at least the equivalent of 16 hours a week at National Living Wage and individually earns under £100,000. The child must be at least 9 months old. Eligibility is checked by the parent through the GOV.UK Childcare Service every 3 months.',
  },
  {
    q: 'When does the entitlement start for a particular child?',
    a: 'The term after the child turns 9 months old, provided the parent has applied and received an eligibility code. Terms start in September, January, and April. So a child turning 9 months in October starts funded hours in January (the first day of the spring term).',
  },
  {
    q: 'How many funded hours per week, and over how many weeks?',
    a: '30 hours per week over 38 weeks of the year (term-time), totalling 1,140 hours per year. You can agree to "stretch" these across up to 52 weeks with the parent — which works out to about 22 hours a week, but lets the parent claim funded hours during school holidays.',
  },
  {
    q: 'Do I have to offer funded hours? What if my rates are higher than the funding rate?',
    a: 'No — taking funded children is your choice. You will not necessarily make money on funded hours alone (the local authority rate is usually below your normal rate). But you cannot charge a "top-up" fee to bridge the gap (banned since April 2025). You can charge for additional paid hours, food, consumables, and activities — itemised on the invoice — but those must be voluntary, not a condition of taking the funded place.',
  },
  {
    q: 'How do I get paid by the local authority?',
    a: 'You agree the funding pattern with the parent and submit a Headcount return through the local authority funding portal each term. The local authority pays you directly (not the parent). You still issue the parent an invoice that itemises the funded hours at £0 alongside any extras you have charged for.',
  },
  {
    q: 'What changed for childminders specifically in September 2025?',
    a: 'Prior to September 2025, the only 30-hour entitlement was for working parents of 3–4 year olds. From September 2025, that 30-hour entitlement extended down to children aged 9 months and over. For most childminders, this means a much larger share of children are now on funded hours — and more of them are funded for longer hours.',
  },
]

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: '30 funded hours from 9 months — the September 2025 rollout explained',
  description: metadata.description,
  datePublished: '2026-05-06',
  dateModified: '2026-05-06',
  author: { '@type': 'Organization', name: 'Dottie', url: 'https://www.godottie.cloud' },
  publisher: {
    '@type': 'Organization',
    name: 'Dottie',
    url: 'https://www.godottie.cloud',
    logo: { '@type': 'ImageObject', url: 'https://www.godottie.cloud/icon' },
  },
  mainEntityOfPage: { '@type': 'WebPage', '@id': URL },
}

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map(f => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Dottie', item: 'https://www.godottie.cloud' },
    { '@type': 'ListItem', position: 2, name: 'Guides', item: 'https://www.godottie.cloud/guides' },
    { '@type': 'ListItem', position: 3, name: 'Funded hours', item: 'https://www.godottie.cloud/guides/funded-hours' },
    { '@type': 'ListItem', position: 4, name: '30 hours from 9 months (Sept 2025)', item: URL },
  ],
}

export default function Page() {
  return (
    <div className="bg-white text-gray-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <header className="border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-amber-400">
              <span className="text-white text-xs font-extrabold">D.</span>
            </span>
            <span className="font-bold text-gray-900 text-sm">Dottie</span>
          </Link>
          <Link href="/signup" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800">
            Start free trial →
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="text-sm text-gray-500 mb-6">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link href="/" className="hover:text-emerald-700">Home</Link></li>
            <li aria-hidden>/</li>
            <li><Link href="/guides" className="hover:text-emerald-700">Guides</Link></li>
            <li aria-hidden>/</li>
            <li><Link href="/guides/funded-hours" className="hover:text-emerald-700">Funded hours</Link></li>
            <li aria-hidden>/</li>
            <li><span className="text-gray-900 font-medium">30 hours from 9 months</span></li>
          </ol>
        </nav>

        <p className="text-emerald-700 text-xs font-semibold uppercase tracking-widest mb-3">
          UK funded childcare entitlements
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight text-gray-900 mb-4">
          30 funded hours from 9 months — the September 2025 rollout
        </h1>
        <p className="text-gray-600 text-lg leading-relaxed mb-2">
          The September 2025 expansion is the biggest shift to funded childcare in a decade. Working parents of children aged <strong>9 months and over</strong> can now claim <strong>30 funded hours a week</strong> — up from a 15-hour entitlement that started six months earlier. Here is what childminders need to know to invoice and report correctly.
        </p>
        <p className="text-gray-500 text-sm mb-10">Last updated 6 May 2026 · 5 min read</p>

        <aside className="mb-10 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6">
          <p className="text-emerald-900 text-xs font-bold uppercase tracking-widest mb-2">In one paragraph</p>
          <p className="text-gray-800 leading-relaxed">
            From <strong>September 2025</strong>, eligible working parents in England can claim <strong>30 funded hours a week</strong> for their child from <strong>9 months old</strong> until they start school. The funded hours run over 38 weeks (term-time) or up to 52 weeks if stretched. Childminders cannot charge top-up fees, but can itemise paid hours, food, consumables, and activities separately — which is exactly what the January 2026 invoice rules require.
          </p>
        </aside>

        {/* The rollout timeline */}
        <h2 id="timeline" className="scroll-mt-16 text-2xl font-bold text-gray-900 mt-12 mb-4">
          1. The full rollout timeline
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          The Spring Budget 2023 expansion rolled out in four stages:
        </p>
        <div className="rounded-2xl border border-gray-200 overflow-hidden mb-6 text-sm">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-600">
                <th className="py-2.5 px-4 font-semibold">Date</th>
                <th className="py-2.5 px-4 font-semibold">Who became eligible</th>
                <th className="py-2.5 px-4 font-semibold">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              <tr><td className="py-2.5 px-4">April 2024</td><td className="py-2.5 px-4">Working parents of 2-year-olds</td><td className="py-2.5 px-4">15h</td></tr>
              <tr><td className="py-2.5 px-4">September 2024</td><td className="py-2.5 px-4">Working parents of 9 months – 2 years</td><td className="py-2.5 px-4">15h</td></tr>
              <tr className="bg-emerald-50/50"><td className="py-2.5 px-4 font-semibold">September 2025</td><td className="py-2.5 px-4 font-semibold">Working parents of 9 months → school start</td><td className="py-2.5 px-4 font-semibold">30h</td></tr>
              <tr><td className="py-2.5 px-4">Pre-existing</td><td className="py-2.5 px-4">All 3–4 year olds (universal)</td><td className="py-2.5 px-4">15h</td></tr>
              <tr><td className="py-2.5 px-4">Pre-existing</td><td className="py-2.5 px-4">Working parents of 3–4 year olds</td><td className="py-2.5 px-4">30h</td></tr>
              <tr><td className="py-2.5 px-4">Pre-existing</td><td className="py-2.5 px-4">Disadvantaged 2-year-olds</td><td className="py-2.5 px-4">15h</td></tr>
            </tbody>
          </table>
        </div>

        {/* Eligibility */}
        <h2 id="eligibility" className="scroll-mt-16 text-2xl font-bold text-gray-900 mt-12 mb-4">
          2. Eligibility — what parents need
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          The parent (and their partner, if they have one) must each:
        </p>
        <ul className="space-y-2 mb-6 text-gray-700">
          <li className="flex gap-3">
            <span className="mt-2 inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <span>Earn at least the equivalent of <strong>16 hours a week at National Living Wage</strong> over the next 3 months.</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <span>Earn under <strong>£100,000 individually</strong> (it&apos;s an income cap, not a household one).</span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <span>Reconfirm eligibility every 3 months on the GOV.UK Childcare Service.</span>
          </li>
        </ul>
        <p className="text-gray-700 leading-relaxed mb-4">
          The child must be at least <strong>9 months old</strong> on the cut-off date for the term. The cut-off dates are 31 August (autumn term), 31 December (spring), and 31 March (summer).
        </p>

        {/* Childminder action */}
        <h2 id="for-childminders" className="scroll-mt-16 text-2xl font-bold text-gray-900 mt-12 mb-4">
          3. What this means for childminders
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Three practical changes:
        </p>
        <ul className="space-y-2 mb-6 text-gray-700">
          {[
            { k: 'More children on funded hours', v: 'Babies and toddlers in working-parent households are now in scope. The share of your children claiming funded hours is much higher than it was in 2024.' },
            { k: 'More hours per child', v: 'A child whose family qualifies can now claim 30 funded hours from 9 months — twice the previous default. If you offer 50 hours of care a week, 30 of them might now be funded.' },
            { k: 'Top-up fees still banned', v: 'Since April 2025 you cannot charge the gap between your hourly rate and the funding rate. You absorb that gap on funded hours, and recover other costs (food, consumables, activities) as voluntary, itemised extras.' },
          ].map(it => (
            <li key={it.k} className="flex gap-3">
              <span className="mt-2 inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
              <span><strong className="text-gray-900">{it.k}.</strong> <span className="text-gray-600">{it.v}</span></span>
            </li>
          ))}
        </ul>

        <p className="text-gray-700 leading-relaxed mb-6">
          The mechanics of invoicing under the new entitlement are governed by the <Link href="/guides/funded-hours/2026-invoice-rules" className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800">January 2026 invoice rules</Link> — read that next.
        </p>

        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-amber-400 p-6 sm:p-8 text-white shadow-xl shadow-emerald-200/40 my-10">
          <h3 className="text-xl sm:text-2xl font-extrabold mb-2">Track every funded entitlement on every child</h3>
          <p className="text-white/85 mb-5 leading-relaxed">
            Dottie supports all six UK funded entitlements — universal, working-parents, disadvantaged, 9 months to school. Pick the scheme once per child, and invoices format themselves correctly.
          </p>
          <Link href="/signup" className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-emerald-700 font-bold text-sm hover:bg-emerald-50 transition-colors active:scale-95">
            Start free trial →
          </Link>
        </div>

        <h2 id="faq" className="scroll-mt-16 text-2xl font-bold text-gray-900 mt-12 mb-4">Frequently asked questions</h2>
        <div className="space-y-2 mb-12">
          {FAQS.map((f, i) => (
            <details key={i} className="group bg-white border border-gray-200 rounded-xl overflow-hidden">
              <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                <span>{f.q}</span>
                <svg className="flex-shrink-0 w-4 h-4 text-gray-400 transition-transform duration-200 group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-4 pt-1 text-sm text-gray-600 leading-relaxed border-t border-gray-100">
                {f.a}
              </div>
            </details>
          ))}
        </div>

        <h2 id="sources" className="scroll-mt-16 text-2xl font-bold text-gray-900 mt-12 mb-3">Sources & further reading</h2>
        <ul className="space-y-2 text-sm text-gray-600 mb-12">
          <li><a className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800" href="https://educationhub.blog.gov.uk/2025/09/how-to-apply-for-30-hours-free-childcare-and-find-out-if-youre-eligible/" rel="nofollow noopener" target="_blank">How to apply for 30 hours free childcare — GOV.UK Education Hub (Sep 2025)</a></li>
          <li><a className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800" href="https://commonslibrary.parliament.uk/research-briefings/cbp-10288/" rel="nofollow noopener" target="_blank">Expanding government-funded childcare in England — House of Commons Library</a></li>
          <li><a className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800" href="https://assets.publishing.service.gov.uk/media/683981d4c99c4f37ab4e86e3/September_2025_early_education_and_childcare_entitlements_expansion_-_local_authority_system_guidance_May_2025.pdf" rel="nofollow noopener" target="_blank">DfE — September 2025 expansion: local authority system guidance (PDF)</a></li>
        </ul>

        <p className="text-xs text-gray-400 leading-relaxed">
          General guidance, not legal or tax advice. Always check the live GOV.UK page and your local authority funding portal for current eligibility and rates.
        </p>
      </article>
    </div>
  )
}
