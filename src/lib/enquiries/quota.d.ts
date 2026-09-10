export const ENQUIRIES_QUOTA: {
  includedDraftsPerMonth: number
  overageGbpPerDraft: number
  maxOverageDraftsPerMonth: number
  burstPerHour: number
  burstWindowMs: number
  burstPerDay: number
  dayWindowMs: number
  parentMessageMaxChars: number
  grokInputUsdPerMTok: number
  grokOutputUsdPerMTok: number
}

export function monthlyHardCap(q?: typeof ENQUIRIES_QUOTA): number
export function remainingIncluded(usedIncludingThis: number, included?: number): number
export function extraDrafts(usedIncludingThis: number, included?: number): number
export function overageAmountGbp(usedIncludingThis: number, included?: number, rate?: number): number
export function enquiriesQuotaCopy(q?: typeof ENQUIRIES_QUOTA): string

export type EnquiryDraftDecision = {
  callModel: boolean
  status: number
  reason: 'unsubscribed' | 'hour_burst' | 'day_burst' | 'monthly_cap' | 'overage' | 'included'
  error: string | null
  remainingIncluded: number
  extraDrafts: number
  overageGbp: number
}

export function decideEnquiryDraft(input: {
  subscribed: boolean
  usedIncludingThis: number
  hourOk?: boolean
  dayOk?: boolean
}): EnquiryDraftDecision

export function generateEnquiryDraftIfAllowed<T>(
  decision: EnquiryDraftDecision,
  generate: () => Promise<T> | T,
): Promise<{ ok: boolean; decision: EnquiryDraftDecision; result: T | null }>

export function runEnquiryDraft<T>(opts: {
  subscribed: boolean
  usedIncludingThis: number
  hourOk?: boolean
  dayOk?: boolean
  generate: () => Promise<T> | T
}): Promise<{ ok: boolean; decision: EnquiryDraftDecision; result: T | null }>
