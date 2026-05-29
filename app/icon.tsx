import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        background: '#2563eb',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '6px',
      }}
    >
      <div
        style={{
          color: 'white',
          fontSize: '13px',
          fontWeight: '900',
          letterSpacing: '-0.5px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        CI
      </div>
    </div>,
    { ...size },
  )
}
