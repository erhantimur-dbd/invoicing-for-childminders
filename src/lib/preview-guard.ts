/**
 * Fail-closed gates for any runtime that is not Vercel Production.
 * Local dev leaves VERCEL_ENV unset, so it is non-production too.
 * Both gates are no-ops when VERCEL_ENV === 'production'.
 */

export function isProductionEnv(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.VERCEL_ENV === 'production'
}

export function parseAllowlist(raw: string | undefined | null): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}

export type AccountAllowlistGate =
  | { allow: true; ids: null }
  | { allow: true; ids: string[] }
  | { allow: false; skipped: 'allowlist empty' }

/** Profile ids Preview/local cron and webhook writes may touch. */
export function accountAllowlistGate(env: NodeJS.ProcessEnv = process.env): AccountAllowlistGate {
  if (isProductionEnv(env)) return { allow: true, ids: null }
  const ids = parseAllowlist(env.CRON_USER_ALLOWLIST)
  if (ids.length === 0) return { allow: false, skipped: 'allowlist empty' }
  return { allow: true, ids }
}

export type RecipientField = string | string[] | undefined

export type EmailRecipients = {
  to: string | string[]
  cc?: RecipientField
  bcc?: RecipientField
  subject: string
  headers?: Record<string, string>
}

export type EmailGuardResult =
  | {
      action: 'send'
      to: string | string[]
      cc?: string | string[]
      bcc?: string | string[]
      subject: string
      headers?: Record<string, string>
    }
  | { action: 'skip'; reason: 'override_unset' }

function asList(value: RecipientField): string[] {
  if (!value) return []
  const items = Array.isArray(value) ? value : [value]
  return items.map((item) => item.trim()).filter((item) => item.length > 0)
}

/** Original to/cc/bcc, kept on X-Original-To when a preview override replaces them. */
export function originalRecipientHeader(input: {
  to: RecipientField
  cc?: RecipientField
  bcc?: RecipientField
}): string {
  const parts: string[] = []
  const to = asList(input.to)
  const cc = asList(input.cc)
  const bcc = asList(input.bcc)
  if (to.length) parts.push(`to:${to.join(',')}`)
  if (cc.length) parts.push(`cc:${cc.join(',')}`)
  if (bcc.length) parts.push(`bcc:${bcc.join(',')}`)
  return parts.join(' ')
}

export function guardEmailRecipients(
  input: EmailRecipients,
  env: NodeJS.ProcessEnv = process.env,
): EmailGuardResult {
  if (isProductionEnv(env)) {
    return {
      action: 'send',
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      subject: input.subject,
      headers: input.headers,
    }
  }

  const override = env.RESEND_TO_OVERRIDE?.trim() ?? ''
  if (!override) return { action: 'skip', reason: 'override_unset' }

  // Resend rejects the same address on to and cc/bcc, so the only recipient is
  // the override. Original cc/bcc stay on X-Original-To and are not mailed.
  const headers = {
    ...(input.headers ?? {}),
    'X-Original-To': originalRecipientHeader(input),
  }
  return {
    action: 'send',
    to: override,
    subject: input.subject,
    headers,
  }
}

type ProfileLookup = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string,
      ) => {
        maybeSingle: () => PromiseLike<{ data: Record<string, string | null> | null }>
      }
    }
  }
}

/**
 * Profile id a Stripe webhook event would mutate. Read-only.
 * Null means the event cannot be tied to an allowlisted account.
 */
export async function stripeEventProfileId(
  supabase: ProfileLookup,
  event: { type: string; data: { object: Record<string, unknown> } },
): Promise<string | null> {
  const object = event.data?.object ?? {}
  const metadata = (object.metadata ?? {}) as Record<string, string | undefined>

  if (
    event.type === 'checkout.session.completed'
    || event.type === 'checkout.session.async_payment_succeeded'
  ) {
    if (metadata.user_id) return metadata.user_id
    if (metadata.invoice_id) {
      const { data } = await supabase
        .from('invoices')
        .select('childminder_id')
        .eq('id', metadata.invoice_id)
        .maybeSingle()
      return data?.childminder_id ?? null
    }
    return null
  }

  if (
    event.type === 'customer.subscription.trial_will_end'
    || event.type === 'customer.subscription.created'
    || event.type === 'customer.subscription.updated'
    || event.type === 'customer.subscription.deleted'
    || event.type === 'invoice.payment_failed'
  ) {
    const customer = typeof object.customer === 'string' ? object.customer : null
    if (!customer) return null
    const { data } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('stripe_customer_id', customer)
      .maybeSingle()
    return data?.user_id ?? null
  }

  if (event.type === 'account.updated') {
    const accountId = typeof object.id === 'string' ? object.id : null
    if (!accountId) return null
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_connect_account_id', accountId)
      .maybeSingle()
    return data?.id ?? null
  }

  return null
}
