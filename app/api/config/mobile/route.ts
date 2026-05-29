import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const res = await fetch(
    `${supabaseUrl}/rest/v1/app_config?select=key,value&key=in.(min_android_version,min_ios_version)`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      cache: 'no-store',
    }
  )

  const data = await res.json()
  console.log('[config/mobile] url:', supabaseUrl)
  console.log('[config/mobile] raw:', JSON.stringify(data))

  if (!res.ok) {
    return NextResponse.json({ error: 'Falha ao carregar configuração.' }, { status: 500 })
  }

  const config = Object.fromEntries((data as { key: string; value: string }[]).map(({ key, value }) => [key, value]))

  return NextResponse.json(
    {
      min_android_version: config['min_android_version'] ?? '0.0.0',
      min_ios_version: config['min_ios_version'] ?? '0.0.0',
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
