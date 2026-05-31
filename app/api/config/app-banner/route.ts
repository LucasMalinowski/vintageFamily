import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const res = await fetch(
    `${supabaseUrl}/rest/v1/app_config?select=key,value&key=in.(show_ios_app_banner,show_android_app_banner)`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      cache: 'no-store',
    }
  )

  if (!res.ok) {
    return NextResponse.json({ ios: false, android: false }, { status: 200 })
  }

  const data = await res.json() as { key: string; value: string }[]
  const cfg = Object.fromEntries(data.map(({ key, value }) => [key, value]))

  return NextResponse.json(
    {
      ios: cfg['show_ios_app_banner'] === 'true',
      android: cfg['show_android_app_banner'] === 'true',
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
