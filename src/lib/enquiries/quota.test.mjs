import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import {
  ENQUIRIES_QUOTA,
  decideEnquiryDraft,
  extraDrafts,
  generateEnquiryDraftIfAllowed,
  monthlyHardCap,
  overageAmountGbp,
  remainingIncluded,
  runEnquiryDraft,
  enquiriesQuotaCopy,
} from './quota.mjs'
import { marketing } from '../marketing.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const docs = join(root, '..', 'docs')

test('remaining included, extra drafts, and overage use shipped rate constants', () => {
  const included = ENQUIRIES_QUOTA.includedDraftsPerMonth
  const rate = ENQUIRIES_QUOTA.overageGbpPerDraft

  assert.equal(remainingIncluded(1), included - 1)
  assert.equal(remainingIncluded(included), 0)
  assert.equal(remainingIncluded(included + 5), 0)

  assert.equal(extraDrafts(included), 0)
  assert.equal(extraDrafts(included + 1), 1)
  assert.equal(extraDrafts(included + 10), 10)

  assert.equal(overageAmountGbp(included), 0)
  assert.equal(overageAmountGbp(included + 1), 1 * rate)
  assert.equal(overageAmountGbp(included + 10), 10 * rate)
  assert.equal(overageAmountGbp(90), extraDrafts(90) * rate)
})

test('under limit, exactly at included, and overage still call the model', () => {
  const included = ENQUIRIES_QUOTA.includedDraftsPerMonth

  const under = decideEnquiryDraft({ subscribed: true, usedIncludingThis: 1, hourOk: true, dayOk: true })
  assert.equal(under.callModel, true)
  assert.equal(under.reason, 'included')
  assert.equal(under.status, 200)
  assert.equal(under.remainingIncluded, included - 1)
  assert.equal(under.overageGbp, 0)

  const at = decideEnquiryDraft({ subscribed: true, usedIncludingThis: included, hourOk: true, dayOk: true })
  assert.equal(at.callModel, true)
  assert.equal(at.reason, 'included')
  assert.equal(at.remainingIncluded, 0)
  assert.equal(at.extraDrafts, 0)
  assert.equal(at.overageGbp, extraDrafts(included) * ENQUIRIES_QUOTA.overageGbpPerDraft)

  const over = decideEnquiryDraft({ subscribed: true, usedIncludingThis: included + 1, hourOk: true, dayOk: true })
  assert.equal(over.callModel, true)
  assert.equal(over.reason, 'overage')
  assert.equal(over.overageGbp, extraDrafts(included + 1) * ENQUIRIES_QUOTA.overageGbpPerDraft)
})

test('monthly cap and bursts do not invoke the model', async () => {
  const cap = monthlyHardCap()
  let calls = 0
  const generate = async () => {
    calls += 1
    return { body: 'should not run' }
  }

  const blocked = await runEnquiryDraft({
    subscribed: true,
    usedIncludingThis: cap + 1,
    hourOk: true,
    dayOk: true,
    generate,
  })
  assert.equal(blocked.ok, false)
  assert.equal(blocked.decision.callModel, false)
  assert.equal(blocked.decision.reason, 'monthly_cap')
  assert.equal(blocked.decision.status, 429)
  assert.equal(blocked.result, null)
  assert.equal(calls, 0)

  const hour = await generateEnquiryDraftIfAllowed(
    decideEnquiryDraft({ subscribed: true, usedIncludingThis: 1, hourOk: false, dayOk: true }),
    generate,
  )
  assert.equal(hour.ok, false)
  assert.equal(hour.decision.reason, 'hour_burst')
  assert.equal(calls, 0)

  const unpaid = await runEnquiryDraft({
    subscribed: false,
    usedIncludingThis: 1,
    hourOk: true,
    dayOk: true,
    generate,
  })
  assert.equal(unpaid.ok, false)
  assert.equal(unpaid.decision.status, 403)
  assert.equal(calls, 0)

  const allowed = await runEnquiryDraft({
    subscribed: true,
    usedIncludingThis: 1,
    hourOk: true,
    dayOk: true,
    generate,
  })
  assert.equal(allowed.ok, true)
  assert.equal(allowed.result.body, 'should not run')
  assert.equal(calls, 1)
})

test('draft HTTP handler consults runEnquiryDraft before draftEnquiryReply', () => {
  const src = readFileSync(join(root, 'app/api/enquiries/draft/route.ts'), 'utf8')
  const post = src.slice(src.indexOf('export async function POST'))
  assert.match(post, /runEnquiryDraft/)
  assert.match(post, /failOpen: false/)
  assert.match(post, /burstPerHour/)
  assert.match(post, /burstPerDay/)
  assert.ok(post.indexOf('runEnquiryDraft') < post.indexOf('draftEnquiryReply'))
})

test('cost-per-email write-up exists with Grok 4.6 prices and the shipped quota', () => {
  const text = readFileSync(join(docs, 'enquiries-cost-per-email.md'), 'utf8')
  assert.match(text, /Grok 4\.6/)
  assert.match(text, /\$2/)
  assert.match(text, /\$6/)
  assert.match(text, /COGS/)
  assert.match(text, /cost table|List prices/i)
  assert.match(text, new RegExp(String(ENQUIRIES_QUOTA.includedDraftsPerMonth)))
  assert.match(text, /0\.15/)
  assert.match(text, /childminder/i)
})

test('EU AI Act, GDPR and security assessment maps obligations to product facts', () => {
  const text = readFileSync(join(docs, 'enquiries-compliance-security.md'), 'utf8')
  assert.match(text, /EU AI Act/)
  assert.match(text, /GDPR/)
  assert.match(text, /security/i)
  assert.match(text, /Article 50/)
  assert.match(text, /human/i)
  assert.match(text, /enquiry-draft/)
  assert.match(text, /fail-open|fail-closed/)
  assert.match(text, /xAI/)
  assert.match(text, /Anthropic/)
  assert.match(text, /SCC/)
})

test('childminder-facing copy uses the same quota constants', () => {
  const copy = enquiriesQuotaCopy()
  assert.equal(copy, marketing.enquiriesQuotaLine)
  assert.match(copy, new RegExp(String(ENQUIRIES_QUOTA.includedDraftsPerMonth)))
  assert.match(copy, /£0\.15/)
  assert.match(copy, /approve/)
  const paywall = readFileSync(join(root, 'components/enquiries/EnquiriesPaywall.tsx'), 'utf8')
  assert.match(paywall, /enquiriesQuotaCopy/)
  const pricing = readFileSync(join(root, 'components/marketing/Pricing.tsx'), 'utf8')
  assert.match(pricing, /enquiriesQuotaLine/)
  const subscribe = readFileSync(join(root, 'app/subscribe/page.tsx'), 'utf8')
  assert.match(subscribe, /enquiriesQuotaCopy/)
})
