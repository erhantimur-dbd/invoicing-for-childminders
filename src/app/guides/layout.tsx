import SiteHeader from '@/components/marketing/SiteHeader'
import SiteFooter from '@/components/marketing/SiteFooter'
import { marketing } from '@/lib/marketing.mjs'

export default function GuidesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${marketing.pageClass} min-h-screen flex flex-col`}
      style={{ backgroundColor: marketing.canvas, color: marketing.ink, fontFamily: marketing.fontFamily }}
    >
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  )
}
