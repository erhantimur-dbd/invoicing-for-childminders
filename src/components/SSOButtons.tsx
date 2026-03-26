'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Props = {
  mode: 'login' | 'signup'
}

export default function SSOButtons({ mode }: Props) {
  const [googleLoading, setGoogleLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)

  async function handleGoogle() {
    setGoogleLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    })
    if (error) {
      console.error('Google OAuth error:', error)
      setGoogleLoading(false)
    }
  }

  async function handleApple() {
    setAppleLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin + '/auth/callback' },
    })
    if (error) {
      console.error('Apple OAuth error:', error)
      setAppleLoading(false)
    }
  }

  const spinnerWhite = (
    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )

  const spinnerDark = (
    <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )

  const googleIcon = (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <g>
        <path d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9087c1.7018-1.5668 2.6836-3.874 2.6836-6.615z" fill="#4285F4"/>
        <path d="M9 18c2.43 0 4.4673-.8059 5.9564-2.1818l-2.9087-2.2581c-.8059.54-1.8368.8591-3.0477.8591-2.3441 0-4.3282-1.5836-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z" fill="#34A853"/>
        <path d="M3.964 10.71c-.18-.54-.2823-1.1168-.2823-1.71s.1023-1.17.2823-1.71V4.9582H.9574C.3477 6.1732 0 7.5477 0 9s.3477 2.8268.9574 4.0418L3.964 10.71z" fill="#FBBC05"/>
        <path d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9574 4.9582L3.964 7.29C4.6718 5.1632 6.6559 3.5795 9 3.5795z" fill="#EA4335"/>
      </g>
    </svg>
  )

  const appleIcon = (
    <svg width="18" height="18" viewBox="0 0 814 1000" xmlns="http://www.w3.org/2000/svg" fill="white">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.5 135.4-317.3 269-317.3 70.1 0 128.4 46.4 172.5 46.4 42.8 0 109.5-49 189.5-49 30.4 0 110.3 2.6 170.3 93.4zm-225.1-193.8c28.3-35.1 48.3-84.1 48.3-133.1 0-6.5-.6-13-.6-19.5C556.4 8.4 486.3 39.5 440 82.5 410.8 110.1 386 160.4 386 211.8c0 6.5 1.3 13 1.9 15.6 3.2.6 8.4.6 13.6.6 44.3 0 108.2-29.7 161.5-80.9z"/>
    </svg>
  )

  const actionText = mode === 'signup' ? 'Sign up' : 'Continue'

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading || appleLoading}
        className="w-full h-12 flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
      >
        {googleLoading ? spinnerDark : googleIcon}
        {actionText} with Google
      </button>
      <button
        type="button"
        onClick={handleApple}
        disabled={googleLoading || appleLoading}
        className="w-full h-12 flex items-center justify-center gap-3 bg-gray-950 border border-gray-950 rounded-xl text-sm font-semibold text-white hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
      >
        {appleLoading ? spinnerWhite : appleIcon}
        {actionText} with Apple
      </button>
    </div>
  )
}
