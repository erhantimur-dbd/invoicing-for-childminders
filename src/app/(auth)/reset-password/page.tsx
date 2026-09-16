'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Lock, CheckCircle2 } from 'lucide-react'
import PasswordStrength from '@/components/PasswordStrength'
import { passwordIsStrong } from '@/lib/password-policy.mjs'

type LinkState = 'checking' | 'ready' | 'invalid'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [linkState, setLinkState] = useState<LinkState>('checking')

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    let ready = false

    function markReady() {
      if (cancelled || ready) return
      ready = true
      setLinkState('ready')
    }

    function markInvalid() {
      if (cancelled || ready) return
      setLinkState('invalid')
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) markReady()
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION'))) {
        markReady()
      }
    })

    const t = window.setTimeout(markInvalid, 4000)

    return () => {
      cancelled = true
      subscription.unsubscribe()
      window.clearTimeout(t)
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!passwordIsStrong(password)) {
      toast.error('Please choose a stronger password')
      return
    }
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      toast.error(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
      setTimeout(() => router.push('/dashboard'), 2000)
    }
  }

  if (success) {
    return (
      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Password updated</h2>
        <p className="text-gray-500 text-sm">Redirecting you to your dashboard...</p>
      </div>
    )
  }

  if (linkState === 'checking') {
    return (
      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 p-8 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-4" />
        <p className="text-gray-500 text-sm">Verifying your reset link...</p>
      </div>
    )
  }

  if (linkState === 'invalid') {
    return (
      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 p-8 text-center">
        <h2 className="text-lg font-bold text-gray-900 mb-2">This reset link is not valid</h2>
        <p className="text-gray-500 text-sm mb-6">
          It may have expired or already been used. Request a new one and try again.
        </p>
        <Link
          href="/forgot-password"
          className="text-emerald-600 font-semibold text-sm hover:text-emerald-700"
        >
          Request a new reset link
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 p-8">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Set new password</h2>
        <p className="text-gray-500 text-sm">Choose a strong password for your account.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-semibold text-gray-700">
            New password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              placeholder="Create a strong password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 text-base pl-10 border-gray-200 rounded-xl"
            />
          </div>
          <PasswordStrength password={password} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirm" className="text-sm font-semibold text-gray-700">
            Confirm password
          </Label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              placeholder="Re-enter your password"
              required
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-12 text-base pl-10 border-gray-200 rounded-xl"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700 rounded-xl font-semibold shadow-sm shadow-emerald-200"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Update password'}
        </Button>

        <p className="text-sm text-gray-400 text-center pt-1">
          <Link href="/login" className="text-emerald-600 font-semibold hover:text-emerald-700">
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
