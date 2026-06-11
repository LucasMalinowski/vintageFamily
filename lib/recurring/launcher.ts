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

// In-memory equivalent of Postgres ILIKE for the batched duplicate check
function matchesLikePattern(text: string, likePattern: string): boolean {
  const regex = new RegExp(
    '^' + likePattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.') + '$',
    'i'
  )
  return regex.test(text)
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

  // Batch prefetch existing pending_confirmation rows for all patterns at once
  // (one query per table instead of one per pattern), then dedupe in memory.
  const cycleWindows = patterns.map((p) => {
    const baseDate = p.next_expected_date ?? today
    const tolerance = p.tolerance_days ?? 5
    return {
      start: toISO(addDays(new Date(baseDate), -tolerance)),
      end: toISO(addDays(new Date(baseDate), tolerance)),
    }
  })
  const globalStart = cycleWindows.map((w) => w.start).sort()[0]
  const globalEnd = cycleWindows.map((w) => w.end).sort().at(-1)!

  type PendingRow = { family_id: string; description: string | null; date: string }
  const pendingByTable: Record<'expenses' | 'incomes', PendingRow[]> = { expenses: [], incomes: [] }
  for (const table of ['expenses', 'incomes'] as const) {
    const { data } = await supabaseAdmin
      .from(table)
      .select('family_id,description,date')
      .in('family_id', uniqueFamilyIds)
      .eq('status', 'pending_confirmation')
      .gte('date', globalStart)
      .lte('date', globalEnd)
    pendingByTable[table] = data ?? []
  }

  let launched = 0

  for (const [index, pattern] of patterns.entries()) {
    // Check if a pending_confirmation entry already exists for this pattern this cycle
    const { start: cycleStart, end: cycleEnd } = cycleWindows[index]
    const table = pattern.kind === 'income' ? 'incomes' : 'expenses'

    const existing = pendingByTable[table].some(
      (row) =>
        row.family_id === pattern.family_id &&
        row.date >= cycleStart &&
        row.date <= cycleEnd &&
        matchesLikePattern(row.description ?? '', pattern.description_pattern)
    )

    if (existing) continue

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

    // Keep the in-memory snapshot consistent so a near-identical pattern
    // later in this run still sees this insert as a duplicate
    pendingByTable[table].push({
      family_id: pattern.family_id,
      description: safeEntryData.description,
      date: safeEntryData.date,
    })

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
