import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  getAccessTokenFromAuthHeader,
  getAccessTokenFromCookieStore,
  requireUserByAccessToken,
  getProfileByUserId,
} from '@/lib/billing/auth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { buildCategoryLabelMap } from '@/lib/categories'
import { nvidiaAIService } from '@/lib/ai/NvidiaAIService'

export async function POST(request: NextRequest) {
  const cookieStore = await cookies()
  const token = getAccessTokenFromAuthHeader(request) ?? getAccessTokenFromCookieStore(cookieStore)
  const { error, user } = await requireUserByAccessToken(token)
  if (error || !user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const profile = await getProfileByUserId(user.id)
  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })

  const body = await request.json()
  const description: string = body?.description ?? ''
  const kind: 'expense' | 'income' = body?.kind === 'income' ? 'income' : 'expense'

  if (!description.trim() || description.trim().length < 2) {
    return NextResponse.json({ categoryId: null })
  }

  // Step 1: heuristic — check last 2 months of transactions for matching description
  const twoMonthsAgo = new Date()
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)
  const sinceDate = twoMonthsAgo.toISOString().slice(0, 10)

  const table = kind === 'expense' ? 'expenses' : 'incomes'
  const { data: recent } = await supabaseAdmin
    .from(table)
    .select('description, category_id')
    .eq('family_id', profile.family_id)
    .gte('date', sinceDate)
    .not('category_id', 'is', null)
    .order('date', { ascending: false })
    .limit(500)

  if (recent?.length) {
    const descLower = description.toLowerCase()
    for (const row of recent) {
      if (row.description?.toLowerCase().includes(descLower) || descLower.includes(row.description?.toLowerCase() ?? '')) {
        if (row.category_id) return NextResponse.json({ categoryId: row.category_id })
      }
    }
  }

  // Step 2: AI fallback
  const { data: cats } = await supabaseAdmin
    .from('categories')
    .select('id,name,kind,parent_id,is_system,icon')
    .eq('family_id', profile.family_id)
    .eq('kind', kind)

  if (!cats?.length) return NextResponse.json({ categoryId: null })

  const labelMap = buildCategoryLabelMap(cats as Parameters<typeof buildCategoryLabelMap>[0])
  const categoryId = await nvidiaAIService.suggestCategory(description, labelMap)

  return NextResponse.json({ categoryId })
}
