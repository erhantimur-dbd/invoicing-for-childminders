import Link from 'next/link'
import { ENQUIRIES_PRICE } from '@/lib/enquiries/types'

export default function EnquiriesPaywall() {
  return (
    <div className="max-w-xl mx-auto">
      <div className="rounded-3xl border border-emerald-100 bg-white p-8 shadow-sm text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-3">Dottie Enquiries</p>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-3">
          Answer new parents while you&apos;re with the children
        </h1>
        <p className="text-gray-600 leading-relaxed mb-6">
          Dottie reads the enquiry, checks start date, days, and 15/30-hour funding, and helps you book a visit in <em>your</em> hours. Same Dottie login you already use for invoices.
        </p>
        <p className="text-3xl font-extrabold text-gray-900 mb-1">£{ENQUIRIES_PRICE.monthly}<span className="text-base font-semibold text-gray-400">/month</span></p>
        <p className="text-sm text-gray-400 mb-8">or £{ENQUIRIES_PRICE.annual}/year · cancel anytime · no trial</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/subscribe?product=enquiries"
            className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-200"
          >
            Start with Enquiries
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center justify-center px-6 py-3 rounded-2xl border-2 border-emerald-200 text-emerald-700 font-semibold hover:bg-emerald-50"
          >
            Book a demo first
          </Link>
        </div>
      </div>
    </div>
  )
}
