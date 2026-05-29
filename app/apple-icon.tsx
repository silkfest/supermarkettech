import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        background: 'linear-gradient(145deg, #2563eb 0%, #4338ca 100%)',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '0px',
        }}
      >
        <span
          style={{
            color: 'white',
            fontSize: '68px',
            fontWeight: '900',
            letterSpacing: '-3px',
            fontFamily: 'system-ui, sans-serif',
            lineHeight: 1,
          }}
        >
          Cold
        </span>
        <span
          style={{
            color: 'rgba(255,255,255,0.55)',
            fontSize: '68px',
            fontWeight: '900',
            letterSpacing: '-3px',
            fontFamily: 'system-ui, sans-serif',
            lineHeight: 1,
          }}
        >
          IQ
        </span>
      </div>
      <div
        style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: '14px',
          fontWeight: '500',
          letterSpacing: '3px',
          fontFamily: 'system-ui, sans-serif',
          textTransform: 'uppercase',
        }}
      >
        Refrigeration
      </div>
    </div>,
    { ...size },
  )
}
