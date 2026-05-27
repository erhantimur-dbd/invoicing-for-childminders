import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Support for UK Childminders',
  description:
    'Get help with Dottie — automated invoicing for UK childminders. Contact our support team or browse common questions.',
  alternates: { canonical: 'https://www.godottie.cloud/support' },
}

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  return children
}
