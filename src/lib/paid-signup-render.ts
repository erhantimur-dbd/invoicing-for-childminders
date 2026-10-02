import { connection } from 'next/server'
import { isPaidSignupOpen } from '@/lib/stripe/prices'

/**
 * Request-time read of `isPaidSignupOpen` for server components.
 * In Production, `connection()` keeps the result off the static build so a
 * missing or inactive live price fails closed on the next request. The
 * helper's own cache still covers the Stripe lookup. Route handlers keep
 * calling `isPaidSignupOpen` directly; they already run per request.
 */
export async function readPaidSignupOpen(): Promise<boolean> {
  if (process.env.VERCEL_ENV === 'production') {
    await connection()
  }
  return isPaidSignupOpen()
}
