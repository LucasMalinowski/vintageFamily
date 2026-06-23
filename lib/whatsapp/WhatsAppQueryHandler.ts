import {
  subMonths, subDays, startOfYear, endOfYear, format, parseISO,
} from 'date-fns'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { nvidiaAIService } from '@/lib/ai/NvidiaAIService'
import { formatMoney } from '@/lib/money'
import type { IntentClassification, ClassifyItem, ClassifyResult } from '@/lib/ai/NvidiaAIService'
import { getBillingCycleRange, getCurrentBillingPeriod } from '@/lib/billing-cycle'
import { getWhatsAppMessages, getWhatsAppMonthName } from '@/lib/whatsapp/messages'
import type { AppLocale } from '@/lib/i18n/getLocale'

type DateRange = { from: string; to: string }

interface InternalRow {
  idx: number
  id: string
  date: string
  description: string
  category: string
  amount_cents: number
  kind: 'expense' | 'income'
}

interface InternalSaving {
  name: string
  target_cents: number | null
  contributed_cents: number
}

interface InternalReminder {
  title: string
  due_date: string | null
  is_done: boolean
  category: string
}

interface InternalPayload {
  expenses?: InternalRow[]
  incomes?: InternalRow[]
  savings?: InternalSaving[]
  reminders?: InternalReminder[]
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

function dateBR(iso: string): string {
  return iso.split('-').reverse().join('/')
}

function periodLabel(
  timeRange: IntentClassification['time_range'],
  dateRange: DateRange,
  locale: AppLocale | null,
  m: ReturnType<typeof getWhatsAppMessages>
): string {
  switch (timeRange) {
    case 'current_month':
    case 'last_month':
      return m.query.periodInMonth(getWhatsAppMonthName(locale, dateRange.from.slice(0, 7)))
    case 'current_year':
      return m.query.periodInYear(format(parseISO(dateRange.from), 'yyyy'))
    case 'last_7_days':   return m.query.periodLastDays
    case 'next_7_days':   return m.query.periodNextDays
    default:              return ''
  }
}

export class WhatsAppQueryHandler {
  async handle(
    question: string,
    intent: IntentClassification,
    familyId: string,
    todayISO: string,
    fromPhone?: string,
    billingCycleDay: number = 7,
    locale: AppLocale | null = null,
    currency: string = 'BRL'
  ): Promise<string> {
    const m = getWhatsAppMessages(locale)

    if (intent.data_needed.length === 0) {
      return m.query.intentFallback
    }

    const dateRange = WhatsAppQueryHandler.buildDateRange(intent.time_range, todayISO, billingCycleDay)
    const payload = await this.fetchData(intent, familyId, dateRange)
    const rawPeriod = periodLabel(intent.time_range, dateRange, locale, m)
    const period = intent.status_filter === 'open'
      ? (rawPeriod ? `${m.query.pendingPrefix} ${rawPeriod.trimStart()}` : m.query.pendingPrefix)
      : rawPeriod

    const parts: string[] = []

    const expenses = payload.expenses ?? []
    const incomes = (payload.incomes ?? []).map((r, i) => ({ ...r, idx: expenses.length + i }))
    const rowData: InternalRow[] = [...expenses, ...incomes]

    if (rowData.length > 0) {
      const items: ClassifyItem[] = rowData.map(r => ({
        idx: r.idx,
        date: r.date,
        description: r.description,
        category: r.category,
      }))

      const result = await nvidiaAIService.classifyQueryData(question, items, intent.focus)
      const msg = WhatsAppQueryHandler.buildRowMessage(result, rowData, period, intent.data_needed, m, currency, locale)
      if (msg) parts.push(msg)

      if (fromPhone && (result.query_type === 'sum' || result.query_type === 'list')) {
        const idxSet = new Set(result.selected)
        const shownRows = rowData.filter(r => idxSet.has(r.idx)).slice(0, 10)
        if (shownRows.length > 0) {
          await supabaseAdmin.from('whatsapp_context').upsert({
            phone: fromPhone,
            family_id: familyId,
            context_items: shownRows.map((r, i) => ({
              idx: i + 1,
              record_id: r.id,
              record_type: r.kind,
              description: r.description,
              amount_cents: r.amount_cents,
            })),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          }, { onConflict: 'phone' })
        }
      }
    }

    if (payload.savings?.length) {
      parts.push(WhatsAppQueryHandler.buildSavingsMessage(payload.savings, period, m, currency, locale))
    }

    if (payload.reminders?.length) {
      parts.push(WhatsAppQueryHandler.buildRemindersMessage(payload.reminders, period, m))
    }

    if (parts.length === 0) {
      return m.query.noRecords(period)
    }

    return parts.join('\n\n')
  }

  private static buildRowMessage(
    result: ClassifyResult,
    allRows: InternalRow[],
    period: string,
    dataTables: string[],
    m: ReturnType<typeof getWhatsAppMessages>,
    currency: string,
    locale: AppLocale | null
  ): string | null {
    const idxSet = new Set(result.selected)
    const selected = allRows.filter(r => idxSet.has(r.idx))

    if (selected.length === 0) {
      const label = result.focus_label ?? 'registros'
      return m.query.noFocusRecords(label, period)
    }

    const isIncome = !dataTables.includes('expenses') && dataTables.includes('incomes')
    const focusLabel = result.focus_label ?? (isIncome ? m.query.incomesLabel : m.query.expensesLabel)
    const routePath = isIncome ? '/incomes' : '/expenses'

    let msg: string
    if (result.query_type === 'sum') {
      msg = WhatsAppQueryHandler.buildSumMessage(selected, focusLabel, period, routePath, isIncome, m, currency, locale)
    } else if (result.query_type === 'max') {
      msg = WhatsAppQueryHandler.buildMaxMessage(selected, period, m, currency, locale)
    } else if (result.query_type === 'count') {
      msg = WhatsAppQueryHandler.buildCountMessage(selected, focusLabel, period, m)
    } else {
      msg = WhatsAppQueryHandler.buildListMessage(selected, focusLabel, period, routePath, m, currency, locale)
    }

    if (result.context_selected?.length && result.context_label) {
      const ctxSet = new Set(result.context_selected)
      const ctxRows = allRows.filter(r => ctxSet.has(r.idx))
      if (ctxRows.length) {
        const ctxTotal = ctxRows.reduce((s, r) => s + r.amount_cents, 0)
        msg += `\n\n${m.query.relatedContext(result.context_label, formatMoney(ctxTotal, currency, locale ?? 'pt-BR'))}`
      }
    }

    return msg
  }

  private static buildSumMessage(
    rows: InternalRow[],
    label: string,
    period: string,
    routePath: string,
    isIncome: boolean,
    m: ReturnType<typeof getWhatsAppMessages>,
    currency: string,
    locale: AppLocale | null
  ): string {
    const total = rows.reduce((s, r) => s + r.amount_cents, 0)
    const lines = [m.query.sumSentence(formatMoney(total, currency, locale ?? 'pt-BR'), label, period, isIncome)]

    const display = rows.slice(0, 10)
    display.forEach((r, i) => {
      lines.push(`${i + 1}. ${dateBR(r.date)}: ${r.description} (${r.category}) - *${formatMoney(r.amount_cents, currency, locale ?? 'pt-BR')}*`)
    })

    lines.push(`\n${m.query.editHint}`)

    if (rows.length > 10) {
      lines.push(m.query.moreItems(rows.length - 10))
      lines.push(`${m.query.viewAll} ${appUrl}${routePath}`)
    }

    return lines.join('\n')
  }

  private static buildMaxMessage(
    rows: InternalRow[],
    period: string,
    m: ReturnType<typeof getWhatsAppMessages>,
    currency: string,
    locale: AppLocale | null
  ): string {
    const groups = new Map<string, InternalRow[]>()
    for (const r of rows) {
      if (!groups.has(r.category)) groups.set(r.category, [])
      groups.get(r.category)!.push(r)
    }

    const [topCategory, topRows] = Array.from(groups.entries())
      .sort((a, b) => {
        const sumA = a[1].reduce((s, r) => s + r.amount_cents, 0)
        const sumB = b[1].reduce((s, r) => s + r.amount_cents, 0)
        return sumB - sumA
      })[0]

    const topTotal = topRows.reduce((s, r) => s + r.amount_cents, 0)

    if (topRows.length === 1) {
      const r = topRows[0]
      return m.query.maxSingle(period, r.description, dateBR(r.date), formatMoney(r.amount_cents, currency, locale ?? 'pt-BR'))
    }

    const lines = [
      m.query.maxCategoryHeader(period, topCategory, formatMoney(topTotal, currency, locale ?? 'pt-BR')),
      m.query.maxCategoryItems(topRows.length),
    ]
    topRows.forEach(r => {
      lines.push(`- ${dateBR(r.date)}: *${formatMoney(r.amount_cents, currency, locale ?? 'pt-BR')}*`)
    })

    const sorted = Array.from(groups.entries())
      .map(([cat, rs]) => ({ cat, total: rs.reduce((s, r) => s + r.amount_cents, 0) }))
      .sort((a, b) => b.total - a.total)

    if (sorted.length > 1) {
      lines.push(m.query.maxRunnerUp(sorted[1].cat, formatMoney(sorted[1].total, currency, locale ?? 'pt-BR')))
    }

    return lines.join('\n')
  }

  private static buildCountMessage(
    rows: InternalRow[],
    label: string,
    period: string,
    m: ReturnType<typeof getWhatsAppMessages>
  ): string {
    const groups = new Map<string, number>()
    for (const r of rows) {
      groups.set(r.description, (groups.get(r.description) ?? 0) + 1)
    }

    const lines = [m.query.countSentence(rows.length, label, period)]
    Array.from(groups.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([desc, count]) => {
        lines.push(`- ${desc}: *${count}x*`)
      })

    return lines.join('\n')
  }

  private static buildListMessage(
    rows: InternalRow[],
    label: string,
    period: string,
    routePath: string,
    m: ReturnType<typeof getWhatsAppMessages>,
    currency: string,
    locale: AppLocale | null
  ): string {
    const lines = [m.query.listHeader(label, period)]

    rows.slice(0, 10).forEach((r, i) => {
      lines.push(`${i + 1}. ${dateBR(r.date)}: ${r.description} (${r.category}) - *${formatMoney(r.amount_cents, currency, locale ?? 'pt-BR')}*`)
    })

    lines.push(`\n${m.query.editHint}`)

    if (rows.length > 10) {
      lines.push(m.query.moreItems(rows.length - 10))
      lines.push(`${m.query.viewAll} ${appUrl}${routePath}`)
    }

    return lines.join('\n')
  }

  private static buildSavingsMessage(
    savings: InternalSaving[],
    period: string,
    m: ReturnType<typeof getWhatsAppMessages>,
    currency: string,
    locale: AppLocale | null
  ): string {
    const lines = [m.query.savingsHeader]

    savings.forEach(d => {
      const target = d.target_cents != null ? m.query.savingsTarget(formatMoney(d.target_cents, currency, locale ?? 'pt-BR')) : ''
      const contributed = d.contributed_cents > 0
        ? m.query.savingsContributed(period, formatMoney(d.contributed_cents, currency, locale ?? 'pt-BR'))
        : m.query.savingsNoContributions(period)
      lines.push(`- ${d.name}${target}${contributed}`)
    })

    lines.push(`\n${m.query.viewAll} ${appUrl}/savings`)
    return lines.join('\n')
  }

  private static buildRemindersMessage(
    reminders: InternalReminder[],
    period: string,
    m: ReturnType<typeof getWhatsAppMessages>
  ): string {
    const pending = reminders.filter(r => !r.is_done)
    const done = reminders.filter(r => r.is_done)

    const lines = [m.query.remindersHeader(period)]

    if (pending.length) {
      lines.push(m.query.remindersPending)
      pending.forEach(r => {
        const due = r.due_date ? m.query.reminderDue(dateBR(r.due_date)) : ''
        lines.push(`- ${r.title}${due}`)
      })
    }

    if (done.length) {
      lines.push(`\n${m.query.remindersDone}`)
      done.forEach(r => lines.push(`- ✅ ${r.title}`))
    }

    lines.push(`\n${m.query.viewAll} ${appUrl}/reminders`)
    return lines.join('\n')
  }

  private static buildDateRange(
    timeRange: IntentClassification['time_range'],
    todayISO: string,
    billingCycleDay: number = 7
  ): DateRange {
    const today = parseISO(todayISO)
    const fmt = (d: Date) => format(d, 'yyyy-MM-dd')

    switch (timeRange) {
      case 'current_month': {
        const refMonth = getCurrentBillingPeriod(billingCycleDay, today)
        const { start, end } = getBillingCycleRange(billingCycleDay, refMonth)
        return { from: start, to: end }
      }
      case 'last_month': {
        const currentRef = getCurrentBillingPeriod(billingCycleDay, today)
        const [cy, cm] = currentRef.split('-').map(Number)
        const prev = subMonths(new Date(cy, cm - 1, 1), 1)
        const refMonth = format(prev, 'yyyy-MM')
        const { start, end } = getBillingCycleRange(billingCycleDay, refMonth)
        return { from: start, to: end }
      }
      case 'current_year':
        return { from: fmt(startOfYear(today)), to: fmt(endOfYear(today)) }
      case 'last_7_days':
        return { from: fmt(subDays(today, 7)), to: todayISO }
      case 'next_7_days':
        return { from: todayISO, to: fmt(subDays(today, -7)) }
      case 'all':
        return { from: '2000-01-01', to: todayISO }
      default:
        return { from: fmt(startOfYear(today)), to: fmt(endOfYear(today)) }
    }
  }

  private async fetchData(
    intent: IntentClassification,
    familyId: string,
    dateRange: DateRange
  ): Promise<InternalPayload> {
    const needed = intent.data_needed
    const results = await Promise.all([
      needed.includes('expenses')
        ? supabaseAdmin
            .from('expenses')
            .select('id,date,description,category_name,amount_cents')
            .eq('family_id', familyId)
            .gte('date', dateRange.from)
            .lte('date', dateRange.to)
            .eq('installment_index', 1)
            .order('date', { ascending: false })
            .limit(50)
            .then(({ data }) =>
              (data ?? []).map((r, i) => ({
                idx: i,
                id: r.id,
                date: r.date,
                description: r.description,
                category: r.category_name ?? '',
                amount_cents: r.amount_cents,
                kind: 'expense' as const,
                ...(intent.status_filter === 'open' ? {} : {}),
              })).filter(r => intent.status_filter !== 'open' || (r as any).status === 'open')
            )
        : Promise.resolve(null),
      needed.includes('incomes')
        ? supabaseAdmin
            .from('incomes')
            .select('id,date,description,category_name,amount_cents')
            .eq('family_id', familyId)
            .gte('date', dateRange.from)
            .lte('date', dateRange.to)
            .order('date', { ascending: false })
            .limit(50)
            .then(({ data }) =>
              (data ?? []).map((r, i) => ({
                idx: i,
                id: r.id,
                date: r.date,
                description: r.description,
                category: r.category_name ?? '',
                amount_cents: r.amount_cents,
                kind: 'income' as const,
              }))
            )
        : Promise.resolve(null),
      needed.includes('savings')
        ? supabaseAdmin
            .from('savings')
            .select('id,name,target_cents')
            .eq('family_id', familyId)
            .order('created_at', { ascending: false })
            .then(async ({ data: savingsData }) => {
              if (!savingsData?.length) return []
              const contributions = await Promise.all(
                savingsData.map(s =>
                  supabaseAdmin
                    .from('savings_contributions')
                    .select('amount_cents')
                    .eq('saving_id', s.id)
                    .gte('date', dateRange.from)
                    .lte('date', dateRange.to)
                    .then(({ data }) => ({
                      name: s.name,
                      target_cents: s.target_cents,
                      contributed_cents: (data ?? []).reduce((sum, c) => sum + c.amount_cents, 0),
                    }))
                )
              )
              return contributions
            })
        : Promise.resolve(null),
      needed.includes('reminders')
        ? supabaseAdmin
            .from('reminders')
            .select('title,due_date,is_done')
            .eq('family_id', familyId)
            .gte('due_date', dateRange.from)
            .lte('due_date', dateRange.to)
            .order('due_date', { ascending: true })
            .limit(20)
            .then(({ data }) =>
              (data ?? []).map(r => ({
                title: r.title,
                due_date: r.due_date,
                is_done: r.is_done,
                category: '',
              }))
            )
        : Promise.resolve(null),
    ])

    return {
      expenses: results[0] ?? undefined,
      incomes: results[1] ?? undefined,
      savings: results[2] ?? undefined,
      reminders: results[3] ?? undefined,
    }
  }
}

export const whatsAppQueryHandler = new WhatsAppQueryHandler()
