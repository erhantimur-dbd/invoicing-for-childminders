/**
 * Privacy SoT (Marco / Erhan).
 *
 * Gmail is only used to detect new childcare enquiry messages.
 * Everything else is classified in memory and discarded — never written to our DB.
 * The portal stores enquiry prospects and those classified messages only.
 * No mailbox dumps, quarantine archive, receipts, newsletters, or personal mail.
 * Scopes stay gmail.readonly + gmail.send. Pause and disconnect stop polling
 * and block draft + send. Auto-send / Draft & approve apply only after classify.
 */

import type { MailDecision } from './filters'

export function shouldPersistEnquiry(decision: MailDecision): boolean {
  return decision.include
}

/** Non-matches are dropped from headers, labels, and snippet. Do not fetch the body. */
export function rejectWithoutFetchingBody(decision: MailDecision): boolean {
  return !shouldPersistEnquiry(decision)
}
