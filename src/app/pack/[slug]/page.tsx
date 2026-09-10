import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { marketing } from '@/lib/marketing.mjs'
import { packFilePublicUrl } from '@/lib/enquiries/pack-email'

export const metadata: Metadata = {
  title: 'Starter pack',
  robots: { index: false, follow: false },
}

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createServiceClient(url, key)
}

export default async function PackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const admin = adminClient()
  if (!admin) notFound()

  const { data: settings } = await admin
    .from('enquiry_settings')
    .select('user_id, display_name, ofsted_urn')
    .eq('inbound_slug', slug)
    .maybeSingle()
  if (!settings) notFound()

  const { data: docs } = await admin
    .from('enquiry_knowledge')
    .select('file_name, file_path')
    .eq('user_id', settings.user_id)
    .eq('kind', 'document')
    .order('file_name')

  const files = (docs ?? []).filter((d) => d.file_name)

  return (
    <div
      className="min-h-screen px-6 py-16"
      style={{ backgroundColor: marketing.canvas, color: marketing.ink, fontFamily: marketing.fontFamily }}
    >
      <div className="max-w-lg mx-auto">
        <p className="text-[13px] tracking-[0.12em] uppercase mb-3" style={{ color: marketing.muted }}>
          Starter pack
        </p>
        <h1 className="text-[28px] sm:text-[34px] tracking-[-0.03em] font-semibold">
          {settings.display_name ? `${settings.display_name}'s forms` : 'Your forms and policies'}
        </h1>
        {settings.ofsted_urn ? (
          <p className="mt-2 text-sm" style={{ color: marketing.muted }}>
            Ofsted URN {settings.ofsted_urn}
          </p>
        ) : null}
        <p className="mt-4 text-[15px] leading-relaxed" style={{ color: marketing.muted }}>
          Download the forms and policies below, complete them, and send them back to your childminder.
        </p>

        {files.length ? (
          <ul className="mt-8 space-y-2">
            {files.map((file) => {
              const href = packFilePublicUrl(file.file_path) || '#'
              return (
                <li key={`${file.file_name}-${file.file_path ?? ''}`}>
                  <a
                    href={href}
                    className="block rounded-xl border bg-white px-4 py-3 text-sm font-medium hover:border-[#123a4a]/40"
                    style={{ borderColor: marketing.hairline, color: marketing.accent }}
                  >
                    {file.file_name}
                  </a>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="mt-8 text-sm" style={{ color: marketing.muted }}>
            No files have been uploaded yet. Your childminder will send them separately.
          </p>
        )}
      </div>
    </div>
  )
}
