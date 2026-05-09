import { addMonths, format, parseISO } from 'date-fns'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { buildCategoryLabelMap, findCategoryIdByStoredName, CategoryRecord } from '@/lib/categories'
import { nvidiaAIService, AIExtractedRecord, IntentClassification } from '@/lib/ai/NvidiaAIService'
import { whatsAppService } from '@/lib/whatsapp/WhatsAppService'
import { whatsAppQueryHandler } from '@/lib/whatsapp/WhatsAppQueryHandler'
import { formatBRL } from '@/lib/money'
import { hasBillingAccess } from '@/lib/billing/access'
import { checkAndIncrementWhatsAppRecording, checkAndIncrementAIQuery } from '@/lib/billing/free-tier'

const FEEDBACK_LINE = '\n\n_Algo deu errado? Nos conte: https://florim.app/feedback_'

const USAGE_HINT = `Olá! 👋 Para registrar suas finanças, envie mensagens como:

💸 *Despesa:* "Gastei 50 reais no mercado no pix"
💸 *Parcelado:* "Comprei um tênis de 150 em 3x"
💰 *Receita:* "Recebi 1500 de salário"
⭐ *Poupança:* "Guardei 200 para a viagem"
📝 *Lembrete:* "Me lembre de pagar o aluguel"

Você também pode combinar: "Gastei 30 na farmácia e 55 de gasolina"`

type SaveResult =
  | { ok: true; line: string }
  | { ok: false; line: string }

type WhatsAppUserRow = {
  id: string
  family_id: string
  billing_cycle_day: number | null
}

type ProcessOptions = {
  skipMessageLog?: boolean
  messageType?: 'text' | 'audio'
  sourceMessageId?: string
  requireConfirmation?: boolean
  transcript?: string
}

type PendingActionPayload =
  | { records: AIExtractedRecord[] }
  | { intent: IntentClassification }

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

const MAX_MESSAGE_LENGTH = 1000
const PENDING_ACTION_TTL_MS = 30 * 60 * 1000

export async function logInboundWhatsAppMessage(
  messageId: string,
  messageType: 'text' | 'audio' | 'button',
  mediaId?: string | null
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('whatsapp_message_log')
    .insert({ message_id: messageId, message_type: messageType, media_id: mediaId ?? null })

  return !error
}

export async function updateWhatsAppMessageLog(
  messageId: string,
  values: {
    family_id?: string | null
    user_id?: string | null
    transcript?: string | null
    transcription_model?: string | null
    transcription_status?: string | null
    transcription_error?: string | null
  }
): Promise<void> {
  await supabaseAdmin
    .from('whatsapp_message_log')
    .update(values)
    .eq('message_id', messageId)
}

export async function findWhatsAppUser(fromPhone: string): Promise<WhatsAppUserRow | null> {
  const candidates = buildPhoneCandidates(fromPhone)

  for (const candidate of candidates) {
    const { data } = await supabaseAdmin
      .from('users')
      .select('id,family_id,billing_cycle_day')
      .like('phone_number', `%${candidate}`)
      .maybeSingle()
    if (data) return data
  }

  return null
}

function formatRecordSummary(record: AIExtractedRecord): string {
  if (record.type === 'reminder') {
    return `Lembrete: ${record.description} (${record.date})`
  }

  if (record.type === 'savings_contribution') {
    return `${formatBRL(Math.round((record.amount ?? 0) * 100))} para ${record.saving_name ?? record.description} (Poupança)`
  }

  const category = record.category_name ? ` (${record.category_name})` : ''
  return `${formatBRL(Math.round((record.amount ?? 0) * 100))} com ${record.description}${category}`
}

function buildPendingSummary(actionType: 'record' | 'edit' | 'delete', payload: PendingActionPayload): string {
  if ('records' in payload) {
    return payload.records.map(formatRecordSummary).join(' • ')
  }

  const intent = payload.intent
  if (actionType === 'delete') return `Remover o item ${intent.item_index ?? '?'} da última lista`
  return `Editar o item ${intent.item_index ?? '?'} para ${formatBRL(Math.round((intent.edit_amount ?? 0) * 100))}`
}

async function sendAudioConfirmationTemplate(fromPhone: string, summaryText: string): Promise<void> {
  const templateName = process.env.WHATSAPP_AUDIO_CONFIRM_TEMPLATE_NAME

  if (!templateName) {
    await whatsAppService.sendTextMessage(
      fromPhone,
      `Confirmando o que você disse:\n\n${summaryText}\n\nResponda "Sim, criar" para confirmar ou envie outro áudio/texto para corrigir.`
    )
    return
  }

  await whatsAppService.sendTemplateMessage(
    fromPhone,
    templateName,
    [summaryText],
    'pt_BR',
    [
      { index: '0', payload: 'audio_confirm_yes' },
      { index: '1', payload: 'audio_confirm_no' },
    ]
  )
}

export async function processWhatsAppMessage(
  fromPhone: string,
  messageText: string,
  messageId?: string,
  options: ProcessOptions = {}
): Promise<void> {
  if (messageId && !options.skipMessageLog) {
    const inserted = await logInboundWhatsAppMessage(messageId, options.messageType ?? 'text')
    if (!inserted) return // duplicate key -> already processed
  }

  const text = messageText.length > MAX_MESSAGE_LENGTH
    ? messageText.slice(0, MAX_MESSAGE_LENGTH)
    : messageText

  const userRow = await findWhatsAppUser(fromPhone)

  if (!userRow) {
    await whatsAppService.sendTextMessage(fromPhone, 'Número não cadastrado no Florim. Acesse o app para vincular seu WhatsApp.')
    return
  }

  const { family_id: familyId } = userRow
  if (messageId) {
    await updateWhatsAppMessageLog(messageId, {
      family_id: familyId,
      user_id: userRow.id,
      transcript: options.transcript ?? null,
      transcription_status: options.messageType === 'audio' ? 'completed' : null,
    })
  }

  const billingCycleDay = userRow.billing_cycle_day ?? 7

  const todayISO = new Date().toISOString().slice(0, 10)

  let intent: IntentClassification
  try {
    intent = await nvidiaAIService.classifyIntent(text, todayISO)
  } catch {
    intent = { type: 'record', data_needed: [], time_range: 'current_month', focus: null, status_filter: null }
  }

  if (intent.type === 'delete' || intent.type === 'edit') {
    if (options.requireConfirmation && options.sourceMessageId) {
      await createPendingWhatsAppAction({
        familyId,
        userId: userRow.id,
        fromPhone,
        sourceMessageId: options.sourceMessageId,
        transcript: options.transcript ?? text,
        actionType: intent.type,
        payload: { intent },
      })
      return
    }

    const reply = await handleMutation(fromPhone, familyId, intent)
    await whatsAppService.sendTextMessage(fromPhone, reply)
    return
  }

  if (intent.type === 'query') {
    const access = await hasBillingAccess({ familyId })
    if (access.isFreeTier) {
      const usage = await checkAndIncrementAIQuery(familyId)
      if (!usage.allowed) {
        await whatsAppService.sendTextMessage(
          fromPhone,
          'Você usou todas as 15 consultas gratuitas deste mês. 🎯\n\nAssine o Florim Pro para consultas ilimitadas: florim.app/pricing\n\nCancele quando quiser. Seus dados ficam para sempre.'
        )
        return
      }
    }
    try {
      const reply = await whatsAppQueryHandler.handle(text, intent, familyId, todayISO, fromPhone, billingCycleDay)
      const transcriptNote = options.messageType === 'audio'
        ? `Transcrevi seu áudio como: "${text}"\n\nSe eu entendi errado, tente enviar de novo.\n\n`
        : ''
      await whatsAppService.sendTextMessage(fromPhone, transcriptNote + reply + FEEDBACK_LINE)
    } catch {
      await whatsAppService.sendTextMessage(fromPhone, 'Não consegui buscar seus dados agora. Tente novamente em instantes. 🔄')
    }
    return
  }

  const { data: categories } = await supabaseAdmin
    .from('categories')
    .select('id,name,kind,parent_id,is_system,icon')
    .eq('family_id', familyId)

  const categoryList = (categories ?? []) as CategoryRecord[]
  const labelMap = buildCategoryLabelMap(categoryList)

  let records: Awaited<ReturnType<typeof nvidiaAIService.extractFinancialRecords>>
  try {
    records = await nvidiaAIService.extractFinancialRecords(text, labelMap, todayISO)
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
  if (!records.length && QUERY_KEYWORDS.test(text)) {
    const fallbackIntent: IntentClassification = {
      type: 'query', data_needed: ['expenses', 'incomes'],
      time_range: 'current_month', focus: null, status_filter: null,
    }
    try {
      const reply = await whatsAppQueryHandler.handle(text, fallbackIntent, familyId, todayISO, fromPhone, billingCycleDay)
      const transcriptNote = options.messageType === 'audio'
        ? `Transcrevi seu áudio como: "${text}"\n\nSe eu entendi errado, tente enviar de novo.\n\n`
        : ''
      await whatsAppService.sendTextMessage(fromPhone, transcriptNote + reply + FEEDBACK_LINE)
    } catch {
      await whatsAppService.sendTextMessage(fromPhone, USAGE_HINT)
    }
    return
  }

  if (!records.length) {
    await whatsAppService.sendTextMessage(fromPhone, USAGE_HINT)
    return
  }

  if (options.requireConfirmation && options.sourceMessageId) {
    await createPendingWhatsAppAction({
      familyId,
      userId: userRow.id,
      fromPhone,
      sourceMessageId: options.sourceMessageId,
      transcript: options.transcript ?? text,
      actionType: 'record',
      payload: { records },
    })
    return
  }

  // Free tier recording limit check
  const recordAccess = await hasBillingAccess({ familyId })
  if (recordAccess.isFreeTier) {
    const usage = await checkAndIncrementWhatsAppRecording(familyId)
    if (!usage.allowed) {
      await whatsAppService.sendTextMessage(
        fromPhone,
        'Você usou todas as 75 mensagens gratuitas deste mês. 🎯\n\nAssine o Florim Pro para mensagens ilimitadas: florim.app/pricing\n\nCancele quando quiser. Seus dados ficam para sempre.'
      )
      return
    }
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

  await whatsAppService.sendTextMessage(fromPhone, parts.join('\n\n') + FEEDBACK_LINE)
}

async function saveRecordsAndReply(
  fromPhone: string,
  familyId: string,
  records: AIExtractedRecord[],
  todayISO: string
): Promise<void> {
  const { data: categories } = await supabaseAdmin
    .from('categories')
    .select('id,name,kind,parent_id,is_system,icon')
    .eq('family_id', familyId)

  const categoryList = (categories ?? []) as CategoryRecord[]
  const labelMap = buildCategoryLabelMap(categoryList)
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

  await whatsAppService.sendTextMessage(fromPhone, parts.join('\n\n') + FEEDBACK_LINE)
}

async function createPendingWhatsAppAction({
  familyId,
  userId,
  fromPhone,
  sourceMessageId,
  transcript,
  actionType,
  payload,
}: {
  familyId: string
  userId: string
  fromPhone: string
  sourceMessageId: string
  transcript: string
  actionType: 'record' | 'edit' | 'delete'
  payload: PendingActionPayload
}): Promise<void> {
  const summaryText = buildPendingSummary(actionType, payload)
  const { error } = await supabaseAdmin
    .from('pending_whatsapp_actions')
    .insert({
      family_id: familyId,
      user_id: userId,
      phone: fromPhone,
      source_message_id: sourceMessageId,
      transcript,
      action_type: actionType,
      payload: payload as any,
      summary_text: summaryText,
      expires_at: new Date(Date.now() + PENDING_ACTION_TTL_MS).toISOString(),
    })

  if (error) {
    console.error('[WA] pending action insert error:', error.message)
    await whatsAppService.sendTextMessage(fromPhone, 'Não consegui preparar a confirmação do áudio. Tente novamente. 🔄')
    return
  }

  await sendAudioConfirmationTemplate(fromPhone, summaryText)
}

export async function processWhatsAppButtonReply(
  fromPhone: string,
  payload: string,
  messageId?: string
): Promise<void> {
  if (messageId) {
    const inserted = await logInboundWhatsAppMessage(messageId, 'button')
    if (!inserted) return
  }

  if (payload !== 'audio_confirm_yes' && payload !== 'audio_confirm_no') {
    await whatsAppService.sendTextMessage(fromPhone, 'Não reconheci essa resposta. Envie uma mensagem de texto ou áudio para continuar.')
    return
  }

  const userRow = await findWhatsAppUser(fromPhone)
  if (!userRow) {
    await whatsAppService.sendTextMessage(fromPhone, 'Número não cadastrado no Florim. Acesse o app para vincular seu WhatsApp.')
    return
  }

  const { data: pending } = await supabaseAdmin
    .from('pending_whatsapp_actions')
    .select('id,family_id,user_id,phone,source_message_id,transcript,action_type,payload,summary_text,status,expires_at')
    .eq('family_id', userRow.family_id)
    .eq('phone', fromPhone)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!pending) {
    await whatsAppService.sendTextMessage(fromPhone, 'Não encontrei uma confirmação pendente. Envie um novo áudio ou mensagem de texto.')
    return
  }

  if (new Date(pending.expires_at).getTime() <= Date.now()) {
    await supabaseAdmin
      .from('pending_whatsapp_actions')
      .update({ status: 'expired' })
      .eq('id', pending.id)
    await whatsAppService.sendTextMessage(
      fromPhone,
      'Essa confirmação expirou. Envie o áudio ou mensagem novamente para eu processar com segurança.'
    )
    return
  }

  if (payload === 'audio_confirm_no') {
    await supabaseAdmin
      .from('pending_whatsapp_actions')
      .update({ status: 'rejected', rejected_at: new Date().toISOString() })
      .eq('id', pending.id)

    await supabaseAdmin.from('feedback').insert({
      family_id: pending.family_id,
      type: 'feedback',
      location: 'whatsapp_audio_confirmation',
      phone: fromPhone,
      description: JSON.stringify({
        reason: 'audio_confirmation_rejected',
        user_id: pending.user_id,
        source_message_id: pending.source_message_id,
        transcript: pending.transcript,
        action_type: pending.action_type,
        summary_text: pending.summary_text,
        payload: pending.payload,
      }, null, 2),
    })

    await whatsAppService.sendTextMessage(
      fromPhone,
      'Tudo bem, estarei aguardando seu novo áudio ou mensagem de texto.'
    )
    return
  }

  const { data: claimed } = await supabaseAdmin
    .from('pending_whatsapp_actions')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', pending.id)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (!claimed?.id) {
    await whatsAppService.sendTextMessage(fromPhone, 'Essa confirmação já foi processada. Envie um novo áudio ou mensagem se precisar registrar outra coisa.')
    return
  }

  const access = await hasBillingAccess({ familyId: pending.family_id })
  if (access.isFreeTier && pending.action_type === 'record') {
    const usage = await checkAndIncrementWhatsAppRecording(pending.family_id)
    if (!usage.allowed) {
      await supabaseAdmin
        .from('pending_whatsapp_actions')
        .update({ status: 'rejected', rejected_at: new Date().toISOString() })
        .eq('id', pending.id)
      await whatsAppService.sendTextMessage(
        fromPhone,
        'Você usou todas as 75 mensagens gratuitas deste mês. 🎯\n\nAssine o Florim Pro para mensagens ilimitadas: florim.app/pricing\n\nCancele quando quiser. Seus dados ficam para sempre.'
      )
      return
    }
  }

  if (pending.action_type === 'record') {
    const records = ((pending.payload as any).records ?? []) as AIExtractedRecord[]
    await saveRecordsAndReply(fromPhone, pending.family_id, records, new Date().toISOString().slice(0, 10))
  } else {
    const intent = (pending.payload as any).intent as IntentClassification
    const reply = await handleMutation(fromPhone, pending.family_id, intent)
    await whatsAppService.sendTextMessage(fromPhone, reply)
  }
}

const MAX_AMOUNT_CENTS = 100_000_000_00  // R$100 million
const MAX_INSTALLMENTS = 120

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

  // ── Amount validation (expense, income, savings_contribution) ───────────────
  const amount_cents = Math.round((record.amount ?? 0) * 100)
  if (!Number.isFinite(amount_cents) || amount_cents <= 0 || amount_cents > MAX_AMOUNT_CENTS) {
    return { ok: false, line: `❌ Valor inválido: ${record.description}` }
  }

  // ── Category resolution (expense, income) ───────────────────────────────────
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
    const installmentCount = Math.min(Math.max(1, record.installments ?? 1), MAX_INSTALLMENTS)

    if (installmentCount > 1) {
      const groupId = crypto.randomUUID()
      const perInstallment = Math.floor(amount_cents / installmentCount)
      const rows = Array.from({ length: installmentCount }, (_, i) => ({
        family_id: familyId,
        description: record.description,
        amount_cents: i === installmentCount - 1
          ? amount_cents - perInstallment * (installmentCount - 1)
          : perInstallment,
        date: format(addMonths(parseISO(record.date), i), 'yyyy-MM-dd'),
        category_id: categoryId,
        category_name: categoryName ?? 'Outros',
        payment_method: record.payment_method ?? 'Credito',
        status: i === 0 ? 'paid' : 'open',
        paid_at: i === 0 ? new Date(record.date).toISOString() : null,
        notes: 'Criado via WhatsApp',
        low_confidence: false,
        installments: installmentCount,
        installment_index: i + 1,
        installment_group_id: groupId,
      }))

      const { error } = await supabaseAdmin.from('expenses').insert(rows)
      const catStr = resolvedLabel ? ` (${resolvedLabel})` : ''
      const line = `💸 ${formatBRL(amount_cents)} — ${record.description}${catStr} _(${formatBRL(perInstallment)} × ${installmentCount} — 1ª parcela paga)_`
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
        amount_cents: amount_cents,
        date: record.date,
        category_id: categoryId,
        category_name: categoryName ?? 'Outros',
        payment_method: record.payment_method,
        status,
        paid_at: status === 'paid' ? new Date(record.date).toISOString() : null,
        notes: 'Criado via WhatsApp',
        low_confidence: false,
        installments: 1,
      })
      .select('id')
      .single()

    const statusLabel = status === 'paid' ? '_(pago)_' : '_(pendente)_'
    const catStr = resolvedLabel ? ` (${resolvedLabel})` : ''
    const line = `💸 ${formatBRL(amount_cents)} — ${record.description}${catStr} ${statusLabel}`
    if (error || !data?.id) {
      console.error('[WA] expense insert error:', error?.message)
      return { ok: false, line }
    }
    return { ok: true, line }
  }

  // ── Income ──────────────────────────────────────────────────────────────────
  if (record.type === 'income') {
    const status = record.date > todayISO ? 'pending' : 'received'
    const { data, error } = await supabaseAdmin
      .from('incomes')
      .insert({
        family_id: familyId,
        description: record.description,
        amount_cents: amount_cents,
        date: record.date,
        category_id: categoryId,
        category_name: categoryName ?? 'Outras Receitas',
        status,
        notes: 'Criado via WhatsApp',
        low_confidence: false,
      })
      .select('id')
      .single()

    const catStr = resolvedLabel ? ` (${resolvedLabel})` : ''
    const line = `💰 ${formatBRL(amount_cents)} — ${record.description}${catStr} _(${status === 'received' ? 'recebido' : 'a receber'})_`
    if (error || !data?.id) {
      console.error('[WA] income insert error:', error?.message)
      return { ok: false, line }
    }
    return { ok: true, line }
  }

  // ── Savings contribution ─────────────────────────────────────────────────────
  if (record.type !== 'savings_contribution') {
    return { ok: false, line: `❌ Tipo desconhecido: ${record.description}` }
  }

  const savingName = record.saving_name ?? record.description

  // Prefer exact match; fall back to partial. Using .limit(1) avoids maybeSingle() error on multiple matches.
  const { data: exactMatches } = await supabaseAdmin
    .from('savings')
    .select('id,name')
    .eq('family_id', familyId)
    .ilike('name', savingName)
    .limit(1)

  const { data: partialMatches } = exactMatches?.length ? { data: [] } : await supabaseAdmin
    .from('savings')
    .select('id,name')
    .eq('family_id', familyId)
    .ilike('name', `%${savingName}%`)
    .limit(1)

  const saving = exactMatches?.[0] ?? partialMatches?.[0] ?? null

  if (!saving) {
    return { ok: false, line: `⭐ ${formatBRL(amount_cents)} — Poupança "${savingName}" não encontrada no Florim` }
  }

  const { data, error } = await supabaseAdmin
    .from('savings_contributions')
    .insert({
      family_id: familyId,
      saving_id: saving.id,
      amount_cents: amount_cents,
      date: record.date,
      notes: 'Criado via WhatsApp',
      type: 'deposit',
    })
    .select('id')
    .single()

  const line = `⭐ ${formatBRL(amount_cents)} — ${saving.name} (Poupança)`
  if (error || !data?.id) {
    console.error('[WA] savings insert error:', error?.message)
    return { ok: false, line }
  }
  return { ok: true, line }
}

type ContextItem = {
  idx: number
  record_id: string
  record_type: 'expense' | 'income' | 'savings_contribution' | 'reminder'
  description: string
  amount_cents: number
}

const RECORD_TYPE_TO_TABLE: Record<string, string> = {
  expense: 'expenses',
  income: 'incomes',
  savings_contribution: 'savings_contributions',
  reminder: 'reminders',
}

async function handleMutation(
  fromPhone: string,
  familyId: string,
  intent: IntentClassification
): Promise<string> {
  const { data: ctx } = await supabaseAdmin
    .from('whatsapp_context')
    .select('context_items, family_id')
    .eq('phone', fromPhone)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!ctx || ctx.family_id !== familyId) {
    return 'Não encontrei uma lista recente. Primeiro me peça uma lista para poder editar ou apagar itens.'
  }

  const contextItems = ctx.context_items as ContextItem[]
  const targetItem = contextItems.find(item => item.idx === intent.item_index)

  if (!targetItem) {
    return `Item ${intent.item_index} não encontrado na última lista.`
  }

  const table = RECORD_TYPE_TO_TABLE[targetItem.record_type]
  if (!table) {
    return `Não foi possível ${intent.type === 'delete' ? 'apagar' : 'editar'} esse tipo de registro.`
  }

  const db = supabaseAdmin as any

  if (intent.type === 'delete') {
    const { error } = await db
      .from(table)
      .delete()
      .eq('id', targetItem.record_id)
      .eq('family_id', familyId)

    if (error) {
      console.error('[WA] delete error:', error.message)
      return 'Não foi possível apagar o item. Tente novamente.'
    }

    const amountStr = targetItem.amount_cents > 0 ? ` — ${formatBRL(targetItem.amount_cents)}` : ''
    return `✅ Removido: ${targetItem.description}${amountStr}`
  }

  // edit
  const newAmountCents = Math.round((intent.edit_amount ?? 0) * 100)
  if (!Number.isFinite(newAmountCents) || newAmountCents <= 0) {
    return `Valor inválido. Tente: "edita o ${intent.item_index} para 60"`
  }

  const { error } = await db
    .from(table)
    .update({ amount_cents: newAmountCents })
    .eq('id', targetItem.record_id)
    .eq('family_id', familyId)

  if (error) {
    console.error('[WA] edit error:', error.message)
    return 'Não foi possível editar o item. Tente novamente.'
  }

  return `✅ Atualizado: ${targetItem.description} — ${formatBRL(newAmountCents)}`
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
