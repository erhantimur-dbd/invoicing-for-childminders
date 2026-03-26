import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Uses service role so we can read invoice by ID without auth
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: invoice, error } = await supabaseAdmin
    .from('invoices')
    .select('*, children(first_name, last_name, parent_name, parent_email), invoice_line_items(*)')
    .eq('id', id)
    .single()

  if (error || !invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  // Fetch childminder profile + primary bank account
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('full_name, email, phone, address_line1, address_line2, city, postcode, ofsted_number, show_ofsted_on_invoice, primary_bank_account_id')
    .eq('id', invoice.childminder_id)
    .single()

  let bankAccount = null
  if (profile?.primary_bank_account_id) {
    const { data: bank } = await supabaseAdmin
      .from('bank_accounts')
      .select('bank_name, account_name, sort_code, account_number')
      .eq('id', profile.primary_bank_account_id)
      .single()
    bankAccount = bank
  }

  return NextResponse.json({ invoice, profile, bankAccount })
}
