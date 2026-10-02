import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/resend'
import { rateLimit, clientIp } from '@/lib/rate-limit'
import { log } from '@/lib/log'
import { contactAutoReplyEmail, contactInboxNoticeEmail } from '@/lib/email/transactional'

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

  // ── Send email via the Resend chokepoint ────────────────────────────────
  const inbox = contactInboxNoticeEmail({
    name: name.trim(),
    email: email.trim(),
    subject: subject?.trim() || '',
    message: message.trim(),
    ip,
  })
  const reply = contactAutoReplyEmail({ name: name.trim() })

  const sendFailed = NextResponse.json(
    { error: 'Failed to send message. Please email us directly at support@godottie.cloud.' },
    { status: 500 },
  )

  try {
    const toSupport = await sendEmail({
      from: 'Go Dottie contact form <hello@godottie.cloud>',
      to: 'support@godottie.cloud',
      replyTo: email.trim(),
      subject: inbox.subject,
      html: inbox.html,
    })
    if (!toSupport.success) return sendFailed

    const autoReply = await sendEmail({
      from: 'Go Dottie <hello@godottie.cloud>',
      to: email.trim(),
      subject: reply.subject,
      html: reply.html,
    })
    if (!autoReply.success) return sendFailed

    return NextResponse.json({ ok: true })
  } catch (err) {
    log.error('contact_form_send_failed', err, { ip })
    return NextResponse.json(
      { error: 'Failed to send message. Please email us directly at support@godottie.cloud.' },
      { status: 500 },
    )
  }
}
