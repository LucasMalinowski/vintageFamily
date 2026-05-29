import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('app_config')
    .select('key, value')
    .in('key', ['min_android_version', 'min_ios_version'])

  if (error) {
    return NextResponse.json({ error: 'Falha ao carregar configuração.' }, { status: 500 })
  }

  const config = Object.fromEntries(data.map(({ key, value }) => [key, value]))

  return NextResponse.json(
    {
      min_android_version: config['min_android_version'] ?? '0.0.0',
      min_ios_version: config['min_ios_version'] ?? '0.0.0',
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
