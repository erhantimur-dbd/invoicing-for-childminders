/** Pricing tab and checkout share this query key. Default annual. */
export function parseBilling(raw) {
  return raw === 'monthly' ? 'monthly' : 'annual'
}

export function billingFromSearch(search) {
  const q = typeof search === 'string' ? search.replace(/^\?/, '') : ''
  return parseBilling(new URLSearchParams(q).get('billing'))
}

export function withBilling(path, billing) {
  const plan = parseBilling(billing)
  const [base, hash] = path.split('#')
  const url = new URL(base, 'https://www.godottie.cloud')
  url.searchParams.set('billing', plan)
  const next = `${url.pathname}?${url.searchParams.toString()}`
  return hash ? `${next}#${hash}` : next
}

export function authCallbackRedirect(origin, nextPath) {
  return `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
}

/** Post-signup / SSO destination: Enquiries checkout with the billing tab preserved. */
export function subscribeNext(billing, product = 'enquiries') {
  const prod = product === 'invoicing' ? 'invoicing' : 'enquiries'
  return withBilling(`/subscribe?product=${prod}`, billing)
}
