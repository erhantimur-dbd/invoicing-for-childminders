import { Resend } from 'resend'

// Lazy-initialise so missing env var doesn't crash the build
function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL ?? 'Dottie <hello@dottie.cloud>'

interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
}

interface SendEmailResult {
  success: boolean
  id?: string
  error?: string
}

export async function sendEmail({
  to,
  subject,
  html,
  from,
}: SendEmailOptions): Promise<SendEmailResult> {
  const resend = getResend()
  if (!resend) {
    console.warn('[sendEmail] RESEND_API_KEY not set — email skipped')
    return { success: false, error: 'email_not_configured' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: from ?? DEFAULT_FROM,
      to,
      subject,
      html,
    })

    if (error) {
      console.error('[sendEmail] Resend error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (err) {
    console.error('[sendEmail] Unexpected error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
