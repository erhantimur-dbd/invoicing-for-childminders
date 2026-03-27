import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: 'linear-gradient(135deg, #10b981 0%, #0ea5e9 100%)',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            color: 'white',
            fontSize: 17,
            fontWeight: 800,
            letterSpacing: '-0.5px',
            marginBottom: 1,
          }}
        >
          D.
        </span>
      </div>
    ),
    { ...size },
  )
}
