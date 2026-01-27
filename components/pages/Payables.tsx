'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/layout/Topbar'
import VintageCard from '@/components/ui/VintageCard'
import StatCard from '@/components/ui/StatCard'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { formatBRL } from '@/lib/money'
import { formatDate, getCurrentMonth, getCurrentYear, MONTHS, getYearOptions, getMonthRange } from '@/lib/dates'
import { buildInstallmentDates, splitAmountCents } from '@/lib/installments'
import { Pencil, Receipt, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

type PaymentMethod = 'PIX' | 'Credito' | 'Debito'

interface Expense {
  id: string
  description: string
  category_name: string
  amount_cents: number
  date: string
  status: 'open' | 'paid'
  paid_at: string | null
  notes: string | null
  payment_method: PaymentMethod | null
  installments: number | null
  installment_group_id: string | null
  installment_index: number | null
}

interface Category {
  name: string
}

const formatPaymentLabel = (method: PaymentMethod | null, installments: number | null) => {
  if (method === 'Credito') {
    const count = installments && installments > 1 ? `${installments}x` : ''
    return count ? `Credito ${count}` : 'Credito'
  }
  if (method === 'Debito') return 'Debito'
  return 'PIX'
}

const buildInstallmentIndexes = (rows: Expense[]) => {
  const indexMap = new Map<string, number>()
  rows.forEach((row) => {
    if (row.installment_index) {
      indexMap.set(row.id, row.installment_index)
    }
  })
  return indexMap
}

export default function Payables() {
  const { familyId } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingIds, setUpdatingIds] = useState<string[]>([])
  
  // Filtros
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('')
  const [onlyInstallments, setOnlyInstallments] = useState(false)
  const [groupByPurchase, setGroupByPurchase] = useState(false)
  
  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  
  // Form
  const [formData, setFormData] = useState({
    description: '',
    category: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    status: 'open' as 'open' | 'paid',
    notes: '',
    paymentMethod: 'PIX' as PaymentMethod,
    installments: 1,
  })

  useEffect(() => {
    if (familyId) {
      loadCategories()
      loadExpenses()
    }
  }, [
    familyId,
    selectedMonth,
    selectedYear,
    selectedCategory,
    selectedStatus,
    selectedPaymentMethod,
    onlyInstallments,
  ])

  const loadCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('name')
      .eq('family_id', familyId!)
      .eq('kind', 'expense')
      .order('name')

    if (data) {
      setCategories(data)
    }
  }

  const loadExpenses = async () => {
    setLoading(true)
    const resolvedMonth = Number.isFinite(selectedMonth) ? selectedMonth : getCurrentMonth()
    const resolvedYear = Number.isFinite(selectedYear) ? selectedYear : getCurrentYear()
    const { start, end } = getMonthRange(resolvedMonth, resolvedYear)

    let query = supabase
      .from('expenses')
      .select('*')
      .eq('family_id', familyId!)
      .gte('date', format(start, 'yyyy-MM-dd'))
      .lte('date', format(end, 'yyyy-MM-dd'))
      .order('date', { ascending: false })

    if (selectedCategory) {
      query = query.eq('category_name', selectedCategory)
    }

    if (selectedStatus) {
      query = query.eq('status', selectedStatus)
    }

    if (selectedPaymentMethod) {
      query = query.eq('payment_method', selectedPaymentMethod)
    }

    if (onlyInstallments) {
      query = query.eq('payment_method', 'Credito').gt('installments', 1)
    }

    const { data } = await query

    if (data) {
      const normalized: Expense[] = data.map((row) => ({
        id: row.id,
        description: row.description,
        category_name: row.category_name,
        amount_cents: row.amount_cents,
        date: row.date,
        status: row.status === 'paid' ? 'paid' : 'open',
        paid_at: row.paid_at,
        notes: row.notes,
        payment_method: row.payment_method || 'PIX',
        installments: row.installments || 1,
        installment_group_id: row.installment_group_id,
        installment_index: row.installment_index,
      }))
      setExpenses(normalized)
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const amountCents = Math.round(parseFloat(formData.amount) * 100)
    const paymentMethod = formData.paymentMethod
    const installments = paymentMethod === 'Credito' ? Math.max(1, formData.installments) : 1

    const expenseData = {
      family_id: familyId!,
      description: formData.description,
      category_name: formData.category,
      amount_cents: amountCents,
      date: formData.date,
      status: formData.status,
      paid_at: formData.status === 'paid' ? new Date().toISOString() : null,
      notes: formData.notes || null,
      payment_method: paymentMethod,
      installments,
      installment_group_id: editingExpense?.installment_group_id || null,
      installment_index: editingExpense?.installment_index || null,
    }
    if (paymentMethod !== 'Credito') {
      expenseData.installment_group_id = null
      expenseData.installment_index = null
    }

    if (editingExpense) {
      if (paymentMethod === 'Credito' && installments > 1) {
        const amounts = splitAmountCents(amountCents, installments)
        const dates = buildInstallmentDates(formData.date, installments)
        const groupId = crypto.randomUUID()

        if (editingExpense.installment_group_id) {
          await supabase
            .from('expenses')
            .delete()
            .eq('installment_group_id', editingExpense.installment_group_id)
        } else {
          await supabase.from('expenses').delete().eq('id', editingExpense.id)
        }

        const rows = amounts.map((amount, index) => ({
          ...expenseData,
          amount_cents: amount,
          date: dates[index],
          installment_group_id: groupId,
          installment_index: index + 1,
        }))
        await supabase.from('expenses').insert(rows)
      } else {
        if (paymentMethod === 'Credito' && !expenseData.installment_group_id) {
          expenseData.installment_group_id = crypto.randomUUID()
          expenseData.installment_index = 1
        }
        if (editingExpense.installment_group_id) {
          await supabase
            .from('expenses')
            .delete()
            .eq('installment_group_id', editingExpense.installment_group_id)
            .neq('id', editingExpense.id)
        }
        await supabase
          .from('expenses')
          .update({ ...expenseData, updated_at: new Date().toISOString() })
          .eq('id', editingExpense.id)
      }
    } else {
      if (paymentMethod === 'Credito' && installments > 1) {
        const amounts = splitAmountCents(amountCents, installments)
        const dates = buildInstallmentDates(formData.date, installments)
        const groupId = crypto.randomUUID()
        const rows = amounts.map((amount, index) => ({
          ...expenseData,
          amount_cents: amount,
          date: dates[index],
          installment_group_id: groupId,
          installment_index: index + 1,
        }))
        await supabase.from('expenses').insert(rows)
      } else {
        if (paymentMethod === 'Credito') {
          expenseData.installment_group_id = crypto.randomUUID()
          expenseData.installment_index = 1
        }
        await supabase.from('expenses').insert(expenseData)
      }
    }

    closeModal()
    loadExpenses()
  }

  const handleDelete = async (id: string) => {
    if (updatingIds.includes(id)) return
    if (confirm('Remover este registro?')) {
      setUpdatingIds((prev) => [...prev, id])
      await supabase.from('expenses').delete().eq('id', id)
      setUpdatingIds((prev) => prev.filter((item) => item !== id))
      loadExpenses()
    }
  }

  const handleTogglePaid = async (expense: Expense) => {
    if (updatingIds.includes(expense.id)) return
    const nextStatus = expense.status === 'paid' ? 'open' : 'paid'
    const now = new Date().toISOString()
    const nextPaidAt = nextStatus === 'paid' ? now : null

    setUpdatingIds((prev) => [...prev, expense.id])
    await supabase
      .from('expenses')
      .update({ status: nextStatus, paid_at: nextPaidAt, updated_at: now })
      .eq('id', expense.id)
    setUpdatingIds((prev) => prev.filter((item) => item !== expense.id))

    loadExpenses()
  }

  const openModal = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense)
      setFormData({
        description: expense.description,
        category: expense.category_name,
        amount: (expense.amount_cents / 100).toFixed(2),
        date: expense.date,
        status: expense.status,
        notes: expense.notes || '',
        paymentMethod: expense.payment_method || 'PIX',
        installments: expense.installments || 1,
      })
    } else {
      setEditingExpense(null)
      setFormData({
        description: '',
        category: '',
        amount: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        status: 'open',
        notes: '',
        paymentMethod: 'PIX',
        installments: 1,
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingExpense(null)
  }

  // Cálculos
  const total = expenses.reduce((sum, exp) => sum + exp.amount_cents, 0)
  const paid = expenses.filter(e => e.status === 'paid').reduce((sum, e) => sum + e.amount_cents, 0)
  const open = total - paid
  const installmentIndexes = buildInstallmentIndexes(expenses)
  const groupedExpenses = expenses.reduce((acc, expense) => {
    const groupId = expense.installment_group_id || expense.id
    const group = acc.get(groupId) || {
      id: groupId,
      description: expense.description,
      category_name: expense.category_name,
      payment_method: expense.payment_method,
      installments: expense.installments || 1,
      total_cents: 0,
      items: [] as Expense[],
    }
    group.total_cents += expense.amount_cents
    group.items.push(expense)
    acc.set(groupId, group)
    return acc
  }, new Map<string, {
    id: string
    description: string
    category_name: string
    payment_method: PaymentMethod | null
    installments: number
    total_cents: number
    items: Expense[]
  }>())

  const groupedList = Array.from(groupedExpenses.values()).sort((a, b) => {
    const aDate = a.items[0]?.date || ''
    const bDate = b.items[0]?.date || ''
    return bDate.localeCompare(aDate)
  })
  const openExpenses = expenses
    .filter((expense) => expense.status !== 'paid')
    .sort((a, b) => b.date.localeCompare(a.date))
  const paidExpenses = expenses
    .filter((expense) => expense.status === 'paid')
    .sort((a, b) => b.date.localeCompare(a.date))

  return (
    <>
      <Topbar 
        title="Contas a Pagar" 
        subtitle="Compromissos honrados constroem segurança."
        actions={
          <button
            onClick={() => openModal()}
            className="px-4 py-2 bg-fab-green text-white rounded-lg hover:bg-fab-green/90 transition-vintage text-sm"
          >
            + Nova despesa
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filtros */}
        <VintageCard className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            <Select
              label="Mês"
              value={selectedMonth.toString()}
              onChange={(v) =>
                setSelectedMonth(v ? parseInt(v, 10) : getCurrentMonth())
              }
              options={MONTHS.map(m => ({ value: m.value.toString(), label: m.label }))}
              placeholder="Atual"
            />
            <Select
              label="Ano"
              value={selectedYear.toString()}
              onChange={(v) =>
                setSelectedYear(v ? parseInt(v, 10) : getCurrentYear())
              }
              options={getYearOptions()}
              placeholder="Atual"
            />
            <Select
              label="Categoria"
              value={selectedCategory}
              onChange={setSelectedCategory}
              options={[
                { value: '', label: 'Todas' },
                ...categories.map(c => ({ value: c.name, label: c.name }))
              ]}
            />
            <Select
              label="Status"
              value={selectedStatus}
              onChange={setSelectedStatus}
              options={[
                { value: '', label: 'Todos' },
                { value: 'paid', label: 'Pago' },
                { value: 'open', label: 'Em aberto' },
              ]}
            />
            <Select
              label="Metodo"
              value={selectedPaymentMethod}
              onChange={setSelectedPaymentMethod}
              options={[
                { value: '', label: 'Todos' },
                { value: 'PIX', label: 'PIX' },
                { value: 'Credito', label: 'Credito' },
                { value: 'Debito', label: 'Debito' },
              ]}
            />
            <label className="flex items-end gap-2 text-sm text-ink/70 pb-1">
              <input
                type="checkbox"
                checked={onlyInstallments}
                onChange={(event) => setOnlyInstallments(event.target.checked)}
                className="w-4 h-4 rounded border-border"
              />
              Somente parceladas
            </label>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedCategory('')
                  setSelectedStatus('')
                  setSelectedPaymentMethod('')
                  setOnlyInstallments(false)
                }}
                className="w-full px-4 py-3 border border-border rounded-lg hover:bg-paper-2 transition-vintage text-sm"
              >
                Limpar filtros
              </button>
            </div>
          </div>
        </VintageCard>

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard label="Total do período" value={total} color="terracotta" />
          <StatCard label="Pago" value={paid} color="olive" />
          <StatCard label="Em aberto" value={open} color="default" />
        </div>

        {/* Lista */}
        <VintageCard>
          <h3 className="text-lg font-serif text-coffee mb-4">
            Total do período | {MONTHS[selectedMonth - 1]?.label} - {selectedYear}
          </h3>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <p className="text-sm text-ink/60 italic">
              Cada conta paga é um gesto de cuidado com o amanhã da família.
            </p>
            <label className="flex items-center gap-2 text-sm text-ink/70">
              <input
                type="checkbox"
                checked={groupByPurchase}
                onChange={(event) => setGroupByPurchase(event.target.checked)}
                className="w-4 h-4 rounded border-border"
              />
              Agrupar por compra
            </label>
          </div>

          {loading ? (
            <div className="text-center py-12 text-ink/60">Carregando...</div>
          ) : expenses.length === 0 ? (
            <EmptyState
              icon={<Receipt className="w-16 h-16" />}
              message="Ainda não há despesas aqui — um bom começo."
              submessage="Use o botão + para adicionar uma despesa."
            />
          ) : groupByPurchase ? (
            <div className="space-y-4">
              {groupedList.map((group) => {
                const sortedItems = group.items.slice().sort((a, b) => a.date.localeCompare(b.date))
                const isInstallmentGroup =
                  group.payment_method === 'Credito' && group.installments > 1
                const paidCount = group.items.filter((item) => item.status === 'paid').length
                const openCount = group.items.length - paidCount
                return (
                  <div
                    key={group.id}
                    className="p-4 bg-paper rounded-lg border border-border hover:shadow-soft transition-vintage"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="inline-flex items-center gap-2 text-xs uppercase tracking-wide text-ink/60">
                            {isInstallmentGroup ? 'Parcelado' : 'Compra'}
                          </span>
                          <h4 className="font-body font-medium">{group.description}</h4>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-ink/60">
                          <span>{group.category_name}</span>
                          <span>•</span>
                          <span>{formatPaymentLabel(group.payment_method, group.installments)}</span>
                          {isInstallmentGroup ? (
                            <>
                              <span>•</span>
                              <span>{group.installments}x</span>
                            </>
                          ) : null}
                          <span>•</span>
                          <span>{paidCount} pagas</span>
                          <span>•</span>
                          <span>{openCount} em aberto</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-ink/60">Total</div>
                        <div className="font-numbers text-lg font-semibold">
                          {formatBRL(group.total_cents)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {sortedItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-sm text-ink/70"
                        >
                          <div className="flex items-center gap-3">
                            {isInstallmentGroup ? (
                              <span className="text-ink/50">
                                Parcela {item.installment_index || 1}/{item.installments || 1}
                              </span>
                            ) : null}
                            <span>{formatDate(item.date)}</span>
                            <span className={item.status === 'paid' ? 'text-olive' : 'text-terracotta'}>
                              {item.status === 'paid' ? 'Pago' : 'Em aberto'}
                            </span>
                          </div>
                          <span className="font-numbers">{formatBRL(item.amount_cents)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {openExpenses.map((expense) => {
                const isUpdating = updatingIds.includes(expense.id)
                return (
                  <div
                    id={`expense-${expense.id}`}
                    key={expense.id}
                    className={`flex items-center justify-between p-4 bg-paper rounded-lg border border-border hover:shadow-soft transition-vintage ${
                      isUpdating ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`w-2 h-2 rounded-full ${
                          expense.status === 'paid' ? 'bg-olive' : 'bg-terracotta'
                        }`} />
                        <h4
                          className={`font-body font-medium ${
                            expense.status === 'paid' ? 'line-through italic text-ink/60' : ''
                          }`}
                        >
                          {expense.description}
                        </h4>
                        {expense.payment_method === 'Credito' && (expense.installments || 1) > 1 ? (
                          <span className="text-[10px] uppercase tracking-wide text-ink/60 border border-border px-2 py-0.5 rounded-full">
                            Parcelado
                          </span>
                        ) : null}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-ink/60">
                      <span>{expense.category_name}</span>
                      <span>•</span>
                      <span>{formatDate(expense.date)}</span>
                      <span>•</span>
                      <span>{formatPaymentLabel(expense.payment_method, expense.installments)}</span>
                      {expense.payment_method === 'Credito' && (expense.installments || 1) > 1 ? (
                        <>
                          <span>•</span>
                          <span>
                            Parcela {installmentIndexes.get(expense.id) || 1}/{expense.installments}
                          </span>
                        </>
                      ) : null}
                      <span>•</span>
                      <span className={expense.status === 'paid' ? 'text-olive' : 'text-terracotta'}>
                        {expense.status === 'paid' ? 'Pago' : 'Em aberto'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-ink/70 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={expense.status === 'paid'}
                        disabled={isUpdating}
                        onChange={() => handleTogglePaid(expense)}
                        className="w-5 h-5 rounded border-border disabled:opacity-60"
                        aria-label={`Marcar ${expense.description} como ${expense.status === 'paid' ? 'em aberto' : 'pago'}`}
                      />
                      <span className="hidden sm:inline">Pago</span>
                    </label>
                    <span className="font-numbers text-lg font-semibold">
                      {formatBRL(expense.amount_cents)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openModal(expense)}
                        disabled={isUpdating}
                        className="relative group text-ink/50 hover:text-ink transition-vintage disabled:opacity-50"
                        aria-label={`Editar ${expense.description}`}
                      >
                        <Pencil className="w-5 h-5" />
                        <span className="pointer-events-none absolute -top-8 right-0 whitespace-nowrap rounded-md bg-coffee text-paper text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-vintage">
                          Editar {expense.description}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(expense.id)}
                        disabled={isUpdating}
                        className="relative group text-terracotta/70 hover:text-terracotta transition-vintage disabled:opacity-50"
                        aria-label={`Deletar ${expense.description}`}
                      >
                        <Trash2 className="w-5 h-5" />
                        <span className="pointer-events-none absolute -top-8 right-0 whitespace-nowrap rounded-md bg-terracotta text-paper text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-vintage">
                          Deletar {expense.description}
                        </span>
                      </button>
                    </div>
                  </div>
                  </div>
                )
              })}
              {paidExpenses.length > 0 && (
                <div className="flex items-center gap-3 pt-2 text-ink/50 italic text-sm">
                  <div className="flex-1 h-px bg-border" />
                  <span>Pagos</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}
              {paidExpenses.map((expense) => {
                const isUpdating = updatingIds.includes(expense.id)
                return (
                  <div
                    id={`expense-${expense.id}`}
                    key={expense.id}
                    className={`flex items-center justify-between p-4 bg-paper rounded-lg border border-border hover:shadow-soft transition-vintage ${
                      isUpdating ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="w-2 h-2 rounded-full bg-olive" />
                        <h4 className="font-body font-medium line-through italic text-ink/60">
                          {expense.description}
                        </h4>
                        {expense.payment_method === 'Credito' && (expense.installments || 1) > 1 ? (
                          <span className="text-[10px] uppercase tracking-wide text-ink/60 border border-border px-2 py-0.5 rounded-full">
                            Parcelado
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-ink/60">
                        <span>{expense.category_name}</span>
                        <span>•</span>
                        <span>{formatDate(expense.date)}</span>
                        <span>•</span>
                        <span>{formatPaymentLabel(expense.payment_method, expense.installments)}</span>
                        {expense.payment_method === 'Credito' && (expense.installments || 1) > 1 ? (
                          <>
                            <span>•</span>
                            <span>
                              Parcela {installmentIndexes.get(expense.id) || 1}/{expense.installments}
                            </span>
                          </>
                        ) : null}
                        <span>•</span>
                        <span className="text-olive">Pago</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-sm text-ink/70 cursor-pointer">
                        <input
                          type="checkbox"
                          checked
                          disabled={isUpdating}
                          onChange={() => handleTogglePaid(expense)}
                          className="w-5 h-5 rounded border-border disabled:opacity-60"
                          aria-label={`Marcar ${expense.description} como em aberto`}
                        />
                        <span className="hidden sm:inline">Pago</span>
                      </label>
                      <span className="font-numbers text-lg font-semibold">
                        {formatBRL(expense.amount_cents)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openModal(expense)}
                          disabled={isUpdating}
                          className="relative group text-ink/50 hover:text-ink transition-vintage disabled:opacity-50"
                          aria-label={`Editar ${expense.description}`}
                        >
                          <Pencil className="w-5 h-5" />
                          <span className="pointer-events-none absolute -top-8 right-0 whitespace-nowrap rounded-md bg-coffee text-paper text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-vintage">
                            Editar {expense.description}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(expense.id)}
                          disabled={isUpdating}
                          className="relative group text-terracotta/70 hover:text-terracotta transition-vintage disabled:opacity-50"
                          aria-label={`Deletar ${expense.description}`}
                        >
                          <Trash2 className="w-5 h-5" />
                          <span className="pointer-events-none absolute -top-8 right-0 whitespace-nowrap rounded-md bg-terracotta text-paper text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-vintage">
                            Deletar {expense.description}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </VintageCard>

      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingExpense ? 'Editar Despesa' : 'Nova Despesa'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-body text-ink mb-2">
              Descrição <span className="text-terracotta">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-petrol/50"
              placeholder="Ex: Conta de luz"
            />
          </div>

          <Select
            label="Categoria"
            value={formData.category}
            onChange={(v) => setFormData({ ...formData, category: v })}
            options={categories.map(c => ({ value: c.name, label: c.name }))}
            required
          />

          <Select
            label="Método de pagamento"
            value={formData.paymentMethod}
            onChange={(value) =>
              setFormData({
                ...formData,
                paymentMethod: value as PaymentMethod,
                installments: value === 'Credito' ? formData.installments : 1,
              })
            }
            options={[
              { value: 'PIX', label: 'PIX' },
              { value: 'Credito', label: 'Credito' },
              { value: 'Debito', label: 'Debito' },
            ]}
            required
          />

          {formData.paymentMethod === 'Credito' ? (
            <Select
              label="Parcelas"
              value={String(formData.installments)}
              onChange={(value) => setFormData({ ...formData, installments: parseInt(value, 10) || 1 })}
              options={Array.from({ length: 12 }, (_, index) => {
                const count = index + 1
                return { value: String(count), label: `${count}x` }
              })}
              required
            />
          ) : null}

          <div>
            <label className="block text-sm font-body text-ink mb-2">
              Valor (R$) <span className="text-terracotta">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-petrol/50"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block text-sm font-body text-ink mb-2">
              Data <span className="text-terracotta">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-petrol/50"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.status === 'paid'}
                onChange={(e) => setFormData({ ...formData, status: e.target.checked ? 'paid' : 'open' })}
                className="w-5 h-5 rounded border-border"
              />
              <span className="text-sm font-body text-ink">Marcar como pago</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-body text-ink mb-2">
              Observação
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-petrol/50 resize-none"
              rows={3}
              placeholder="Notas adicionais..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 px-4 py-3 border border-border rounded-lg hover:bg-paper transition-vintage"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-coffee text-paper rounded-lg hover:bg-coffee/90 transition-vintage"
            >
              Salvar
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
