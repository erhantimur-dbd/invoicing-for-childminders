import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabasePublicEnv } from '@/lib/supabase/env'

export async function createClient() {
  // cookies() must run first so pages stay dynamic. Throwing before it
  // makes Next try to prerender auth pages and fails the Preview build.
  const cookieStore = await cookies()
  const env = getSupabasePublicEnv()
  if (!env) {
    throw new Error('Supabase is not configured.')
  }

  return createServerClient(
    env.url,
    env.anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — safe to ignore
          }
        },
      },
    }
  )
}
