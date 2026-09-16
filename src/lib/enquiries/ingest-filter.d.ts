export function parseFromHeader(raw?: string | null): { name: string | null; email: string | null }
export function sameEmail(a?: string | null, b?: string | null): boolean
export function headerMap(
  headers?: Record<string, string> | { name?: string; value?: string }[] | null,
): Record<string, string>
export function shouldIngestMessage(input: {
  from?: string | null
  connectedEmail?: string | null
  headers?: Record<string, string> | { name?: string; value?: string }[] | null
  labelIds?: string[]
}): boolean
export function inboundSlugFromRecipient(to?: string | null, domain?: string): string | null
