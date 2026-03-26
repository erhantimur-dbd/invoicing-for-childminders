import Link from 'next/link'

export default function SubscribeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-sky-50 flex flex-col">
      {/* Minimal header */}
      <header className="py-6 px-4 sm:px-6 flex justify-center">
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-sky-500 shadow-md group-hover:shadow-lg transition-shadow">
            <span className="text-white font-extrabold text-sm">EI</span>
          </span>
          <span className="text-gray-900 font-bold text-xl tracking-tight">Easy Invoicing</span>
        </Link>
      </header>

      {/* Page content */}
      <main className="flex-1 flex flex-col items-center justify-start py-8 px-4 sm:px-6">
        <div className="w-full max-w-3xl">
          {children}
        </div>
      </main>

      {/* Minimal footer */}
      <footer className="py-6 px-4 text-center text-gray-400 text-sm">
        <p>
          Part of the{' '}
          <span className="text-sky-500 font-medium">Dottie OS</span> ecosystem
          &nbsp;&middot;&nbsp;
          <a href="/" className="hover:text-emerald-600 transition-colors">Back to home</a>
        </p>
      </footer>
    </div>
  )
}
