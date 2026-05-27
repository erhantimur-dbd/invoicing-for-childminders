import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Start Your Free Trial',
  description:
    'Create your Dottie account and start a 7-day free trial — no credit card required. Automated invoicing built for UK childminders.',
  alternates: { canonical: 'https://www.godottie.cloud/signup' },
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children
}
