import { notFound } from 'next/navigation'
import InvoicePreview from '@/components/InvoicePreview'
import type { Metadata } from 'next'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  return {
    title: 'Invoice | Easy Invoicing',
    description: 'View your childcare invoice',
    openGraph: {
      title: 'Childcare Invoice',
      description: 'View and download your invoice',
    },
  }
}

async function getInvoice(id: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3001')

  const res = await fetch(`${baseUrl}/api/invoice/${id}/public`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

export default async function PublicInvoicePage({ params }: Props) {
  const { id } = await params
  const data = await getInvoice(id)

  if (!data || !data.invoice) notFound()

  const { invoice, profile, bankAccount } = data

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-sky-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">EI</span>
          </div>
          <span className="font-semibold text-gray-900 text-sm">Easy Invoicing</span>
        </div>
        <button
          onClick={undefined}
          className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors print:hidden"
          id="print-btn"
        >
          Save as PDF
        </button>
      </div>

      {/* Invoice */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <InvoicePreview
            invoice={invoice}
            profile={profile}
            primaryBankAccount={bankAccount}
          />
        </div>

        {/* Footer note */}
        <p className="text-center text-xs text-gray-400 mt-6 print:hidden">
          This invoice was sent to you via{' '}
          <span className="font-medium text-emerald-600">Easy Invoicing</span>
          {' '}— childcare invoicing on autopilot.
        </p>
      </div>

      {/* Print button JS */}
      <script dangerouslySetInnerHTML={{ __html: `
        document.getElementById('print-btn')?.addEventListener('click', () => window.print());
      `}} />

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  )
}
