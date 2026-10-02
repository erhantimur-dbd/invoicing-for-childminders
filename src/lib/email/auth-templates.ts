import { buttonGroup, filledButton, renderEmail, textLink } from '@/lib/email/layout'

const H = 'margin:0 0 12px;font-size:24px;font-weight:700;line-height:1.3;color:#0b1220;'
const P = 'margin:0 0 16px;font-size:15px;line-height:1.6;color:#0b1220;'
const MUTED = 'margin:0 0 16px;font-size:14px;line-height:1.6;color:#5b6573;'

function confirmBlock(label: string): string {
  const href = '{{ .ConfirmationURL }}'
  return `${buttonGroup([filledButton(label, href)])}
    <p class="muted" style="${MUTED}">Or copy this link:</p>
    <p class="ink" style="margin:0 0 16px;font-size:13px;line-height:1.5;word-break:break-all;color:#0b1220;">${textLink(href, href)}</p>
    <p class="muted" style="${MUTED}">Or enter this code: {{ .Token }}</p>`
}

export type AuthEmail = {
  id: string
  file: string
  renderFile: string
  dashboard: string
  subject: string
  trigger: string
  html: string
}

const emails: AuthEmail[] = [
  {
    id: 'confirmation',
    file: 'confirmation.html',
    renderFile: 'authConfirmSignup',
    dashboard: 'Confirm signup',
    subject: 'Confirm your Go Dottie email',
    trigger: 'Supabase Auth confirm signup. Paste supabase/templates/auth/confirmation.html into the dashboard.',
    html: renderEmail(`
      <h1 class="ink" style="${H}">Confirm your email</h1>
      <p class="ink" style="${P}">Confirm {{ .Email }} to finish creating your Go Dottie account.</p>
      ${confirmBlock('Confirm email')}
    `, 'account'),
  },
  {
    id: 'magic_link',
    file: 'magic-link.html',
    renderFile: 'authMagicLink',
    dashboard: 'Magic link',
    subject: 'Your Go Dottie sign-in link',
    trigger: 'Supabase Auth magic link. Paste supabase/templates/auth/magic-link.html into the dashboard.',
    html: renderEmail(`
      <h1 class="ink" style="${H}">Sign in</h1>
      <p class="ink" style="${P}">Use this link to sign in to Go Dottie as {{ .Email }}.</p>
      ${confirmBlock('Sign in')}
    `, 'account'),
  },
  {
    id: 'recovery',
    file: 'recovery.html',
    renderFile: 'authResetPassword',
    dashboard: 'Reset password',
    subject: 'Reset your Go Dottie password',
    trigger: 'Supabase Auth reset password. Paste supabase/templates/auth/recovery.html into the dashboard.',
    html: renderEmail(`
      <h1 class="ink" style="${H}">Reset your password</h1>
      <p class="ink" style="${P}">Choose a new password for {{ .Email }}.</p>
      ${confirmBlock('Reset password')}
    `, 'account'),
  },
  {
    id: 'invite',
    file: 'invite.html',
    renderFile: 'authInviteUser',
    dashboard: 'Invite user',
    subject: 'You are invited to Go Dottie',
    trigger: 'Supabase Auth invite user. Paste supabase/templates/auth/invite.html into the dashboard.',
    html: renderEmail(`
      <h1 class="ink" style="${H}">You are invited</h1>
      <p class="ink" style="${P}">You have been invited to join Go Dottie at {{ .SiteURL }}.</p>
      ${confirmBlock('Accept invite')}
    `, 'account'),
  },
  {
    id: 'email_change',
    file: 'email-change.html',
    renderFile: 'authChangeEmail',
    dashboard: 'Change email address',
    subject: 'Confirm your new Go Dottie email',
    trigger: 'Supabase Auth change email address. Paste supabase/templates/auth/email-change.html into the dashboard.',
    html: renderEmail(`
      <h1 class="ink" style="${H}">Confirm your new email</h1>
      <p class="ink" style="${P}">Confirm the change from {{ .Email }} to {{ .NewEmail }}.</p>
      ${confirmBlock('Confirm new email')}
    `, 'account'),
  },
  {
    id: 'reauthentication',
    file: 'reauthentication.html',
    renderFile: 'authReauthentication',
    dashboard: 'Reauthentication',
    subject: 'Your Go Dottie code',
    trigger: 'Supabase Auth reauthentication. Paste supabase/templates/auth/reauthentication.html into the dashboard.',
    html: renderEmail(`
      <h1 class="ink" style="${H}">Confirm it is you</h1>
      <p class="ink" style="${P}">Enter this code to continue as {{ .Email }}.</p>
      <table role="presentation" class="panel" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin:0 0 16px;">
        <tr>
          <td style="padding:20px;text-align:center;">
            <p class="ink" style="margin:0;font-size:32px;font-weight:700;letter-spacing:0.18em;color:#0b1220;">{{ .Token }}</p>
          </td>
        </tr>
      </table>
      <p class="muted" style="${MUTED}">You can also open <a class="link" href="{{ .SiteURL }}" style="color:#0b1220;text-decoration:underline;">{{ .SiteURL }}</a>.</p>
    `, 'account'),
  },
]

export function authEmails(): AuthEmail[] {
  return emails
}

/** Preview values so screenshots show a real link and code. Source files keep the Go actions. */
export function previewAuthHtml(html: string): string {
  return html
    .replaceAll('{{ .ConfirmationURL }}', 'https://www.godottie.cloud/auth/v1/verify?token=preview&type=signup')
    .replaceAll('{{ .NewEmail }}', 'sam.new@example.com')
    .replaceAll('{{ .TokenHash }}', 'preview-token-hash')
    .replaceAll('{{ .SiteURL }}', 'https://www.godottie.cloud')
    .replaceAll('{{ .Email }}', 'sam.taylor@example.com')
    .replaceAll('{{ .Token }}', '482913')
}
