export const SEND_MODES = ['auto', 'approve'] as const

export type SendMode = (typeof SEND_MODES)[number]

export const DEFAULT_SEND_MODE: SendMode = 'auto'

export function parseSendMode(value: string | null | undefined): SendMode {
  if (value === 'approve') return 'approve'
  if (value === 'auto') return 'auto'
  return DEFAULT_SEND_MODE
}

export function isAutoSendEnabled(settings: {
  agent_paused?: boolean | null
  send_mode?: string | null
} | null | undefined): boolean {
  if (!settings) return false
  if (settings.agent_paused) return false
  return parseSendMode(settings.send_mode) === 'auto'
}
