import { escapeHtml } from '@/lib/html-escape.mjs'

/** Navy approved for every customer email. */
export const NAVY = '#0b1220'
export const INK = '#0b1220'
export const RULE = '#e5e7eb'
const SUPPORT_EMAIL = 'hello@godottie.cloud'

/** Production mark host. Never the request host, and never VERCEL_URL. */
export const PRODUCTION_ORIGIN = 'https://www.godottie.cloud'

/**
 * Logo origin from the configured site URL.
 * Production always uses https://www.godottie.cloud.
 * Previews may use NEXT_PUBLIC_APP_URL when it is already https.
 */
export function emailAssetOrigin(): string {
  if (process.env.VERCEL_ENV === 'preview') {
    const raw = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, '') ?? ''
    if (/^https:\/\//i.test(raw)) return raw
  }
  return PRODUCTION_ORIGIN
}

export function markUrl(): string {
  return `${emailAssetOrigin()}/email/go-dottie-mark.png`
}

const DARK = `
  .email-body, .email-canvas { background-color:#111827 !important; }
  .email-card { background-color:#1f2937 !important; }
  .header { background-color:${NAVY} !important; }
  .header-text { color:#ffffff !important; }
  .mark { background-color:${NAVY} !important; outline:none !important; }
  .email-card h1, .email-card p, .email-card li, .email-card td, .email-card th, .email-card strong {
    color:#f9fafb !important;
  }
  .email-card .muted, .footer, .footer p, .footer .muted { color:#d1d5db !important; }
  .footer { background-color:#1f2937 !important; border-top:1px solid #374151 !important; }
  .email-card a, .footer a { color:#ffffff !important; text-decoration:underline !important; }
  .btn-fill { background-color:#f9fafb !important; border:none !important; }
  a.btn-fill-link { color:${NAVY} !important; background-color:#f9fafb !important; text-decoration:none !important; }
  .btn-outline { background-color:transparent !important; border:1px solid #ffffff !important; }
  a.btn-outline-link { color:#ffffff !important; background-color:transparent !important; text-decoration:none !important; }
  .panel { background-color:#111827 !important; border-color:#374151 !important; color:#f9fafb !important; }
  .panel p, .panel li, .panel td, .panel th, .panel strong { color:#f9fafb !important; }
  .panel-alert { background-color:#3f1d1d !important; border-color:#fecaca !important; }
  .sheet, .sheet td { background-color:#111827 !important; color:#f9fafb !important; border-color:#374151 !important; }
  .sheet th { background-color:${NAVY} !important; color:#ffffff !important; border-color:#374151 !important; }
`

/** Gmail sets data-ogsc / data-ogsb in dark mode instead of only honoring the media query. */
function attributeDark(css: string): string {
  return css.replace(/([^{}]+)\{([^}]+)\}/g, (_match, selectors: string, body: string) => {
    const expanded = String(selectors).split(',').map((part) => part.trim()).filter(Boolean)
    const ogSelectors = expanded.map((sel) => {
      const self = sel.match(/^\.([a-z0-9-]+)$/)
      if (self) {
        return `[data-ogsc] ${sel}, [data-ogsc].${self[1]}, [data-ogsb] ${sel}, [data-ogsb].${self[1]}`
      }
      return `[data-ogsc] ${sel}, [data-ogsb] ${sel}`
    })
    return `${ogSelectors.join(', ')} {${body}}`
  })
}

export function filledButton(label: string, href: string): string {
  const safeHref = escapeHtml(href)
  const safeLabel = escapeHtml(label)
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="btn" style="margin:0;">
    <tr>
      <td class="btn-fill" align="center" bgcolor="${NAVY}" style="border-radius:8px;background-color:${NAVY};">
        <a class="btn-fill-link" href="${safeHref}" style="display:inline-block;padding:12px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;line-height:20px;color:#ffffff;text-decoration:none;border-radius:8px;background-color:${NAVY};">${safeLabel}</a>
      </td>
    </tr>
  </table>`
}

export function outlineButton(label: string, href: string): string {
  const safeHref = escapeHtml(href)
  const safeLabel = escapeHtml(label)
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" class="btn" style="margin:0;">
    <tr>
      <td class="btn-outline" align="center" bgcolor="#ffffff" style="border-radius:8px;border:1px solid ${NAVY};background-color:#ffffff;">
        <a class="btn-outline-link" href="${safeHref}" style="display:inline-block;padding:12px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;line-height:20px;color:${NAVY};text-decoration:none;border-radius:8px;">${safeLabel}</a>
      </td>
    </tr>
  </table>`
}

/** Stack bulletproof buttons with 12px between them so they cannot overlap. */
export function buttonGroup(buttons: string[]): string {
  const rows: string[] = []
  for (const html of buttons.filter(Boolean)) {
    if (rows.length) {
      rows.push('<tr><td height="12" style="height:12px;line-height:12px;font-size:12px;mso-line-height-rule:exactly;">&nbsp;</td></tr>')
    }
    rows.push(`<tr><td align="left">${html}</td></tr>`)
  }
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 20px;">${rows.join('')}</table>`
}

export function textLink(href: string, label: string): string {
  return `<a class="link" href="${escapeHtml(href)}" style="color:${NAVY};text-decoration:underline;">${escapeHtml(label)}</a>`
}

export function renderEmail(
  content: string,
  audience: 'parent' | 'account' = 'account',
  options?: { markSrc?: string; footerLead?: string },
): string {
  const year = new Date().getFullYear()
  const mark = escapeHtml(options?.markSrc ?? markUrl())
  const copyright = `<p class="muted" style="margin:8px 0 0;font-size:11px;line-height:1.5;color:#5b6573;text-align:center;">&copy; ${year} Go Dottie. All rights reserved.</p>`
  const footer = options?.footerLead
    ? `<p class="muted" style="margin:0;font-size:12px;line-height:1.5;color:#5b6573;text-align:center;">${escapeHtml(options.footerLead)}</p>
              ${copyright}`
    : audience === 'parent'
    ? `<p class="muted" style="margin:0;font-size:12px;line-height:1.5;color:#5b6573;text-align:center;">Sent with Go Dottie</p>
              ${copyright}`
    : `<p class="muted" style="margin:0;font-size:12px;line-height:1.5;color:#5b6573;text-align:center;">
                Need help? Email us at ${textLink(`mailto:${SUPPORT_EMAIL}`, SUPPORT_EMAIL)}
              </p>
              ${copyright}`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Go Dottie</title>
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    .email-card a { color:${NAVY}; text-decoration:underline; }
    a.btn-fill-link { color:#ffffff !important; text-decoration:none !important; }
    a.btn-outline-link { color:${NAVY} !important; text-decoration:none !important; }
    @media (prefers-color-scheme: dark) { ${DARK} }
    ${attributeDark(DARK)}
  </style>
</head>
<body class="email-body" style="margin:0;padding:0;background-color:#f9fafb;color:${INK};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" class="email-canvas" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
          <tr>
            <td class="header" style="background-color:${NAVY};padding:16px 28px;border-bottom:1px solid rgba(255,255,255,0.16);">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="40" style="width:40px;vertical-align:middle;">
                    <img class="mark" src="${mark}" width="40" height="40" alt="Go Dottie" style="display:block;width:40px;height:40px;border:0;background-color:${NAVY};outline:none;">
                  </td>
                  <td style="padding-left:12px;vertical-align:middle;">
                    <p class="header-text" style="margin:0;font-size:20px;font-weight:700;line-height:40px;color:#ffffff;letter-spacing:-0.3px;">Go Dottie</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="email-card ink" style="background-color:#ffffff;padding:36px 32px;color:${INK};">
              ${content}
            </td>
          </tr>
          <tr>
            <td class="footer" style="background-color:#ffffff;padding:20px 32px;border-top:1px solid ${RULE};">
              ${footer}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
