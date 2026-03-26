const BRAND_COLOR = '#059669'
const BRAND_COLOR_DARK = '#047857'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://easyinvoicing.co.uk'
const SUPPORT_EMAIL = 'hello@easyinvoicing.co.uk'

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Easy Invoicing</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

          <!-- Header -->
          <tr>
            <td style="background-color:${BRAND_COLOR};border-radius:12px 12px 0 0;padding:28px 32px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Easy Invoicing</p>
              <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.8);">for Childcare Professionals</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:36px 32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f3f4f6;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:20px 32px;">
              <p style="margin:0;font-size:12px;color:#6b7280;text-align:center;">
                Need help? Email us at
                <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND_COLOR};text-decoration:none;">${SUPPORT_EMAIL}</a>
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#9ca3af;text-align:center;">
                Easy Invoicing is part of the <strong style="color:#6b7280;">Dottie OS</strong> ecosystem.
                &copy; ${new Date().getFullYear()} Easy Invoicing. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function ctaButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
    <tr>
      <td style="border-radius:8px;background-color:${BRAND_COLOR};">
        <a href="${href}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;background-color:${BRAND_COLOR};">${label}</a>
      </td>
    </tr>
  </table>`
}

// ─── Template 1: Welcome email ────────────────────────────────────────────────

export function welcomeEmail({ name }: { name: string }): {
  subject: string
  html: string
} {
  const firstName = name.split(' ')[0]

  const content = `
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#111827;">Welcome to Easy Invoicing! 🎉</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;">Hi ${firstName}, we're so glad you're here.</p>

    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
      You've just unlocked <strong>7 days of free access</strong> to everything Easy Invoicing has to offer.
      We built this tool specifically for childminders — so you can spend less time on admin and more time
      with the children in your care.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:4px;margin:24px 0;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 14px;font-size:14px;font-weight:600;color:#065f46;text-transform:uppercase;letter-spacing:0.5px;">What's included in your trial</p>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding:5px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:22px;vertical-align:top;padding-top:1px;">
                      <span style="display:inline-block;width:18px;height:18px;background-color:${BRAND_COLOR};border-radius:50%;text-align:center;line-height:18px;font-size:11px;color:#fff;font-weight:700;">✓</span>
                    </td>
                    <td style="padding-left:10px;font-size:14px;color:#374151;line-height:1.5;">
                      <strong>Auto-invoices</strong> — generate professional invoices in seconds
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:5px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:22px;vertical-align:top;padding-top:1px;">
                      <span style="display:inline-block;width:18px;height:18px;background-color:${BRAND_COLOR};border-radius:50%;text-align:center;line-height:18px;font-size:11px;color:#fff;font-weight:700;">✓</span>
                    </td>
                    <td style="padding-left:10px;font-size:14px;color:#374151;line-height:1.5;">
                      <strong>PDF-ready invoices</strong> — download and share with parents instantly
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:5px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="width:22px;vertical-align:top;padding-top:1px;">
                      <span style="display:inline-block;width:18px;height:18px;background-color:${BRAND_COLOR};border-radius:50%;text-align:center;line-height:18px;font-size:11px;color:#fff;font-weight:700;">✓</span>
                    </td>
                    <td style="padding-left:10px;font-size:14px;color:#374151;line-height:1.5;">
                      <strong>Expense tracking</strong> — log costs and stay on top of your finances
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${ctaButton('Get started', APP_URL)}

    <p style="margin:0;font-size:14px;line-height:1.6;color:#6b7280;">
      If you have any questions, just reply to this email — we'd love to hear from you.
    </p>

    <p style="margin:20px 0 0;font-size:14px;color:#374151;">
      Warm regards,<br>
      <strong style="color:#111827;">The Easy Invoicing Team</strong>
    </p>
  `

  return {
    subject: 'Welcome to Easy Invoicing! 🎉',
    html: baseLayout(content),
  }
}

// ─── Template 2: Trial expiring email ─────────────────────────────────────────

export function trialExpiringEmail({
  name,
  daysLeft,
  trialEnd,
}: {
  name: string
  daysLeft: number
  trialEnd: string
}): { subject: string; html: string } {
  const firstName = name.split(' ')[0]
  const dayWord = daysLeft === 1 ? 'day' : 'days'

  const content = `
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#111827;">Your trial ends in ${daysLeft} ${dayWord}</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;">Hi ${firstName}, just a friendly heads-up.</p>

    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
      Your Easy Invoicing free trial ends on <strong>${trialEnd}</strong>. After that, access to your
      account will be paused until you choose a plan.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:10px;margin:24px 0;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#92400e;">What you'll lose access to</p>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            <tr><td style="padding:4px 0;font-size:14px;color:#374151;">&#8226;&nbsp; Invoice creation and sending</td></tr>
            <tr><td style="padding:4px 0;font-size:14px;color:#374151;">&#8226;&nbsp; PDF invoice downloads</td></tr>
            <tr><td style="padding:4px 0;font-size:14px;color:#374151;">&#8226;&nbsp; Expense tracking and reports</td></tr>
            <tr><td style="padding:4px 0;font-size:14px;color:#374151;">&#8226;&nbsp; Your children and payment records</td></tr>
          </table>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 6px;font-size:15px;line-height:1.6;color:#374151;">
      Keep everything going for just:
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px 0 24px;">
      <tr>
        <td style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 20px;text-align:center;">
          <p style="margin:0;font-size:20px;font-weight:700;color:${BRAND_COLOR};">£4.99 <span style="font-size:14px;font-weight:400;color:#6b7280;">/ month</span></p>
          <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">or save with <strong style="color:${BRAND_COLOR};">£54 / year</strong></p>
        </td>
      </tr>
    </table>

    ${ctaButton('Choose your plan', `${APP_URL}/subscribe`)}

    <p style="margin:0;font-size:14px;line-height:1.6;color:#6b7280;">
      Questions about plans? Just reply to this email and we'll help you out.
    </p>

    <p style="margin:20px 0 0;font-size:14px;color:#374151;">
      Best,<br>
      <strong style="color:#111827;">The Easy Invoicing Team</strong>
    </p>
  `

  return {
    subject: `Your Easy Invoicing trial ends in ${daysLeft} ${dayWord}`,
    html: baseLayout(content),
  }
}

// ─── Template 3: Subscription confirmation email ──────────────────────────────

export function subscriptionConfirmEmail({
  name,
  plan,
}: {
  name: string
  plan: string
}): { subject: string; html: string } {
  const firstName = name.split(' ')[0]
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1)

  const content = `
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#111827;">You're all set! 🎉</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;">Hi ${firstName}, your subscription is confirmed.</p>

    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
      Thank you for subscribing to Easy Invoicing. Your account is now fully active and you have
      complete access to all features.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin:24px 0;">
      <tr>
        <td style="padding:20px 24px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#065f46;text-transform:uppercase;letter-spacing:0.5px;">Your plan</p>
          <p style="margin:0;font-size:20px;font-weight:700;color:${BRAND_COLOR};">${planLabel}</p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
      Everything is ready to go — head to your dashboard to continue managing your childcare invoices.
    </p>

    ${ctaButton('Go to your dashboard', `${APP_URL}/dashboard`)}

    <p style="margin:0;font-size:14px;line-height:1.6;color:#6b7280;">
      If you ever have questions or need support, we're always here to help.
    </p>

    <p style="margin:20px 0 0;font-size:14px;color:#374151;">
      Warm regards,<br>
      <strong style="color:#111827;">The Easy Invoicing Team</strong>
    </p>
  `

  return {
    subject: "You're all set! Easy Invoicing subscription confirmed",
    html: baseLayout(content),
  }
}
