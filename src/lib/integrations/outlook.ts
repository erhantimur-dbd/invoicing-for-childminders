/** Outlook / Microsoft Graph adapter. Not wired for launch. */
export function outlookNotImplemented() {
  return { ok: false as const, error: 'outlook_not_implemented' as const }
}
