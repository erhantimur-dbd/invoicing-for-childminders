export type HoldbackCategory = 'safeguarding' | 'health' | 'complaint' | 'payment'

export type HoldbackDecision =
  | { decision: 'send' }
  | { decision: 'hold'; category: HoldbackCategory }
  | { decision: 'unclear' }
  | { decision: 'ambiguous' }

export function classifyHoldback(inbound: string, draft: string): HoldbackDecision

export function resolveAutoSendDecision(input?: {
  inboundText?: string | null
  draftText?: string | null
  needsHuman?: boolean
  classify?: (inbound: string, draft: string) => HoldbackDecision | Promise<HoldbackDecision>
  timeoutMs?: number
}): Promise<{ send: boolean; reason: string }>

export function childminderFooterName(
  displayName?: string | null,
  fullName?: string | null,
): string | null

export function autoSendFooterLine(name?: string | null): string

export function composeOutboundBody(
  body: string,
  via: 'auto' | 'approve' | 'manual' | undefined,
  name?: string | null,
): string

export function markAutoSendHeld(
  supabase: unknown,
  userId: string,
  prospectId: string,
  draftId: string,
): Promise<void>
