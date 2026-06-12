import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendExpoPushNotifications } from '@/lib/notifications/push'
import { dispatchInsights } from '@/lib/insights/dispatcher'
import { formatBRL } from '@/lib/money'
import { getCurrentBillingPeriod } from '@/lib/billing-cycle'

/**
 * Checks if the category's monthly limit threshold was just crossed and,
 * if so, sends push notifications + WhatsApp/email via dispatchInsights.
 *
 * Shared by /api/categories/limit-alert (web) and the WhatsApp expense
 * parser, so every channel that can create an expense triggers the same check.
 */

type AlertLevel = 'warning' | 'over'

async function generateInsight(
  categoryName: string,
  pct: number,
  spentCents: number,
  limitCents: number,
  level: AlertLevel
): Promise<string> {
  const spent = formatBRL(spentCents)
  const limit = formatBRL(limitCents)
  const excess = formatBRL(Math.max(0, spentCents - limitCents))

  // Header line always contains the hard facts — no AI ambiguity
  const header = level === 'over'
    ? `🚨 *Limite ultrapassado — ${categoryName}*\n\nGasto este mês: *${spent}* de *${limit}* (${pct}%) — *${excess} acima do limite.*`
    : `⚠️ *Limite próximo — ${categoryName}*\n\nGasto este mês: *${spent}* de *${limit}* (${pct}%).`

  // AI adds one short practical tip about this specific category — purely optional
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return header

  // Use leaf name for natural-sounding tips ("Combustível" instead of "Transporte / Combustível")
  const leafName = categoryName.includes('/') ? categoryName.split('/').pop()!.trim() : categoryName

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3_000)

    const prompt = level === 'over'
      ? `A família ultrapassou o limite de ${leafName} em ${excess} (gasto ${spent}, limite ${limit}). Escreva UMA dica prática e curta (máx 15 palavras) sobre como controlar gastos com ${leafName} nos próximos dias. Apenas a dica, sem introdução.`
      : `A família usou ${pct}% do limite de ${leafName} (${spent} de ${limit}). Escreva UMA dica prática e curta (máx 15 palavras) para não ultrapassar o limite de ${leafName}. Apenas a dica, sem introdução.`

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      cache: 'no-store',
      signal: controller.signal,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'Você é um consultor financeiro. Responda em português informal e direto.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 40,
      }),
    })
    clearTimeout(timeout)

    if (!res.ok) return header
    const data = await res.json()
    const tip: string = data?.choices?.[0]?.message?.content?.trim() ?? ''
    return tip ? `${header}\n\n💡 ${tip}` : header
  } catch {
    return header
  }
}

export type LimitAlertResult =
  | { ok: true; reason: 'category not found' | 'no limit set' | 'below threshold' | 'silenced'; pct?: number; level?: AlertLevel }
  | { ok: true; alerted: true; level: AlertLevel; pct: number }

export async function checkAndAlertCategoryLimit(familyId: string, categoryId: string): Promise<LimitAlertResult> {
  // Load the category and its siblings to resolve the right limit
  // (the limit may be on a parent — walk up if needed)
  const [{ data: cat }, { data: allSiblings }] = await Promise.all([
    supabaseAdmin
      .from('categories')
      .select('name, parent_id, monthly_limit_cents')
      .eq('id', categoryId)
      .eq('family_id', familyId)
      .maybeSingle(),
    supabaseAdmin
      .from('categories')
      .select('id, name, parent_id, monthly_limit_cents')
      .eq('family_id', familyId)
      .eq('kind', 'expense'),
  ])

  if (!cat) {
    console.log(`[limit-alert] category not found categoryId=${categoryId} familyId=${familyId}`)
    return { ok: true, reason: 'category not found' }
  }

  // Determine which category holds the relevant limit:
  // Use the category's own limit, or fall back to the parent's limit
  let limitHolderId = categoryId
  let limitCents: number | null = cat.monthly_limit_cents
  let categoryName: string = cat.name

  if (!limitCents && cat.parent_id) {
    const parent = (allSiblings ?? []).find(c => c.id === cat.parent_id)
    if (parent?.monthly_limit_cents) {
      limitHolderId = parent.id
      limitCents = parent.monthly_limit_cents
      categoryName = parent.name
    }
  }

  if (!limitCents) {
    console.log(`[limit-alert] no limit set categoryId=${categoryId} categoryName=${cat.name} parentId=${cat.parent_id ?? 'none'}`)
    return { ok: true, reason: 'no limit set' }
  }

  // Gather all category IDs that count toward this limit:
  // If the limit is on a parent → include the parent + all its children
  // If the limit is on a leaf → just that category
  const limitedCatIds: string[] = [limitHolderId]
  const isParent = !((allSiblings ?? []).find(c => c.id === limitHolderId)?.parent_id)
  if (isParent) {
    for (const category of allSiblings ?? []) {
      if (category.parent_id === limitHolderId) {
        limitedCatIds.push(category.id)
      }
    }
  }

  const now = new Date()
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)

  const { data: expenses } = await supabaseAdmin
    .from('expenses')
    .select('amount_cents')
    .eq('family_id', familyId)
    .in('category_id', limitedCatIds)
    .gte('date', firstDay)
    .lte('date', lastDay)

  const spentCents = (expenses ?? []).reduce((sum, e) => sum + (e.amount_cents ?? 0), 0)
  const pct = Math.round((spentCents / limitCents) * 100)

  const level: AlertLevel | null = pct >= 100 ? 'over' : pct >= 80 ? 'warning' : null
  if (!level) {
    console.log(`[limit-alert] below threshold categoryName=${categoryName} pct=${pct} spent=${spentCents} limit=${limitCents}`)
    return { ok: true, reason: 'below threshold', pct }
  }

  // Check if this limit is silenced for the current billing period
  const { data: familyUser } = await supabaseAdmin
    .from('users')
    .select('billing_cycle_day')
    .eq('family_id', familyId)
    .not('billing_cycle_day', 'is', null)
    .limit(1)
    .maybeSingle()
  const billingPeriodKey = getCurrentBillingPeriod(familyUser?.billing_cycle_day ?? 1, now)

  const { data: silence } = await supabaseAdmin
    .from('category_limit_silences')
    .select('category_id')
    .eq('family_id', familyId)
    .eq('category_id', limitHolderId)
    .eq('billing_period_key', billingPeriodKey)
    .maybeSingle()

  if (silence) {
    console.log(`[limit-alert] silenced categoryName=${categoryName} pct=${pct} level=${level} period=${billingPeriodKey}`)
    return { ok: true, reason: 'silenced', pct, level }
  }

  console.log(`[limit-alert] ${categoryName} pct=${pct} level=${level} spent=${spentCents} limit=${limitCents}`)
  const insight = await generateInsight(categoryName, pct, spentCents, limitCents, level)
  const pushTitle = level === 'over'
    ? `🚨 ${categoryName} ultrapassou o limite`
    : `⚠️ Limite próximo: ${categoryName}`

  // Push notifications
  let pushSent = 0
  let pushTokenCount = 0
  try {
    const { data: users } = await supabaseAdmin.from('users').select('id').eq('family_id', familyId)
    const userIds = (users ?? []).map((u) => u.id)
    console.log(`[limit-alert] push: ${userIds.length} users in family`)
    if (userIds.length) {
      const { data: tokens } = await supabaseAdmin.from('push_tokens').select('token').in('user_id', userIds)
      pushTokenCount = tokens?.length ?? 0
      console.log(`[limit-alert] push: ${pushTokenCount} push tokens found`)
      const messages = (tokens ?? []).map((t) => ({
        to: t.token, title: pushTitle, body: insight,
        sound: 'default' as const, channelId: 'default',
        data: { type: 'limit_alert', categoryId },
      }))
      if (messages.length) {
        const result = await sendExpoPushNotifications(messages)
        pushSent = result.sent
        console.log(`[limit-alert] push sent=${result.sent} failed=${result.failed}`)
      }
    }
  } catch (err) {
    console.error('[limit-alert] push error', err)
  }

  // WhatsApp via dispatchInsights
  const monthLabel = now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
  try {
    await dispatchInsights(familyId, [insight], monthLabel, 'limit_alert')
    console.log('[limit-alert] dispatchInsights completed')
  } catch (err) {
    console.error('[limit-alert] dispatchInsights error', err)
  }

  console.log(`[limit-alert] push tokens=${pushTokenCount} sent=${pushSent}`)
  return { ok: true, alerted: true, level, pct }
}
