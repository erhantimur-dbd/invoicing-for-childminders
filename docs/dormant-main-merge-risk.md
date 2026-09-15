# Dormant → main merge-risk map

**For:** Jim (CTO) → Noah (Soft Launch)  
**Date:** 10 Sep 2026  
**Goal:** Cut `feat/dormant-features-and-enhancements` → `main` ahead of 30 Nov go-live, without blocking Gmail Enquiries → Checkout.

This is a planning note only. No feature code.

| Ref | SHA / URL |
|---|---|
| `main` | `b6f6774` (no unique commits vs dormant) |
| dormant | `e5f1136` |
| PR #1 (fat merge, dormant → main) | https://github.com/erhantimur-dbd/invoicing-for-childminders/pull/1 |
| PR #2 (2-line hero copy → dormant) | https://github.com/erhantimur-dbd/invoicing-for-childminders/pull/2 |
| PR #3 (Gmail → dormant, **not** main) | https://github.com/erhantimur-dbd/invoicing-for-childminders/pull/3 |
| Gmail head | `cursor/gmail-enquiries-automation-4bc3` @ `9a4b0a8` |

**Git conflict risk vs current `main` is near-zero.** `main` has no commits that dormant lacks. Blast radius is operational: Stripe, encryption, trials, Enquiries schema, and a deleted webhook path.

---

## Recommendation (hand this to Noah)

**Do not land one fat merge of dormant + Gmail onto `main`.**

Land **four stacked cuts**. Encryption and dual-Stripe must exist before Gmail tokens or Enquiries checkout can be safe.

| Cut | What ships | Merge vehicle | Why this order |
|---|---|---|---|
| **1. Foundation** | Bank encryption, rate limits, Stripe event idempotency, RLS capture, child-limit trigger, reminders/overdue/mark-paid, invoice-token hardening | Split out of PR #1 (commits `b35820a` + `0ebf299`) | Gmail encrypts OAuth tokens with `BANK_DETAIL_ENCRYPTION_KEY`. Webhook idempotency needs `stripe_events`. Public invoices break if the key or `INVOICE_VERIFY_SECRET` is missing. |
| **2. Billing / dual Stripe** | Paid signup (no auto-trial), admin grant-trial, checkout `product=invoicing\|enquiries`, webhook writes **separate** invoicing vs Enquiries columns | Split out of PR #1 (`3b7b079` + Stripe parts of `e5f1136`) | Soft Launch checkout is this webhook. Main still hardcodes `trial_period_days: 7` and sets `status: 'active'` on `checkout.session.completed`. |
| **3. Enquiries product (no Gmail)** | Portal, setup wizard, Grok draft, paywall, nav, homepage hero, `20260827_dottie_enquiries.sql` | Rest of `e5f1136` | PR #3 assumes `enquiry_*` tables and `enquiries_status`. Manual “Add a parent” works without Gmail. |
| **4. Gmail Soft Launch** | OAuth, poll cron, Auto-send default, portal inbox | **PR #3, retarget to `main` after cuts 1–3** | Already isolated. Do not squash into PR #1. |

**Accountant CSV formats (Xero / QuickBooks / FreeAgent) already sit on dormant** (`a333f87`). They are bank-statement CSVs, not provider OAuth. **Ship them with cut 1 or leave them.** Do **not** implement FreeAgent / QuickBooks / Xero APIs.

Close or merge PR #2 into dormant before cut 3 (homepage conflict surface).

---

## 1. Diff size vs `main`

```
origin/main...dormant:  103 files, +5926 / −714
PR #3 on top of dormant: 40 files, +2680 / −136
```

`main` has **no** `supabase/migrations/` folder. Dormant introduces the first seven migration files. Production may already have some of this applied out-of-band (PR #1 says the checkpoint is live). **Kev must confirm before re-applying.**

### Five dormant commits (oldest first)

| Commit | Theme | Size | Gmail? |
|---|---|---|---|
| `b35820a` Checkpoint | Encryption, bank APIs, rate limits, Stripe idempotency, trial trigger, webhook path move | +1649 / −301, 36 files | No |
| `0ebf299` Activate dormant | Reminders cron, overdue cron, mark-paid, validation, RLS dump, children CSV import | +1399 / −122, 30 files | No |
| `3b7b079` Paid funnel | Drop auto-trial, Book a demo, admin grant-trial | +380 / −77, 27 files | No |
| `a333f87` Accountant CSVs | Xero / QBO / FreeAgent **file** exports | +303 / −56, 3 files | No |
| `e5f1136` Enquiries hero | Dual Stripe, Enquiries UI, Grok, homepage | +2303 / −266, 37 files | **No** (manual add-parent only) |

### What is Gmail-only (PR #3 — not on dormant)

New: `src/lib/enquiries/gmail/*`, `src/app/api/enquiries/gmail/*`, `src/app/api/enquiries/send/route.ts`, `src/app/api/cron/sync-enquiries/route.ts`, `src/components/enquiries/GmailConnect.tsx`, `SendModeToggle.tsx`, auto-reply / send-mode helpers, migrations `20260909`–`20260911`.

Touches shared Enquiries files Noah will keep editing: `ProspectDetail.tsx`, `enquiries/page.tsx`, `SetupWizard.tsx`, `api/enquiries/draft/route.ts`, `lib/enquiries/types.ts`, `vercel.json`.

### What is on dormant and is **not** Gmail

**Enquiries (manual, already a product):**

- Schema: `supabase/migrations/20260827_dottie_enquiries.sql` — `enquiries_*` columns on `subscriptions`; tables `enquiry_settings`, `enquiry_vacancies`, `enquiry_knowledge`, `enquiry_prospects`, `enquiry_messages` + RLS.
- UI: `src/app/(dashboard)/enquiries/**`, `src/components/enquiries/SetupWizard.tsx`, `EnquiriesPaywall.tsx`.
- Draft only: `src/app/api/enquiries/draft/route.ts`, `src/lib/enquiries/grok.ts` (OpenAI SDK → `https://api.x.ai/v1`, model `grok-4.6`).
- Empty-state copy already says Gmail “comes next”.

**Dual Stripe (invoicing + Enquiries on one customer):**

- `src/lib/stripe/prices.ts` — `STRIPE_ENQUIRIES_MONTHLY_PRICE_ID` / `STRIPE_ENQUIRIES_ANNUAL_PRICE_ID`.
- `src/app/api/stripe/create-checkout/route.ts` — `product: 'invoicing' | 'enquiries'`; reuses `stripe_customer_id`; **removes** main’s `trial_period_days: 7`.
- `src/app/api/stripe/webhook/route.ts` — routes by `metadata.product` / `enquiries_stripe_subscription_id`. **Does not** set invoicing `status` on `checkout.session.completed` (waits for `customer.subscription.*`).
- `src/proxy.ts` — `/enquiries` is auth-gated but paywall-exempt; invoicing prefixes still require invoicing entitlement.
- `src/app/subscribe/page.tsx` + `success/page.tsx` — dual CTAs; success polls `/api/me/subscription`.

**Bank encryption:**

- `src/lib/crypto.ts` — AES-256-GCM, prefix `enc:v1:`.
- Write path moved off the browser: `src/app/api/bank-accounts/route.ts`, `[id]/route.ts`, `primary/route.ts`.
- `src/components/BankAccountsSection.tsx` + onboarding no longer `supabase.from('bank_accounts').insert` plaintext.
- Decrypt on public invoice + send: `src/app/api/invoice/[id]/public/route.ts`, `src/app/api/invoices/send/route.ts`.
- Backfill: `scripts/encrypt-bank-fields.ts` (dry-run default; `--commit` writes).

**Billing / trials:**

- `20260508_handle_new_user_trial.sql` **creates** auto-trial + **backfills every user with no row**.
- `20260706_disable_auto_trial.sql` **drops** `on_auth_user_created_subscription` and `trg_handle_new_user_trial`.
- `src/app/api/admin/grant-trial/route.ts`, `src/components/GrantTrialForm.tsx`.
- `/demo` + CSP `frame-src` for `calendar.google.com` (`next.config.ts`).

**Invoicing “dormant features” now wired:**

- `src/lib/cron/reminders.ts`, `src/lib/cron/overdue.ts` hooked from `src/app/api/cron/generate-invoices/route.ts`.
- `src/app/api/invoices/mark-paid/route.ts`.
- Parent Pay now = stored `stripe_payment_link` (not the deleted invoice-payment webhook).

**Security / infra:**

- `20260506_rate_limits_and_stripe_events.sql` — `rate_limits`, `increment_rate_limit()`, `stripe_events`, plus `children.funding_scheme` and `invoice_line_items.category`.
- `20260507_child_limit_trigger.sql` — keys on `subscriptions.tier` (not `plan`).
- `20260705_rls_policies.sql` — snapshot of live RLS (2026-07-05), enables RLS on `invoice_access_attempts`.
- `src/lib/invoiceToken.ts` — **throws** if `INVOICE_VERIFY_SECRET` missing or < 32 chars (main uses `'fallback-dev-secret'`).

**Deletes vs main (ops, not git):**

- `src/app/api/webhooks/stripe/route.ts` — on main this marks **parent invoices** paid from `invoice_id` metadata. Dormant deletes it. `src/proxy.ts` already only allowlists `/api/stripe/webhook`.
- `src/components/ThemeProvider.tsx` — unused; safe.

**Out of scope (do not build):** FreeAgent / QuickBooks / Xero **connections**, Outlook, Gmail push/Pub/Sub, medical fields.

---

## 2. Ranked conflict / blast-radius risks

Git merge vs today’s `main` will not fight. These are the failure modes if the whole dormant (+ Gmail) lands at once.

### P0 — will take production down or corrupt money/PII

1. **`BANK_DETAIL_ENCRYPTION_KEY` missing or rotated after backfill**  
   Deploying bank APIs / public invoice decrypt without a 64-hex key throws. After `--commit`, ciphertext is unreadable without that exact key. Gmail refresh tokens use the **same** key (`src/lib/crypto.ts`; PR #3 `gmail/tokens.ts`).  
   *Rollback:* none after backfill. Treat the key as a break-glass secret.

2. **`INVOICE_VERIFY_SECRET` short or unset**  
   `src/lib/invoiceToken.ts` refuses to sign/verify. Parent DOB-gated invoice views 500.

3. **Trial migration order / 20260508 backfill**  
   Applying `20260508` on a DB that already uses production trigger `on_auth_user_created_subscription` is mostly additive, but the **INSERT backfill grants a 7-day trial to every `auth.users` row with no subscription**. Then `20260706` only drops triggers — it does **not** revoke those rows.  
   *Noah/Kev:* if 20260508 was never applied in prod, **do not apply it**. Apply `20260706` only (drops both trigger names).

4. **Stripe webhook dual-write**  
   Main: one subscription, `checkout.session.completed` → `status: 'active'`.  
   Dormant: two Stripe subscriptions, one customer; Enquiries fields must never overwrite invoicing `status`. A missed `customer.subscription.created/updated` leaves success-page polling hanging (`src/app/subscribe/success/page.tsx`, 30s timeout).  
   Deleted `/api/webhooks/stripe` 404s if the Stripe dashboard still posts invoice-payment events there.

5. **Enquiries checkout without price IDs**  
   `resolveEnquiriesPriceId` returns null → HTTP 503. Homepage and nav will still sell Enquiries.

### P1 — Soft Launch blocked or entitlement leaks

6. **Gmail stacked on dormant, not main**  
   If Noah keeps committing to PR #3 while someone rewrites `ProspectDetail.tsx` / `SetupWizard.tsx` / `draft/route.ts` on dormant or a split branch, rebase pain is the real “conflict”. Freeze those files on dormant once cut 3 starts, or retarget PR #3 early and do Gmail-only there.

7. **`agent_paused` / Auto-send**  
   Product lock (Erhan, 9 Sep): default `send_mode = 'auto'`. Pause must 403 draft **and** send. Cut 4 must not ship without that; cut 3 has pause UI but no send API yet.

8. **Proxy entitlement split** (`src/proxy.ts`)  
   Enquiries-only subscriber can open `/dashboard` but is bounced from `/children`, `/invoices`, `/expenses`, `/reports`. Wrong `enquiries_status` leaves paywall or a subscribe loop.

9. **Cron coupling**  
   Dormant hourly cron now always runs overdue + reminders. Gmail adds `*/15 * * * *` → `/api/cron/sync-enquiries`. Both need `CRON_SECRET`. Auto-send from cron without filters = outbound mail incident.

### P2 — noisy but containable

10. **RLS dump** (`20260705_rls_policies.sql`) is a point-in-time clone of prod. Re-applying is idempotent (`if not exists`) but will **not** delete policies added in Supabase after 5 Jul 2026.

11. **Homepage / SEO** (`src/app/page.tsx`, layouts) — large copy rewrite; PR #2 touches the same hero.

12. **`openai` dependency** — Grok only. Harmless if `XAI_API_KEY` unset (draft route errors at runtime).

13. **Child-limit trigger** — `tier` null → starter cap 5. Trial-only rows with null `tier` get capped. Confirm `grant-trial` sets `tier`.

14. **Vercel previews** — PR #1 and PR #3 last recorded deploy **Error**. Fix preview before calling a cut green.

---

## 3. Cut strategy

### Why not one fat merge (PR #1 + PR #3)

- Mixes irreversible encryption with a marketing homepage and an Auto-send mailer.
- One rollback story cannot cover “restore bank plaintext” and “stop Gmail sending”.
- PR #3’s shared-file edits become unreviewable inside a 143-file diff.
- FA/QBO-shaped CSV code would ride along and look like an accounting-provider launch. It is not.

### Why not Gmail-first onto `main`

PR #3 does not compile against `main`. It needs `enquiry_*` tables, `enquiriesActive()`, `encryptField`, and the dual-product webhook. Cherry-picking Gmail onto `main` is a rewrite, not a slice.

### Why not “Gmail slice then Stripe”

Checkout and `enquiries_status` are how Soft Launch gets paid. Gmail without billing is a free mailer on prod.

### Chosen path — stacked, encryption → Stripe → Enquiries → Gmail

```
main
  └─ Cut 1 Foundation          (encrypt + crons + RLS + CSVs optional)
       └─ Cut 2 Dual Stripe      (prices + webhook + trial-off)
            └─ Cut 3 Enquiries   (schema + portal + Grok, no Gmail)
                 └─ Cut 4 Gmail  (PR #3 retargeted to main)
```

**Noah works on cut 4 only** after cut 3 is on `main` (or a `main`-equivalent release branch). Until then PR #3 can stay based on dormant **if dormant is frozen**.

If Jim wants fewer PRs: merge cuts 1–3 as a **single** PR #1 after the checklist below, then land PR #3. That is acceptable **only if** Kev applies migrations/env in the order in §4 *before* the code deploy, and Gmail stays a second deploy.

---

## 4. Env / migration / rollback checklist (chosen path)

### 4.1 Confirm live state (Kev, before any cut)

- [ ] Which of `20260506` … `20260827` are **already** on prod? Git has no baseline.
- [ ] Stripe webhook endpoint in the Dashboard: `https://www.godottie.cloud/api/stripe/webhook` only? Anything still on `/api/webhooks/stripe`?
- [ ] Events enabled: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.trial_will_end`, `invoice.payment_failed`.
- [ ] `INVOICE_VERIFY_SECRET` length ≥ 32 in Vercel Production.
- [ ] Any plaintext `bank_accounts` / `children.bank_*` still in prod?

### 4.2 Cut 1 — Foundation

**Env (set before deploy):**

| Var | Notes |
|---|---|
| `BANK_DETAIL_ENCRYPTION_KEY` | `openssl rand -hex 32`. Vercel encrypted. Never rotate without a re-encrypt script (none exists). |
| `INVOICE_VERIFY_SECRET` | Already required; dormant now hard-fails. |
| `CRON_SECRET` | Already used; reminders/overdue now run every hourly tick. |

**Migrations (skip 20260508 unless Kev proves it is already applied and backfill is spent):**

1. `supabase/migrations/20260506_rate_limits_and_stripe_events.sql`
2. `supabase/migrations/20260507_child_limit_trigger.sql`
3. `supabase/migrations/20260705_reminders_due_index.sql`
4. `supabase/migrations/20260705_rls_policies.sql`

**Deploy order:**

1. Set env.
2. Deploy cut 1 code (reads accept plaintext **or** `enc:v1:`; writes encrypt).
3. `tsx scripts/encrypt-bank-fields.ts` (dry-run counts).
4. `tsx scripts/encrypt-bank-fields.ts --commit`.
5. Spot-check: add bank account UI shows masks; public invoice / send email show real sort code; PDF still prints.

**Rollback:** revert the Vercel deployment. Leave migrations; they are additive. **Do not** revert the key. Do not run a “decrypt backfill” unless Jim writes one. Stripe `stripe_events` fail-open if the table is missing.

### 4.3 Cut 2 — Dual Stripe + paid signup

**Env:**

| Var | Notes |
|---|---|
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Existing |
| `STRIPE_MONTHLY_PRICE_ID` / `STRIPE_ANNUAL_PRICE_ID` | Existing invoicing |
| `STRIPE_ENQUIRIES_MONTHLY_PRICE_ID` | Create Enquiries product/price in Stripe first |
| `STRIPE_ENQUIRIES_ANNUAL_PRICE_ID` | Same |
| Optional `STRIPE_STARTER_*` / `STRIPE_PROFESSIONAL_*` | `prices.ts` checks these before the generic monthly/annual IDs |

**Migrations:**

- `20260706_disable_auto_trial.sql` only (see P0 #3).
- Enquiries **columns** from `20260827_dottie_enquiries.sql` (the `alter table subscriptions add column enquiries_*` block) **can** land here so the webhook has somewhere to write. Tables can wait for cut 3.

**Deploy order:**

1. Create Stripe prices; put IDs in Vercel.
2. Confirm webhook URL + events.
3. Apply SQL.
4. Deploy.
5. Test: invoicing checkout still upserts `stripe_subscription_id` / `status` via `customer.subscription.*`; Enquiries checkout writes `enquiries_*` only; existing invoicing customer can add Enquiries without a second email/customer.
6. Test: new signup → `/subscribe`, **no** 7-day Stripe trial.
7. Test: admin grant-trial still opens the dashboard.

**Rollback:** revert deploy; webhook code on `main` will ignore unknown `enquiries_*` columns. **Do not** drop columns if any Enquiries checkout has fired. Re-adding `trial_period_days: 7` is a code revert, not SQL.

### 4.4 Cut 3 — Enquiries product (no Gmail)

**Env:** `XAI_API_KEY` (Grok drafts). `NEXT_PUBLIC_APP_URL` stable.

**Migrations:** remainder of `20260827_dottie_enquiries.sql` (tables + RLS).

**Deploy order:** apply SQL → deploy → buy Enquiries on a test account → setup wizard → Add a parent → Draft. Pause toggle must stop drafts.

**Rollback:** revert deploy; leave tables. Hide nav if needed. Do not drop `enquiry_*` if any prospect rows exist.

### 4.5 Cut 4 — Gmail (Noah)

**Env (do not commit):**

| Var | Notes |
|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | Web client; Gmail API on; sensitive-scope testers |
| `GOOGLE_OAUTH_REDIRECT_URI` | Default `${NEXT_PUBLIC_APP_URL}/api/enquiries/gmail/callback` |
| `BANK_DETAIL_ENCRYPTION_KEY` | **Same** as cut 1 |
| `XAI_API_KEY`, `CRON_SECRET` | Already required |

**Migrations (PR #3):**

1. `20260909_enquiry_gmail.sql` — `enquiry_gmail_accounts`, thread/message ids
2. `20260910_enquiry_send_mode.sql` — `send_mode` default `auto`
3. `20260911_enquiry_send_mode_default_auto.sql` — default flip only

**Vercel:** `vercel.json` cron `*/15 * * * *` → `/api/cron/sync-enquiries`.

**Google Cloud:** redirect `https://www.godottie.cloud/api/enquiries/gmail/callback`. Scopes: `gmail.readonly` + `gmail.send` only.

**Rollback:** disconnect Gmail in-app; disable the sync cron; set `send_mode='approve'` or `agent_paused=true` for every row; revert deploy. Tokens remain encrypted at rest. Do not drop `enquiry_gmail_accounts` until Jim says testers are gone.

**Noah test lock (from PR #3):** Auto-send default; labelled parent mail sends; receipts/newsletters do not; Draft & approve does not send until Approve; pause 403s draft/send; Check Gmail may still import.

### 4.6 Do not do

- Fat-merge PR #3 into PR #1.
- Apply `20260508` “to be safe”.
- Rotate `BANK_DETAIL_ENCRYPTION_KEY`.
- Point a second Stripe webhook at `/api/webhooks/stripe`.
- Implement FreeAgent / QuickBooks / Xero OAuth or sync.
- Gmail push / Pub/Sub (poll is Soft Launch).
- Outlook.

---

## 5. FreeAgent / QuickBooks — out of scope

Dormant already has **offline CSV** exporters:

- `src/app/api/reports/export-csv/route.ts` — `format=freeagent|xero|quickbooks|income|expenses|summary`
- `src/components/ExportMenu.tsx`
- `src/app/(dashboard)/reports/page.tsx`

These are bank-statement-shaped files (date / amount / description). They are **not** accounting-provider integrations.

**Noah: do not add FA/QBO OAuth, app-store listings, or invoice push.** If Jim wants less marketing confusion, drop the three format labels from `ExportMenu` in a later cleanup — do not block Soft Launch on that.

---

## Open questions

### Kev (prod / Stripe / Supabase)

1. Which git migrations are already applied? Especially: was `20260508` backfill ever run?
2. Is `BANK_DETAIL_ENCRYPTION_KEY` already in Vercel? Has `encrypt-bank-fields.ts --commit` been run?
3. Dashboard webhook URL(s) — confirm `/api/webhooks/stripe` is unused.
4. Do Enquiries Stripe prices exist? What are the live `STRIPE_MONTHLY_PRICE_ID` / `STRIPE_ANNUAL_PRICE_ID` (starter vs professional vs one price)?
5. `INVOICE_VERIFY_SECRET` length in Production / Preview.
6. Why are Vercel previews on PR #1 / PR #3 red?

### Noah (Soft Launch)

1. Work on PR #3 only. Do not reopen dual-Stripe or `crypto.ts` unless cut 1/2 is wrong.
2. After cuts 1–3 are on `main`, retarget PR #3 → `main` and rebase. Expect conflicts in `ProspectDetail.tsx`, `enquiries/page.tsx`, `SetupWizard.tsx`, `draft/route.ts`.
3. Auto-send stays the default. Do not flip to confirm-before-send.
4. Reuse `enquiry_*` + `BANK_DETAIL_ENCRYPTION_KEY`. No second mailbox, no Resend for parent replies, no `@godottie` From.
5. Leave FA/QBO providers alone.
6. `npm test` on PR #3 is 30 passing — keep that as the Gmail gate.

### Jim

1. Accept stacked cuts vs “merge PR #1 whole, then PR #3”? Recommendation: **stack if we can split in under a day of branch surgery; otherwise merge PR #1 after §4.1–4.3 env/SQL, then PR #3.**
2. Who owns Stripe price creation and Google OAuth tester access before Noah’s cut 4?
3. Freeze dormant feature work (except this plan / PR #2) until cut 3 is on `main`.

---

## Suggested Noah week-one sequence (after Jim signs this)

1. Kev answers §4.1.
2. Land cut 1 on `main` (or apply SQL+env, then merge the foundation slice).
3. Land cut 2; Noah uses a test card on Enquiries checkout against preview.
4. Land cut 3; Noah finishes setup wizard + draft on `main`.
5. Rebase PR #3; ship Gmail behind real testers; Auto-send default; pause 403s.

Done when invoicing billing on `main` still works, Enquiries can be purchased, and Gmail is a follow-up PR — not a hostage of a 143-file merge.
