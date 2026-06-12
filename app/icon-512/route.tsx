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
        }}
      >
        {/* Snowflake sized to fit within the maskable safe zone (~80% center) */}
        <div style={{ position: 'relative', width: 220, height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {([0, 60, 120] as number[]).map(r => (
            <div
              key={r}
              style={{
                position: 'absolute',
                width: 30,
                height: 220,
                background: 'white',
                borderRadius: 15,
                transform: `rotate(${r}deg)`,
              }}
            />
          ))}
          <div style={{ position: 'absolute', width: 48, height: 48, background: 'white', borderRadius: '50%' }} />
        </div>
      </div>
    ),
    { width: 512, height: 512 },
  )
}
