import { formatGbp, pricingAmounts } from './marketing.mjs'
import { ENQUIRIES_QUOTA, enquiriesQuotaCopy } from './enquiries/quota.mjs'

export const SIGN_UP_CTA = 'Sign up'

export const freeTrialAnswer =
  "No. Book a demo and we'll show you how Go Dottie handles a parent enquiry, or sign up for Enquiries at £160 a year."

export function enquiriesPriceSentence() {
  const p = pricingAmounts.enquiries
  return `Enquiries is ${formatGbp(p.annual)} a year.`
}

export function invoicingFromSentence() {
  return 'Limited is £208 a year. Full is £280 a year. Book a demo to talk those through.'
}

export function bothFromSentence() {
  return 'Limited is £208 a year. Full is £280 a year.'
}

export function howMuchDoesDottieCost() {
  return `${enquiriesPriceSentence()} ${invoicingFromSentence()} ${enquiriesQuotaCopy()}`
}

export function dashboardEnquiriesPitch() {
  const p = pricingAmounts.enquiries
  return `Parent emails, knowledge base, visits. ${formatGbp(p.annual)} a year — invoicing is an add-on.`
}

export function remainingDraftsCopy(used, included, annualGbp, rate = ENQUIRIES_QUOTA.overageGbpPerDraft) {
  const left = Math.max(0, included - used)
  const extra = Math.max(0, used - included)
  const overageGbp = extra * rate
  return `${left} of ${included} AI drafts left this month. Extra drafts are ${formatGbp(rate)} each${extra ? ` (overage so far ${formatGbp(overageGbp)})` : ''}. Annual is ${formatGbp(annualGbp)}/year.`
}
