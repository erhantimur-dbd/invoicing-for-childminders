'use client'

import { useEffect, useState } from 'react'
import { marketing } from '@/lib/marketing.mjs'

const loop = marketing.heroLoop
const accentSoft = 'rgba(18,58,74,0.08)'

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 4.5 8 8.5 14 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

function CalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3.5" width="12" height="10.5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 6.5h12" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5.5 2.5v2M10.5 2.5v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function CheckMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="1.4" />
      <path className="ef-check" d="M5.5 9.2 7.8 11.4 12.5 6.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function EmailFlow() {
  const [step, setStep] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reduce, setReduce] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduce(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    if (reduce || paused) return
    const ms = loop[step]?.ms ?? 3000
    const t = window.setTimeout(() => {
      setStep((s) => (s + 1) % loop.length)
    }, ms)
    return () => window.clearTimeout(t)
  }, [step, paused, reduce])

  const beat = reduce ? loop[loop.length - 1] : loop[step]
  const id = beat.id

  return (
    <div
      data-email-flow="true"
      data-product-window="true"
      className="overflow-hidden bg-white shadow-[0_32px_80px_rgba(0,0,0,0.38)]"
      style={{ borderColor: marketing.hairline, color: marketing.ink, borderWidth: 1, borderStyle: 'solid', borderRadius: 8 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="flex items-center gap-3 px-4 py-2.5 border-b"
        style={{ borderColor: marketing.hairline, backgroundColor: '#f4f6f8' }}
      >
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="block w-2.5 h-2.5 rounded-full bg-[#d8dce3]" />
          <span className="block w-2.5 h-2.5 rounded-full bg-[#d8dce3]" />
          <span className="block w-2.5 h-2.5 rounded-full bg-[#d8dce3]" />
        </span>
        <p className="flex-1 text-center text-[11px] tracking-[0.12em] uppercase" style={{ color: marketing.muted }}>
          {marketing.windowTitle}
        </p>
        <span className="w-10" aria-hidden="true" />
      </div>

      <div className="p-4 sm:p-5">
        <ol className="flex gap-1.5 mb-5" aria-label="Enquiry flow">
          {loop.map((item, i) => {
            const on = reduce || i === step
            const done = reduce || i < step
            return (
              <li key={item.id} className="flex-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep(i)
                    setPaused(true)
                  }}
                  className="w-full text-left"
                >
                  <span
                    className="block h-[2px] mb-2"
                    style={{ backgroundColor: on || done ? marketing.accent : marketing.hairline }}
                  />
                  <span
                    className="text-[11px] tabular-nums tracking-[0.12em]"
                    style={{ color: on ? marketing.accent : marketing.muted }}
                  >
                    {item.label}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>

        <p className="text-[15px] font-semibold tracking-tight min-h-[1.5em]">
          {beat.line}
        </p>
        {beat.note ? (
          <p className="mt-1 text-[13px]" style={{ color: marketing.muted }}>
            {beat.note}
          </p>
        ) : (
          <p className="mt-1 text-[13px] invisible" aria-hidden="true">.</p>
        )}

        <div key={id} className="mt-5 min-h-[280px] space-y-3">
          {id === 'reply' ? <ReplyScene /> : null}
          {id === 'match' ? <MatchScene /> : null}
          {id === 'book' ? <BookScene /> : null}
        </div>
      </div>
    </div>
  )
}

function ReplyScene() {
  return (
    <div className="space-y-3">
      <article
        className="ef-in border p-3.5 flex gap-3 items-start"
        style={{ borderColor: marketing.hairline, backgroundColor: '#fff', borderRadius: 6 }}
      >
        <span className="mt-0.5" style={{ color: marketing.muted }}>
          <MailIcon />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide" style={{ color: marketing.muted }}>
            {marketing.scene.fromLabel} · {marketing.scene.fromMeta}
          </p>
          <p className="mt-1.5 text-[14px] leading-relaxed" style={{ color: marketing.ink }}>
            {marketing.scene.fromBody}
          </p>
        </div>
      </article>

      <article
        className="ef-in border p-3.5"
        style={{
          borderColor: marketing.hairline,
          backgroundColor: '#f4f6f8',
          borderRadius: 6,
          animationDelay: '280ms',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] uppercase tracking-wide" style={{ color: marketing.accent }}>
            {marketing.scene.replyLabel}
          </p>
          <span
            className="ef-pop text-[11px] font-medium tabular-nums px-2 py-0.5"
            style={{
              color: marketing.accent,
              backgroundColor: accentSoft,
              borderRadius: 4,
              animationDelay: '420ms',
            }}
          >
            {marketing.scene.repliedMark}
          </span>
        </div>
        <p className="mt-2 text-[14px] leading-relaxed whitespace-pre-wrap" style={{ color: marketing.ink }}>
          {marketing.scene.replyExcerpt}
        </p>
      </article>
    </div>
  )
}

function MatchScene() {
  const asked = marketing.scene.match[0]
  const vacancy = marketing.scene.match[1]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div
          className="ef-in border px-3 py-3"
          style={{ borderColor: marketing.hairline, backgroundColor: accentSoft, borderRadius: 6 }}
        >
          <p className="text-[11px] uppercase tracking-wide" style={{ color: marketing.accent }}>{asked.label}</p>
          <p className="text-[13px] mt-0.5 font-medium">{asked.value}</p>
        </div>
        <div className="flex flex-col items-center gap-1 px-1">
          <span
            className="ef-grow block h-px w-6 sm:w-10"
            style={{ backgroundColor: marketing.accent }}
          />
        </div>
        <div
          className="ef-in border px-3 py-3"
          style={{ borderColor: marketing.hairline, backgroundColor: accentSoft, borderRadius: 6, animationDelay: '120ms' }}
        >
          <p className="text-[11px] uppercase tracking-wide" style={{ color: marketing.accent }}>{vacancy.label}</p>
          <p className="text-[13px] mt-0.5 font-medium">{vacancy.value}</p>
        </div>
      </div>
      <div
        className="ef-pop inline-flex items-center gap-2 border px-3 py-2 text-[13px] font-medium"
        style={{
          borderColor: marketing.accent,
          color: marketing.accent,
          borderRadius: 6,
          animationDelay: '380ms',
        }}
      >
        <CheckMark />
        Match
      </div>
    </div>
  )
}

function BookScene() {
  return (
    <div className="space-y-4">
      <div
        className="ef-in border p-3"
        style={{ borderColor: marketing.hairline, borderRadius: 6 }}
      >
        <p className="flex items-center gap-2 text-[11px] uppercase tracking-wide mb-3" style={{ color: marketing.accent }}>
          <CalIcon />
          Gmail Calendar
        </p>
        <ul className="grid grid-cols-5 gap-1.5">
          {marketing.scene.calendarDays.map((day) => (
            <li
              key={day.label}
              className={day.on ? 'ef-pop' : ''}
              style={{
                animationDelay: day.on ? '80ms' : undefined,
                borderRadius: 4,
                border: `1px solid ${day.on ? marketing.accent : marketing.hairline}`,
                backgroundColor: day.on ? accentSoft : '#fff',
                padding: '8px 4px',
                textAlign: 'center',
              }}
            >
              <p className="text-[11px] uppercase tracking-wide" style={{ color: day.on ? marketing.accent : marketing.muted }}>
                {day.label}
              </p>
              <p
                className="mt-1 text-[12px] font-medium tabular-nums"
                style={{ color: day.on ? marketing.accent : marketing.ink }}
              >
                {day.time ?? '—'}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-2">
        <p className="text-[11px] uppercase tracking-wide" style={{ color: marketing.muted }}>Places</p>
        {Array.from({ length: marketing.scene.places }).map((_, i) => (
          <span
            key={i}
            className="ef-pop inline-flex h-6 w-6 items-center justify-center"
            style={{
              animationDelay: `${400 + i * 90}ms`,
              borderRadius: 999,
              backgroundColor: marketing.accent,
              color: '#fff',
            }}
            aria-label="Place filled"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M2.5 6.2 4.7 8.3 9.5 3.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        ))}
      </div>

      <ul className="flex flex-wrap gap-2">
        {marketing.scene.pack.map((item, i) => (
          <li
            key={item}
            className="ef-in text-[13px] border px-3 py-1.5 bg-white"
            style={{
              borderColor: marketing.hairline,
              borderRadius: 6,
              animationDelay: `${520 + i * 80}ms`,
            }}
          >
            {item}
          </li>
        ))}
      </ul>

      <p
        className="ef-in text-[14px] font-semibold tracking-tight"
        style={{ color: marketing.accent, animationDelay: '720ms' }}
      >
        {marketing.scene.resultLine}
      </p>
    </div>
  )
}
