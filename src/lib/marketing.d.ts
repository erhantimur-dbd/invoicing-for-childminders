export const ANNUAL_DISCOUNT: number

export function yearlyFromMonthly(monthly: number): number
export function annualMonthlyEquivalent(yearly: number): number
export function formatGbp(amount: number): string

export const pricingAmounts: {
  discountPct: number
  enquiries: { monthly: number; annual: number; annualMonthly: number }
  invoicingFrom: { monthly: number; annual: number; annualMonthly: number }
  bothFrom: { monthly: number; annual: number; annualMonthly: number }
  professional: { monthly: number; annual: number; annualMonthly: number }
}

export const marketing: {
  canvas: string
  canvasNearWhite: string
  ink: string
  muted: string
  accent: string
  hero: string
  heroMuted: string
  heroHairline: string
  hairline: string
  ctaRadiusPx: number
  fontFamily: string
  headingFamily: string
  pageClass: string
  products: string[]
  jobs: string[]
  ctas: {
    signup: { label: string; href: string }
    demo: { label: string; href: string }
  }
  brand: string
  kicker: string
  tagline: string
  headline: string
  businessEnd: string
  subhead: string
  floorLine: string
  flow: { id: string; title: string; body: string; ms: number }[]
  capabilities: { title: string; body: string }[]
  windowTitle: string
  worksWith: string
  heroLoop: { id: string; label: string; line: string; note?: string; ms: number }[]
  trust: { title: string; body: string }[]
  forWho: { title: string; yesLabel: string; yes: string; noLabel: string; no: string }
  pricingIcpDottie: string
  pricingIcpInvoicing: string
  pricingIcpBoth: string
  pricingBoth: string
  billingDefault: 'monthly' | 'annual'
  annualSaveLabel: string
  enquiriesQuotaLine: string
  pricingPlans: {
    id: string
    name: string
    monthlyAmount: number
    price: string
    from: boolean
    period: string
    note: string
    monthlyNote: string
    annualNote: string
    icp: string
    body: string
    href: string
    cta: string
    featured: boolean
  }[]
  pricingCompare: {
    columns: { id: string; label: string }[]
    rows: { feature: string; enquiries: boolean; both: boolean }[]
  }
  scene: {
    fromLabel: string
    fromMeta: string
    fromBody: string
    match: { label: string; value: string }[]
    replyLabel: string
    replyBody: string
    replyExcerpt: string
    repliedMark: string
    confirmLabel: string
    confirmBody: string
    visitChip: string
    calendarDays: { label: string; on: boolean; time?: string }[]
    places: number
    resultLine: string
    pack: string[]
  }
  howItWorksTitle: string
  invoicing: { name: string; line: string; body: string }
  pricingKicker: string
  pricingLead: string
  pricingAssistant: string
  pricingInvoicing: string
  closing: string
  demoHeadline: string
  demoSubhead: string
}

export const marketingCtaClass: {
  primary: string
  secondary: string
  primaryOnDark: string
  secondaryOnDark: string
}

export function ctaRadiusStyle(): { borderRadius: string }
