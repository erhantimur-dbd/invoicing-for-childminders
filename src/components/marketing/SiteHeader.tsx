import Link from 'next/link'
import MobileNav from '@/components/MobileNav'
import { marketing, marketingCtaClass, ctaRadiusStyle } from '@/lib/marketing.mjs'

export default function SiteHeader() {
  return (
    <header
      className="sticky top-0 z-50 border-b"
      style={{ backgroundColor: marketing.hero, borderColor: marketing.heroHairline, color: '#f6f7f9' }}
    >
      <div className="max-w-[1120px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="text-[16px] font-semibold tracking-tight shrink-0">
          {marketing.brand}
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
          <Link
            href={marketing.ctas.demo.href}
            className={`${marketingCtaClass.secondaryOnDark} !px-4 !py-1.5 text-[13px]`}
            style={ctaRadiusStyle()}
          >
            {marketing.ctas.demo.label}
          </Link>
          <Link
            href={marketing.ctas.signup.href}
            className={`${marketingCtaClass.primaryOnDark} !px-4 !py-1.5 text-[13px]`}
            style={ctaRadiusStyle()}
          >
            {marketing.ctas.signup.label}
          </Link>
        </div>

        <MobileNav />
      </div>
    </header>
  )
}
