import { formatGbp, pricingAmounts } from './marketing.mjs'
import { ENQUIRIES_QUOTA, enquiriesQuotaCopy } from './enquiries/quota.mjs'

export const SIGN_UP_CTA = 'Sign up'

export const noSelfServeTrial =
  "We don't offer a self-serve free trial. Sign up and choose a plan to get started, or book a demo. Qualifying childminders may be offered a trial after a chat."

export function enquiriesPriceSentence() {
  const p = pricingAmounts.enquiries
  return `Enquiries is ${formatGbp(p.monthly)}/month or ${formatGbp(p.annual)}/year (${pricingAmounts.discountPct}% off annual).`
}

export function invoicingFromSentence() {
  const p = pricingAmounts.invoicingFrom
  return `Invoicing is an add-on from ${formatGbp(p.monthly)}/month or ${formatGbp(p.annual)}/year (${pricingAmounts.discountPct}% off annual).`
}

export function bothFromSentence() {
  const p = pricingAmounts.bothFrom
  return `Enquiries + invoicing is from ${formatGbp(p.monthly)}/month or ${formatGbp(p.annual)}/year.`
}

export function howMuchDoesDottieCost() {
  return `${enquiriesPriceSentence()} ${invoicingFromSentence()} ${enquiriesQuotaCopy()} Nothing is sent to a parent until you approve.`
}

export function dashboardEnquiriesPitch() {
  const p = pricingAmounts.enquiries
  return `Parent emails, knowledge base, visits. ${formatGbp(p.monthly)}/month or ${formatGbp(p.annual)}/year — invoicing is an add-on.`
}

export function remainingDraftsCopy(used, included, annualGbp, rate = ENQUIRIES_QUOTA.overageGbpPerDraft) {
  const left = Math.max(0, included - used)
  const extra = Math.max(0, used - included)
  const overageGbp = extra * rate
  return `${left} of ${included} AI drafts left this month. Extra drafts are ${formatGbp(rate)} each${extra ? ` (overage so far ${formatGbp(overageGbp)})` : ''}. Annual is ${formatGbp(annualGbp)}/year.`
}
