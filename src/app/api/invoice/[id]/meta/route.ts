import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error('Supabase is not configured.')
  }
  return createClient(url, key)
}

// Returns only non-sensitive metadata for the DOB gate prompt
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabaseAdmin = getAdmin()

  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .select('id, children(first_name)')
    .eq('id', id)
    .single()

  if (error || !invoice) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const child = (invoice as any).children
  return NextResponse.json({ childFirstName: child?.first_name ?? null })
}
