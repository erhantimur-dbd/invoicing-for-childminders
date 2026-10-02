import Link from 'next/link'
import MobileNav from '@/components/MobileNav'
import { marketing, marketingCtaClass, ctaRadiusStyle } from '@/lib/marketing.mjs'
import { readPaidSignupOpen } from '@/lib/paid-signup-render'
import { companionCta, enquiriesSignupCta } from '@/lib/enquiries-signup.mjs'

export default async function SiteHeader() {
  const paymentsOpen = await readPaidSignupOpen()
  const signup = enquiriesSignupCta(paymentsOpen)
  const companion = companionCta(paymentsOpen)
  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{ backgroundColor: marketing.hero, borderColor: marketing.heroHairline, color: '#f6f7f9' }}
    >
      <div className="max-w-[1120px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="shrink-0 flex items-center gap-2 leading-tight">
          <img src="/icon.svg" alt="" width={28} height={28} className="h-7 w-7 shrink-0" />
          <span>
            <span className="block text-[16px] font-semibold tracking-tight">{marketing.brand}</span>
            <span
              className="block text-[11px] font-normal tracking-tight mt-0.5 whitespace-nowrap"
              style={{ color: marketing.heroMuted }}
            >
              {marketing.navTagline}
            </span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-[13px]" style={{ color: marketing.heroMuted }}>
          <a href="/#how-it-works" className="hover:text-white transition-colors">How it works</a>
          <a href="/#invoicing" className="hover:text-white transition-colors">Invoicing</a>
          <a href="/#pricing" className="hover:text-white transition-colors">Pricing</a>
          <Link href="/guides" className="hover:text-white transition-colors">Guides</Link>
          <Link href="/support" className="hover:text-white transition-colors">Support</Link>
          <Link href="/login" className="hover:text-white transition-colors">Sign in</Link>
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {paymentsOpen ? (
            <Link
              href={companion.href}
              className={`${marketingCtaClass.secondaryOnDark} !px-4 !py-1.5 text-[13px]`}
              style={ctaRadiusStyle()}
            >
              {companion.label}
            </Link>
          ) : null}
          <Link
            href={signup.href}
            className={`${marketingCtaClass.primaryOnDark} !px-4 !py-1.5 text-[13px]`}
            style={ctaRadiusStyle()}
          >
            {signup.label}
          </Link>
        </div>

        <MobileNav
          signupHref={signup.href}
          signupLabel={signup.label}
          companionHref={companion.href}
          companionLabel={companion.label}
          showCompanion={paymentsOpen}
        />
      </div>
    </header>
  )
}
