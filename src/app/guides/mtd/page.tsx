import Link from 'next/link'
import type { Metadata } from 'next'

const URL = 'https://www.godottie.cloud/guides/mtd'

export const metadata: Metadata = {
  title: 'Making Tax Digital for childminders — the 2026 guide',
  description:
    'MTD for Income Tax kicks in for £50k+ UK sole traders from April 2026, then £30k from April 2027 and £20k from April 2028. What it means for childminders — what to do, when, and how Dottie helps.',
  alternates: { canonical: URL },
  openGraph: {
    title: 'Making Tax Digital for childminders — Dottie',
    description:
      'Everything UK childminders need to know about MTD for Income Tax (April 2026 onward). Thresholds, quarterly updates, what software has to do.',
    url: URL,
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Making Tax Digital for childminders',
    description: 'MTD for Income Tax thresholds, deadlines, and what to do — for UK childminders.',
  },
}

const FAQS: { q: string; a: string }[] = [
  {
    q: 'When does MTD start for childminders?',
    a: 'From 6 April 2026 if your gross self-employment + property income is over £50,000. From 6 April 2027 if it is over £30,000. From 6 April 2028 if it is over £20,000. The threshold is gross income, not profit, and it counts childminding plus any other self-employed income you have.',
  },
  {
    q: 'What does MTD actually require me to do?',
    a: 'Three things. (1) Keep digital records of every income and expense item — not paper or just a spreadsheet — using HMRC-recognised software. (2) Send a quarterly summary to HMRC five weeks after each quarter ends (deadlines: 7 August, 7 November, 7 February, 7 May). (3) File a final declaration by 31 January after the tax year ends.',
  },
  {
    q: 'Are the quarterly updates the same as a tax return?',
    a: 'No. Quarterly updates are short summaries of income and expenses, not full tax returns. The annual final declaration is your tax return — submitted by the same 31 January deadline as Self Assessment is now.',
  },
  {
    q: 'Can childminders still use the PACEY/HMRC simplified expenses concession?',
    a: 'Not under MTD. HMRC clarified on 18 March 2026 (BIM52751) that childminders within MTD must use the standard approach to calculating taxable profits — the long-standing concession for flat-rate utilities and wear-and-tear deductions does not apply. Outside MTD, the concession still works as before.',
  },
  {
    q: 'Should I be on cash basis or traditional accounting?',
    a: 'Cash basis has been the default for sole traders since April 2025, including childminders. Most childminders should stay on cash basis — it is simpler and works fine under MTD. You record income and expenses when money actually moves, not when invoices are issued.',
  },
  {
    q: 'Do I have to use software, or can I keep doing my spreadsheet?',
    a: 'Once you are within MTD you must use software that connects to HMRC — a "spreadsheet plus bridging software" approach is allowed. A standalone spreadsheet is not. Dottie handles the digital-records and quarterly-summary side; for the actual HMRC filing we integrate with HMRC-recognised filing tools (FreeAgent, QuickBooks, Xero) so you do not need to learn a separate package.',
  },
  {
    q: 'What if I am under the £20k threshold?',
    a: 'You stay on the existing Self Assessment process — one return a year, due 31 January. There has been no announcement of MTD applying below £20k. You can still benefit from digital record-keeping (and Dottie still helps), but it is not yet mandatory.',
  },
]

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Making Tax Digital for childminders — the 2026 guide',
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
    { '@type': 'ListItem', position: 3, name: 'MTD for childminders', item: URL },
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
            <li><span className="text-gray-900 font-medium">MTD</span></li>
          </ol>
        </nav>

        <p className="text-emerald-700 text-xs font-semibold uppercase tracking-widest mb-3">
          UK childminder compliance
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight text-gray-900 mb-4">
          Making Tax Digital for childminders — the 2026 guide
        </h1>
        <p className="text-gray-600 text-lg leading-relaxed mb-2">
          From <strong>April 2026</strong>, the way most full-time UK childminders report income to HMRC changes. One annual Self Assessment becomes <em>five</em> submissions — four quarterly updates plus a final declaration — all from MTD-recognised software. Here is what it means for you, and exactly when you have to do something.
        </p>
        <p className="text-gray-500 text-sm mb-10">Last updated 6 May 2026 · 7 min read</p>

        {/* TL;DR */}
        <aside className="mb-10 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6">
          <p className="text-emerald-900 text-xs font-bold uppercase tracking-widest mb-2">In one paragraph</p>
          <p className="text-gray-800 leading-relaxed">
            MTD for Income Tax applies to UK sole traders (which most childminders are) above a gross-income threshold: <strong>£50k from 6 April 2026</strong>, <strong>£30k from 6 April 2027</strong>, <strong>£20k from 6 April 2028</strong>. Once in, you keep digital records and submit quarterly summaries to HMRC via approved software, plus a final declaration once a year. Childminders no longer use the PACEY simplified-expenses concession under MTD.
          </p>
        </aside>

        {/* Threshold table */}
        <h2 id="thresholds" className="scroll-mt-16 text-2xl font-bold text-gray-900 mt-12 mb-4">
          1. When does MTD apply to you?
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          You are caught by MTD for Income Tax based on your <strong>gross self-employment + property income</strong> in the previous tax year. Gross — not profit. If childminding is your only income source, this is just your turnover.
        </p>
        <div className="rounded-2xl border border-gray-200 overflow-hidden mb-6 text-sm">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-600">
                <th className="py-2.5 px-4 font-semibold">Tax year you joined MTD</th>
                <th className="py-2.5 px-4 font-semibold">If gross income is over</th>
                <th className="py-2.5 px-4 font-semibold">First quarterly update due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              <tr><td className="py-2.5 px-4">6 April 2026</td><td className="py-2.5 px-4">£50,000</td><td className="py-2.5 px-4">7 August 2026</td></tr>
              <tr><td className="py-2.5 px-4">6 April 2027</td><td className="py-2.5 px-4">£30,000</td><td className="py-2.5 px-4">7 August 2027</td></tr>
              <tr><td className="py-2.5 px-4">6 April 2028</td><td className="py-2.5 px-4">£20,000</td><td className="py-2.5 px-4">7 August 2028</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-gray-600 text-sm leading-relaxed mb-6">
          A full-time childminder with 4–5 children typically grosses £35–£55k a year, so most full-time childminders will be inside MTD by April 2027 at the latest.
        </p>

        {/* Quarterly */}
        <h2 id="quarterly" className="scroll-mt-16 text-2xl font-bold text-gray-900 mt-12 mb-4">
          2. The four quarterly deadlines
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Once you are in MTD, you submit a summary of income and expenses every quarter — five weeks after the quarter ends. Quarters are fixed (you cannot align them to your accounting period unless you opt in to calendar quarters):
        </p>
        <div className="rounded-2xl border border-gray-200 overflow-hidden mb-6 text-sm">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-600">
                <th className="py-2.5 px-4 font-semibold">Quarter covers</th>
                <th className="py-2.5 px-4 font-semibold">Submission deadline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              <tr><td className="py-2.5 px-4">6 April – 5 July</td><td className="py-2.5 px-4">7 August</td></tr>
              <tr><td className="py-2.5 px-4">6 July – 5 October</td><td className="py-2.5 px-4">7 November</td></tr>
              <tr><td className="py-2.5 px-4">6 October – 5 January</td><td className="py-2.5 px-4">7 February</td></tr>
              <tr><td className="py-2.5 px-4">6 January – 5 April</td><td className="py-2.5 px-4">7 May</td></tr>
              <tr className="bg-amber-50/50"><td className="py-2.5 px-4 font-semibold">Final declaration</td><td className="py-2.5 px-4 font-semibold">31 January after tax-year end</td></tr>
            </tbody>
          </table>
        </div>

        {/* Childminder-specific */}
        <h2 id="childminder-specific" className="scroll-mt-16 text-2xl font-bold text-gray-900 mt-12 mb-4">
          3. What changes specifically for childminders
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          On 18 March 2026, HMRC updated <a className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800" href="https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim52751" rel="nofollow noopener" target="_blank">BIM52751</a> to clarify that childminders within MTD must use the <strong>standard approach</strong> for calculating taxable profits. In practice, three things change:
        </p>
        <ul className="space-y-2 mb-6 text-gray-700">
          {[
            { k: 'No more PACEY simplified expenses', v: 'The flat-rate concession for utilities/wear-and-tear under the long-standing PACEY/HMRC agreement does not apply under MTD. You apportion actual costs (or use HMRC simplified expenses on the standard sole-trader basis).' },
            { k: 'Cash basis is fine — and is the default', v: 'Since April 2025 cash basis is the default for sole traders. Most childminders should stay on it; under cash basis you cannot claim capital allowances, but you deduct apportioned costs the same way.' },
            { k: 'Digital records, not just totals', v: 'You log each transaction (date, amount, category) digitally. Spreadsheets are allowed only with bridging software that submits to HMRC.' },
          ].map(it => (
            <li key={it.k} className="flex gap-3">
              <span className="mt-2 inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
              <span><strong className="text-gray-900">{it.k}.</strong> <span className="text-gray-600">{it.v}</span></span>
            </li>
          ))}
        </ul>

        {/* Dottie pivot */}
        <h2 id="how-dottie-helps" className="scroll-mt-16 text-2xl font-bold text-gray-900 mt-12 mb-4">
          4. How Dottie fits in
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Dottie keeps digital records the way MTD requires: every invoice you send and every expense you log is captured as a categorised, dated, digital entry — not a row on a paper book. From there, two paths to HMRC:
        </p>
        <ul className="space-y-2 mb-6 text-gray-700">
          <li className="flex gap-3">
            <span className="mt-2 inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <span><strong className="text-gray-900">Bridge to FreeAgent / Xero / QuickBooks.</strong> <span className="text-gray-600">Export an MTD-shaped CSV from Dottie&apos;s reports into your existing bookkeeping software. We are working on a one-click sync to FreeAgent (free for FreeAgent customers of NatWest/RBS/Mettle).</span></span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <span><strong className="text-gray-900">Direct quarterly submission (roadmap).</strong> <span className="text-gray-600">A native Dottie + HMRC connection so you never leave the app. Targeted for the 2027 threshold drop.</span></span>
          </li>
        </ul>

        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-amber-400 p-6 sm:p-8 text-white shadow-xl shadow-emerald-200/40 my-10">
          <h3 className="text-xl sm:text-2xl font-extrabold mb-2">Get MTD-ready records from day one</h3>
          <p className="text-white/85 mb-5 leading-relaxed">
            Dottie keeps every invoice and expense as a digital record HMRC will accept under MTD. 7 days free, no credit card.
          </p>
          <Link href="/signup" className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-emerald-700 font-bold text-sm hover:bg-emerald-50 transition-colors active:scale-95">
            Start free trial →
          </Link>
        </div>

        {/* FAQ */}
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

        {/* Sources */}
        <h2 id="sources" className="scroll-mt-16 text-2xl font-bold text-gray-900 mt-12 mb-3">Sources & further reading</h2>
        <ul className="space-y-2 text-sm text-gray-600 mb-12">
          <li><a className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800" href="https://www.icaew.com/insights/tax-news/2026/mar-2026/hmrc-updates-its-guidance-for-childminders" rel="nofollow noopener" target="_blank">HMRC updates its guidance for childminders — ICAEW (March 2026)</a></li>
          <li><a className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800" href="https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim52751" rel="nofollow noopener" target="_blank">BIM52751 — HMRC manual: childminders&apos; expenses</a></li>
          <li><a className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800" href="https://www.gov.uk/guidance/find-software-thats-compatible-with-making-tax-digital-for-income-tax" rel="nofollow noopener" target="_blank">Find MTD-compatible software — GOV.UK</a></li>
          <li><a className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800" href="https://www.fsb.org.uk/resources/article/making-tax-digital-2026-deadlines-rules-and-more-MCQVRXUNIJC5EQRAZBQ7DFJNGYMA" rel="nofollow noopener" target="_blank">Making Tax Digital 2026: deadlines & rules — FSB</a></li>
        </ul>

        <p className="text-xs text-gray-400 leading-relaxed">
          This guide is general information, not tax advice. Rules and dates may change — always check GOV.UK and consider speaking with a qualified accountant.
        </p>
      </article>
    </div>
  )
}
