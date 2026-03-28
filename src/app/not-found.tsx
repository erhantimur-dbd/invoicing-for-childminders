import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-sky-50 to-white px-4">
      <div className="text-center max-w-sm">
        <div
          className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 shadow-lg shadow-emerald-200/60"
          style={{ background: 'linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)' }}
        >
          <span className="text-white font-extrabold text-2xl leading-none tracking-tight">D.</span>
        </div>
        <h1 className="text-6xl font-extrabold text-gray-900 mb-2">404</h1>
        <p className="text-gray-500 text-lg mb-8">This page doesn&apos;t exist.</p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md transition-all active:scale-95"
        >
          Back to Dottie
        </Link>
      </div>
    </div>
  )
}
