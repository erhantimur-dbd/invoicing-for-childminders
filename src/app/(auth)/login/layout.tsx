import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Dottie account to manage invoices, children, and expenses.',
  alternates: { canonical: 'https://www.godottie.cloud/login' },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
