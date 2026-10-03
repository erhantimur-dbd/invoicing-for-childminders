import { Resend } from 'resend'
import { guardEmailRecipients, originalRecipientHeader } from '@/lib/preview-guard'

// Lazy-initialise so missing env var doesn't crash the build
function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

const DEFAULT_FROM = process.env.RESEND_FROM_EMAIL ?? 'Dottie <hello@godottie.cloud>'

interface SendEmailOptions {
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
  headers?: Record<string, string>
}

export interface SendEmailResult {
  success: boolean
  id?: string
  error?: string
  /** True when a non-production send was dropped because RESEND_TO_OVERRIDE was unset. */
  skipped?: boolean
}

export type OutboundEmail = {
  from: string
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  html: string
  replyTo?: string
  headers?: Record<string, string>
}

export type EmailTransport = (payload: OutboundEmail) => Promise<{ id?: string; error?: string }>

/**
 * Single Resend chokepoint. Every product email must call this.
 * Outside Production, RESEND_TO_OVERRIDE replaces to/cc/bcc. If that variable
 * is unset or empty, nothing is sent and the caller gets a no-op success.
 * VERCEL_ENV === 'production' sends the payload unchanged.
 */
export async function sendEmail(
  options: SendEmailOptions,
  deps?: { transport?: EmailTransport; env?: NodeJS.ProcessEnv },
): Promise<SendEmailResult> {
  const guarded = guardEmailRecipients({
    to: options.to,
    cc: options.cc,
    bcc: options.bcc,
    subject: options.subject,
    headers: options.headers,
  }, deps?.env)

  if (guarded.action === 'skip') {
    console.warn('[sendEmail] non-production send skipped — RESEND_TO_OVERRIDE unset or empty', {
      originalTo: originalRecipientHeader(options),
      subject: options.subject,
    })
    return { success: true, skipped: true }
  }

  const payload: OutboundEmail = {
    from: options.from ?? DEFAULT_FROM,
    to: guarded.to,
    subject: guarded.subject,
    html: options.html,
  }
  if (guarded.cc !== undefined) payload.cc = guarded.cc
  if (guarded.bcc !== undefined) payload.bcc = guarded.bcc
  if (options.replyTo) payload.replyTo = options.replyTo
  if (guarded.headers && Object.keys(guarded.headers).length > 0) payload.headers = guarded.headers

  try {
    if (deps?.transport) {
      const result = await deps.transport(payload)
      if (result.error) return { success: false, error: result.error }
      return { success: true, id: result.id }
    }

    const resend = getResend()
    if (!resend) {
      console.warn('[sendEmail] RESEND_API_KEY not set — email skipped')
      return { success: false, error: 'email_not_configured' }
    }

    const { data, error } = await resend.emails.send(payload)

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
