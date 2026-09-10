/**
 * Deterministic parent-vs-noise filters for Soft Launch.
 * Labels first (enquiry inbox / "new parent"); receipts and newsletters out.
 * Classify in memory. Non-matches are discarded — never saved.
 * Grok only drafts after a message is already persisted as an enquiry.
 */

export const DEFAULT_ENQUIRY_LABELS = [
  'enquiries',
  'enquiry',
  'enquiry inbox',
  'new parent',
  'new parents',
] as const

const SYSTEM_SKIP = new Set(['spam', 'trash', 'drafts', 'draft', 'sent', 'chat', 'yellow_star'])

const NOISE_CATEGORIES = new Set([
  'category_promotions',
  'category_social',
  'category_updates',
  'category_forums',
])

const NOISE_FROM_RE =
  /(^|[-+._])(noreply|no-reply|donotreply|do-not-reply|notifications?|newsletter|billing|receipts?|invoices?|mailer-daemon|bounce|support)@/i

const NOISE_SUBJECT_RE =
  /\b(receipt|invoice|statement|newsletter|unsubscribe|order confirmation|payment (received|confirmed)|your order|shipping update|delivery update|password reset|verify your email|reset your password|security alert|sale ends|% off)\b/i

const ENQUIRY_SIGNAL_RE =
  /\b(childmind(?:er|ing)?|child[\s-]?care|looking for (?:a )?(?:place|space)|funded hours|15 hours|30 hours|ofsted|nursery place|start(?:ing)? (?:in|from|sept|jan|april|this)|days a week|full[-\s]?time|part[-\s]?time|do you have (?:a )?(?:place|space)|any (?:places|spaces)|childminding place)\b/i

const TRANSACTIONAL_HOST_RE =
  /(amazon\.|paypal\.|stripe\.com|mailchimp\.|sendgrid\.|mailgun\.|postmarkapp\.|shopify\.|ebay\.|etsy\.|gov\.uk|hmrc\.|companieshouse\.|facebookmail\.|linkedin\.|twitter\.|x\.com|google\.com|accounts\.google|apple\.com|microsoft\.com|noreply\.)/i

export type MailCandidate = {
  from: string
  subject: string
  body: string
  labelNames: string[]
  headers?: Record<string, string>
  connectedEmail?: string | null
  extraLabels?: string[]
}

export type MailDecision =
  | { include: true; reason: 'label' | 'inbox_signal' }
  | { include: false; reason: 'noise' | 'self' | 'system' | 'no_signal' }

export function normaliseLabel(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ')
}

export function watchedLabels(custom?: string | null): string[] {
  const extra = normaliseLabel(custom)
  const set = new Set<string>(DEFAULT_ENQUIRY_LABELS)
  if (extra) set.add(extra)
  return [...set]
}

export function hasEnquiryLabel(labelNames: string[], custom?: string | null): boolean {
  const watched = new Set(watchedLabels(custom))
  return labelNames.some((name) => watched.has(normaliseLabel(name)))
}

function header(headers: Record<string, string> | undefined, name: string): string {
  if (!headers) return ''
  return headers[name.toLowerCase()] || ''
}

function emailAddress(from: string): string {
  const angle = from.match(/<([^>]+)>/)
  return (angle ? angle[1] : from).trim().toLowerCase()
}

function displayLooksTransactional(from: string): boolean {
  const addr = emailAddress(from)
  if (NOISE_FROM_RE.test(addr)) return true
  const host = addr.split('@')[1] || ''
  return TRANSACTIONAL_HOST_RE.test(host)
}

function isBulk(headers: Record<string, string> | undefined): boolean {
  if (header(headers, 'list-unsubscribe')) return true
  const precedence = header(headers, 'precedence').toLowerCase()
  if (precedence === 'bulk' || precedence === 'junk' || precedence === 'list') return true
  const auto = header(headers, 'auto-submitted').toLowerCase()
  if (auto && auto !== 'no') return true
  return false
}

function labelsIndicateSystemSkip(labelNames: string[]): boolean {
  return labelNames.some((name) => SYSTEM_SKIP.has(normaliseLabel(name)))
}

function labelsIndicateNoiseCategory(labelNames: string[]): boolean {
  return labelNames.some((name) => NOISE_CATEGORIES.has(normaliseLabel(name)))
}

export function classifyEnquiryMail(mail: MailCandidate): MailDecision {
  const labels = mail.labelNames.map(normaliseLabel)
  const custom = mail.extraLabels?.[0] ?? null
  const fromAddr = emailAddress(mail.from)
  const connected = (mail.connectedEmail || '').trim().toLowerCase()

  if (connected && fromAddr === connected) {
    return { include: false, reason: 'self' }
  }
  if (labelsIndicateSystemSkip(labels)) {
    return { include: false, reason: 'system' }
  }

  const labelled = hasEnquiryLabel(mail.labelNames, custom)
  const noisy =
    isBulk(mail.headers) ||
    displayLooksTransactional(mail.from) ||
    NOISE_SUBJECT_RE.test(mail.subject || '')

  if (labelled) {
    if (noisy) return { include: false, reason: 'noise' }
    return { include: true, reason: 'label' }
  }

  if (labelsIndicateNoiseCategory(labels) || noisy) {
    return { include: false, reason: 'noise' }
  }

  const haystack = `${mail.subject}\n${mail.body}`
  if (ENQUIRY_SIGNAL_RE.test(haystack)) {
    return { include: true, reason: 'inbox_signal' }
  }

  return { include: false, reason: 'no_signal' }
}

export function gmailSearchQuery(customLabel?: string | null): string {
  const labels = watchedLabels(customLabel)
    .map((name) => (name.includes(' ') ? `label:"${name}"` : `label:${name}`))
    .join(' OR ')

  const inboxSignals = [
    'childmind',
    'childminder',
    'childminding',
    'childcare',
    '"child care"',
    '"looking for a place"',
    '"looking for a space"',
    '"funded hours"',
    '"15 hours"',
    '"30 hours"',
    'ofsted',
  ].join(' OR ')

  return [
    `((${labels}) OR (in:inbox newer_than:21d (${inboxSignals})))`,
    '-in:spam',
    '-in:trash',
    '-in:sent',
    '-in:drafts',
    '-category:promotions',
    '-category:social',
  ].join(' ')
}
