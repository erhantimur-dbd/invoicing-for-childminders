import type { EnquiryKnowledge, EnquiryProspect, EnquirySettings } from './types'

export type PackKind = 'thankyou' | 'policies' | 'pack'

export type ParentLetter = {
  to: string
  subject: string
  text: string
  html: string
  replyTo?: string
}

function firstName(prospect: EnquiryProspect): string {
  const n = prospect.parent_name?.trim()
  if (!n) return ''
  return n.split(/\s+/)[0]
}

function signOff(settings: EnquirySettings): string {
  return settings.display_name?.trim() || 'Your childminder'
}

export function packPageUrl(slug: string | null | undefined, origin?: string | null): string | null {
  if (!slug) return null
  const base = String(origin || process.env.NEXT_PUBLIC_APP_URL || 'https://www.godottie.cloud').replace(/\/$/, '')
  return `${base}/pack/${encodeURIComponent(slug)}`
}

export function packFilePublicUrl(filePath: string | null | undefined): string | null {
  if (!filePath) return null
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) return null
  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/enquiry-pack/${filePath}`
}

function policiesList(
  knowledge: EnquiryKnowledge[],
  packUrl: string | null,
): string {
  const docs = knowledge.filter((k) => k.kind === 'document' && k.file_name)
  const notes = knowledge.filter((k) => (k.kind === 'faq' || k.kind === 'note') && k.answer)
  const lines: string[] = []
  if (packUrl) {
    lines.push(`Download your forms and policies here: ${packUrl}`)
  }
  for (const d of docs) {
    const href = packFilePublicUrl(d.file_path)
    lines.push(href ? `- ${d.file_name}: ${href}` : `- ${d.file_name}`)
  }
  for (const n of notes) {
    const title = n.question || 'Note'
    lines.push(`- ${title}: ${n.answer}`)
  }
  if (!lines.length) {
    return '- Our policies will follow in a second email.'
  }
  return lines.join('\n')
}

function htmlFromText(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return `<p style="white-space:pre-wrap;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.55;color:#0b1220;">${escaped}</p>`
}

export function buildParentLetter(input: {
  kind: PackKind
  prospect: EnquiryProspect
  settings: EnquirySettings
  knowledge: EnquiryKnowledge[]
  paymentNote?: string | null
  origin?: string | null
}): ParentLetter | null {
  const to = input.prospect.parent_email?.trim()
  if (!to) return null

  const name = firstName(input.prospect)
  const thanks = name ? `Thank you for your email, ${name}.` : 'Thank you for your email.'
  const afterVisit = name
    ? `Thank you for coming to visit, ${name}.`
    : 'Thank you for coming to visit.'
  const stage = String(input.prospect.stage)
  const visited = Boolean(input.prospect.visit_at)
    || stage === 'visit'
    || stage === 'awaiting'
    || stage === 'accepted'
  const sign = signOff(input.settings)
  const ofsted = input.settings.ofsted_urn
    ? `We are registered with Ofsted (URN ${input.settings.ofsted_urn}).`
    : 'Our Ofsted registration details are included with our policies.'
  const certs = input.settings.certifications?.trim()
    ? `Certificates: ${input.settings.certifications.trim()}.`
    : ''
  const packUrl = packPageUrl(input.settings.inbound_slug, input.origin)
  const policies = policiesList(input.knowledge, packUrl)
  const payment = input.paymentNote?.trim()
    || input.settings.payment_instructions?.trim()
    || 'Payment instructions will be on your first invoice, and we will go through them when you start.'
  const registrationBlock = [ofsted, certs].filter(Boolean).join('\n')

  let subject = ''
  let text = ''

  if (input.kind === 'thankyou') {
    subject = visited ? 'Thank you for coming to visit' : 'Thank you for your enquiry'
    text = visited
      ? `${afterVisit}

It was a pleasure to meet you. After careful thought, I am sorry to say we are not able to offer a place at this time. I wish you both well with your search.

Kind regards
${sign}`
      : `${thanks}

Thank you for considering us. I am sorry to say we are not able to offer a place at this time. I wish you both well with your search.

Kind regards
${sign}`
  } else if (input.kind === 'policies') {
    subject = 'Our policies and registration'
    text = `${afterVisit}

It was lovely to meet you both. As discussed, here is how we are registered, together with our policies and certificates:

${registrationBlock}

${policies}

I look forward to hearing from you.

Kind regards
${sign}`
  } else {
    subject = 'Your starter pack'
    text = `${afterVisit}

We are delighted to offer you a place. Please download your forms and policies using the link below, complete them, and return them when you can.

${registrationBlock}

${policies}

Payment
${payment}

I look forward to welcoming you both.

Kind regards
${sign}`
  }

  return {
    to,
    subject,
    text,
    html: htmlFromText(text),
    replyTo: undefined,
  }
}
