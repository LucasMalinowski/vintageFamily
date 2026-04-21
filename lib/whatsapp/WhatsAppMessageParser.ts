import { addMonths, format, parseISO } from 'date-fns'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { buildCategoryLabelMap, findCategoryIdByStoredName, CategoryRecord } from '@/lib/categories'
import { nvidiaAIService, AIExtractedRecord, IntentClassification } from '@/lib/ai/NvidiaAIService'
import { whatsAppService } from '@/lib/whatsapp/WhatsAppService'
import { whatsAppQueryHandler } from '@/lib/whatsapp/WhatsAppQueryHandler'
import { formatBRL } from '@/lib/money'

const USAGE_HINT = `Olá! 👋 Para registrar suas finanças, envie mensagens como:

💸 *Despesa:* "Gastei 50 reais no mercado no pix"
💸 *Parcelado:* "Comprei um tênis de 150 em 3x"
💰 *Receita:* "Recebi 1500 de salário"
⭐ *Sonho:* "Guardei 200 para a viagem"
📝 *Lembrete:* "Me lembre de pagar o aluguel"

Você também pode combinar: "Gastei 30 na farmácia e 55 de gasolina"`

type SaveResult =
  | { ok: true; line: string }
  | { ok: false; line: string }

function buildPhoneCandidates(phone: string): string[] {
  const digits = phone.replace(/\D/g, '')
  const candidates = new Set<string>([digits])
  if (digits.startsWith('55') && digits.length === 12) {
    candidates.add(digits.slice(0, 4) + '9' + digits.slice(4))
  }
  if (digits.startsWith('55') && digits.length === 13 && digits[4] === '9') {
    candidates.add(digits.slice(0, 4) + digits.slice(5))
  }
  return Array.from(candidates)
}

function getFallbackCategory(
  kind: 'expense' | 'income',
  categoryList: CategoryRecord[]
): { id: string; name: string } | null {
  const fallbackName = kind === 'expense' ? 'outros' : 'outras receitas'
  const found = categoryList.find(
    (c) => c.name.toLowerCase() === fallbackName && !c.parent_id
  )
  return found ?? null
}

export async function processWhatsAppMessage(fromPhone: string, messageText: string): Promise<void> {
  const candidates = buildPhoneCandidates(fromPhone)

  let userRow: { id: string; family_id: string } | null = null
  for (const candidate of candidates) {
    const { data } = await supabaseAdmin
      .from('users')
      .select('id,family_id')
      .like('phone_number', `%${candidate}`)
      .maybeSingle()
    if (data) { userRow = data; break }
  }

  if (!userRow) {
    await whatsAppService.sendTextMessage(fromPhone, 'Número não cadastrado no Florim. Acesse o app para vincular seu WhatsApp.')
    return
  }

  const { family_id: familyId } = userRow

  const todayISO = new Date().toISOString().slice(0, 10)

  let intent: IntentClassification
  try {
    intent = await nvidiaAIService.classifyIntent(messageText, todayISO)
  } catch {
    intent = { type: 'record', data_needed: [], time_range: 'current_month', focus: null }
  }

  if (intent.type === 'query') {
    try {
      const reply = await whatsAppQueryHandler.handle(messageText, intent, familyId, todayISO)
      await whatsAppService.sendTextMessage(fromPhone, reply)
    } catch {
      await whatsAppService.sendTextMessage(fromPhone, 'Não consegui buscar seus dados agora. Tente novamente em instantes. 🔄')
    }
    return
  }

  const { data: categories } = await supabaseAdmin
    .from('categories')
    .select('id,name,kind,parent_id,is_system')
    .eq('family_id', familyId)

  const categoryList = (categories ?? []) as CategoryRecord[]
  const labelMap = buildCategoryLabelMap(categoryList)

  let records: Awaited<ReturnType<typeof nvidiaAIService.extractFinancialRecords>>
  try {
    records = await nvidiaAIService.extractFinancialRecords(messageText, labelMap, todayISO)
  } catch (err: any) {
    const isRateLimit = err?.message?.includes('rate limit')
    await whatsAppService.sendTextMessage(
      fromPhone,
      isRateLimit
        ? 'O Florim está sobrecarregado no momento. Tente novamente em instantes. ⏳'
        : 'Erro ao processar sua mensagem. Tente novamente. 🔄'
    )
    return
  }

  const QUERY_KEYWORDS = /\b(quanto|qual|quantas|quantos|me mostra|resumo|total|meus gastos|minhas receitas)\b/i
  if (!records.length && QUERY_KEYWORDS.test(messageText)) {
    const fallbackIntent: IntentClassification = {
      type: 'query', data_needed: ['expenses', 'incomes'],
      time_range: 'current_month', focus: null,
    }
    try {
      const reply = await whatsAppQueryHandler.handle(messageText, fallbackIntent, familyId, todayISO)
      await whatsAppService.sendTextMessage(fromPhone, reply)
    } catch {
      await whatsAppService.sendTextMessage(fromPhone, USAGE_HINT)
    }
    return
  }

  if (!records.length) {
    await whatsAppService.sendTextMessage(fromPhone, USAGE_HINT)
    return
  }

  const results: SaveResult[] = []

  for (const record of records) {
    const result = await saveRecord(record, familyId, categoryList, labelMap, todayISO)
    results.push(result)
  }

  const succeeded = results.filter((r) => r.ok)
  const failed = results.filter((r) => !r.ok)

  const parts: string[] = []

  if (succeeded.length) {
    parts.push(`✅ Criados:\n${succeeded.map((r) => r.line).join('\n')}`)
  }

  if (failed.length) {
    parts.push(`⚠️ Não foi possível criar:\n${failed.map((r) => r.line).join('\n')}`)
  }

  await whatsAppService.sendTextMessage(fromPhone, parts.join('\n\n'))
}

async function saveRecord(
  record: AIExtractedRecord,
  familyId: string,
  categoryList: CategoryRecord[],
  labelMap: Map<string, string>,
  todayISO: string
): Promise<SaveResult> {

  // ── Reminder ────────────────────────────────────────────────────────────────
  if (record.type === 'reminder') {
    const { error } = await supabaseAdmin
      .from('reminders')
      .insert({
        family_id: familyId,
        title: record.description,
        due_date: record.date,
        is_done: false,
        note: 'Criado via WhatsApp',
      })
    const dueDateStr = record.date === todayISO
      ? 'hoje'
      : record.date.split('-').reverse().join('/')
    const line = `📝 ${record.description} _(lembrete para ${dueDateStr})_`
    if (error) {
      console.error('[WA] reminder insert error:', error.message)
      return { ok: false, line }
    }
    return { ok: true, line }
  }

  // ── Category resolution (expense, income, dream) ────────────────────────────
  const kind = record.type === 'income' ? 'income' : 'expense'

  let categoryId = record.category_name
    ? (findCategoryIdByStoredName(categoryList, record.category_name) ??
       findCategoryIdByLabel(categoryList, labelMap, record.category_name))
    : null

  let categoryName = record.category_name

  if (!categoryName) {
    const fallback = getFallbackCategory(kind, categoryList)
    categoryId = fallback?.id ?? null
    categoryName = fallback?.name ?? (kind === 'expense' ? 'Outros' : 'Outras Receitas')
  }

  const resolvedLabel = categoryId ? (labelMap.get(categoryId) ?? categoryName) : categoryName

  // ── Expense ─────────────────────────────────────────────────────────────────
  if (record.type === 'expense') {
    const status = record.status ?? 'paid'
    const installmentCount = Math.max(1, record.installments ?? 1)

    if (installmentCount > 1) {
      const groupId = crypto.randomUUID()
      const perInstallment = Math.floor(record.amount_cents / installmentCount)
      const rows = Array.from({ length: installmentCount }, (_, i) => ({
        family_id: familyId,
        description: record.description,
        amount_cents: i === installmentCount - 1
          ? record.amount_cents - perInstallment * (installmentCount - 1)
          : perInstallment,
        date: format(addMonths(parseISO(record.date), i), 'yyyy-MM-dd'),
        category_id: categoryId,
        category_name: categoryName ?? 'Outros',
        payment_method: record.payment_method ?? 'Credito',
        status: i === 0 ? 'paid' : 'open',
        notes: 'Criado via WhatsApp',
        low_confidence: false,
        installments: installmentCount,
        installment_index: i + 1,
        installment_group_id: groupId,
      }))

      const { error } = await supabaseAdmin.from('expenses').insert(rows)
      const catStr = resolvedLabel ? ` (${resolvedLabel})` : ''
      const line = `💸 ${formatBRL(record.amount_cents)} — ${record.description}${catStr} _(${formatBRL(perInstallment)} × ${installmentCount} — 1ª parcela paga)_`
      if (error) {
        console.error('[WA] installment insert error:', error.message)
        return { ok: false, line }
      }
      return { ok: true, line }
    }

    const { data, error } = await supabaseAdmin
      .from('expenses')
      .insert({
        family_id: familyId,
        description: record.description,
        amount_cents: record.amount_cents,
        date: record.date,
        category_id: categoryId,
        category_name: categoryName ?? 'Outros',
        payment_method: record.payment_method,
        status,
        notes: 'Criado via WhatsApp',
        low_confidence: false,
        installments: 1,
      })
      .select('id')
      .single()

    const statusLabel = status === 'paid' ? '_(pago)_' : '_(pendente)_'
    const catStr = resolvedLabel ? ` (${resolvedLabel})` : ''
    const line = `💸 ${formatBRL(record.amount_cents)} — ${record.description}${catStr} ${statusLabel}`
    if (error || !data?.id) {
      console.error('[WA] expense insert error:', error?.message)
      return { ok: false, line }
    }
    return { ok: true, line }
  }

  // ── Income ──────────────────────────────────────────────────────────────────
  if (record.type === 'income') {
    const { data, error } = await supabaseAdmin
      .from('incomes')
      .insert({
        family_id: familyId,
        description: record.description,
        amount_cents: record.amount_cents,
        date: record.date,
        category_id: categoryId,
        category_name: categoryName ?? 'Outras Receitas',
        notes: 'Criado via WhatsApp',
        low_confidence: false,
      })
      .select('id')
      .single()

    const catStr = resolvedLabel ? ` (${resolvedLabel})` : ''
    const line = `💰 ${formatBRL(record.amount_cents)} — ${record.description}${catStr} _(recebido)_`
    if (error || !data?.id) {
      console.error('[WA] income insert error:', error?.message)
      return { ok: false, line }
    }
    return { ok: true, line }
  }

  // ── Dream contribution ───────────────────────────────────────────────────────
  const dreamName = record.dream_name ?? record.description
  const { data: dream } = await supabaseAdmin
    .from('dreams')
    .select('id,name')
    .eq('family_id', familyId)
    .ilike('name', `%${dreamName}%`)
    .maybeSingle()

  if (!dream) {
    return { ok: false, line: `⭐ ${formatBRL(record.amount_cents)} — Sonho "${dreamName}" não encontrado no Florim` }
  }

  const { data, error } = await supabaseAdmin
    .from('dream_contributions')
    .insert({
      family_id: familyId,
      dream_id: dream.id,
      amount_cents: record.amount_cents,
      date: record.date,
      notes: 'Criado via WhatsApp',
    })
    .select('id')
    .single()

  const line = `⭐ ${formatBRL(record.amount_cents)} — ${dream.name} (Sonho)`
  if (error || !data?.id) {
    console.error('[WA] dream insert error:', error?.message)
    return { ok: false, line }
  }
  return { ok: true, line }
}

function findCategoryIdByLabel(
  categories: CategoryRecord[],
  labelMap: Map<string, string>,
  target: string
): string | null {
  const normalizedTarget = target.toLowerCase().trim()
  for (const [id, label] of labelMap.entries()) {
    if (label.toLowerCase().includes(normalizedTarget) || normalizedTarget.includes(label.toLowerCase())) {
      return id
    }
  }
  return null
}
