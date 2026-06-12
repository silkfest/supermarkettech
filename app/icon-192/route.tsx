import { ImageResponse } from 'next/og'

export const dynamic = 'force-static'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #1d4ed8, #4338ca)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '40px',
        }}
      >
        <div style={{ position: 'relative', width: 104, height: 104, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {([0, 60, 120] as number[]).map(r => (
            <div
              key={r}
              style={{
                position: 'absolute',
                width: 14,
                height: 104,
                background: 'white',
                borderRadius: 8,
                transform: `rotate(${r}deg)`,
              }}
            />
          ))}
          <div style={{ position: 'absolute', width: 24, height: 24, background: 'white', borderRadius: '50%' }} />
        </div>
      </div>
    ),
    { width: 192, height: 192 },
  )
}
