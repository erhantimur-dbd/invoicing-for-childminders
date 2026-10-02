export const PAY_DISCLAIMER =
  "You use your own Stripe account. Dottie doesn't handle payments, refunds or disputes."

export const PARENT_PAY_DISCLAIMER =
  "Your childminder uses their own Stripe or PayPal. Dottie doesn't handle payments, refunds or disputes."

export function invoicePayHref(input) {
  if (!input?.acceptOnlinePayments) return null
  if (input.status === 'paid') return null
  if (input.connectReady && input.invoiceId) {
    const origin = String(input.origin || '').replace(/\/$/, '')
    const path = `/api/invoices/pay/${encodeURIComponent(input.invoiceId)}`
    const base = origin ? `${origin}${path}` : path
    if (input.sig) return `${base}?sig=${encodeURIComponent(input.sig)}`
    return base
  }
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
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="btn" style="margin:0;">
    <tr>
      <td class="btn-fill" align="center" bgcolor="#0b1220" style="border-radius:8px;background-color:#0b1220;">
        <a class="btn-fill-link" href="${safe}" style="display:inline-block;padding:12px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;line-height:20px;color:#ffffff;text-decoration:none;border-radius:8px;background-color:#0b1220;">Pay this invoice</a>
      </td>
    </tr>
  </table>`
}
