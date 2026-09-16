/**
 * Parent facts for the Enquiries draft model. SEN / extra-needs text is
 * redacted: it can be Art. 9 health data and is not sent to US AI processors.
 * Stored on the prospect for the childminder only. See privacy + Article 50.
 */
/** Product lock: human-approved letters in the childminder's voice. Do not stamp AI on parent mail. */
export const ARTICLE_50_DECISION = 'keep_human_approved_mary_letters'

export const SEN_REDACTED =
  'mentioned (details not sent to the AI — the childminder will cover this in person if needed)'

export function senNotesForModel(senNotes) {
  const t = String(senNotes || '').trim()
  if (!t) return 'none'
  return SEN_REDACTED
}

export function parentBlockForModel(prospect, fundingLabel) {
  return `This parent
Stage: ${prospect.stageLabel || prospect.stage || 'unknown'}
Parent: ${prospect.parent_name || 'unknown'} <${prospect.parent_email || 'no email'}>
Child: ${prospect.child_name || 'unknown'} (${prospect.child_age_text || prospect.child_dob || 'age unknown'})
Start date: ${prospect.start_date || 'unknown'}
Days: ${prospect.days_needed || 'unknown'}
Hours: ${prospect.hours_needed || 'unknown'}
Funding: ${fundingLabel}
Extra needs they mentioned: ${senNotesForModel(prospect.sen_notes)}`
}
