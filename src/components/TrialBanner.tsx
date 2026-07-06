import Link from 'next/link'

type Props = {
  status: string | null
  daysLeft: number | null
}

/**
 * Shown above dashboard pages when the user is on a free trial or past_due.
 *
 * `daysLeft` is computed by the caller (the dashboard layout) so this
 * component stays pure for the React Compiler.
 *
 * Visibility:
 *   - status='trialing' + daysLeft > 0  → countdown (amber if ≤2)
 *   - status='past_due'                 → red prompt to update payment
 *   - everything else                   → null
 *
 * The proxy hard-gates the dashboard once the trial expires, so this
 * component only ever sees a still-valid trial.
 */
export default function TrialBanner({ status, daysLeft }: Props) {
  if (status === 'past_due') {
    return (
      <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 flex items-center justify-between gap-3">
        <div className="text-sm text-red-800">
          <strong className="font-semibold">Payment failed.</strong> We couldn&apos;t charge your card. Update your payment method to keep your subscription active.
        </div>
        <Link
          href="/subscribe"
          className="shrink-0 inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition-colors"
        >
          Update card →
        </Link>
      </div>
    )
  }

  if (status !== 'trialing' || daysLeft == null || daysLeft <= 0) return null

  const urgent = daysLeft <= 2
  return (
    <div
      className={`mb-4 rounded-2xl border px-4 py-3 flex items-center justify-between gap-3 ${
        urgent
          ? 'border-amber-200 bg-amber-50'
          : 'border-emerald-200 bg-emerald-50'
      }`}
    >
      <div className={`text-sm ${urgent ? 'text-amber-900' : 'text-emerald-900'}`}>
        <span className="font-semibold">Free trial:</span>{' '}
        {daysLeft} day{daysLeft === 1 ? '' : 's'} left
        {!urgent && <span className="text-emerald-700/80"> · pick a plan any time</span>}
      </div>
      <Link
        href="/subscribe"
        className={`shrink-0 inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
          urgent
            ? 'bg-amber-600 text-white hover:bg-amber-700'
            : 'bg-emerald-600 text-white hover:bg-emerald-700'
        }`}
      >
        {urgent ? 'Add a plan →' : 'View plans →'}
      </Link>
    </div>
  )
}
