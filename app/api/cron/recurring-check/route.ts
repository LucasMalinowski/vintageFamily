import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { detectAndUpsertRecurringPatterns } from '@/lib/recurring/detector'
import { launchDueRecurringItems } from '@/lib/recurring/launcher'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch all active families
  const { data: families } = await supabaseAdmin
    .from('families')
    .select('id')
    .is('deleted_at', null)

  if (!families?.length) return NextResponse.json({ ok: true, families: 0 })

  let totalDetected = 0
  let totalLaunched = 0

  for (const family of families) {
    try {
      totalDetected += await detectAndUpsertRecurringPatterns(family.id)
    } catch (err) {
      console.error('[recurring-check] detect error', family.id, err)
    }
  }

  totalLaunched = await launchDueRecurringItems()

  return NextResponse.json({ ok: true, families: families.length, totalDetected, totalLaunched })
}
