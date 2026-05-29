import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        background: 'linear-gradient(145deg, #1e40af 0%, #3730a3 100%)',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
      }}
    >
      {/* Snowflake */}
      <div style={{ position: 'relative', width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {([0, 30, 60, 90, 120, 150] as number[]).map(r => (
          <div
            key={r}
            style={{
              position: 'absolute',
              width: 6,
              height: 72,
              background: 'rgba(255,255,255,0.92)',
              borderRadius: 4,
              transform: `rotate(${r}deg)`,
            }}
          />
        ))}
        {/* Arms cross-bars */}
        {([0, 60, 120] as number[]).map(r => (
          <div key={`xb-${r}`} style={{ position: 'absolute', width: 6, height: 72, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', transform: `rotate(${r}deg)` }}>
            <div style={{ width: 20, height: 5, background: 'rgba(255,255,255,0.7)', borderRadius: 3, marginTop: 10, transform: 'rotate(90deg) translateX(-4px)' }} />
            <div style={{ position: 'absolute', bottom: 10, width: 20, height: 5, background: 'rgba(255,255,255,0.7)', borderRadius: 3, transform: 'rotate(90deg) translateX(-4px)' }} />
          </div>
        ))}
        {/* Centre */}
        <div style={{ position: 'absolute', width: 14, height: 14, background: 'white', borderRadius: '50%' }} />
      </div>

      {/* Wordmark */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
        <span style={{ color: 'white', fontSize: 32, fontWeight: 900, letterSpacing: -1, fontFamily: 'system-ui, sans-serif', lineHeight: 1 }}>
          Cold
        </span>
        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 32, fontWeight: 900, letterSpacing: -1, fontFamily: 'system-ui, sans-serif', lineHeight: 1 }}>
          IQ
        </span>
      </div>
    </div>,
    { ...size },
  )
}
