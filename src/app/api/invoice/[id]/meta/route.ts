import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Returns only non-sensitive metadata for the DOB gate prompt
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for invoice meta')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let supabaseAdmin
  try {
    supabaseAdmin = getAdminClient()
  } catch {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .select('id, children(first_name)')
    .eq('id', id)
    .single()

  if (error || !invoice) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const child = (invoice as unknown as { children?: { first_name: string } | null }).children
  return NextResponse.json({ childFirstName: child?.first_name ?? null })
}
