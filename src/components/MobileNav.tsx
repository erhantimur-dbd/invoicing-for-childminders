'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      {/* Hamburger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="p-2 -mr-2 text-gray-500 hover:text-gray-700 transition-colors"
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

      {/* Dropdown panel */}
      <div
        className={`absolute top-16 left-0 right-0 bg-white border-b border-gray-100 shadow-lg transition-all duration-200 ease-out ${open ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-1">
          <a href="#features" onClick={() => setOpen(false)} className="py-3 px-3 text-sm font-medium text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
            Features
          </a>
          <a href="#pricing" onClick={() => setOpen(false)} className="py-3 px-3 text-sm font-medium text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
            Pricing
          </a>
          <a href="#security" onClick={() => setOpen(false)} className="py-3 px-3 text-sm font-medium text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
            Support
          </a>
          <div className="h-px bg-gray-100 my-2" />
          <Link href="/login" onClick={() => setOpen(false)} className="py-3 px-3 text-sm font-medium text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
            Sign in
          </Link>
          <Link
            href="/signup"
            onClick={() => setOpen(false)}
            className="mt-1 py-3 px-3 text-sm font-semibold text-center text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors"
          >
            Start free trial
          </Link>
        </div>
      </div>
    </div>
  )
}
