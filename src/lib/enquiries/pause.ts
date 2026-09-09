export const AGENT_PAUSED_MESSAGE =
  'Dottie is paused — she will not draft or send replies until you turn her back on.'

export function isAgentPaused(settings: { agent_paused?: boolean | null } | null | undefined): boolean {
  return Boolean(settings?.agent_paused)
}
