/**
 * Enquiries AI draft allowance and overage.
 * Numbers are justified in docs/enquiries-cost-per-email.md — do not drift.
 */

export const ENQUIRIES_QUOTA = {
  includedDraftsPerMonth: 80,
  overageGbpPerDraft: 0.15,
  maxOverageDraftsPerMonth: 80,
  burstPerHour: 15,
  burstWindowMs: 60 * 60 * 1000,
  burstPerDay: 40,
  dayWindowMs: 24 * 60 * 60 * 1000,
  parentMessageMaxChars: 8000,
  grokInputUsdPerMTok: 2,
  grokOutputUsdPerMTok: 6,
}

export function monthlyHardCap(q = ENQUIRIES_QUOTA) {
  return q.includedDraftsPerMonth + q.maxOverageDraftsPerMonth
}

export function remainingIncluded(usedIncludingThis, included = ENQUIRIES_QUOTA.includedDraftsPerMonth) {
  return Math.max(0, included - usedIncludingThis)
}

export function extraDrafts(usedIncludingThis, included = ENQUIRIES_QUOTA.includedDraftsPerMonth) {
  return Math.max(0, usedIncludingThis - included)
}

export function overageAmountGbp(
  usedIncludingThis,
  included = ENQUIRIES_QUOTA.includedDraftsPerMonth,
  rate = ENQUIRIES_QUOTA.overageGbpPerDraft,
) {
  return extraDrafts(usedIncludingThis, included) * rate
}

export function enquiriesQuotaCopy(q = ENQUIRIES_QUOTA) {
  const extra = q.overageGbpPerDraft.toFixed(2)
  return `${q.includedDraftsPerMonth} AI email drafts a month included. Extra drafts are £${extra} each. You approve before anything is sent to a parent.`
}

/**
 * @param {{
 *   subscribed: boolean,
 *   usedIncludingThis: number,
 *   hourOk?: boolean,
 *   dayOk?: boolean,
 * }} input
 * usedIncludingThis is the atomic monthly counter AFTER this request's increment.
 */
export function decideEnquiryDraft(input) {
  const q = ENQUIRIES_QUOTA
  const used = Number(input.usedIncludingThis) || 0
  const remaining = remainingIncluded(used)
  const extra = extraDrafts(used)
  const billedExtra = Math.min(extra, q.maxOverageDraftsPerMonth)
  const overageGbp = billedExtra * q.overageGbpPerDraft

  if (!input.subscribed) {
    return {
      callModel: false,
      status: 403,
      reason: 'unsubscribed',
      error: 'Turn on Enquiries first.',
      remainingIncluded: 0,
      extraDrafts: 0,
      overageGbp: 0,
    }
  }

  if (input.hourOk === false) {
    return {
      callModel: false,
      status: 429,
      reason: 'hour_burst',
      error: 'That’s a lot of drafts in one hour. Try again shortly.',
      remainingIncluded: remaining,
      extraDrafts: extra,
      overageGbp,
    }
  }

  if (input.dayOk === false) {
    return {
      callModel: false,
      status: 429,
      reason: 'day_burst',
      error: 'Daily draft limit reached. Try again tomorrow.',
      remainingIncluded: remaining,
      extraDrafts: extra,
      overageGbp,
    }
  }

  if (used > monthlyHardCap(q)) {
    return {
      callModel: false,
      status: 429,
      reason: 'monthly_cap',
      error: 'You’ve used this month’s AI drafts, including overage. Extra drafts resume next month.',
      remainingIncluded: 0,
      extraDrafts: billedExtra,
      overageGbp,
    }
  }

  return {
    callModel: true,
    status: 200,
    reason: extra > 0 ? 'overage' : 'included',
    error: null,
    remainingIncluded: remaining,
    extraDrafts: extra,
    overageGbp,
  }
}

export async function generateEnquiryDraftIfAllowed(decision, generate) {
  if (!decision.callModel) {
    return { ok: false, decision, result: null }
  }
  const result = await generate()
  return { ok: true, decision, result }
}

export async function runEnquiryDraft(opts) {
  const decision = decideEnquiryDraft({
    subscribed: opts.subscribed,
    usedIncludingThis: opts.usedIncludingThis,
    hourOk: opts.hourOk,
    dayOk: opts.dayOk,
  })
  return generateEnquiryDraftIfAllowed(decision, opts.generate)
}
