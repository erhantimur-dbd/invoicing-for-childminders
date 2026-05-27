'use client'

import { useEffect, useState } from 'react'
import Script from 'next/script'
import Link from 'next/link'

const STORAGE_KEY = 'dottie_cookie_consent'

type Consent = 'granted' | 'denied'

function readConsent(): Consent | null {
  if (typeof window === 'undefined') return null
  const v = window.localStorage.getItem(STORAGE_KEY)
  return v === 'granted' || v === 'denied' ? v : null
}

export default function CookieConsent({ gaId }: { gaId: string }) {
  const [consent, setConsent] = useState<Consent | null>(null)
  // Tracks whether we've read the stored choice yet, so the banner doesn't
  // flash on first paint for visitors who already decided.
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setConsent(readConsent())
    setReady(true)
  }, [])

  function choose(value: Consent) {
    window.localStorage.setItem(STORAGE_KEY, value)
    setConsent(value)
  }

  return (
    <>
      {/* Analytics loads only after explicit opt-in. No GA cookies are set
          until the visitor accepts, keeping the privacy policy accurate. */}
      {consent === 'granted' && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}');
          `}</Script>
        </>
      )}

      {ready && consent === null && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label="Cookie consent"
          className="fixed inset-x-0 bottom-0 z-[100] px-4 pb-4 sm:px-6"
        >
          <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-black/10 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
            <p className="text-sm text-gray-600 leading-relaxed flex-1">
              We use essential cookies to run Dottie. With your consent we also
              use Google Analytics to understand how the site is used. See our{' '}
              <Link href="/privacy" className="text-emerald-600 font-medium underline underline-offset-2 hover:text-emerald-700">
                privacy policy
              </Link>
              .
            </p>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => choose('denied')}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={() => choose('granted')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition-colors"
              >
                Accept analytics
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
