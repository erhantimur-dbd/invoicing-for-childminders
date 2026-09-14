export const AUTH_CALLBACK_FAILED = 'Could not complete sign-in. Try Google or Apple again, or use email.'

export function loginErrorFromQuery(errorParam) {
  if (errorParam === 'auth_callback_failed') return AUTH_CALLBACK_FAILED
  return null
}
