/**
 * Shared FAQ/support plan copy. Navy marketing pages import this module;
 * keep numbers sourced from marketing.mjs so they cannot drift.
 */

import { formatGbp, marketing, pricingAmounts } from './marketing.mjs'

export const noSelfServeTrial =
  "We don't run a self-serve free trial as standard. Book a demo and we'll walk you through Dottie. Qualifying childminders may be offered a trial after a chat."

export function howMuchDoesDottieCost() {
  const enquiries = formatGbp(pricingAmounts.enquiries.monthly)
  const enquiriesYear = formatGbp(pricingAmounts.enquiries.annual)
  const both = formatGbp(pricingAmounts.bothFrom.monthly)
  const bothYear = formatGbp(pricingAmounts.bothFrom.annual)
  const invoicing = formatGbp(pricingAmounts.invoicingFrom.monthly)
  const save = `${pricingAmounts.discountPct}%`
  return (
    `${marketing.pricingPlans[0].name} is ${enquiries}/month or ${enquiriesYear}/year (save ${save}). ` +
    `${marketing.pricingPlans[1].name} is from ${both}/month or ${bothYear}/year — Enquiries plus invoicing from ${invoicing}/month, same login. ` +
    'Cancel any time. No self-serve free trial; book a demo first.'
  )
}
