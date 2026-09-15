export function invoicePayHref(input) {
  if (!input?.acceptOnlinePayments) return null
  if (input.status === 'paid') return null
  const url = String(input.payUrl || '').trim()
  if (!/^https:\/\//i.test(url)) return null
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return null
  } catch {
    return null
  }
  return url
}

export function invoicePayButtonHtml(href) {
  if (!href) return ''
  const safe = String(href)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
  return `
      <div style="margin-top:16px;text-align:center;">
        <a href="${safe}" style="background:#059669;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">
          Pay this invoice
        </a>
        <p style="margin:10px 0 0;font-size:12px;color:#6b7280;">Pays your childminder’s Stripe or PayPal. Dottie does not take this payment.</p>
      </div>`
}
