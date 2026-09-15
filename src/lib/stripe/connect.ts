import Stripe from 'stripe'

export function stripeClient(secret = process.env.STRIPE_SECRET_KEY) {
  if (!secret) throw new Error('STRIPE_SECRET_KEY is not set')
  return new Stripe(secret)
}

export function isMerchantCardPaymentsActive(account: {
  configuration?: { merchant?: { capabilities?: { card_payments?: { status?: string } } } }
} | null | undefined) {
  return account?.configuration?.merchant?.capabilities?.card_payments?.status === 'active'
}

export async function accountCanCharge(stripe: Stripe, accountId: string): Promise<boolean> {
  try {
    const account = await stripe.v2.core.accounts.retrieve(accountId, {
      include: ['configuration.merchant'],
    })
    return isMerchantCardPaymentsActive(account)
  } catch {
    const account = await stripe.accounts.retrieve(accountId)
    return Boolean(account.charges_enabled)
  }
}

export async function createChildminderConnectAccount(
  stripe: Stripe,
  opts: { email?: string | null; name?: string | null; userId: string },
) {
  return stripe.v2.core.accounts.create({
    contact_email: opts.email || undefined,
    display_name: opts.name || undefined,
    dashboard: 'full',
    identity: {
      country: 'gb',
      entity_type: 'individual',
    },
    configuration: {
      merchant: {
        capabilities: {
          card_payments: { requested: true },
        },
      },
    },
    defaults: {
      currency: 'gbp',
      responsibilities: {
        fees_collector: 'stripe',
        losses_collector: 'stripe',
      },
    },
    metadata: { user_id: opts.userId, dottie_kind: 'childminder_connect' },
    include: ['configuration.merchant', 'identity', 'requirements'],
  })
}

export async function createConnectOnboardingLink(
  stripe: Stripe,
  accountId: string,
  origin: string,
) {
  const base = origin.replace(/\/$/, '')
  return stripe.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: 'account_onboarding',
      account_onboarding: {
        configurations: ['merchant'],
        collection_options: { fields: 'eventually_due' },
        return_url: `${base}/api/stripe/connect/return`,
        refresh_url: `${base}/api/stripe/connect/refresh`,
      },
    },
  })
}
