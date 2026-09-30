import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign up',
  description:
    'Create your Dottie account and put your childminding invoices on autopilot. Simple plans, cancel anytime.',
  alternates: { canonical: 'https://www.godottie.cloud/signup' },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children
}
