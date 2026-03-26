import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export { resend }

const DEFAULT_FROM = 'Easy Invoicing <hello@easyinvoicing.co.uk>'

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
  try {
    const { data, error } = await resend.emails.send({
      from: from ?? process.env.RESEND_FROM_EMAIL ?? DEFAULT_FROM,
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
