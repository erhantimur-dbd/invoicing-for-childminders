export const AGENT_PAUSED_MESSAGE =
  'Go Dottie is paused — it will not read Gmail, draft, or send replies until you turn it back on.'

export function isAgentPaused(settings: { agent_paused?: boolean | null } | null | undefined): boolean {
  return Boolean(settings?.agent_paused)
}

export function isGmailPollingAllowed(
  settings: { agent_paused?: boolean | null } | null | undefined,
): boolean {
  return !isAgentPaused(settings)
}
