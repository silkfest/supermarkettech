import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        background: 'linear-gradient(135deg, #1d4ed8, #4338ca)',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '7px',
      }}
    >
      {/* Snowflake — 3 crossing bars */}
      <div style={{ position: 'relative', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {([0, 60, 120] as number[]).map(r => (
          <div
            key={r}
            style={{
              position: 'absolute',
              width: 2.5,
              height: 18,
              background: 'white',
              borderRadius: 2,
              transform: `rotate(${r}deg)`,
            }}
          />
        ))}
        {/* Centre dot */}
        <div style={{ position: 'absolute', width: 4, height: 4, background: 'white', borderRadius: '50%' }} />
      </div>
    </div>,
    { ...size },
  )
}
