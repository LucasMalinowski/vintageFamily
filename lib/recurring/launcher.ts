import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { whatsAppService } from '@/lib/whatsapp/WhatsAppService'
import { formatBRL } from '@/lib/money'

function toISO(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

const FREQUENCY_DAYS: Record<string, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
  bimonthly: 60,
  quarterly: 91,
  semiannual: 182,
  annual: 365,
}

export async function launchDueRecurringItems(familyId?: string): Promise<number> {
  const today = toISO(new Date())
  const lookAheadDate = toISO(addDays(new Date(), 2))

  let patternsQuery = supabaseAdmin
    .from('recurring_patterns')
    .select('*')
    .eq('is_active', true)
    .lte('next_expected_date', lookAheadDate)

  if (familyId) {
    patternsQuery = patternsQuery.eq('family_id', familyId)
  }

  const { data: patterns } = await patternsQuery

  if (!patterns?.length) return 0

  // Batch prefetch category names and family phone numbers to avoid N+1 queries
  const uniqueCategoryIds = [...new Set(
    patterns.map(p => p.category_id).filter(Boolean) as string[]
  )]
  const categoryNameMap = new Map<string, string>()
  if (uniqueCategoryIds.length) {
    const { data: cats } = await supabaseAdmin
      .from('categories')
      .select('id,name')
      .in('id', uniqueCategoryIds)
    for (const cat of cats ?? []) categoryNameMap.set(cat.id, cat.name)
  }

  const uniqueFamilyIds = [...new Set(patterns.map(p => p.family_id))]
  const familyPhoneMap = new Map<string, string>()
  {
    const { data: members } = await supabaseAdmin
      .from('users')
      .select('family_id,phone_number')
      .in('family_id', uniqueFamilyIds)
      .not('phone_number', 'is', null)
    for (const m of members ?? []) {
      if (!familyPhoneMap.has(m.family_id) && m.phone_number)
        familyPhoneMap.set(m.family_id, m.phone_number)
    }
  }

  let launched = 0

  for (const pattern of patterns) {
    // Check if a pending_confirmation entry already exists for this pattern this cycle
    const baseDate = pattern.next_expected_date ?? today
    const cycleStart = toISO(addDays(new Date(baseDate), -(pattern.tolerance_days ?? 5)))
    const cycleEnd = toISO(addDays(new Date(baseDate), pattern.tolerance_days ?? 5))

    const table = pattern.kind === 'income' ? 'incomes' : 'expenses'

    const { data: existing } = await supabaseAdmin
      .from(table)
      .select('id')
      .eq('family_id', pattern.family_id)
      .eq('status', 'pending_confirmation')
      .ilike('description', pattern.description_pattern)
      .gte('date', cycleStart)
      .lte('date', cycleEnd)
      .limit(1)

    if (existing?.length) continue

    // Insert pending_confirmation entry
    const entryData = {
      family_id: pattern.family_id,
      description: pattern.description_pattern,
      category_id: pattern.category_id,
      category_name: null as string | null,
      amount_cents: pattern.estimated_amount_cents ?? 0,
      date: pattern.next_expected_date ?? today,
      status: 'pending_confirmation',
      notes: null,
    }

    if (pattern.category_id) {
      entryData.category_name = categoryNameMap.get(pattern.category_id) ?? null
    }

    const safeEntryData = {
      ...entryData,
      category_name: entryData.category_name ?? 'Outros',
    }

    if (pattern.kind === 'income') {
      await supabaseAdmin.from('incomes').insert(safeEntryData)
    } else {
      await supabaseAdmin.from('expenses').insert(safeEntryData)
    }

    const phone = familyPhoneMap.get(pattern.family_id)
    if (phone) {
      const amountStr = pattern.estimated_amount_cents
        ? ` de ${formatBRL(pattern.estimated_amount_cents)}`
        : ''
      const kindLabel = pattern.kind === 'income' ? 'receita recorrente' : 'despesa recorrente'
      const msg = `📅 Detectei sua ${kindLabel} *${pattern.description_pattern}*${amountStr}.\n\nEla foi registrada como pendente. Confirmar que aconteceu? Acesse o app para confirmar ou cancelar.`
      try {
        await whatsAppService.sendTextMessage(phone, msg)
      } catch { /* non-critical */ }
    }

    // Advance next_expected_date
    const freqDays = FREQUENCY_DAYS[pattern.frequency] ?? 30
    const currentNext = new Date(pattern.next_expected_date ?? today)
    const newNext = addDays(currentNext, freqDays)

    await supabaseAdmin
      .from('recurring_patterns')
      .update({
        last_occurrence_date: pattern.next_expected_date,
        next_expected_date: toISO(newNext),
        updated_at: new Date().toISOString(),
      })
      .eq('id', pattern.id)

    launched++
  }

  return launched
}
