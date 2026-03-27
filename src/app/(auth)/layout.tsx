export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-sky-50 to-white px-4 py-12 relative overflow-hidden">
      {/* Subtle background pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #059669 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
      />
      {/* Decorative blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }} />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-10 pointer-events-none" style={{ background: 'radial-gradient(circle, #0ea5e9, transparent 70%)' }} />

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-2">
          <a href="/" className="inline-flex items-center gap-1 text-xs text-white/70 hover:text-white transition-colors">
            ← Back to website
          </a>
        </div>
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg shadow-emerald-200/60"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)' }}
          >
            <span className="text-white font-extrabold text-2xl leading-none tracking-tight">D.</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Dottie</h1>
          <p className="text-gray-500 text-sm mt-1">Every i dotted. Every T crossed.</p>
        </div>
        {children}
      </div>
    </div>
  )
}
