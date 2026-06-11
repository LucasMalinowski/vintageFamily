import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/billing/supabase-service'
import { isAuthorizedCronRequest } from '@/lib/security/cron'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error, count } = await supabaseService
    .from('web_handoff_tokens')
    .delete({ count: 'exact' })
    .lt('expires_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // older than 1 hour

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ deleted: count })
}
