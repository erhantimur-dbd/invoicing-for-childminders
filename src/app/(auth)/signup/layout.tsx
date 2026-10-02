import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { readPaidSignupOpen } from '@/lib/paid-signup-render'

export const metadata: Metadata = {
  title: 'Sign up',
  description:
    'Create your Go Dottie account and start with Enquiries — new parents, 15/30-hour funding, visits. Add invoicing when a child starts.',
  alternates: { canonical: 'https://www.godottie.cloud/signup' },
}

export default async function SignupLayout({ children }: { children: React.ReactNode }) {
  if (!(await readPaidSignupOpen())) redirect('/demo')
  return children
}
