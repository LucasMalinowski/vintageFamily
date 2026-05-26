import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#f5f1eb',
          padding: '60px 72px',
          justifyContent: 'space-between',
          fontFamily: 'Georgia, serif',
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            display: 'flex',
            width: 80,
            height: 4,
            backgroundColor: '#3E5F4B',
            borderRadius: 2,
          }}
        />

        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Brand name */}
          <div
            style={{
              display: 'flex',
              fontSize: 96,
              fontWeight: 700,
              color: '#2F3B33',
              letterSpacing: '-2px',
              lineHeight: 1,
            }}
          >
            Florim
          </div>

          {/* Tagline */}
          <div
            style={{
              display: 'flex',
              fontSize: 36,
              color: '#3E5F4B',
              fontWeight: 400,
              letterSpacing: '-0.5px',
              lineHeight: 1.3,
            }}
          >
            Gestão financeira familiar
          </div>
        </div>

        {/* Bottom row */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          {/* Feature pills */}
          <div style={{ display: 'flex', flexDirection: 'row', gap: 12 }}>
            {['Despesas', 'Receitas', 'Poupança', 'Insights IA'].map((label) => (
              <div
                key={label}
                style={{
                  display: 'flex',
                  backgroundColor: '#3E5F4B',
                  color: '#f5f1eb',
                  fontSize: 18,
                  fontFamily: 'Arial, sans-serif',
                  fontWeight: 400,
                  padding: '8px 18px',
                  borderRadius: 99,
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Domain */}
          <div
            style={{
              display: 'flex',
              fontSize: 22,
              color: '#8C7B6B',
              fontFamily: 'Arial, sans-serif',
            }}
          >
            florim.app
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}
