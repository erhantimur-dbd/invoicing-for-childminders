import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loginRedirectTarget } from '@/lib/auth/login-redirect'
import LoginForm from '../login-form'

function isNextRedirect(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'digest' in err
    && String((err as { digest: unknown }).digest).startsWith('NEXT_REDIRECT')
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const params = await searchParams
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) redirect(loginRedirectTarget(params.next))
  } catch (err) {
    if (isNextRedirect(err)) throw err
  }
  return <LoginForm />
}
