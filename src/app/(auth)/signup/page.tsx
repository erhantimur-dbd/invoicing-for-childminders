'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Mail, Lock, User, CheckCircle2, XCircle } from 'lucide-react'
import PasswordStrength from '@/components/PasswordStrength'
import SSOButtons from '@/components/SSOButtons'
import { passwordIsStrong, passwordRequirements } from '@/lib/password-policy.mjs'
import { authCallbackRedirect, parseBilling, subscribeNext } from '@/lib/billing-query.mjs'

function nextAfterSignup() {
  // Confirm-email + session both land on /subscribe?product=enquiries
  return subscribeNext(
    parseBilling(new URLSearchParams(window.location.search).get('billing')),
    'enquiries',
  )
}

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [weakError, setWeakError] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsError, setTermsError] = useState(false)
  const [checkInbox, setCheckInbox] = useState(false)
  const [ssoError, setSsoError] = useState<string | null>(null)

  const requirements = passwordRequirements(password)
  const showRequirements = passwordFocused || password.length > 0

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!passwordIsStrong(password)) {
      setWeakError(true)
      return
    }
    setWeakError(false)
    if (!termsAccepted) {
      setTermsError(true)
      return
    }
    setTermsError(false)
    setLoading(true)
    const supabase = createClient()
    const next = nextAfterSignup()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: authCallbackRedirect(window.location.origin, next),
      },
    })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    fetch('/api/email/welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: data.user?.id }),
    }).catch(console.error)

    if (!data.session) {
      setCheckInbox(true)
      setLoading(false)
      return
    }

    toast.success('Account created — start with Enquiries.')
    router.push(next)
    router.refresh()
  }

  if (checkInbox) {
    return (
      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <Mail className="w-6 h-6 text-emerald-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Check your inbox</h2>
        <p className="text-gray-500 text-sm mb-6">
          We sent a confirmation link to <span className="font-medium text-gray-700">{email}</span>.
          Open it to finish creating your account, then you can start Enquiries.
        </p>
        <Link
          href="/login"
          className="text-emerald-600 font-semibold text-sm hover:text-emerald-700"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 p-8">
      <div className="space-y-6">
        <SSOButtons mode="signup" onError={setSsoError} />
        {ssoError && (
          <p className="text-sm text-red-600 text-center" role="alert">{ssoError}</p>
        )}

        <div className="relative flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-sm font-semibold text-gray-700">Full name</Label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="fullName"
                type="text"
                placeholder="Jane Smith"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                className="h-12 text-base pl-10 border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500"
                autoComplete="name"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="h-12 text-base pl-10 border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-semibold text-gray-700">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type="password"
                placeholder="Create a strong password"
                value={password}
                onChange={e => { setPassword(e.target.value); setWeakError(false) }}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                required
                className="h-12 text-base pl-10 border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500"
                autoComplete="new-password"
              />
            </div>
            <PasswordStrength password={password} />
            {weakError && (
              <p className="text-xs text-red-500 font-medium mt-1">
                Please choose a stronger password before continuing.
              </p>
            )}
            {showRequirements && (
              <ul className="mt-2 space-y-1">
                {requirements.map((req) => (
                  <li key={req.id} className="flex items-center gap-1.5 text-xs">
                    {req.met
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      : <XCircle className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                    }
                    <span className={req.met ? 'text-emerald-700' : 'text-gray-400'}>{req.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-1">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={e => { setTermsAccepted(e.target.checked); setTermsError(false) }}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 flex-shrink-0"
              />
              <span className="text-xs text-gray-500 leading-relaxed">
                I agree to Dottie&apos;s{' '}
                <Link href="/terms" target="_blank" className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" target="_blank" className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2">
                  Privacy Policy
                </Link>
              </span>
            </label>
            {termsError && (
              <p className="text-xs text-red-500 font-medium pl-7">
                You must accept the terms to create an account.
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700 rounded-xl font-semibold shadow-sm shadow-emerald-200"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create account'}
          </Button>

          <p className="text-sm text-gray-400 text-center pt-1">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-600 font-semibold hover:text-emerald-700">
              Sign in
            </Link>
          </p>
          <p className="text-xs text-gray-400 text-center">
            Questions?{' '}
            <a href="mailto:support@godottie.cloud" className="text-emerald-600 font-medium hover:text-emerald-700">
              support@godottie.cloud
            </a>
          </p>
        </form>
      </div>
    </div>
  )
}
