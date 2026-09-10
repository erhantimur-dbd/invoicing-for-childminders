export const SEND_MODES = ['approve', 'auto'] as const

export type SendMode = (typeof SEND_MODES)[number]

export const DEFAULT_SEND_MODE: SendMode = 'approve'

export function parseSendMode(value: string | null | undefined): SendMode {
  return value === 'auto' ? 'auto' : DEFAULT_SEND_MODE
}

export function isAutoSendEnabled(settings: {
  agent_paused?: boolean | null
  send_mode?: string | null
} | null | undefined): boolean {
  if (!settings) return false
  if (settings.agent_paused) return false
  return parseSendMode(settings.send_mode) === 'auto'
}
