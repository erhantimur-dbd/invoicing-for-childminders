export const ADMIN_GUARDRAILS_VERSION: string
export const ADMIN_GUARDRAILS_LOCKED: true
export const ADMIN_JOB: string
export const ADMIN_REPLY_PATTERN: string
export const ADMIN_HARD_RULES: string
export function adminSystemPrompt(displayName?: string | null): string
export function sanitiseAccountGuardrails(raw?: string | null): string
export function accountCustomisationBlock(raw?: string | null): string
