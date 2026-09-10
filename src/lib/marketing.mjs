/**
 * Shipped marketing tokens and copy for godottie.cloud public pages.
 * Imported by the homepage and by node:test — do not duplicate in tests.
 */

import { enquiriesQuotaCopy } from './enquiries/quota.mjs'

/** Annual is billed yearly at this off the monthly run-rate. Vacancies are sessional — do not undercut with a cheap month. */
export const ANNUAL_DISCOUNT = 0.3

export function yearlyFromMonthly(monthly) {
  return Math.round(monthly * 12 * (1 - ANNUAL_DISCOUNT))
}

export function annualMonthlyEquivalent(yearly) {
  return Math.round((yearly / 12) * 100) / 100
}

export function formatGbp(amount) {
  if (Number.isInteger(amount)) return `£${amount}`
  return `£${amount.toFixed(2)}`
}

const ENQUIRIES_MONTHLY = 19
const INVOICING_FROM_MONTHLY = 9.99
const BOTH_FROM_MONTHLY = 28.99
const PROFESSIONAL_MONTHLY = 19.99

const enquiriesAnnual = yearlyFromMonthly(ENQUIRIES_MONTHLY)
const invoicingFromAnnual = yearlyFromMonthly(INVOICING_FROM_MONTHLY)
const bothFromAnnual = yearlyFromMonthly(BOTH_FROM_MONTHLY)
const professionalAnnual = yearlyFromMonthly(PROFESSIONAL_MONTHLY)

export const pricingAmounts = {
  discountPct: Math.round(ANNUAL_DISCOUNT * 100),
  enquiries: {
    monthly: ENQUIRIES_MONTHLY,
    annual: enquiriesAnnual,
    annualMonthly: annualMonthlyEquivalent(enquiriesAnnual),
  },
  invoicingFrom: {
    monthly: INVOICING_FROM_MONTHLY,
    annual: invoicingFromAnnual,
    annualMonthly: annualMonthlyEquivalent(invoicingFromAnnual),
  },
  bothFrom: {
    monthly: BOTH_FROM_MONTHLY,
    annual: bothFromAnnual,
    annualMonthly: annualMonthlyEquivalent(bothFromAnnual),
  },
  professional: {
    monthly: PROFESSIONAL_MONTHLY,
    annual: professionalAnnual,
    annualMonthly: annualMonthlyEquivalent(professionalAnnual),
  },
}

export const marketing = {
  canvas: '#f6f7f9',
  canvasNearWhite: '#ffffff',
  ink: '#0b1220',
  muted: '#5b6573',
  accent: '#123a4a',
  hero: '#0b1220',
  heroMuted: 'rgba(246,247,249,0.64)',
  heroHairline: 'rgba(246,247,249,0.12)',
  hairline: 'rgba(11,18,32,0.10)',
  ctaRadiusPx: 4,
  fontFamily: 'var(--font-nunito), ui-sans-serif, system-ui, sans-serif',
  headingFamily: 'var(--font-nunito), ui-sans-serif, system-ui, sans-serif',
  pageClass: 'marketing-page',
  products: ['Dottie', 'Invoicing'],
  jobs: ['email', 'knowledge base', 'reply', 'visit', 'onboard'],
  ctas: {
    signup: { label: 'Sign up', href: '/signup' },
    demo: { label: 'Book a demo', href: '/demo' },
  },
  brand: 'Dottie',
  kicker: 'For registered UK childminders',
  tagline: "Dottie dots the i and crosses the T's",
  headline: 'The next parent email should fill a place — not fill your evening.',
  businessEnd: '',
  subhead:
    'Dottie matches days and hours to a space you have listed, then drafts the reply in your voice. You send it. A visit is offered in your hours. Add invoicing if you want Dottie to handle this once the child is onboarded.',
  floorLine: 'The business end, handled.',
  flow: [
    {
      id: 'email',
      title: 'Email arrives',
      body: 'A parent email arrives in Gmail — including contact-form messages from your own website. Dottie does not host the form.',
      ms: 2200,
    },
    {
      id: 'knowledge',
      title: 'Matched to a space',
      body: 'Dottie reads Your answers: the days you have, visiting hours, and how you work. If they mention funded hours, that is so you know you are set up for it — it is a payment method, not a hurdle.',
      ms: 2600,
    },
    {
      id: 'reply',
      title: 'You send the draft',
      body: 'A reply is prepared in your voice. You read it and send it when you choose.',
      ms: 3200,
    },
    {
      id: 'visit',
      title: 'Visit in your hours',
      body: 'A slot is offered only inside the hours you set. You confirm the time. Works with Gmail.',
      ms: 2400,
    },
    {
      id: 'onboard',
      title: 'Pack ready',
      body: 'Your own sign-up forms and policies — a download link in the starter email, hosted by Dottie.',
      ms: 2400,
    },
  ],
  capabilities: [
    {
      title: 'Email',
      body: 'The enquiry gets a reply in your voice — from the spaces you listed.',
    },
    {
      title: 'Visits',
      body: 'A visit is offered only in the hours you set. Works with Gmail.',
    },
    {
      title: 'Onboarding',
      body: 'Your forms and policies, as a download link in the starter email.',
    },
    {
      title: 'Invoicing',
      body: 'Once they are onboarded, add invoicing if you want Dottie to raise the invoices.',
    },
  ],
  windowTitle: 'Dottie — live enquiry',
  worksWith: 'Works with Gmail',
  heroLoop: [
    {
      id: 'reply',
      label: '01',
      line: 'Instant draft.',
      note: 'In Gmail. Four seconds.',
      ms: 3200,
    },
    {
      id: 'match',
      label: '02',
      line: 'Vacancy matches.',
      ms: 3000,
    },
    {
      id: 'book',
      label: '03',
      line: 'Visit offered.',
      note: 'Works with Gmail.',
      ms: 3800,
    },
  ],
  trust: [
    { title: 'Place offered', body: 'From the space you listed.' },
    { title: 'You send', body: 'Nothing goes to a parent until you say so.' },
    { title: 'Your voice', body: 'Drafted from Your answers, not a generic script.' },
    { title: 'UK / EU data', body: 'Kept in the UK/EU. You stay with the children.' },
  ],
  forWho: {
    title: 'Built for the childminder, not the agency.',
    yesLabel: 'For',
    yes: 'Registered UK childminders filling a place while they stay with the children.',
    noLabel: 'Not for',
    no: 'Not a parent portal, not a nursery suite, not a letter sent without you.',
  },
  pricingIcpDottie: 'For the childminder who wants the next enquiry to fill a place.',
  pricingIcpInvoicing: 'Once a child is onboarded, add invoicing if you want Dottie to handle it.',
  pricingIcpBoth: 'Enquiries through to invoices, when you want both.',
  pricingBoth: 'Enquiries, visits, your forms — and invoicing once they are onboarded.',
  billingDefault: 'annual',
  annualSaveLabel: `Save ${pricingAmounts.discountPct}%`,
  enquiriesQuotaLine: enquiriesQuotaCopy(),
  pricingPlans: [
    {
      id: 'enquiries',
      name: 'Enquiries',
      monthlyAmount: pricingAmounts.enquiries.monthly,
      price: formatGbp(pricingAmounts.enquiries.monthly),
      from: false,
      period: '/month',
      note: `or ${formatGbp(pricingAmounts.enquiries.annual)}/year · save ${pricingAmounts.discountPct}%`,
      monthlyNote: `or ${formatGbp(pricingAmounts.enquiries.annual)}/year · save ${pricingAmounts.discountPct}%`,
      annualNote: `${formatGbp(pricingAmounts.enquiries.annualMonthly)}/month equivalent · save ${pricingAmounts.discountPct}%`,
      icp: 'Parent emails, visits, and your own starter pack — while you stay with the children.',
      body: 'Your answers, vacancy matching, Gmail visits, forms parents can download.',
      href: '/signup',
      cta: 'Sign up',
      featured: false,
    },
    {
      id: 'both',
      name: 'Enquiries + invoicing',
      monthlyAmount: pricingAmounts.bothFrom.monthly,
      price: formatGbp(pricingAmounts.bothFrom.monthly),
      from: true,
      period: '/month',
      note: `Enquiries ${formatGbp(pricingAmounts.enquiries.monthly)} plus invoicing from ${formatGbp(pricingAmounts.invoicingFrom.monthly)}. Same login.`,
      monthlyNote: `Enquiries ${formatGbp(pricingAmounts.enquiries.monthly)} plus invoicing from ${formatGbp(pricingAmounts.invoicingFrom.monthly)}. Same login.`,
      annualNote: `Enquiries plus invoicing from ${formatGbp(pricingAmounts.invoicingFrom.annual)}/year. Same login.`,
      icp: 'Enquiries, then invoicing once a child is onboarded — same login.',
      body: 'Everything in Enquiries. Add invoicing if you want Dottie to handle this once they start.',
      href: '/signup',
      cta: 'Sign up',
      featured: true,
    },
  ],
  pricingCompare: {
    columns: [
      { id: 'enquiries', label: 'Enquiries' },
      { id: 'both', label: 'Enquiries + invoicing' },
    ],
    rows: [
      { feature: 'Parent emails and replies', enquiries: true, both: true },
      { feature: 'Vacancy matching', enquiries: true, both: true },
      { feature: 'Visit offered in your Gmail hours', enquiries: true, both: true },
      { feature: 'Your forms, via a download link', enquiries: true, both: true },
      { feature: 'Lead pipeline', enquiries: true, both: true },
      { feature: 'Invoices generated for approval', enquiries: false, both: true },
      { feature: 'Funded and private hours', enquiries: false, both: true },
      { feature: 'Expenses and tax reports', enquiries: false, both: true },
      { feature: 'You approve before anything is sent', enquiries: true, both: true },
    ],
  },
  scene: {
    fromLabel: 'From Emma',
    fromMeta: 'Contact form · Gmail',
    fromBody:
      "Hi, I'm looking for childcare for my daughter who is 6 months old. We're looking for 3 days, Mon–Wed, 8am–6pm. This will be 30 hours of government-funded childcare.",
    match: [
      { label: 'Asked', value: 'Mon–Wed, 8am–6pm' },
      { label: 'Vacancy', value: 'Mon–Wed, one place' },
      { label: 'Result', value: 'Match' },
    ],
    replyLabel: 'Dottie',
    replyBody:
      'Thank you for your email, Emma.\n\nI am pleased to say we have a place on Monday to Wednesday, 8am to 6pm, for a six-month-old, using 30 hours of government-funded childcare. Would Wednesday at 6pm suit you both for a visit?\n\nI look forward to meeting you both.\n\nKind regards\nMary',
    replyExcerpt:
      'Thank you for your email, Emma.\n\nWe have a place Monday to Wednesday, 8am to 6pm. Would Wednesday at 6pm suit you both for a visit?\n\nKind regards\nMary',
    repliedMark: 'Draft ready · 4s',
    confirmLabel: 'Emma',
    confirmBody: 'Thank you — Wednesday at 6pm is perfect. We look forward to seeing you.',
    visitChip: 'Wednesday 6:00pm — offered in your hours',
    calendarDays: [
      { label: 'Mon', on: false },
      { label: 'Tue', on: false },
      { label: 'Wed', on: true, time: '6:00' },
      { label: 'Thu', on: false },
      { label: 'Fri', on: false },
    ],
    places: 3,
    resultLine: 'All vacancies filled. Admin sorted.',
    pack: ['Your contract', 'Your child form', 'Your policies'],
  },
  howItWorksTitle: 'From the email to a visit',
  invoicing: {
    name: 'Invoicing',
    line: 'Once they are onboarded, invoices can follow.',
    body: 'Add invoicing if you want Dottie to handle this once the child is onboarded. Funded hours sit on the invoice as a payment method — separate from private hours and food. Nothing is sent until you approve.',
  },
  pricingKicker: 'Pricing',
  pricingLead: 'Start with enquiries. Add invoicing if you want Dottie to handle this once the child is onboarded.',
  pricingAssistant: 'Parent emails, Your answers, visits, your forms.',
  pricingInvoicing: 'Invoicing once they are onboarded. Same login.',
  closing: 'You look after the children. AI looks after the business.',
  demoHeadline: 'See Dottie draft a live enquiry.',
  demoSubhead:
    'We will walk through an email, a listed space, a visit in your hours, and your own forms as a download link.',
}

export const marketingCtaClass = {
  primary:
    'inline-flex items-center justify-center px-6 py-3 text-[15px] font-medium text-white bg-[#123a4a] hover:bg-[#0c2c38] transition-colors',
  secondary:
    'inline-flex items-center justify-center px-6 py-3 text-[15px] font-medium text-[#123a4a] bg-transparent border border-[#123a4a]/30 hover:border-[#123a4a]/70 transition-colors',
  primaryOnDark:
    'inline-flex items-center justify-center px-6 py-3 text-[15px] font-medium text-[#0b1220] bg-white hover:bg-[#eef0f3] transition-colors',
  secondaryOnDark:
    'inline-flex items-center justify-center px-6 py-3 text-[15px] font-medium text-white bg-transparent border border-white/25 hover:border-white/70 transition-colors',
}

export function ctaRadiusStyle() {
  return { borderRadius: `${marketing.ctaRadiusPx}px` }
}
