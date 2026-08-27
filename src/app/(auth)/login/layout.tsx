import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to Dottie — Enquiries for new parents, invoicing when they start.',
  alternates: { canonical: 'https://www.godottie.cloud/login' },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
