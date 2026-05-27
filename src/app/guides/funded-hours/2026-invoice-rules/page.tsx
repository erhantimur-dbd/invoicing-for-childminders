import Link from 'next/link'
import type { Metadata } from 'next'

const URL = 'https://www.godottie.cloud/guides/funded-hours/2026-invoice-rules'

export const metadata: Metadata = {
  title: 'The 2026 Childminder Invoice Rules: What Must Be Itemised',
  description:
    'From January 2026, every funded-hours invoice must itemise free hours, paid hours, food, consumables, and activities separately. Here\'s exactly what changes — and a free compliant template.',
  alternates: { canonical: URL },
  openGraph: {
    title: 'The 2026 Childminder Invoice Rules — Dottie',
    description:
      'What UK childminders must itemise on every invoice from January 2026 (and why the top-up fee ban from April 2025 still trips people up).',
    url: URL,
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The 2026 Childminder Invoice Rules',
    description:
      'What must be itemised on every funded-hours invoice from January 2026.',
  },
}

const FAQS: { q: string; a: string }[] = [
  {
    q: 'What changes about childminder invoices in January 2026?',
    a: 'From January 2026, every invoice for a child receiving government-funded hours must itemise five things separately: the funded hours per week or term, any additional paid hours (at your normal rate), food charges, non-consumables (e.g. nappies, sun cream), and activities or trips. Each non-consumable and activity must be listed individually, not bundled.',
  },
  {
    q: 'Can I still charge a top-up fee?',
    a: 'No. Since 1 April 2025, DfE rules prohibit early-years providers from charging a top-up fee — that is, the difference between your normal hourly rate and the funding rate the local authority pays you. You can charge for additional paid hours at your normal rate, but those hours must not be a condition of the funded place.',
  },
  {
    q: 'What can I charge for during funded hours?',
    a: 'Voluntary, optional charges only: meals, snacks, consumables (nappies, sun cream), specific activities or trips. Parents must be told they have a choice — to send their own food, opt out of an outing, etc. — and the charges must be itemised on the invoice.',
  },
  {
    q: 'Do funded hours have to be over 38 weeks?',
    a: 'No. The default is 38 weeks (term-time only) but funding can be stretched across up to 52 weeks, which reduces the number of funded hours per week. You agree the pattern with the parent and the local authority funding portal at the start of the term.',
  },
  {
    q: 'Does Dottie support the 2026 invoice rules?',
    a: 'Yes. Dottie generates invoices that itemise funded hours, additional paid hours, food, non-consumables, and activities as separate line items by default. The invoice is compliant out of the box — you do not need to build a custom template.',
  },
  {
    q: 'What about the September 2025 expansion to 30 funded hours from 9 months old?',
    a: 'From September 2025, eligible working parents can claim 30 funded hours per week from when the child is 9 months old, until they start school. The invoice rules above apply to every funded-hours invoice, regardless of which entitlement the child is on (15h universal, 15h working-parents, or 30h working-parents).',
  },
]

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'The 2026 Childminder Invoice Rules: What Must Be Itemised',
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
  mainEntity: FAQS.map((f) => ({
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
    { '@type': 'ListItem', position: 4, name: '2026 invoice rules', item: URL },
  ],
}

export default function Page() {
  return (
    <div className="bg-white text-gray-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Top nav (light) */}
      <header className="border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-amber-400">
              <span className="text-white text-xs font-extrabold">D.</span>
            </span>
            <span className="font-bold text-gray-900 text-sm">Dottie</span>
          </Link>
          <Link
            href="/signup"
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Start free trial →
          </Link>
        </div>
      </header>

      <article className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="text-sm text-gray-500 mb-6">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link href="/" className="hover:text-emerald-700">Home</Link></li>
            <li aria-hidden>/</li>
            <li><span className="text-gray-700">Guides</span></li>
            <li aria-hidden>/</li>
            <li><span className="text-gray-700">Funded hours</span></li>
            <li aria-hidden>/</li>
            <li><span className="text-gray-900 font-medium">2026 invoice rules</span></li>
          </ol>
        </nav>

        {/* Title block */}
        <p className="text-emerald-700 text-xs font-semibold uppercase tracking-widest mb-3">
          UK childminder compliance
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight text-gray-900 mb-4">
          The 2026 childminder invoice rules: what must be itemised
        </h1>
        <p className="text-gray-600 text-lg leading-relaxed mb-2">
          From <strong>January 2026</strong>, every invoice for a child receiving government-funded hours must itemise five things separately: <em>funded hours</em>, <em>additional paid hours</em>, <em>food</em>, <em>non-consumables</em>, and <em>activities</em>. Get this wrong and you risk losing the funded place — or worse, an Ofsted finding.
        </p>
        <p className="text-gray-500 text-sm mb-10">
          Last updated 6 May 2026 · 6 min read
        </p>

        {/* TL;DR card */}
        <aside className="mb-10 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6">
          <p className="text-emerald-900 text-xs font-bold uppercase tracking-widest mb-2">
            In one paragraph
          </p>
          <p className="text-gray-800 leading-relaxed">
            From <strong>January 2026</strong>, funded-hours invoices must clearly separate funded hours, paid hours, food, non-consumables, and activities. From <strong>April 2025</strong>, top-up fees (charging the gap between your rate and the funding rate) are <strong>banned</strong>. You can still charge for extras — but they must be voluntary, itemised, and never a condition of the funded place.
          </p>
        </aside>

        {/* Section 1 */}
        <h2 id="what-changes" className="scroll-mt-16 text-2xl font-bold text-gray-900 mt-12 mb-4">
          1. What exactly changes in January 2026?
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          DfE-issued statutory guidance now requires that every invoice issued to a parent of a child claiming government-funded early-years hours must show, as separate line items:
        </p>
        <ul className="space-y-2 mb-6 text-gray-700">
          {[
            { k: 'Funded hours', v: 'Per week or per term, with the funded rate of £0 clearly shown.' },
            { k: 'Additional paid hours', v: 'At your normal hourly/daily rate. Must not be a condition of the funded place.' },
            { k: 'Food charges', v: 'Itemised — usually a flat per-meal or per-day amount. Parents must be free to send food instead.' },
            { k: 'Non-consumables', v: 'Each item separately: nappies, sun cream, toiletries, etc. Optional for the parent.' },
            { k: 'Activities & trips', v: 'Each itemised: outings, classes, special projects. Optional.' },
          ].map((it) => (
            <li key={it.k} className="flex gap-3">
              <span className="mt-2 inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
              <span><strong className="text-gray-900">{it.k}.</strong> <span className="text-gray-600">{it.v}</span></span>
            </li>
          ))}
        </ul>

        {/* Worked example */}
        <h2 id="example" className="scroll-mt-16 text-2xl font-bold text-gray-900 mt-12 mb-4">
          2. A compliant invoice, line by line
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Suppose Ava is a 2-year-old whose working parents claim the 15-hour entitlement; you also look after her for an extra 10 hours a week at £6/hour. You provide lunch (£3.50/day) and went on a soft-play outing one day (£8). Here&apos;s what the invoice should look like under the 2026 rules:
        </p>
        <div className="rounded-2xl border border-gray-200 overflow-hidden mb-6 text-sm">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-600">
                <th className="py-2.5 px-4 font-semibold">Line</th>
                <th className="py-2.5 px-4 font-semibold">Detail</th>
                <th className="py-2.5 px-4 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              <tr><td className="py-2.5 px-4">Funded hours</td><td className="py-2.5 px-4 text-gray-500">15h × 5 days, working-parents 2yo entitlement</td><td className="py-2.5 px-4 text-right">£0.00</td></tr>
              <tr><td className="py-2.5 px-4">Additional paid hours</td><td className="py-2.5 px-4 text-gray-500">10h × £6.00</td><td className="py-2.5 px-4 text-right">£60.00</td></tr>
              <tr><td className="py-2.5 px-4">Food</td><td className="py-2.5 px-4 text-gray-500">Lunch × 5 days × £3.50</td><td className="py-2.5 px-4 text-right">£17.50</td></tr>
              <tr><td className="py-2.5 px-4">Activity</td><td className="py-2.5 px-4 text-gray-500">Soft-play outing, Wed 6 May</td><td className="py-2.5 px-4 text-right">£8.00</td></tr>
              <tr className="bg-emerald-50/50 font-semibold"><td className="py-2.5 px-4">Total</td><td className="py-2.5 px-4"></td><td className="py-2.5 px-4 text-right text-emerald-700">£85.50</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-gray-600 text-sm leading-relaxed mb-6">
          Notice three things: the funded line is <strong>shown explicitly at £0.00</strong> (not omitted); the food, activity, and paid hours are <strong>separate</strong> (not bundled into one figure); and the activity has a <strong>date and description</strong> so the parent can see what they paid for.
        </p>

        {/* Section 3 */}
        <h2 id="top-up-ban" className="scroll-mt-16 text-2xl font-bold text-gray-900 mt-12 mb-4">
          3. The April 2025 top-up fee ban (still trips people up)
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Since <strong>1 April 2025</strong>, you cannot charge a parent the difference between your usual hourly rate and the funding rate paid by the local authority. If your normal rate is £8/hour and the council pays you £5.85, you cannot invoice the parent for the £2.15 gap on funded hours. Doing so risks losing the funded place and an Ofsted finding.
        </p>
        <p className="text-gray-700 leading-relaxed mb-6">
          You <strong>can</strong>: charge for additional paid hours at your normal rate, charge for optional extras (food, activities, consumables), and recover the cost of those extras item-by-item. You <strong>cannot</strong>: make any of those charges a condition of accepting the funded place, or roll them into a single &quot;funded hours fee&quot;.
        </p>

        {/* Section 4 — pivot to product */}
        <h2 id="how-dottie-handles-it" className="scroll-mt-16 text-2xl font-bold text-gray-900 mt-12 mb-4">
          4. How Dottie handles this for you
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Dottie is the only UK childminder invoicing tool built around these rules from day one. Set each child&apos;s funded hours, paid hours, and any extras once. Every invoice is generated with the five line-item categories already separated — funded shown at £0.00, paid hours at your rate, food itemised by day, non-consumables and activities each on their own line.
        </p>
        <p className="text-gray-700 leading-relaxed mb-6">
          You review the draft, approve it, and send it to the parent in a single tap. The parent verifies their child&apos;s date of birth before they can see anything sensitive (your bank details). HMRC-ready records are kept automatically — useful when MTD for Income Tax kicks in for £50k+ childminders in April 2026.
        </p>

        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-amber-400 p-6 sm:p-8 text-white shadow-xl shadow-emerald-200/40 my-10">
          <h3 className="text-xl sm:text-2xl font-extrabold mb-2">Try Dottie free for 7 days</h3>
          <p className="text-white/85 mb-5 leading-relaxed">
            Compliant invoices, funded-hours tracking, expense capture, and tax-year reports — built for UK childminders. No credit card required.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-emerald-700 font-bold text-sm hover:bg-emerald-50 transition-colors active:scale-95"
          >
            Start free trial →
          </Link>
        </div>

        {/* FAQ */}
        <h2 id="faq" className="scroll-mt-16 text-2xl font-bold text-gray-900 mt-12 mb-4">
          Frequently asked questions
        </h2>
        <div className="space-y-2 mb-12">
          {FAQS.map((f, i) => (
            <details
              key={i}
              className="group bg-white border border-gray-200 rounded-xl overflow-hidden"
            >
              <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors list-none [&::-webkit-details-marker]:hidden">
                <span>{f.q}</span>
                <svg
                  className="flex-shrink-0 w-4 h-4 text-gray-400 transition-transform duration-200 group-open:rotate-180"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <div className="px-5 pb-4 pt-1 text-sm text-gray-600 leading-relaxed border-t border-gray-100">
                {f.a}
              </div>
            </details>
          ))}
        </div>

        {/* Sources */}
        <h2 id="sources" className="scroll-mt-16 text-2xl font-bold text-gray-900 mt-12 mb-3">
          Sources & further reading
        </h2>
        <ul className="space-y-2 text-sm text-gray-600 mb-12">
          <li>
            <a className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800" href="https://assets.publishing.service.gov.uk/media/683981d4c99c4f37ab4e86e3/September_2025_early_education_and_childcare_entitlements_expansion_-_local_authority_system_guidance_May_2025.pdf" rel="nofollow noopener" target="_blank">
              DfE — September 2025 early education and childcare entitlements expansion (PDF)
            </a>
          </li>
          <li>
            <a className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800" href="https://www.childcare.co.uk/funding-fees-policy" rel="nofollow noopener" target="_blank">
              Funding Fees Policy Guidance — Childcare.co.uk
            </a>
          </li>
          <li>
            <a className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800" href="https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim52751" rel="nofollow noopener" target="_blank">
              BIM52751 — HMRC manual: childminders&apos; expenses
            </a>
          </li>
          <li>
            <a className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800" href="https://www.pacey.org.uk/working-in-childcare/spotlight-on/tax-return-survival-guide/" rel="nofollow noopener" target="_blank">
              Coram PACEY — Tax return survival guide
            </a>
          </li>
        </ul>

        <p className="text-xs text-gray-400 leading-relaxed">
          This guide is for general information only and is not legal or tax advice. Rules change — always check the current GOV.UK guidance, your local authority funding agreement, and where appropriate take advice from a qualified accountant.
        </p>
      </article>
    </div>
  )
}
