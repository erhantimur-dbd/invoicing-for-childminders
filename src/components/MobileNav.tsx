'use client'

import { useState } from 'react'
import Link from 'next/link'
import { marketing, marketingCtaClass, ctaRadiusStyle } from '@/lib/marketing.mjs'

export default function MobileNav({
  signupHref,
  signupLabel,
}: {
  signupHref: string
  signupLabel: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-2 -mr-2 transition-colors"
        style={{ color: '#f6f7f9' }}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          {open ? (
            <>
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </>
          ) : (
            <>
              <path d="M4 7h16" />
              <path d="M4 12h16" />
              <path d="M4 17h16" />
            </>
          )}
        </svg>
      </button>

      <div
        className={`absolute top-16 left-0 right-0 border-b shadow-lg transition-all duration-200 ease-out ${open ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
        style={{ backgroundColor: marketing.hero, borderColor: marketing.heroHairline }}
      >
        <div className="max-w-[1120px] mx-auto px-6 py-4 flex flex-col gap-1">
          <a href="/#how-it-works" onClick={() => setOpen(false)} className="py-3 px-3 text-sm font-medium hover:text-white transition-colors" style={{ color: marketing.heroMuted }}>
            How it works
          </a>
          <a href="/#invoicing" onClick={() => setOpen(false)} className="py-3 px-3 text-sm font-medium hover:text-white transition-colors" style={{ color: marketing.heroMuted }}>
            Invoicing
          </a>
          <a href="/#pricing" onClick={() => setOpen(false)} className="py-3 px-3 text-sm font-medium hover:text-white transition-colors" style={{ color: marketing.heroMuted }}>
            Pricing
          </a>
          <Link href="/guides" onClick={() => setOpen(false)} className="py-3 px-3 text-sm font-medium hover:text-white transition-colors" style={{ color: marketing.heroMuted }}>
            Guides
          </Link>
          <Link href="/support" onClick={() => setOpen(false)} className="py-3 px-3 text-sm font-medium hover:text-white transition-colors" style={{ color: marketing.heroMuted }}>
            Support
          </Link>
          <Link href="/login" onClick={() => setOpen(false)} className="py-3 px-3 text-sm font-medium hover:text-white transition-colors" style={{ color: marketing.heroMuted }}>
            Sign in
          </Link>
          <Link
            href={marketing.ctas.demo.href}
            onClick={() => setOpen(false)}
            className={`${marketingCtaClass.secondaryOnDark} mt-2 !px-4 !py-2.5 text-sm`}
            style={ctaRadiusStyle()}
          >
            {marketing.ctas.demo.label}
          </Link>
          <Link
            href={signupHref}
            onClick={() => setOpen(false)}
            className={`${marketingCtaClass.primaryOnDark} mt-1 !px-4 !py-2.5 text-sm`}
            style={ctaRadiusStyle()}
          >
            {signupLabel}
          </Link>
        </div>
      </div>
    </div>
  )
}
