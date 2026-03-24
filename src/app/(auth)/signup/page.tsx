'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) {
      toast.error(error.message)
      setLoading(false)
    } else {
      toast.success('Account created! Welcome aboard.')
      router.push('/profile?setup=true')
      router.refresh()
    }
  }

  return (
    <Card className="shadow-lg border-0">
      <form onSubmit={handleSignup}>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-base">Your full name</Label>
            <Input
              id="fullName"
              type="text"
              placeholder="Jane Smith"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              className="h-12 text-base"
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-base">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="h-12 text-base"
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-base">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              className="h-12 text-base"
              autoComplete="new-password"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pb-6">
          <Button
            type="submit"
            className="w-full h-12 text-base bg-emerald-600 hover:bg-emerald-700"
            disabled={loading}
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Create account'}
          </Button>
          <p className="text-sm text-gray-500 text-center">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-600 font-medium">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
