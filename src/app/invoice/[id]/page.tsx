'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import InvoicePreview from '@/components/InvoicePreview'
import { Loader2, ShieldCheck, AlertCircle, CheckCircle } from 'lucide-react'

const TOKEN_KEY = (id: string) => `inv_token_${id}`

// ─── DOB Gate ────────────────────────────────────────────────────────────────
function DobGate({ invoiceId, onVerified }: { invoiceId: string; onVerified: (token: string) => void }) {
  const [day, setDay] = useState('')
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [locked, setLocked] = useState(false)
  const [childName, setChildName] = useState('')
  const monthRef = useRef<HTMLInputElement>(null)
  const yearRef = useRef<HTMLInputElement>(null)

  // Auto-advance focus
  function handleDay(v: string) {
    const n = v.replace(/\D/g, '').slice(0, 2)
    setDay(n)
    if (n.length === 2) monthRef.current?.focus()
  }
  function handleMonth(v: string) {
    const n = v.replace(/\D/g, '').slice(0, 2)
    setMonth(n)
    if (n.length === 2) yearRef.current?.focus()
  }
  function handleYear(v: string) {
    setYear(v.replace(/\D/g, '').slice(0, 4))
  }

  // First, fetch child's first name for the prompt (without revealing DOB)
  useEffect(() => {
    fetch(`/api/invoice/${invoiceId}/meta`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.childFirstName) setChildName(d.childFirstName) })
      .catch(() => {})
  }, [invoiceId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!day || !month || !year || year.length < 4) {
      setError('Please enter a complete date of birth')
      return
    }
    setLoading(true)
    setError('')

    const dob = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`

    const res = await fetch(`/api/invoice/${invoiceId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dob }),
    })
    const data = await res.json()
    setLoading(false)

    if (res.status === 429 || data.locked) {
      setLocked(true)
      setError(data.error)
      return
    }
    if (!res.ok) {
      setError(data.error || 'Incorrect date of birth')
      return
    }

    // Store token in sessionStorage (cleared when tab closes)
    sessionStorage.setItem(TOKEN_KEY(invoiceId), data.token)
    onVerified(data.token)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-sky-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-sky-500 rounded-xl flex items-center justify-center shadow-md">
            <span className="text-white font-extrabold text-sm">D.</span>
          </div>
          <div>
            <span className="font-bold text-gray-900">Dottie</span>
            <p className="text-gray-400 text-xs leading-tight">Invoicing simplified.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center">
              <ShieldCheck className="h-7 w-7 text-emerald-600" />
            </div>
          </div>

          <h1 className="text-xl font-bold text-gray-900 text-center mb-1">
            Verify to view invoice
          </h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            Enter{childName ? ` ${childName}'s` : ' your child\'s'} date of birth to access this invoice
          </p>

          {locked ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <AlertCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-red-700">{error}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date of birth
                </label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="DD"
                      value={day}
                      onChange={e => handleDay(e.target.value)}
                      maxLength={2}
                      className="w-full h-12 text-center text-lg font-mono border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                    />
                    <p className="text-xs text-gray-400 text-center mt-1">Day</p>
                  </div>
                  <div className="flex-1">
                    <input
                      ref={monthRef}
                      type="text"
                      inputMode="numeric"
                      placeholder="MM"
                      value={month}
                      onChange={e => handleMonth(e.target.value)}
                      maxLength={2}
                      className="w-full h-12 text-center text-lg font-mono border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                    />
                    <p className="text-xs text-gray-400 text-center mt-1">Month</p>
                  </div>
                  <div className="flex-[1.5]">
                    <input
                      ref={yearRef}
                      type="text"
                      inputMode="numeric"
                      placeholder="YYYY"
                      value={year}
                      onChange={e => handleYear(e.target.value)}
                      maxLength={4}
                      className="w-full h-12 text-center text-lg font-mono border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      required
                    />
                    <p className="text-xs text-gray-400 text-center mt-1">Year</p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="h-5 w-5" />
                    View invoice
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          Your date of birth is used only to verify your identity.
          <br />It is never stored or shared.
        </p>
      </div>
    </div>
  )
}

// ─── Verified Invoice View ────────────────────────────────────────────────────
function InvoiceView({ invoiceId, token }: { invoiceId: string; token: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`/api/invoice/${invoiceId}/public`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => { setError(true); setLoading(false) })
  }, [invoiceId, token])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (error || !data?.invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <p className="text-gray-500 font-medium">Invoice not found</p>
          <p className="text-sm text-gray-400 mt-1">Please check your link or contact your childminder</p>
        </div>
      </div>
    )
  }

  const { invoice, profile, bankAccount } = data

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-sky-500 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-extrabold text-xs">D.</span>
          </div>
          <span className="font-semibold text-gray-900 text-sm">Dottie</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
            <CheckCircle className="h-3.5 w-3.5" />
            Verified
          </span>
          <button
            onClick={() => window.print()}
            className="text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors ml-2"
          >
            Save as PDF
          </button>
        </div>
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
        <p className="text-center text-xs text-gray-400 mt-6 print:hidden">
          This invoice was sent to you via{' '}
          <span className="font-medium text-emerald-600">Dottie</span>
          {' '}— invoicing simplified.
        </p>
      </div>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          nav, header { display: none !important; }
          .max-w-3xl { max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
          .bg-white.rounded-2xl { border: none !important; box-shadow: none !important; border-radius: 0 !important; }
          .min-h-screen { min-height: auto !important; background: white !important; }
          .bg-gray-50 { background: white !important; }
          .border-b { border-bottom: none !important; }
        }
      `}</style>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PublicInvoicePage() {
  const params = useParams()
  const invoiceId = params.id as string
  const [token, setToken] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // Check for an existing valid session token
    const stored = sessionStorage.getItem(TOKEN_KEY(invoiceId))
    if (stored) {
      setToken(stored)
    }
    setChecking(false)
  }, [invoiceId])

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    )
  }

  if (!token) {
    return <DobGate invoiceId={invoiceId} onVerified={setToken} />
  }

  return <InvoiceView invoiceId={invoiceId} token={token} />
}
