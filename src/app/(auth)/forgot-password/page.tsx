'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Mail, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <Mail className="w-6 h-6 text-emerald-600" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">Check your email</h2>
        <p className="text-gray-500 text-sm mb-6">
          If an account exists for <span className="font-medium text-gray-700">{email}</span>, you&apos;ll receive a password reset link shortly.
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
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Reset your password</h2>
        <p className="text-gray-500 text-sm">Enter your email and we&apos;ll send you a reset link.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-semibold text-gray-700">
            Email address
          </Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 text-base pl-10 border-gray-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700 rounded-xl font-semibold shadow-sm shadow-emerald-200"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Send reset link'}
        </Button>

        <p className="text-sm text-gray-400 text-center pt-1">
          <Link href="/login" className="text-emerald-600 font-semibold hover:text-emerald-700 inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to sign in
          </Link>
        </p>
      </form>
    </div>
  )
}
