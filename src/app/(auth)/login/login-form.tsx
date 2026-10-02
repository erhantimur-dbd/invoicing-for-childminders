'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Mail, Lock } from 'lucide-react'
import SSOButtons from '@/components/SSOButtons'
import { loginErrorFromQuery } from '@/lib/auth-errors.mjs'

export default function LoginForm({
  signupHref,
  signupLabel,
}: {
  signupHref: string
  signupLabel: string
}) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ssoError, setSsoError] = useState<string | null>(null)

  useEffect(() => {
    const msg = loginErrorFromQuery(new URLSearchParams(window.location.search).get('error'))
    if (msg) setError(msg)
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSsoError(null)
    setLoading(true)
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      toast.error(signInError.message)
      setError(signInError.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  const banner = error || ssoError

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 p-8">
      <div className="space-y-6">
        {banner && (
          <p className="text-sm text-red-600 text-center" role="alert">{banner}</p>
        )}
        <SSOButtons mode="login" onError={setSsoError} />

        <div className="relative flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
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
                className="h-12 text-base pl-10 border-gray-200 rounded-xl focus:ring-[#0b1220] focus:border-[#0b1220] focus-visible:ring-[#0b1220] focus-visible:border-[#0b1220]"
                autoComplete="email"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-semibold text-gray-700">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-[#0b1220] underline underline-offset-2 font-medium"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="h-12 text-base pl-10 border-gray-200 rounded-xl focus:ring-[#0b1220] focus:border-[#0b1220] focus-visible:ring-[#0b1220] focus-visible:border-[#0b1220]"
                autoComplete="current-password"
              />
            </div>
          </div>
          <Button
            type="submit"
            className="w-full min-h-[44px] h-12 text-base bg-[#0b1220] text-white hover:bg-[#0b1220] rounded-xl font-semibold"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign in'}
          </Button>
          <p className="text-sm text-gray-400 text-center pt-1">
            Don&apos;t have an account?{' '}
            <Link href={signupHref} className="text-[#0b1220] font-semibold underline underline-offset-2">
              {signupLabel}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
