import SiteHeader from '@/components/marketing/SiteHeader'
import SiteFooter from '@/components/marketing/SiteFooter'
import { marketing } from '@/lib/marketing.mjs'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${marketing.pageClass} min-h-screen flex flex-col`}
      style={{ backgroundColor: marketing.canvas, color: marketing.ink, fontFamily: marketing.fontFamily }}
    >
      <SiteHeader />
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <p className="text-[17px] font-semibold tracking-tight">{marketing.brand}</p>
            <p className="text-[13px] mt-1" style={{ color: marketing.muted }}>
              {marketing.tagline}
            </p>
          </div>
          {children}
        </div>
      </div>
      <SiteFooter />
    </div>
  )
}
