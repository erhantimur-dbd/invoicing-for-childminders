import { NextResponse } from 'next/server'
import { ingestParentEmail } from '@/lib/enquiries/ingest'
import { inboundSlugFromRecipient } from '@/lib/enquiries/ingest-filter.mjs'
import { supabaseAdmin } from '@/lib/integrations/admin'
import { log } from '@/lib/log'

export async function POST(request: Request) {
  const secret = process.env.INBOUND_WEBHOOK_SECRET
  const header = request.headers.get('authorization') || request.headers.get('x-inbound-secret')
  if (secret && header !== `Bearer ${secret}` && header !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = supabaseAdmin()
  if (!admin) return NextResponse.json({ error: 'Service role not configured' }, { status: 500 })

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const to = String(body.to || body.recipient || '')
  const from = String(body.from || body.sender || '')
  const subject = String(body.subject || '')
  const text = String(body.text || body['stripped-text'] || body.html || '')
  const slug = inboundSlugFromRecipient(to)
  if (!slug || !from) {
    return NextResponse.json({ error: 'Missing recipient or sender' }, { status: 400 })
  }

  const { data: settings } = await admin
    .from('enquiry_settings')
    .select('user_id')
    .eq('inbound_slug', slug)
    .maybeSingle()
  if (!settings) return NextResponse.json({ error: 'Unknown inbox' }, { status: 404 })

  try {
    const result = await ingestParentEmail({
      supabase: admin,
      userId: settings.user_id,
      from,
      to,
      subject,
      body: text,
      providerMessageId: body.id ? `forward:${body.id}` : `forward:${slug}:${from}:${subject}:${text.slice(0, 40)}`,
      source: 'forward',
    })
    return NextResponse.json(result)
  } catch (err) {
    log.error('inbound_ingest_failed', err, { slug })
    return NextResponse.json({ error: 'ingest_failed' }, { status: 500 })
  }
}
