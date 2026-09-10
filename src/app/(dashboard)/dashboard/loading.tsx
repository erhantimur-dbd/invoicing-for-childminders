// Route-level skeleton for the dashboard server component — mirrors its
// header + stat tiles + recent-invoices layout so there's no jarring shift.
export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
      <div className="space-y-2">
        <div className="h-7 w-48 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-4 w-64 bg-gray-100 rounded-lg animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="space-y-3">
        <div className="h-5 w-36 bg-gray-100 rounded-lg animate-pulse" />
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}
