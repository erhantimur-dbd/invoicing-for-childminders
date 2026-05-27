import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reset Your Password',
  description: 'Request a password reset link for your Dottie account.',
  alternates: { canonical: 'https://www.godottie.cloud/forgot-password' },
  robots: { index: false, follow: true },
}

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children
}
