import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign up',
  description:
    'Create your Dottie account and start with Enquiries — new parents, 15/30-hour funding, visits. Add invoicing when a child starts.',
  alternates: { canonical: 'https://www.godottie.cloud/signup' },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children
}
