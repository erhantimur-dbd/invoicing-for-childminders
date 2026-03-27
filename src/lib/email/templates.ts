const BRAND_COLOR = '#059669'
const BRAND_COLOR_DARK = '#047857'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.dottie.cloud'
const SUPPORT_EMAIL = 'hello@dottie.cloud'

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Dottie</title>
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

          <!-- Header -->
          <tr>
            <td style="background-color:${BRAND_COLOR};border-radius:12px 12px 0 0;padding:28px 32px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Dottie</p>
              <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.8);">Invoicing simplified.</p>
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
                &copy; ${new Date().getFullYear()} Dottie. All rights reserved.
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
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#111827;">Hi ${firstName}, I'm Dottie! 👋</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;">I'll be handling your invoicing from here on in.</p>

    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
      You've got <strong>7 days completely free</strong> to see how much time I can save you.
      You didn't become a childminder to spend Sunday nights writing invoices — that's my job now.
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
      Any questions? Just reply — I'm always here to help.
    </p>

    <p style="margin:20px 0 0;font-size:14px;color:#374151;">
      Talk soon,<br>
      <strong style="color:#111827;">Dottie 💚</strong>
    </p>
  `

  return {
    subject: `Hi ${firstName} — I'm Dottie, and I'm here to help! 👋`,
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
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#111827;">Just a heads-up, ${firstName} ⏰</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;">Your free trial ends in ${daysLeft} ${dayWord}.</p>

    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
      I've been keeping your invoicing running smoothly — I'd love to keep doing that after your trial ends on <strong>${trialEnd}</strong>. Pick a plan and I'll carry on exactly as I have been.
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
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#065f46;">Starter (up to 5 children)</p>
          <p style="margin:0;font-size:18px;font-weight:700;color:${BRAND_COLOR};">£9.99<span style="font-size:13px;font-weight:400;color:#6b7280;">/mo</span> or <strong style="color:${BRAND_COLOR};">£99/yr</strong></p>
          <p style="margin:8px 0 4px;font-size:13px;font-weight:600;color:#065f46;">Professional (up to 20 children)</p>
          <p style="margin:0;font-size:18px;font-weight:700;color:${BRAND_COLOR};">£19.99<span style="font-size:13px;font-weight:400;color:#6b7280;">/mo</span> or <strong style="color:${BRAND_COLOR};">£199/yr</strong></p>
        </td>
      </tr>
    </table>

    ${ctaButton('Choose your plan', `${APP_URL}/subscribe`)}

    <p style="margin:0;font-size:14px;line-height:1.6;color:#6b7280;">
      Questions about which plan is right for you? Just reply — I'll point you in the right direction.
    </p>

    <p style="margin:20px 0 0;font-size:14px;color:#374151;">
      See you on the other side,<br>
      <strong style="color:#111827;">Dottie 💚</strong>
    </p>
  `

  return {
    subject: `Your Dottie trial ends in ${daysLeft} ${dayWord}`,
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
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#111827;">We're official, ${firstName}! 🎉</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#6b7280;">Your subscription is confirmed — I'm not going anywhere.</p>

    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
      From now on, I'll keep your invoices running like clockwork. No more Sunday admin sessions — that's my job.
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
      Everything is already set up and running. Head to your dashboard whenever you're ready — I'll have things ticking along in the background.
    </p>

    ${ctaButton('Go to my dashboard', `${APP_URL}/dashboard`)}

    <p style="margin:0;font-size:14px;line-height:1.6;color:#6b7280;">
      Any questions? Just reply to this email — I'm always here.
    </p>

    <p style="margin:20px 0 0;font-size:14px;color:#374151;">
      Here to help,<br>
      <strong style="color:#111827;">Dottie 💚</strong>
    </p>
  `

  return {
    subject: "You're all set! Dottie subscription confirmed",
    html: baseLayout(content),
  }
}
