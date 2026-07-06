// Route-level skeleton for the invoices list server component.
export default function InvoicesLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading invoices">
      <div className="flex items-center justify-between">
        <div className="h-7 w-32 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-10 w-36 bg-gray-100 rounded-lg animate-pulse" />
      </div>
      <div className="h-10 w-full bg-gray-100 rounded-xl animate-pulse" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}
