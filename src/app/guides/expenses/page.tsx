import Link from 'next/link'
import type { Metadata } from 'next'

const URL = 'https://www.godottie.cloud/guides/expenses'

export const metadata: Metadata = {
  title: 'Expenses childminders can claim — the 2026 guide',
  description:
    'A plain-English list of the expenses UK childminders can claim against tax: food, utilities apportionment, toys, mileage, insurance, training and more — with how the childminder-specific rules work.',
  alternates: { canonical: URL },
  openGraph: {
    title: 'Expenses childminders can claim — Dottie',
    description:
      'What UK childminders can claim against tax, and how to apportion household costs. Food, utilities, toys, car, insurance, training and more.',
    url: URL,
    type: 'article',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Expenses childminders can claim',
    description: 'What UK childminders can claim against tax — food, utilities, toys, mileage, insurance and more.',
  },
}

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Do I need to keep receipts for everything?',
    a: 'Keep a record of every business expense — a receipt, invoice or bank/card statement line. HMRC can ask to see them for up to roughly six years. Small cash items like a loaf of bread for the children can be logged with a note if no receipt survives, but the more evidence you keep, the safer you are. Photographing receipts as you go (Dottie extracts the amount, date and category for you) means you never lose one.',
  },
  {
    q: 'How do I work out the business share of my gas and electricity?',
    a: 'Apportion by time and space. A common HMRC-accepted method is hours-of-business-use: total the hours you mind children in a week, divide by the hours in a week, and apply that fraction to the bill — often adjusted for the rooms used. Alternatively, HMRC simplified expenses lets you claim a flat monthly amount based on hours worked from home. Pick one method and apply it consistently.',
  },
  {
    q: 'Can I claim for wear and tear on my house and furniture?',
    a: 'Yes — a reasonable proportion of wear-and-tear on furnishings and household items used by the children is allowable. Historically childminders used the PACEY/HMRC agreed percentages; under Making Tax Digital you apportion actual costs on the standard basis instead. See our MTD guide for who is affected and when.',
  },
  {
    q: 'Can I claim food I give the children?',
    a: 'Yes. Food and drink you provide to the children in your care is a direct, fully allowable business cost. Keep it separate from your own household food shopping — a rough apportionment of a mixed shop is fine if you note how you worked it out.',
  },
  {
    q: 'What about my car?',
    a: 'You can claim business mileage for trips made for childminding — school runs, outings, trips to buy supplies. The simplest method is HMRC simplified mileage: 45p per mile for the first 10,000 business miles in the year, then 25p. Keep a mileage log. You cannot also claim fuel and running costs separately if you use the mileage rate.',
  },
  {
    q: 'Is my Ofsted registration fee an allowable expense?',
    a: 'Yes. Your annual Ofsted registration fee, along with public liability insurance, DBS checks, first-aid and safeguarding training, and professional membership (e.g. PACEY, NCMA/Early Years Alliance) are all allowable business costs.',
  },
]

const CATEGORIES: { title: string; body: string; examples: string }[] = [
  {
    title: 'Food & drink for the children',
    body: 'Meals, snacks and drinks you provide are a direct, fully deductible cost. Keep them separate from your own groceries, or apportion a mixed shop and note the split.',
    examples: 'Milk, fruit, lunch ingredients, snacks, baby formula',
  },
  {
    title: 'Household costs (apportioned)',
    body: 'Gas, electricity, water, council tax, rent or mortgage interest, and broadband can be partly claimed for the proportion used for childminding — by hours of business use and rooms used, or via HMRC simplified expenses.',
    examples: 'Heating, lighting, water, broadband, wear-and-tear on furnishings',
  },
  {
    title: 'Toys, equipment & play',
    body: 'Anything you buy for the children to use is allowable. Larger items (a garden playhouse, a double buggy) may be treated as capital — under cash basis you simply deduct the cost when you pay.',
    examples: 'Toys, books, arts & crafts, prams, stair gates, high chairs',
  },
  {
    title: 'Outings & activities',
    body: 'Entry fees, class fees and travel for trips made in the course of childminding are claimable.',
    examples: 'Soft play, toddler groups, swimming, farm and museum entry',
  },
  {
    title: 'Car & travel',
    body: 'Business mileage at 45p/mile (first 10,000 miles, then 25p), or a proportion of actual running costs. Keep a mileage log. Public transport fares for business trips also count.',
    examples: 'School runs, outings, trips to buy supplies, bus/train fares',
  },
  {
    title: 'Insurance, registration & fees',
    body: 'The mandatory costs of operating: your Ofsted fee, public liability insurance, DBS checks, and any professional membership.',
    examples: 'Ofsted registration, PL insurance, DBS, PACEY/EYA membership',
  },
  {
    title: 'Training & safeguarding',
    body: 'Courses you must keep up to date are allowable — but new qualifications that give you a lasting new skill can be treated differently, so keep them itemised.',
    examples: 'Paediatric first aid, safeguarding, food hygiene, EYFS training',
  },
  {
    title: 'Admin, consumables & office',
    body: 'The everyday running costs of the business, including software like Dottie, stationery, and the consumables children get through.',
    examples: 'Nappies, wipes, cleaning products, printer ink, invoicing software',
  },
]

const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Expenses childminders can claim — the 2026 guide',
  description: metadata.description,
  datePublished: '2026-07-05',
  dateModified: '2026-07-05',
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
    { '@type': 'ListItem', position: 3, name: 'Expenses childminders can claim', item: URL },
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
            <li><span className="text-gray-900 font-medium">Expenses</span></li>
          </ol>
        </nav>

        <p className="text-emerald-700 text-xs font-semibold uppercase tracking-widest mb-3">
          Running your childminding business
        </p>
        <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight tracking-tight text-gray-900 mb-4">
          Expenses childminders can claim
        </h1>
        <p className="text-gray-600 text-lg leading-relaxed mb-2">
          Every pound of allowable expense reduces your taxable profit — so knowing what counts is worth real money. Childminders get some of the most generous expense rules of any sole trader, because so much of your home and week is given over to the business. Here is what you can claim, and how to apportion the tricky household costs.
        </p>
        <p className="text-gray-500 text-sm mb-10">Last updated 5 July 2026 · 6 min read</p>

        {/* TL;DR */}
        <aside className="mb-10 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-6">
          <p className="text-emerald-900 text-xs font-bold uppercase tracking-widest mb-2">In one paragraph</p>
          <p className="text-gray-800 leading-relaxed">
            You can claim the full cost of anything used <em>only</em> for childminding (children&apos;s food, toys, nappies, Ofsted fee, insurance) and a fair <em>proportion</em> of costs shared with your household (heating, electricity, water, broadband, wear-and-tear). Apportion shared costs by hours of business use, keep a record of every item, and log business mileage at 45p a mile. Keep it consistent year to year.
          </p>
        </aside>

        <h2 id="two-types" className="scroll-mt-16 text-2xl font-bold text-gray-900 mt-12 mb-4">
          1. Two types of expense
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          Everything you claim falls into one of two buckets, and the difference matters:
        </p>
        <ul className="space-y-2 mb-6 text-gray-700">
          <li className="flex gap-3">
            <span className="mt-2 inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <span><strong className="text-gray-900">Wholly business.</strong> <span className="text-gray-600">Bought only for the children — claim 100%. Their food, toys, nappies, your Ofsted fee, public liability insurance.</span></span>
          </li>
          <li className="flex gap-3">
            <span className="mt-2 inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
            <span><strong className="text-gray-900">Shared with your household.</strong> <span className="text-gray-600">Used by your family and the business — claim a fair proportion. Heating, electricity, water, broadband, the wear-and-tear on your sofa.</span></span>
          </li>
        </ul>

        <h2 id="categories" className="scroll-mt-16 text-2xl font-bold text-gray-900 mt-12 mb-4">
          2. What you can claim, category by category
        </h2>
        <div className="space-y-3 mb-8">
          {CATEGORIES.map(cat => (
            <div key={cat.title} className="rounded-2xl border border-gray-200 p-5">
              <p className="font-semibold text-gray-900 mb-1">{cat.title}</p>
              <p className="text-gray-600 text-sm leading-relaxed mb-2">{cat.body}</p>
              <p className="text-xs text-gray-400"><span className="font-medium text-gray-500">Examples:</span> {cat.examples}</p>
            </div>
          ))}
        </div>

        <h2 id="apportion" className="scroll-mt-16 text-2xl font-bold text-gray-900 mt-12 mb-4">
          3. How to apportion household costs
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          The most common HMRC-accepted method for childminders is <strong>hours of business use</strong>. Say you mind children 50 hours a week. There are 168 hours in a week, so your business fraction is roughly 50 ÷ 168 ≈ 30%. Apply that to the shared bills — often refined by the number of rooms the children actually use.
        </p>
        <div className="rounded-2xl border border-gray-200 overflow-hidden mb-6 text-sm">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-600">
                <th className="py-2.5 px-4 font-semibold">Annual bill</th>
                <th className="py-2.5 px-4 font-semibold">Business share (30%)</th>
                <th className="py-2.5 px-4 font-semibold">You can claim</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-800">
              <tr><td className="py-2.5 px-4">Electricity £900</td><td className="py-2.5 px-4">30%</td><td className="py-2.5 px-4">£270</td></tr>
              <tr><td className="py-2.5 px-4">Gas £700</td><td className="py-2.5 px-4">30%</td><td className="py-2.5 px-4">£210</td></tr>
              <tr><td className="py-2.5 px-4">Broadband £360</td><td className="py-2.5 px-4">30%</td><td className="py-2.5 px-4">£108</td></tr>
            </tbody>
          </table>
        </div>
        <p className="text-gray-600 text-sm leading-relaxed mb-6">
          The alternative is <strong>HMRC simplified expenses</strong>: a flat monthly amount based on the hours you work from home (£10, £18 or £26 a month for 25–50, 51–100, or 101+ hours). It is less paperwork but usually claims less than the hours-of-use method for a busy childminder. Whichever you choose, use it consistently and keep the workings.
        </p>

        <aside className="mb-10 rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
          <p className="text-amber-900 text-sm leading-relaxed">
            <strong>Note for anyone within Making Tax Digital:</strong> HMRC confirmed in March 2026 that childminders inside MTD must use the standard approach to expenses, not the old PACEY flat-rate concession. See our{' '}
            <Link href="/guides/mtd" className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800">MTD guide</Link> for who is affected and when.
          </p>
        </aside>

        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-amber-400 p-6 sm:p-8 text-white shadow-xl shadow-emerald-200/40 my-10">
          <h3 className="text-xl sm:text-2xl font-extrabold mb-2">Never lose an expense again</h3>
          <p className="text-white/85 mb-5 leading-relaxed">
            Snap a photo of any receipt and Dottie pulls out the amount, date and category, then files it under the right HMRC heading — ready for your tax return. 7 days free, no credit card.
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
        <h2 id="sources" className="scroll-mt-16 text-2xl font-bold text-gray-900 mt-12 mb-3">Sources &amp; further reading</h2>
        <ul className="space-y-2 text-sm text-gray-600 mb-12">
          <li><a className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800" href="https://www.gov.uk/hmrc-internal-manuals/business-income-manual/bim52751" rel="nofollow noopener" target="_blank">BIM52751 — HMRC manual: childminders&apos; expenses</a></li>
          <li><a className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800" href="https://www.gov.uk/expenses-if-youre-self-employed" rel="nofollow noopener" target="_blank">Expenses if you&apos;re self-employed — GOV.UK</a></li>
          <li><a className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800" href="https://www.gov.uk/simpler-income-tax-simplified-expenses" rel="nofollow noopener" target="_blank">Simplified expenses for the self-employed — GOV.UK</a></li>
        </ul>

        <p className="text-xs text-gray-400 leading-relaxed border-t border-gray-100 pt-6">
          This guide is general information, not tax advice. Rules change and individual circumstances differ — check GOV.UK or an accountant before filing.
        </p>
      </article>
    </div>
  )
}
