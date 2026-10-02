import SiteHeader from '@/components/marketing/SiteHeader'
import SiteFooter from '@/components/marketing/SiteFooter'
import { marketing } from '@/lib/marketing.mjs'
import { readPaidSignupOpen } from '@/lib/paid-signup-render'
import { freeTrialAnswerParts } from '@/lib/enquiries-signup.mjs'
import SupportClient from './support-client'

export default async function SupportPage() {
  const trial = freeTrialAnswerParts(await readPaidSignupOpen())
  return (
    <div
      className={`${marketing.pageClass} min-h-screen flex flex-col`}
      style={{ backgroundColor: marketing.canvas, color: marketing.ink, fontFamily: marketing.fontFamily }}
    >
      <SiteHeader />
      <SupportClient
        trialText={trial.text}
        trialHref={trial.href}
        trialLinkLabel={trial.linkLabel}
      />
      <SiteFooter />
    </div>
  )
}
