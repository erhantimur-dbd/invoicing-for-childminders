import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createInvoiceToken } from '@/lib/invoiceToken'

const MAX_ATTEMPTS = 5
const WINDOW_MINUTES = 15

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for invoice verify')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: invoiceId } = await params
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

  let supabaseAdmin
  try {
    supabaseAdmin = getAdminClient()
  } catch {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // 1. Rate limit — count failed attempts in the last WINDOW_MINUTES
  const windowStart = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString()
  const { count: recentFailures } = await supabaseAdmin
    .from('invoice_access_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('invoice_id', invoiceId)
    .eq('ip', ip)
    .eq('success', false)
    .gte('attempted_at', windowStart)

  const failures = recentFailures ?? 0
  if (failures >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: 'Too many attempts. Please contact your childminder for help.', locked: true },
      { status: 429 }
    )
  }

  // 2. Parse body
  let dob: string
  try {
    const body = await req.json()
    dob = (body.dob || '').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  if (!dob) {
    return NextResponse.json({ error: 'Date of birth is required' }, { status: 400 })
  }

  // 3. Look up invoice → child DOB
  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .select('id, child_id, children(date_of_birth, first_name)')
    .eq('id', invoiceId)
    .single()

  if (error || !invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  const child = (invoice as unknown as {
    children?: { date_of_birth: string | null; first_name: string } | null
  }).children
  const storedDob: string | null = child?.date_of_birth ?? null

  // 4. Compare DOB (both normalised to YYYY-MM-DD)
  const normalise = (d: string) => d.trim().replace(/\//g, '-')
  const match = Boolean(storedDob && normalise(dob) === normalise(storedDob))

  // 5. Record attempt
  await supabaseAdmin.from('invoice_access_attempts').insert({
    invoice_id: invoiceId,
    ip,
    success: match,
  })

  if (!match) {
    const remaining = MAX_ATTEMPTS - failures - 1
    return NextResponse.json(
      {
        error: `Incorrect date of birth. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
        remaining,
      },
      { status: 401 }
    )
  }

  // 6. Issue token
  try {
    const token = createInvoiceToken(invoiceId)
    return NextResponse.json({ token, childFirstName: child?.first_name })
  } catch (err) {
    console.error('createInvoiceToken failed:', err)
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
}
