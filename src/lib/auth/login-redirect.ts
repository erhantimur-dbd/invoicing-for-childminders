/**
 * Where a signed-in visit to /login should go.
 * Same-origin paths only. /login itself would loop, so it falls back to the dashboard.
 */
export function loginRedirectTarget(nextParam: string | null | undefined): string {
  if (!nextParam) return '/dashboard'
  if (!nextParam.startsWith('/')) return '/dashboard'
  if (nextParam.startsWith('//') || nextParam.startsWith('/\\')) return '/dashboard'
  if (nextParam === '/login' || nextParam.startsWith('/login?') || nextParam.startsWith('/login/')) {
    return '/dashboard'
  }
  return nextParam
}
