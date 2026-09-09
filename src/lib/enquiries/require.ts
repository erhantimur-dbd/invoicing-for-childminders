import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { enquiriesActive } from '@/lib/enquiries/access'

type EnquiriesAuth =
  | { error: NextResponse; supabase?: undefined; user?: undefined }
  | { error?: undefined; supabase: Awaited<ReturnType<typeof createClient>>; user: User }

export async function requireEnquiriesUser(): Promise<EnquiriesAuth> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorised' }, { status: 401 }) }
  }

  const { data: sub } = await supabase
    .from('subscriptions')
    .select('enquiries_status')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!enquiriesActive(sub)) {
    return { error: NextResponse.json({ error: 'Turn on Enquiries first.' }, { status: 403 }) }
  }

  return { supabase, user }
}
