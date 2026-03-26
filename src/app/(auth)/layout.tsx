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
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg shadow-emerald-200/60"
            style={{ background: 'linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)' }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 10h16M8 15h10M8 20h12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M25 4H7a2 2 0 00-2 2v20a2 2 0 002 2h18a2 2 0 002-2V6a2 2 0 00-2-2z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Easy Invoicing</h1>
          <p className="text-gray-500 text-sm mt-1">Invoicing on autopilot for childcare professionals</p>
        </div>
        {children}
      </div>
    </div>
  )
}
