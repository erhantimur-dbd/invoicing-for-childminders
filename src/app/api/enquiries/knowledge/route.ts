import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadEnquiryAgentsPolicy } from '@/lib/enquiries/agents-policy.mjs'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  let body: { id?: string; action?: string; question?: string; answer?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.id || (body.action !== 'approve' && body.action !== 'dismiss')) {
    return NextResponse.json({ error: 'Missing pending item.' }, { status: 400 })
  }

  const policy = loadEnquiryAgentsPolicy()
  if (body.action === 'approve' && !policy.learning) {
    return NextResponse.json({ error: 'Learning is off in AGENTS.md.' }, { status: 403 })
  }

  const { data: pending } = await supabase
    .from('enquiry_knowledge_pending')
    .select('*')
    .eq('id', body.id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!pending) return NextResponse.json({ error: 'Not found.' }, { status: 404 })

  if (body.action === 'dismiss') {
    await supabase
      .from('enquiry_knowledge_pending')
      .update({ status: 'dismissed', updated_at: new Date().toISOString() })
      .eq('id', pending.id)
    return NextResponse.json({ ok: true, status: 'dismissed' })
  }

  if (policy.never_learn.includes(pending.reason)) {
    return NextResponse.json({ error: 'This topic cannot be added to Your answers.' }, { status: 403 })
  }

  const question = (body.question || pending.question || '').trim()
  const answer = (body.answer || pending.suggested_answer || '').trim()
  if (!question || !answer) {
    return NextResponse.json({ error: 'Add a question and an answer.' }, { status: 400 })
  }

  const { error: insertError } = await supabase.from('enquiry_knowledge').insert({
    user_id: user.id,
    kind: 'faq',
    question,
    answer,
  })
  if (insertError) return NextResponse.json({ error: 'Could not save.' }, { status: 500 })

  await supabase
    .from('enquiry_knowledge_pending')
    .update({ status: 'approved', question, suggested_answer: answer, updated_at: new Date().toISOString() })
    .eq('id', pending.id)

  return NextResponse.json({ ok: true, status: 'approved' })
}
