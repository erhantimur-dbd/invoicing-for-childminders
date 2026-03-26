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

function getScore(password: string): number {
  if (!password) return 0
  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[a-z]/.test(password)) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) score += 1
  return score
}

type Requirement = {
  label: string
  met: boolean
}

function getRequirements(password: string): Requirement[] {
  return [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'One number', met: /[0-9]/.test(password) },
    { label: 'One special character', met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password) },
  ]
}

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordFocused, setPasswordFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [weakError, setWeakError] = useState(false)

  const requirements = getRequirements(password)
  const showRequirements = passwordFocused || password.length > 0

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    const score = getScore(password)
    if (score < 3) {
      setWeakError(true)
      return
    }
    setWeakError(false)
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) {
      toast.error(error.message)
      setLoading(false)
    } else {
      // Fire-and-forget: send welcome email
      fetch('/api/email/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: data.user?.id }),
      }).catch(console.error)
      toast.success('Account created! Welcome aboard.')
      router.push('/onboarding')
      router.refresh()
    }
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 p-8">
      <div className="space-y-6">
        <SSOButtons mode="signup" />

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
                  <li key={req.label} className="flex items-center gap-1.5 text-xs">
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

          <Button
            type="submit"
            className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700 rounded-xl font-semibold shadow-sm shadow-emerald-200"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create free account'}
          </Button>

          <p className="text-xs text-gray-400 text-center leading-relaxed">
            By creating an account you agree to our{' '}
            <Link href="/terms" className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2">
              Privacy Policy
            </Link>
          </p>

          <p className="text-sm text-gray-400 text-center pt-1">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-600 font-semibold hover:text-emerald-700">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
