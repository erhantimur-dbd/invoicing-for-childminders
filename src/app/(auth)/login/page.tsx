import { readPaidSignupOpen } from '@/lib/paid-signup-render'
import { enquiriesSignupCta } from '@/lib/enquiries-signup.mjs'
import { SIGN_UP_CTA } from '@/lib/plans-copy.mjs'
import LoginForm from './login-form'

export default async function LoginPage() {
  const open = await readPaidSignupOpen()
  const signup = open ? { href: '/signup', label: SIGN_UP_CTA } : enquiriesSignupCta(false)
  return <LoginForm signupHref={signup.href} signupLabel={signup.label} />
}
