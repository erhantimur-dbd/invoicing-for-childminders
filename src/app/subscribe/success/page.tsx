import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function SubscribeSuccessPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If no user session at all, redirect to login
  if (!user) redirect('/login')

  // Optionally: if user already has an active subscription stored in their
  // profile/metadata, redirect straight to dashboard.
  // We check app_metadata or user_metadata for a subscription_status field.
  const subscriptionStatus =
    (user.user_metadata?.subscription_status as string | undefined) ??
    (user.app_metadata?.subscription_status as string | undefined)

  if (subscriptionStatus === 'active') {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-gray-200/60 border border-gray-100 p-10 text-center">
        {/* Big green checkmark */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 mb-6 mx-auto">
          <svg
            className="w-10 h-10 text-emerald-600"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>

        <h1 className="text-2xl font-extrabold text-gray-900 mb-3">
          You&apos;re all set!
        </h1>
        <p className="text-gray-500 text-base leading-relaxed mb-2">
          Your subscription is now active. Welcome to Dottie — your invoices will start generating automatically every Sunday at 7am.
        </p>
        <p className="text-gray-400 text-sm mb-8">
          A confirmation email is on its way to you.
        </p>

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base shadow-md shadow-emerald-200/60 transition-all active:scale-95"
        >
          Go to dashboard →
        </Link>
      </div>

      {/* Branding footer */}
      <p className="mt-8 text-gray-400 text-sm text-center">
        Part of the{' '}
        <span className="text-sky-500 font-medium">Dottie OS</span> ecosystem
      </p>
    </div>
  )
}
