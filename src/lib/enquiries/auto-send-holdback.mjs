/**
 * Server-side gate for automatic Gmail replies.
 * Keyword check on the inbound message and the draft, plus the needsHuman
 * flag from decideHumanEscalation. Errors, timeouts, and unclear results
 * hold the send. The draft is already saved by the caller.
 */

const RULES = [
  {
    category: 'safeguarding',
    pattern: /\b(safeguarding|child protection|child-protection|lado|neglect|physical abuse|sexual abuse|emotional abuse|welfare concern)\b/i,
  },
  {
    category: 'health',
    pattern: /\b(allerg(?:y|ies|ic)|medical|medications?|medicines?|inhaler|epipen|epi-pen|anaphylaxis|asthma|eczema|epilepsy|diabetes|autism|adhd|disabilit\w*|special needs|special educational needs|ehcp|health condition|medical condition|prescribed)\b|\bsen\b/i,
  },
  {
    category: 'complaint',
    pattern: /\b(complaints?|complained|complaining|dissatisfied|unhappy with)\b/i,
  },
  {
    category: 'payment',
    pattern: /\b(payment disputes?|overcharg\w*|refunds?|billing disputes?|invoice disputes?|did(?:n't| not) pay|have(?:n't| not) paid|wrong(?:ly)? charg\w*|non-?payment)\b|\bdisput(?:e|es|ed)(?:\s+\w+){0,4}\s+(?:payments?|invoices?|fees?|bills?|charges?)\b/i,
  },
]

export function classifyHoldback(inbound, draft) {
  const text = `${inbound || ''}\n${draft || ''}`
  if (/\bSEND\b/.test(text)) return { decision: 'hold', category: 'health' }
  for (const rule of RULES) {
    if (rule.pattern.test(text)) return { decision: 'hold', category: rule.category }
  }
  return { decision: 'send' }
}

function interpret(result, needsHuman) {
  if (!result || typeof result !== 'object' || result.decision == null) {
    return { send: false, reason: 'unclear' }
  }
  if (result.decision === 'hold') return { send: false, reason: result.category || 'hold' }
  if (result.decision === 'send') {
    if (needsHuman) return { send: false, reason: 'needs_human' }
    return { send: true, reason: 'clear' }
  }
  if (result.decision === 'ambiguous') return { send: false, reason: 'ambiguous' }
  return { send: false, reason: 'unclear' }
}

export async function resolveAutoSendDecision(input = {}) {
  const timeoutMs = Number.isFinite(input.timeoutMs) ? input.timeoutMs : 1500
  const classify = input.classify || classifyHoldback
  let timer
  try {
    const result = await Promise.race([
      Promise.resolve().then(() => classify(input.inboundText || '', input.draftText || '')),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const err = new Error('timeout')
          err.code = 'timeout'
          reject(err)
        }, timeoutMs)
      }),
    ])
    return interpret(result, Boolean(input.needsHuman))
  } catch (err) {
    const code = err && typeof err === 'object' && err.code === 'timeout' ? 'timeout' : 'error'
    return { send: false, reason: code }
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export function childminderFooterName(displayName, fullName) {
  const display = typeof displayName === 'string' ? displayName.trim() : ''
  if (display) return display
  const full = typeof fullName === 'string' ? fullName.trim() : ''
  if (!full) return null
  return full.split(/\s+/)[0] || null
}

export function autoSendFooterLine(name) {
  const trimmed = typeof name === 'string' ? name.trim() : ''
  if (!trimmed) return 'Written with Go Dottie, an AI assistant.'
  return `Written with Go Dottie, ${trimmed}'s AI assistant.`
}

/** Footer is added only when via is auto. Approve and manual sends stay as written. */
export function composeOutboundBody(body, via, name) {
  const original = String(body || '').trim()
  if (via !== 'auto') return original
  const footer = autoSendFooterLine(name)
  if (original.endsWith(footer)) return original
  return original ? `${original}\n\n${footer}` : footer
}

export async function markAutoSendHeld(supabase, userId, prospectId, draftId) {
  try {
    await supabase.from('enquiry_messages').update({ status: 'needs_human' }).eq('id', draftId).eq('user_id', userId)
    await supabase.from('enquiry_prospects').update({ needs_human: true }).eq('id', prospectId).eq('user_id', userId)
  } catch {
    // The draft row is already saved. A failed status update must not fall through to send.
  }
}
