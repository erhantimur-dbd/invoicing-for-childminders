import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { nuancesFromDraft, mergeNuances } from '@/lib/enquiries/learn-nuance.mjs'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { prospectId?: string; draftBody?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.draftBody) return NextResponse.json({ error: 'Missing draft.' }, { status: 400 })

  const { data: settings } = await supabase
    .from('enquiry_settings')
    .select('display_name, learned_nuances')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!settings) return NextResponse.json({ error: 'Finish setup first.' }, { status: 400 })

  const incoming = nuancesFromDraft(body.draftBody, settings.display_name)
  const learned = mergeNuances(settings.learned_nuances || [], incoming)
  await supabase
    .from('enquiry_settings')
    .update({ learned_nuances: learned, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true, learned, added: incoming.length })
}
