import assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'
import {
  accountAllowlistGate,
  guardEmailRecipients,
  stripeEventProfileId,
} from './preview-guard.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

describe('email guard', () => {
  const real = {
    to: 'parent@example.com',
    cc: ['office@example.com'],
    bcc: 'hidden@example.com',
    subject: 'Invoice INV-1',
    headers: { 'X-Trace': '1' },
  }

  it('replaces to, cc, and bcc when RESEND_TO_OVERRIDE is set', () => {
    const result = guardEmailRecipients(real, {
      VERCEL_ENV: 'preview',
      RESEND_TO_OVERRIDE: ' pip@example.com ',
    })
    assert.equal(result.action, 'send')
    if (result.action !== 'send') return
    assert.equal(result.to, 'pip@example.com')
    assert.equal(result.cc, undefined)
    assert.equal(result.bcc, undefined)
    assert.equal(result.subject, 'Invoice INV-1')
    assert.equal(result.headers?.['X-Trace'], '1')
    assert.equal(
      result.headers?.['X-Original-To'],
      'to:parent@example.com cc:office@example.com bcc:hidden@example.com',
    )
  })

  it('sends nothing when RESEND_TO_OVERRIDE is unset outside Production', () => {
    const preview = guardEmailRecipients(real, { VERCEL_ENV: 'preview' })
    const local = guardEmailRecipients(real, {})
    assert.deepEqual(preview, { action: 'skip', reason: 'override_unset' })
    assert.deepEqual(local, { action: 'skip', reason: 'override_unset' })
  })

  it('sends nothing when RESEND_TO_OVERRIDE is empty', () => {
    const result = guardEmailRecipients(real, {
      VERCEL_ENV: 'development',
      RESEND_TO_OVERRIDE: '  ',
    })
    assert.deepEqual(result, { action: 'skip', reason: 'override_unset' })
  })

  it('leaves recipients unchanged in Production', () => {
    const result = guardEmailRecipients(real, {
      VERCEL_ENV: 'production',
      RESEND_TO_OVERRIDE: 'pip@example.com',
    })
    assert.equal(result.action, 'send')
    if (result.action !== 'send') return
    assert.equal(result.to, real.to)
    assert.deepEqual(result.cc, real.cc)
    assert.equal(result.bcc, real.bcc)
    assert.equal(result.subject, real.subject)
    assert.deepEqual(result.headers, real.headers)
    assert.equal(result.headers?.['X-Original-To'], undefined)
  })
})

describe('account allowlist', () => {
  it('returns the profile ids when CRON_USER_ALLOWLIST is set', () => {
    const gate = accountAllowlistGate({
      VERCEL_ENV: 'preview',
      CRON_USER_ALLOWLIST: ' id-1, id-2, ,id-1 ',
    })
    assert.deepEqual(gate, { allow: true, ids: ['id-1', 'id-2', 'id-1'] })
  })

  it('skips when CRON_USER_ALLOWLIST is unset outside Production', () => {
    assert.deepEqual(accountAllowlistGate({ VERCEL_ENV: 'preview' }), {
      allow: false,
      skipped: 'allowlist empty',
    })
    assert.deepEqual(accountAllowlistGate({}), {
      allow: false,
      skipped: 'allowlist empty',
    })
  })

  it('skips when CRON_USER_ALLOWLIST is empty', () => {
    const gate = accountAllowlistGate({
      VERCEL_ENV: 'preview',
      CRON_USER_ALLOWLIST: ' , ',
    })
    assert.deepEqual(gate, { allow: false, skipped: 'allowlist empty' })
  })

  it('does not filter in Production even if the allowlist is set', () => {
    const gate = accountAllowlistGate({
      VERCEL_ENV: 'production',
      CRON_USER_ALLOWLIST: 'id-1',
    })
    assert.deepEqual(gate, { allow: true, ids: null })
  })
})

describe('stripe webhook profile lookup', () => {
  function lookup(rows: Record<string, Record<string, string>>) {
    return {
      from(table: string) {
        let key = ''
        const api = {
          select() { return api },
          eq(column: string, value: string) {
            key = `${table}.${column}=${value}`
            return api
          },
          async maybeSingle() {
            return { data: rows[key] ?? null }
          },
        }
        return api
      },
    }
  }

  it('reads checkout metadata.user_id without a query', async () => {
    const id = await stripeEventProfileId(lookup({}), {
      type: 'checkout.session.completed',
      data: { object: { metadata: { user_id: 'user-1' } } },
    })
    assert.equal(id, 'user-1')
  })

  it('resolves a parent-invoice checkout through invoices.childminder_id', async () => {
    const id = await stripeEventProfileId(
      lookup({ 'invoices.id=inv-1': { childminder_id: 'cm-9' } }),
      {
        type: 'checkout.session.completed',
        data: { object: { metadata: { dottie_kind: 'parent_invoice', invoice_id: 'inv-1' } } },
      },
    )
    assert.equal(id, 'cm-9')
  })

  it('resolves subscription events through stripe_customer_id', async () => {
    const id = await stripeEventProfileId(
      lookup({ 'subscriptions.stripe_customer_id=cus_1': { user_id: 'user-2' } }),
      {
        type: 'customer.subscription.updated',
        data: { object: { customer: 'cus_1' } },
      },
    )
    assert.equal(id, 'user-2')
  })

  it('resolves account.updated through the Connect account id', async () => {
    const id = await stripeEventProfileId(
      lookup({ 'profiles.stripe_connect_account_id=acct_1': { id: 'user-3' } }),
      { type: 'account.updated', data: { object: { id: 'acct_1' } } },
    )
    assert.equal(id, 'user-3')
  })
})

describe('Resend stays behind the chokepoint', () => {
  const patterns = [
    /\bnew\s+Resend\b/,
    /resend\.emails\.send/,
    /from\s+['"]resend['"]/,
    /import\(\s*['"]resend['"]\s*\)/,
    /require\(\s*['"]resend['"]\s*\)/,
  ]

  function sourceFiles(dir: string): string[] {
    if (!existsSync(dir)) return []
    const out: string[] = []
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === '.next') continue
      const full = join(dir, entry)
      const info = statSync(full)
      if (info.isDirectory()) {
        out.push(...sourceFiles(full))
        continue
      }
      if (entry.endsWith('.d.ts') || /\.test\.(ts|tsx|mjs|js)$/.test(entry)) continue
      if (/\.(ts|tsx|mjs|js)$/.test(entry)) out.push(full)
    }
    return out
  }

  it('fails if any file other than the helper constructs or calls Resend', () => {
    const hits: string[] = []
    for (const file of [...sourceFiles(join(root, 'src')), ...sourceFiles(join(root, 'scripts'))]) {
      const rel = relative(root, file)
      if (rel === 'src/lib/email/resend.ts') continue
      const text = readFileSync(file, 'utf8')
      if (patterns.some((pattern) => pattern.test(text))) hits.push(rel)
    }
    assert.deepEqual(hits, [])

    const helper = readFileSync(join(root, 'src/lib/email/resend.ts'), 'utf8')
    assert.match(helper, /new Resend/)
    assert.match(helper, /emails\.send/)
    assert.match(helper, /guardEmailRecipients/)
  })

  it('routes cron and webhook account writes through the allowlist before any mutation', () => {
    const generate = readFileSync(join(root, 'src/app/api/cron/generate-invoices/route.ts'), 'utf8')
    const sync = readFileSync(join(root, 'src/app/api/cron/sync-enquiries/route.ts'), 'utf8')
    const webhook = readFileSync(join(root, 'src/app/api/stripe/webhook/route.ts'), 'utf8')

    assert.match(generate, /skipped: 'allowlist empty'/)
    assert.ok(generate.indexOf('accountAllowlistGate()') < generate.indexOf('await markOverdueInvoices'))
    assert.match(generate, /\.in\('id', gate\.ids\)/)
    assert.match(generate, /sendEmail\(/)

    assert.match(sync, /skipped: 'allowlist empty'/)
    assert.ok(sync.indexOf('accountAllowlistGate') < sync.indexOf('enquiry_gmail_accounts'))
    assert.match(sync, /\.in\('user_id', gate\.ids\)/)

    assert.match(webhook, /skipped: 'allowlist empty'/)
    assert.ok(webhook.indexOf('accountAllowlistGate') < webhook.indexOf("from('stripe_events')"))
    assert.match(webhook, /stripeEventProfileId/)
    assert.match(webhook, /sendEmail/)
    assert.doesNotMatch(webhook, /from ['"]resend['"]/)
  })
})
