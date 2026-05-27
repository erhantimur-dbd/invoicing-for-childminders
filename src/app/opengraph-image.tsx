import { ImageResponse } from 'next/og'

export const alt = 'Dottie — Automated invoicing for UK childminders'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '80px',
          background: 'linear-gradient(135deg, #047857 0%, #10b981 45%, #fbbf24 100%)',
          fontFamily: 'sans-serif',
          color: 'white',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 96,
              height: 96,
              borderRadius: 28,
              background: 'rgba(255,255,255,0.18)',
              fontSize: 56,
              fontWeight: 800,
            }}
          >
            D.
          </div>
          <div style={{ fontSize: 44, fontWeight: 700 }}>Dottie</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, maxWidth: 900 }}>
            Invoicing on autopilot for UK childminders
          </div>
          <div style={{ fontSize: 34, color: 'rgba(255,255,255,0.85)' }}>
            Set up once. Invoices generate automatically.
          </div>
        </div>

        <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.85)' }}>
          www.godottie.cloud
        </div>
      </div>
    ),
    { ...size }
  )
}
