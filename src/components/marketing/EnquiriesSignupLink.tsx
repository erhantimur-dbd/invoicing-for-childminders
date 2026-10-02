import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { isPaidSignupOpen } from '@/lib/stripe/prices'
import { enquiriesSignupCta } from '@/lib/enquiries-signup.mjs'

/**
 * Sign up when Enquiries checkout is open. Book a demo when it is closed.
 * The closed control is never a greyed-out signup link.
 */
export async function EnquiriesSignupLink({
  href = '/signup',
  label,
  className,
  style,
}: {
  href?: string
  label: ReactNode
  className?: string
  style?: CSSProperties
}) {
  const open = await isPaidSignupOpen()
  const cta = enquiriesSignupCta(open)
  return (
    <Link href={open ? href : cta.href} className={className} style={style}>
      {open ? label : cta.label}
    </Link>
  )
}
