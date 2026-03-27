import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: 'linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)',
          borderRadius: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            color: 'white',
            fontSize: 96,
            fontWeight: 800,
            letterSpacing: '-3px',
            marginBottom: 4,
          }}
        >
          D.
        </span>
      </div>
    ),
    { ...size },
  )
}
