'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Mail, Lock } from 'lucide-react'
import SSOButtons from '@/components/SSOButtons'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 p-8">
      <div className="space-y-6">
        <SSOButtons mode="login" />

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
                className="h-12 text-base pl-10 border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500"
                autoComplete="email"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-semibold text-gray-700">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
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
                className="h-12 text-base pl-10 border-gray-200 rounded-xl"
                autoComplete="current-password"
              />
            </div>
          </div>
          <Button
            type="submit"
            className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700 rounded-xl font-semibold shadow-sm shadow-emerald-200"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign in'}
          </Button>
          <p className="text-sm text-gray-400 text-center pt-1">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="text-emerald-600 font-semibold hover:text-emerald-700">
              Sign up free
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
