import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { log } from '@/lib/log'

// Lazy-init: `new Resend(undefined)` throws and fails `next build` page-data collection.
function getResend() {
  const key = process.env.RESEND_API_KEY
  if (!key) return null
  return new Resend(key)
}

// ── Spam keyword filter ────────────────────────────────────────────────────
const SPAM_PATTERNS = [
  /\b(viagra|cialis|casino|poker|loan|bitcoin|crypto|forex|seo|backlink|buy followers)\b/i,
  /\b(click here|free money|make money fast|earn \$|work from home opportunity)\b/i,
  /https?:\/\/[^\s]+\.(xyz|top|click|club|online|site|biz)\b/i, // shady TLDs
]

function isSpam(text: string): boolean {
  return SPAM_PATTERNS.some(p => p.test(text))
}

export async function POST(req: NextRequest) {
  const ip = clientIp(req.headers)

  // ── Rate limit: 3 submissions per IP per 15 minutes ─────────────────────
  const rl = await rateLimit({
    bucket: 'contact',
    identifier: ip,
    limit: 3,
    windowMs: 15 * 60 * 1000,
  })
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please wait a few minutes before trying again.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } },
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  const { name, email, subject, message, website } = body as Record<string, string>

  // ── Honeypot — bots fill hidden 'website' field, humans leave it blank ──
  if (website && website.trim().length > 0) {
    // Silently accept so bots don't know they were caught
    return NextResponse.json({ ok: true })
  }

  // ── Field validation ────────────────────────────────────────────────────
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Please fill in all required fields.' }, { status: 400 })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
  }

  if (message.trim().length < 10) {
    return NextResponse.json({ error: 'Message is too short.' }, { status: 400 })
  }

  if (message.trim().length > 2000) {
    return NextResponse.json({ error: 'Message is too long (max 2000 characters).' }, { status: 400 })
  }

  // ── Spam content check ──────────────────────────────────────────────────
  const combined = `${name} ${subject} ${message}`
  if (isSpam(combined)) {
    // Silently accept — don't tip off spammers
    return NextResponse.json({ ok: true })
  }

  // ── Send email via Resend ───────────────────────────────────────────────
  const resend = getResend()
  if (!resend) {
    return NextResponse.json(
      { error: 'Failed to send message. Please email us directly at support@godottie.cloud.' },
      { status: 500 },
    )
  }

  const safeSubject = subject?.trim() || '(no subject)'

  try {
    await resend.emails.send({
      from: 'Dottie Contact Form <hello@godottie.cloud>',
      to: 'support@godottie.cloud',
      replyTo: email.trim(),
      subject: `[Contact] ${safeSubject}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; color: #111827;">
          <h2 style="color: #059669; margin-bottom: 4px;">New contact form submission</h2>
          <p style="color: #6b7280; font-size: 13px; margin-top: 0;">Received via godottie.cloud/support</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #6b7280; width: 80px;">Name</td><td style="padding: 6px 0; font-weight: 600;">${name.trim()}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Email</td><td style="padding: 6px 0;"><a href="mailto:${email.trim()}" style="color: #059669;">${email.trim()}</a></td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Subject</td><td style="padding: 6px 0;">${safeSubject}</td></tr>
          </table>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
          <p style="font-size: 13px; color: #6b7280; margin-bottom: 6px;">Message</p>
          <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${message.trim()}</div>
          <p style="font-size: 11px; color: #9ca3af; margin-top: 16px;">IP: ${ip}</p>
        </div>
      `,
    })

    // Send confirmation to the sender
    await resend.emails.send({
      from: 'Dottie <hello@godottie.cloud>',
      to: email.trim(),
      subject: "Got your message — I'll be in touch soon 👋",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; color: #111827;">
          <div style="background: linear-gradient(135deg, #10b981, #0ea5e9); padding: 24px 32px; border-radius: 12px 12px 0 0;">
            <p style="margin: 0; font-size: 20px; font-weight: 700; color: #fff;">Dottie</p>
            <p style="margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.8);">Invoicing simplified.</p>
          </div>
          <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="margin: 0 0 8px; font-size: 22px; font-weight: 700;">Hi ${name.trim().split(' ')[0]}! 👋</h2>
            <p style="color: #6b7280; margin: 0 0 16px;">Thanks for getting in touch.</p>
            <p style="color: #374151; line-height: 1.6; margin: 0 0 16px;">
              I've received your message and will get back to you within 24 hours on business days.
            </p>
            <p style="color: #374151; line-height: 1.6; margin: 0;">
              Talk soon,<br/>
              <strong>Dottie 💚</strong>
            </p>
          </div>
          <div style="background: #f3f4f6; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; padding: 16px 32px; text-align: center;">
            <p style="margin: 0; font-size: 11px; color: #9ca3af;">© 2026 Dottie · <a href="https://www.godottie.cloud" style="color: #059669;">www.godottie.cloud</a></p>
          </div>
        </div>
      `,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    log.error('contact_form_send_failed', err, { ip })
    return NextResponse.json(
      { error: 'Failed to send message. Please email us directly at support@godottie.cloud.' },
      { status: 500 },
    )
  }
}
