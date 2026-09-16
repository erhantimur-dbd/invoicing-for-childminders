# Enquiries AI — cost per email, included allowance, overage

Engineering write-up for Dottie Enquiries drafts (`POST /api/enquiries/draft` → `draftEnquiryReply`). Not a finance audit. Figures below are the source of `ENQUIRIES_QUOTA` in `src/lib/enquiries/quota.mjs`.

## List prices (Grok 4.6)

Source: [xAI models](https://docs.x.ai/developers/models) and [xAI pricing](https://x.ai/docs/developers/pricing.md), checked 21–28 August 2026.

| Token class | USD / 1M tokens (prompt under 200k) |
|---|---|
| Input | $2.00 |
| Cached input | $0.50 |
| Output (includes reasoning / completion) | $6.00 |

Prompts at or above 200k input tokens are billed at $4 / $12. A Dottie draft is thousands of tokens, not hundreds of thousands, so the **under-200k** row applies.

GBP conversion used in this note: **£0.76 per $1** (rounded mid-market for this write-up, August 2026).

Primary model in code: `GROK_MODEL = grok-4.6` (`src/lib/grok/client.ts`). Failover: Claude (`src/lib/ai/claude.ts`), then a local template that does not call a model.

## Representative token sizes

Measured against the live system + user prompts in `src/lib/enquiries/grok.ts` (setting notes, spaces, visiting hours, knowledge-base answers, parent message).

| Profile | Input tokens | Output + reasoning tokens | What it represents |
|---|---|---|---|
| Typical | 3,000 | 1,800 | Short knowledge base, one parent email, default Grok reasoning |
| Heavy | 10,000 | 2,500 | Long “Your answers”, several vacancies, a long parent thread |

Claude `max_tokens` on this path is 1,200, so a Claude failover cannot emit an 8k letter.

## COGS per draft

Formula: `(in / 1e6) × $2 + (out / 1e6) × $6`.

| Profile | USD | GBP at 0.76 |
|---|---|---|
| Typical | $0.0168 | **£0.013** |
| Heavy | $0.0350 | **£0.027** |

**Working band: £0.01–£0.03 per AI draft** on Grok 4.6. Claude failover is higher (Sonnet-class list prices) — treat £0.03 as the planning ceiling, not the mean.

Eighty typical drafts ≈ **£1.04** COGS. Against the Enquiries monthly price of **£19**, that is about 5% of list revenue before support and Stripe fees. A heavy month of 80 still ≈ £2.16 COGS.

## Childminder volume (why 80, not 8 or 800)

England EYFS: a childminder working alone may care for **at most six children under eight** (typically 6:3:1). Dottie is sold to that setting, not to a nursery.

Genuine parent-enquiry load:

- Vacancies are usually **one or two places**, often sessional (term start, a child leaving).
- Parents email several childminders; the childminder still only has a handful of live threads at once.
- A filled place is 1–3 letters (first reply, visit, follow-up), not a call-centre queue.
- A busy September might be **low tens of threads**, not hundreds.

So a busy genuine month is on the order of **20–40 AI drafts** (threads × a couple of regenerations). **80 included drafts/month** sits at about 2× a busy term-start month so a popular setting is not nickeled on day two, and far below an automated loop.

The previous limiter was **30 drafts / 60 minutes / user** and **fail-open** if the RPC was missing (`src/lib/rate-limit.ts`, `src/app/api/enquiries/draft/route.ts`). At 30/hour a compromised session could run **720 model calls/day**. That is the abuse tail this cap exists to stop — not the childminder with three emails on a Monday.

## Included allowance and overage

| Constant | Value | Why |
|---|---|---|
| Included AI drafts / calendar month (UTC) | **80** | Above genuine volume; ~£1–£2 COGS vs £19 |
| Overage | **£0.15 per extra draft** | ~11× typical COGS, ~5.5× heavy; readable as 15p; covers Claude failover + Stripe fees + support |
| Monthly hard cap (included + overage) | **160** (80 extra) | Paying subscribers keep working after 80; a stolen session cannot print unbounded Grok bills if metered Stripe is not live |
| Hour burst | **15 / 60 minutes** | Tighter than the old 30/hour; still enough to regenerate a letter |
| Day burst | **40 / UTC day** | Term-start morning, not a scraper |

Overage amount = `extraDrafts × £0.15`, where `extraDrafts = max(0, usedThisMonth − 80)`.

Paying subscribers **are not 429’d at draft 81**. Draft 81–160 proceed and are recorded as overage. Draft 161 and burst overruns are a hard stop (429). Unpaid accounts never reach the model (existing 403).

**Stripe:** there is no live metered Price ID for 15p drafts (Enquiries annual/monthly SKUs have historically been missing on Vercel). The product **records** extra drafts and **displays** the rate. Charging the card waits on a Stripe Price. Until then the 160/month hard cap and fail-closed bursts are what protect COGS.

## What is not billed

- Local template fallback (no model).
- Pack / outcome letters (`buildParentLetter`) — templates, not Grok.
- Invoice-agent and receipt scan (out of scope for this goal).
- A draft is only created when the childminder asks. **Nothing is sent to a parent until they approve** (copy/mailto or explicit outcome send). Quota is not burned by auto-sending.

## Copy (must match `ENQUIRIES_QUOTA`)

“80 AI email drafts a month included. Extra drafts are £0.15 each. You approve before anything is sent to a parent.”
