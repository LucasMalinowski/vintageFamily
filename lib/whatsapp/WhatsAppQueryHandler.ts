import {
  startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subDays, format, parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { nvidiaAIService } from '@/lib/ai/NvidiaAIService'
import { formatBRL } from '@/lib/money'
import type { IntentClassification, ClassifyItem, ClassifyResult } from '@/lib/ai/NvidiaAIService'

type DateRange = { from: string; to: string }

interface InternalRow {
  idx: number
  date: string
  description: string
  category: string
  amount_cents: number
  kind: 'expense' | 'income'
}

interface InternalDream {
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
  dreams?: InternalDream[]
  reminders?: InternalReminder[]
}

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

function dateBR(iso: string): string {
  return iso.split('-').reverse().join('/')
}

function periodLabel(timeRange: IntentClassification['time_range'], dateRange: DateRange): string {
  switch (timeRange) {
    case 'current_month': return `em ${format(parseISO(dateRange.from), 'MMMM', { locale: ptBR })}`
    case 'last_month':    return `em ${format(parseISO(dateRange.from), 'MMMM', { locale: ptBR })}`
    case 'current_year':  return `em ${format(parseISO(dateRange.from), 'yyyy')}`
    case 'last_7_days':   return 'nos últimos 7 dias'
    case 'next_7_days':   return 'nos próximos 7 dias'
    default:              return ''
  }
}

export class WhatsAppQueryHandler {
  async handle(
    question: string,
    intent: IntentClassification,
    familyId: string,
    todayISO: string
  ): Promise<string> {
    if (intent.data_needed.length === 0) {
      return `Não entendi o que você quer consultar. Tente perguntar como: "Quanto gastei esse mês?" 😊`
    }

    const dateRange = WhatsAppQueryHandler.buildDateRange(intent.time_range, todayISO)
    const payload = await this.fetchData(intent, familyId, dateRange)
    const period = periodLabel(intent.time_range, dateRange)

    const parts: string[] = []

    // Reassign indices after parallel fetch so expenses (0..n) and incomes (n+1..m) never clash
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
      const msg = WhatsAppQueryHandler.buildRowMessage(result, rowData, period, intent.data_needed)
      if (msg) parts.push(msg)
    }

    // Dreams — no classification needed, just list
    if (payload.dreams?.length) {
      parts.push(WhatsAppQueryHandler.buildDreamsMessage(payload.dreams, period))
    }

    // Reminders — no classification needed, just list
    if (payload.reminders?.length) {
      parts.push(WhatsAppQueryHandler.buildRemindersMessage(payload.reminders, period))
    }

    if (parts.length === 0) {
      const periodStr = period ? ` ${period}` : ''
      return `Não encontrei registros${periodStr}. 📊`
    }

    return parts.join('\n\n')
  }

  private static buildRowMessage(
    result: ClassifyResult,
    allRows: InternalRow[],
    period: string,
    dataTables: string[]
  ): string | null {
    const idxSet = new Set(result.selected)
    const selected = allRows.filter(r => idxSet.has(r.idx))

    if (selected.length === 0) {
      const label = result.focus_label ?? 'registros'
      const periodStr = period ? ` ${period}` : ''
      return `Não encontrei ${label}${periodStr}. 📊`
    }

    const focusLabel = result.focus_label ?? (dataTables.includes('expenses') ? 'gastos' : 'receitas')
    const routePath = dataTables.includes('expenses') ? '/expenses' : '/incomes'

    let msg: string
    if (result.query_type === 'sum') {
      msg = WhatsAppQueryHandler.buildSumMessage(selected, focusLabel, period, routePath)
    } else if (result.query_type === 'max') {
      msg = WhatsAppQueryHandler.buildMaxMessage(selected, period)
    } else if (result.query_type === 'count') {
      msg = WhatsAppQueryHandler.buildCountMessage(selected, focusLabel, period)
    } else {
      msg = WhatsAppQueryHandler.buildListMessage(selected, focusLabel, period, routePath)
    }

    if (result.context_selected?.length && result.context_label) {
      const ctxSet = new Set(result.context_selected)
      const ctxRows = allRows.filter(r => ctxSet.has(r.idx))
      if (ctxRows.length) {
        const ctxTotal = ctxRows.reduce((s, r) => s + r.amount_cents, 0)
        msg += `\n\n_Relacionado — ${result.context_label}: *${formatBRL(ctxTotal)}*_`
      }
    }

    return msg
  }

  private static buildSumMessage(
    rows: InternalRow[],
    label: string,
    period: string,
    routePath: string
  ): string {
    const total = rows.reduce((s, r) => s + r.amount_cents, 0)
    const verb = rows.every(r => r.kind === 'income') ? 'recebeu' : 'gastou'
    const periodStr = period ? ` ${period}` : ''
    const lines = [`Você ${verb} *${formatBRL(total)}* em ${label}${periodStr}:\n`]

    const display = rows.slice(0, 15)
    display.forEach(r => {
      lines.push(`- ${dateBR(r.date)}: ${r.description} (${r.category}) — *${formatBRL(r.amount_cents)}*`)
    })

    if (rows.length > 15) {
      lines.push(`\n_...e mais ${rows.length - 15} lançamentos_`)
      lines.push(`Ver todos: ${appUrl}${routePath}`)
    }

    return lines.join('\n')
  }

  private static buildMaxMessage(rows: InternalRow[], period: string): string {
    // Group by category, find the group with the highest total
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

    const periodStr = period ? ` ${period}` : ''
    if (topRows.length === 1) {
      const r = topRows[0]
      return `Seu maior gasto${periodStr}: *${r.description}* em ${dateBR(r.date)} — *${formatBRL(r.amount_cents)}*`
    }

    const lines = [
      `Seu maior gasto${periodStr} foi em *${topCategory}* (*${formatBRL(topTotal)}* no total):`,
      `_${topRows.length} lançamentos:_`,
    ]
    topRows.forEach(r => {
      lines.push(`- ${dateBR(r.date)}: *${formatBRL(r.amount_cents)}*`)
    })

    // Also show runner-up if there's a close second
    const sorted = Array.from(groups.entries())
      .map(([cat, rs]) => ({ cat, total: rs.reduce((s, r) => s + r.amount_cents, 0) }))
      .sort((a, b) => b.total - a.total)

    if (sorted.length > 1) {
      lines.push(`\n2º lugar: *${sorted[1].cat}* — *${formatBRL(sorted[1].total)}*`)
    }

    return lines.join('\n')
  }

  private static buildCountMessage(rows: InternalRow[], label: string, period: string): string {
    const groups = new Map<string, number>()
    for (const r of rows) {
      groups.set(r.description, (groups.get(r.description) ?? 0) + 1)
    }

    const periodStr = period ? ` ${period}` : ''
    const lines = [`Você teve *${rows.length}* lançamento${rows.length > 1 ? 's' : ''} em ${label}${periodStr}:\n`]
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
    routePath: string
  ): string {
    const periodStr = period ? ` ${period}` : ''
    const lines = [`Seus ${label}${periodStr}:\n`]

    rows.slice(0, 15).forEach(r => {
      lines.push(`- ${dateBR(r.date)}: ${r.description} (${r.category}) — *${formatBRL(r.amount_cents)}*`)
    })

    if (rows.length > 15) {
      lines.push(`\n_...e mais ${rows.length - 15} lançamentos_`)
      lines.push(`Ver todos: ${appUrl}${routePath}`)
    }

    return lines.join('\n')
  }

  private static buildDreamsMessage(dreams: InternalDream[], period: string): string {
    const lines = ['Seus sonhos/metas:\n']

    const periodStr = period ? ` ${period}` : ''
    dreams.forEach(d => {
      const target = d.target_cents != null ? ` | Meta: *${formatBRL(d.target_cents)}*` : ''
      const contributed = d.contributed_cents > 0
        ? ` | Guardado${periodStr}: *${formatBRL(d.contributed_cents)}*`
        : ` | _sem contribuições${periodStr}_`
      lines.push(`- ${d.name}${target}${contributed}`)
    })

    lines.push(`\nVer todos: ${appUrl}/dreams`)
    return lines.join('\n')
  }

  private static buildRemindersMessage(reminders: InternalReminder[], period: string): string {
    const pending = reminders.filter(r => !r.is_done)
    const done = reminders.filter(r => r.is_done)

    const periodStr = period ? ` ${period}` : ''
    const lines = [`Lembretes${periodStr}:\n`]

    if (pending.length) {
      lines.push('_Pendentes:_')
      pending.forEach(r => {
        const due = r.due_date ? ` — vence ${dateBR(r.due_date)}` : ''
        lines.push(`- ${r.title}${due}`)
      })
    }

    if (done.length) {
      lines.push('\n_Concluídos:_')
      done.forEach(r => lines.push(`- ✅ ${r.title}`))
    }

    lines.push(`\nVer todos: ${appUrl}/reminders`)
    return lines.join('\n')
  }

  private static buildDateRange(timeRange: IntentClassification['time_range'], todayISO: string): DateRange {
    const today = parseISO(todayISO)
    const fmt = (d: Date) => format(d, 'yyyy-MM-dd')

    switch (timeRange) {
      case 'last_month': {
        const prev = subMonths(today, 1)
        return { from: fmt(startOfMonth(prev)), to: fmt(endOfMonth(prev)) }
      }
      case 'current_year':
        return { from: fmt(startOfYear(today)), to: fmt(endOfYear(today)) }
      case 'last_7_days':
        return { from: fmt(subDays(today, 7)), to: todayISO }
      case 'next_7_days':
        return { from: todayISO, to: fmt(subDays(today, -7)) }
      case 'all':
        return { from: '2000-01-01', to: todayISO }
      case 'current_month':
      default:
        return { from: fmt(startOfMonth(today)), to: fmt(endOfMonth(today)) }
    }
  }

  private async fetchData(
    intent: IntentClassification,
    familyId: string,
    dateRange: DateRange
  ): Promise<InternalPayload> {
    const payload: InternalPayload = {}
    const fetchers: Promise<void>[] = []

    if (intent.data_needed.includes('expenses')) {
      fetchers.push(
        (async () => {
          const { data } = await supabaseAdmin
            .from('expenses')
            .select('date, description, category_name, amount_cents')
            .eq('family_id', familyId)
            .gte('date', dateRange.from)
            .lte('date', dateRange.to)
            .order('date', { ascending: false })
            .limit(50)
          payload.expenses = (data ?? []).map((r, i) => ({
            idx: i,
            date: r.date,
            description: r.description,
            category: r.category_name ?? '',
            amount_cents: r.amount_cents,
            kind: 'expense' as const,
          }))
        })()
      )
    }

    if (intent.data_needed.includes('incomes')) {
      fetchers.push(
        (async () => {
          const { data } = await supabaseAdmin
            .from('incomes')
            .select('date, description, category_name, amount_cents')
            .eq('family_id', familyId)
            .gte('date', dateRange.from)
            .lte('date', dateRange.to)
            .order('date', { ascending: false })
            .limit(50)
          payload.incomes = (data ?? []).map((r, i) => ({
            idx: i,  // reassigned in handle() after parallel fetch completes
            date: r.date,
            description: r.description,
            category: r.category_name ?? '',
            amount_cents: r.amount_cents,
            kind: 'income' as const,
          }))
        })()
      )
    }

    if (intent.data_needed.includes('dreams')) {
      fetchers.push(
        (async () => {
          const [{ data: dreams }, { data: contribs }] = await Promise.all([
            supabaseAdmin
              .from('dreams')
              .select('id, name, target_cents')
              .eq('family_id', familyId),
            supabaseAdmin
              .from('dream_contributions')
              .select('dream_id, amount_cents')
              .eq('family_id', familyId)
              .gte('date', dateRange.from)
              .lte('date', dateRange.to),
          ])
          const sumByDream = new Map<string, number>()
          for (const c of contribs ?? []) {
            sumByDream.set(c.dream_id, (sumByDream.get(c.dream_id) ?? 0) + c.amount_cents)
          }
          payload.dreams = (dreams ?? []).map(d => ({
            name: d.name,
            target_cents: d.target_cents,
            contributed_cents: sumByDream.get(d.id) ?? 0,
          }))
        })()
      )
    }

    if (intent.data_needed.includes('reminders')) {
      fetchers.push(
        (async () => {
          const { data } = await supabaseAdmin
            .from('reminders')
            .select('title, due_date, is_done, category')
            .eq('family_id', familyId)
            .gte('due_date', dateRange.from)
            .lte('due_date', dateRange.to)
            .order('due_date', { ascending: true })
            .limit(30)
          payload.reminders = (data ?? []).map(r => ({
            title: r.title,
            due_date: r.due_date,
            is_done: r.is_done,
            category: r.category ?? '',
          }))
        })()
      )
    }

    await Promise.all(fetchers)
    return payload
  }
}

export const whatsAppQueryHandler = new WhatsAppQueryHandler()
