'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export default function HeroVisual() {
  const [step, setStep] = useState(0)
  const hasPlayed = useRef(false)

  useEffect(() => {
    if (hasPlayed.current) return
    hasPlayed.current = true

    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setStep(4)
      return
    }

    const timers = [
      setTimeout(() => setStep(1), 1200),
      setTimeout(() => setStep(2), 2200),
      setTimeout(() => setStep(3), 3400),
      setTimeout(() => setStep(4), 5400),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  const handleInvoiceClick = useCallback(() => {
    if (step >= 3 && step < 4) setStep(4)
  }, [step])

  return (
    <div className="hidden lg:flex justify-center items-center">
      <div className="flex items-start gap-3">

        {/* ── WhatsApp mini chat ── */}
        <div className="w-56 rounded-2xl overflow-hidden shadow-2xl shadow-black/50 ring-1 ring-white/20 flex-shrink-0">
          {/* Header — chatting with Sarah (the parent) */}
          <div className="flex items-center gap-2.5 px-3 py-2.5" style={{ background: 'linear-gradient(135deg, #075E54 0%, #128C7E 100%)' }}>
            <svg width="9" height="15" viewBox="0 0 9 15" fill="none" className="text-white/70 flex-shrink-0" aria-hidden="true">
              <path d="M8 1L1.5 7.5L8 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-300 to-purple-400 flex items-center justify-center flex-shrink-0 ring-2 ring-white/25 shadow">
              <span className="text-white font-bold text-[10px] leading-none">SB</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-tight">Sarah Bennett</p>
              <p className="text-emerald-200 text-[10px] leading-tight">online</p>
            </div>
            <div className="flex items-center gap-3.5 text-white/75 flex-shrink-0">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.09 13.5a19.79 19.79 0 01-3.07-8.67A2 2 0 012 2.84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 10.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 17.92v-1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <svg width="4" height="16" viewBox="0 0 4 16" fill="currentColor" aria-hidden="true">
                <circle cx="2" cy="2" r="1.5"/><circle cx="2" cy="8" r="1.5"/><circle cx="2" cy="14" r="1.5"/>
              </svg>
            </div>
          </div>

          {/* Chat area */}
          <div className="px-3 py-3 space-y-2 min-h-[120px]" style={{ background: '#ECE5DD' }}>

            {/* Typing indicator */}
            <div
              className={`transition-all duration-300 ${(step === 0 || step === 2) ? 'opacity-100 max-h-12' : 'opacity-0 max-h-0 overflow-hidden'}`}
              aria-hidden="true"
            >
              <div className="flex items-end gap-1.5">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-sky-400 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-white font-extrabold text-[8px] leading-none">D.</span>
                </div>
                <div className="bg-white rounded-xl rounded-tl-none px-3 py-2 shadow-sm">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" style={{ animation: 'dotBounce 1.4s ease-in-out infinite' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" style={{ animation: 'dotBounce 1.4s ease-in-out 0.15s infinite' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" style={{ animation: 'dotBounce 1.4s ease-in-out 0.3s infinite' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Message 1 */}
            <div className={`transition-all duration-500 ease-out ${step >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
              <div className="flex items-end gap-1.5">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-sky-400 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-white font-extrabold text-[8px] leading-none">D.</span>
                </div>
                <div className="relative max-w-[85%]">
                  <div className="absolute top-0 -left-1.5" style={{ width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 7px 7px 0', borderColor: 'transparent white transparent transparent' }} />
                  <div className="bg-white rounded-xl rounded-tl-none px-3 py-1.5 shadow-sm">
                    <p className="text-[#075E54] text-[9px] font-bold leading-none mb-0.5">Dottie</p>
                    <p className="text-gray-800 text-xs leading-snug">Hi Sarah! 👋 Here&apos;s Daniel&apos;s childcare invoice for this week.</p>
                    <p className="text-gray-400 text-[9px] text-right mt-0.5">9:41 AM</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Message 2 — with invoice link */}
            <div className={`transition-all duration-500 ease-out ${step >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
              <div className="flex items-end gap-1.5">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-sky-400 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <span className="text-white font-extrabold text-[8px] leading-none">D.</span>
                </div>
                <div className="relative max-w-[85%]">
                  <div className="bg-white rounded-xl rounded-tl-none px-3 py-1.5 shadow-sm">
                    <p className="text-gray-800 text-xs leading-snug mb-1">Total: <span className="font-semibold">£192.50</span></p>
                    <button
                      type="button"
                      onClick={handleInvoiceClick}
                      className="text-[#075E54] underline text-xs font-semibold hover:text-emerald-700 cursor-pointer text-left block"
                      aria-label="View invoice preview"
                    >
                      View invoice →
                    </button>
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <span className="text-gray-400 text-[9px]">9:42 AM</span>
                      <svg width="16" height="9" viewBox="0 0 18 10" fill="none" className="text-sky-400" aria-hidden="true">
                        <path d="M17 1L8 9.5L5 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M13 1L4 9.5L1 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Input bar */}
          <div className="flex items-center gap-2 px-2.5 py-2" style={{ background: '#F0F0F0' }}>
            <div className="flex-1 flex items-center gap-2 bg-white rounded-full px-3 py-1.5 shadow-sm">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-gray-400 flex-shrink-0" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span className="text-gray-400 text-xs flex-1">Type a message</span>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow" style={{ background: '#075E54' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white" aria-hidden="true">
                <path d="M12 2a3 3 0 013 3v7a3 3 0 01-6 0V5a3 3 0 013-3z"/>
                <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v3M8 22h8" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
        </div>

        {/* ── Invoice card (slides in at step 4) ── */}
        <div className={`transition-all duration-700 ease-out ${step >= 4 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8 pointer-events-none'}`}>
          <div className="relative flex-shrink-0">
            <div className="absolute top-3 left-3 w-full h-full bg-white/20 rounded-3xl" />
            <div className="relative bg-white rounded-3xl shadow-2xl shadow-black/30 p-6 w-72 text-sm">
              {/* Invoice header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">Invoice</div>
                  <div className="text-gray-900 font-bold text-base">#INV-2025-047</div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                  Auto-generated
                </span>
              </div>

              <div className="h-px bg-gray-100 mb-4" />

              {/* Child details */}
              <div className="mb-4">
                <div className="text-xs text-gray-400 font-medium mb-2">CHILD</div>
                <div className="font-semibold text-gray-900">Daniel Bennett</div>
                <div className="text-gray-500 text-xs">Week: 6–10 Jan 2025</div>
              </div>

              {/* Line items */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Mon · Full day</span>
                  <span className="font-medium text-gray-900">£55.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tue · Full day</span>
                  <span className="font-medium text-gray-900">£55.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Wed · Half day</span>
                  <span className="font-medium text-gray-900">£27.50</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Thu · Full day</span>
                  <span className="font-medium text-gray-900">£55.00</span>
                </div>
              </div>

              <div className="h-px bg-gray-100 mb-3" />

              <div className="flex justify-between font-bold text-gray-900 text-base">
                <span>Total</span>
                <span>£192.50</span>
              </div>

              <div className="mt-4 flex gap-2">
                <button className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold">
                  Pay now
                </button>
                <button className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold">
                  Download
                </button>
              </div>
            </div>

            {/* Badge */}
            <div className="absolute -top-3 -right-3 bg-sky-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
              ✨ Auto-created on your schedule
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
