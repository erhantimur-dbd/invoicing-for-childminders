export function makeInboundSlug(displayName: string | null | undefined, userId: string): string {
  const base = (displayName || 'childminder')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24) || 'childminder'
  const tail = userId.replace(/-/g, '').slice(0, 6)
  return `${base}-${tail}`
}
