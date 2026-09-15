import { sendEmail } from '@/lib/email/resend'
import { escalationEmail } from '@/lib/email/templates'
import { log } from '@/lib/log'
import { shouldSendEscalationEmail } from './notify-escalation.mjs'

export { shouldSendEscalationEmail }

export async function notifyHumanEscalation(input: {
  to?: string | null
  displayName?: string | null
  parentName?: string | null
  childName?: string | null
  reasons: string[]
  prospectId: string
}) {
  if (!input.to) return { sent: false, error: 'no_email' as const }
  const mail = escalationEmail({
    displayName: input.displayName,
    parentName: input.parentName,
    childName: input.childName,
    reasons: input.reasons,
    prospectId: input.prospectId,
  })
  const result = await sendEmail({ to: input.to, subject: mail.subject, html: mail.html })
  if (!result.success) {
    log.warn('escalation_email_failed', { prospect_id: input.prospectId, error: result.error })
  }
  return { sent: Boolean(result.success), error: result.error }
}
