import Link from 'next/link'
import { marketing } from '@/lib/marketing.mjs'

export default function SiteFooter() {
  return (
    <footer style={{ backgroundColor: marketing.hero, color: '#f6f7f9', borderTop: `1px solid ${marketing.heroHairline}` }}>
      <div className="max-w-[1120px] mx-auto px-6 py-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div className="lg:col-span-1">
          <p className="text-[16px] font-semibold tracking-tight">{marketing.brand}</p>
          <p className="text-[13px] mt-3 max-w-[28ch] leading-relaxed" style={{ color: marketing.heroMuted }}>
            {marketing.tagline}
          </p>
        </div>
        <div>
          <p className="marketing-kicker mb-4" style={{ color: marketing.heroMuted }}>Product</p>
          <nav className="flex flex-col gap-2.5 text-[13px]" style={{ color: marketing.heroMuted }}>
            <a href="/#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="/#invoicing" className="hover:text-white transition-colors">Invoicing</a>
            <a href="/#pricing" className="hover:text-white transition-colors">Pricing</a>
            <Link href={marketing.ctas.signup.href} className="hover:text-white transition-colors">
              {marketing.ctas.signup.label}
            </Link>
          </nav>
        </div>
        <div>
          <p className="marketing-kicker mb-4" style={{ color: marketing.heroMuted }}>Company</p>
          <nav className="flex flex-col gap-2.5 text-[13px]" style={{ color: marketing.heroMuted }}>
            <Link href="/guides" className="hover:text-white transition-colors">Guides</Link>
            <Link href="/support" className="hover:text-white transition-colors">Support</Link>
            <Link href="/faq" className="hover:text-white transition-colors">FAQ</Link>
            <Link href="/login" className="hover:text-white transition-colors">Sign in</Link>
          </nav>
        </div>
        <div>
          <p className="marketing-kicker mb-4" style={{ color: marketing.heroMuted }}>Legal</p>
          <nav className="flex flex-col gap-2.5 text-[13px]" style={{ color: marketing.heroMuted }}>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </nav>
        </div>
      </div>
      <div
        className="max-w-[1120px] mx-auto px-6 pb-10 pt-2 text-[12px]"
        style={{ color: marketing.heroMuted, borderTop: `1px solid ${marketing.heroHairline}` }}
      >
        <p className="pt-6">© {new Date().getFullYear()} Dottie. All rights reserved.</p>
      </div>
    </footer>
  )
}
