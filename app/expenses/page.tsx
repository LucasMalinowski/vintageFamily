'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import VintageCard from '@/components/ui/VintageCard'
import StatCard from '@/components/ui/StatCard'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { formatBRL } from '@/lib/money'
import { formatDate, getCurrentMonth, getCurrentYear, getMonthRange, getYearOptions, MONTHS } from '@/lib/dates'
import { buildInstallmentDates, splitAmountCents } from '@/lib/installments'
import { Pencil, Receipt, Trash2 } from 'lucide-react'

type PaymentMethod = 'PIX' | 'Credito' | 'Debito'

const normalizePaymentMethod = (method: string | null): PaymentMethod | null => {
  if (method === 'PIX' || method === 'Credito' || method === 'Debito') {
    return method
  }
  return null
}

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

const formatExportMethod = (method: string | null, installments: number | null) => {
  if (method === 'Credito' && installments && installments > 1) {
    return `Credito ${installments}x`
  }
  if (method === 'Debito') return 'Debito'
  return 'PIX'
}

const formatExportInstallments = (
  method: string | null,
  installments: number | null,
  installmentIndex: number | null
) => {
  if (method === 'Credito' && installments && installments > 1) {
    return `${installmentIndex || 1}/${installments}`
  }
  return '-'
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

export default function ExpensesPage() {
  const { familyId } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 12

  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('')
  const [onlyInstallments, setOnlyInstallments] = useState(false)
  const [groupByPurchase, setGroupByPurchase] = useState(false)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [pdfUrl, setPdfUrl] = useState('')
  const [includeSignatures, setIncludeSignatures] = useState(true)
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null)
  const [exportRows, setExportRows] = useState<
    {
      description: string
      category: string
      amount_cents: number
      date: string
      status: string
      notes: string
      payment_method: string
      installments: number
      installment_index: number | null
    }[]
  >([])

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
    page,
  ])

  useEffect(() => {
    if (isPdfModalOpen) {
      document.body.classList.add('no-grain')
    } else {
      document.body.classList.remove('no-grain')
    }
    return () => {
      document.body.classList.remove('no-grain')
    }
  }, [isPdfModalOpen])

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
    let query = supabase
      .from('expenses')
      .select('*', { count: 'exact' })
      .eq('family_id', familyId!)
      .order('date', { ascending: false })

    const monthValue = selectedMonth ? parseInt(selectedMonth) : null
    const yearValue = selectedYear ? parseInt(selectedYear) : null

    if (monthValue) {
      const resolvedYear = yearValue || getCurrentYear()
      const { start, end } = getMonthRange(monthValue, resolvedYear)
      query = query
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
    } else if (yearValue) {
      const start = format(new Date(yearValue, 0, 1), 'yyyy-MM-dd')
      const end = format(new Date(yearValue, 11, 31), 'yyyy-MM-dd')
      query = query.gte('date', start).lte('date', end)
    }

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

    const rangeStart = (page - 1) * pageSize
    const rangeEnd = rangeStart + pageSize - 1
    const { data, count } = await query.range(rangeStart, rangeEnd)

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
        payment_method: normalizePaymentMethod(row.payment_method) ?? 'PIX',
        installments: row.installments || 1,
        installment_group_id: row.installment_group_id,
        installment_index: row.installment_index,
      }))
      setExpenses(normalized)
    }
    setTotalCount(count || 0)
    setLoading(false)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

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
    if (confirm('Remover este registro?')) {
      await supabase.from('expenses').delete().eq('id', id)
      loadExpenses()
    }
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

  const closePdfModal = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl)
    }
    setPdfUrl('')
    setIsPdfModalOpen(false)
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const fetchExportRows = async () => {
    let query = supabase
      .from('expenses')
      .select('*')
      .eq('family_id', familyId!)
      .order('date', { ascending: false })

    const monthValue = selectedMonth ? parseInt(selectedMonth) : null
    const yearValue = selectedYear ? parseInt(selectedYear) : null

    if (monthValue) {
      const resolvedYear = yearValue || getCurrentYear()
      const { start, end } = getMonthRange(monthValue, resolvedYear)
      query = query
        .gte('date', format(start, 'yyyy-MM-dd'))
        .lte('date', format(end, 'yyyy-MM-dd'))
    } else if (yearValue) {
      const start = format(new Date(yearValue, 0, 1), 'yyyy-MM-dd')
      const end = format(new Date(yearValue, 11, 31), 'yyyy-MM-dd')
      query = query.gte('date', start).lte('date', end)
    }

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
    return (data || []).map((row) => ({
      description: row.description,
      category: row.category_name,
      amount_cents: row.amount_cents,
      date: formatDate(row.date),
      status: row.status === 'paid' ? 'Pago' : 'Em aberto',
      notes: row.notes || '',
      payment_method: row.payment_method || 'PIX',
      installments: row.installments || 1,
      installment_index: row.installment_index,
    }))
  }

  const exportExpenses = async () => {
    const rows = await fetchExportRows()

    const header = ['Descricao', 'Categoria', 'Metodo', 'Parcelas', 'Valor', 'Data', 'Status', 'Observacao']
    const csvLines = [
      header.join(','),
      ...rows.map((row) =>
        [
          row.description,
          row.category,
          formatExportMethod(row.payment_method, row.installments),
          formatExportInstallments(row.payment_method, row.installments, row.installment_index),
          formatBRL(row.amount_cents),
          row.date,
          row.status,
          row.notes,
        ]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(',')
      ),
    ].join('\n')

    const blob = new Blob([csvLines], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `despesas_${selectedYear || 'todos'}_${selectedMonth || 'todos'}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportExpensesPdf = async () => {
    const rows = await fetchExportRows()
    setExportRows(rows)
    const blob = await generatePdfBlob(rows)
    updatePdfUrl(blob)
    setIsPdfModalOpen(true)
  }

  const buildFilterSummary = () => {
    const monthLabel = selectedMonth ? MONTHS[parseInt(selectedMonth) - 1]?.label : null
    const yearLabel = selectedYear || null
    const categoryLabel = selectedCategory || null
    const paymentLabel = selectedPaymentMethod || null
    const installmentsLabel = onlyInstallments ? 'Somente parceladas' : null
    const statusLabel =
      selectedStatus === 'paid' ? 'Pago' : selectedStatus === 'open' ? 'Em aberto' : null

    if (!monthLabel && !yearLabel && !categoryLabel && !statusLabel && !paymentLabel && !installmentsLabel) {
      return 'Sem filtros ativos'
    }

    const parts = [
      monthLabel || 'Todos os meses',
      yearLabel ? `Ano ${yearLabel}` : 'Todos os anos',
      categoryLabel ? `Categoria: ${categoryLabel}` : 'Todas as categorias',
      statusLabel ? `Status: ${statusLabel}` : 'Todos os status',
      paymentLabel ? `Metodo: ${paymentLabel}` : 'Todos os metodos',
      installmentsLabel || 'Todas as compras',
    ]

    return parts.join(' • ')
  }

  const loadLogoDataUrl = async () => {
    if (logoDataUrl) return logoDataUrl
    try {
      const response = await fetch('/logo.png')
      if (!response.ok) return null
      const blob = await response.blob()
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('Falha ao ler logo.'))
        reader.readAsDataURL(blob)
      })
      setLogoDataUrl(dataUrl)
      return dataUrl
    } catch {
      return null
    }
  }

  const generatePdfBlob = async (rowsOverride?: typeof exportRows, includeSignatureOverride?: boolean) => {
    const rows = rowsOverride ?? exportRows
    const includeSignatureValue =
      typeof includeSignatureOverride === 'boolean' ? includeSignatureOverride : includeSignatures
    const filterSummary = buildFilterSummary()
    const totalValue = formatBRL(rows.reduce((sum, row) => sum + row.amount_cents, 0))
    const paidValue = formatBRL(
      rows.reduce((sum, row) => sum + (row.status === 'Pago' ? row.amount_cents : 0), 0)
    )
    const openValue = formatBRL(
      rows.reduce((sum, row) => sum + (row.status === 'Em aberto' ? row.amount_cents : 0), 0)
    )

    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    doc.setFillColor(244, 239, 230)
    doc.rect(0, 0, 210, 297, 'F')

    const logoData = await loadLogoDataUrl()
    if (logoData) {
      doc.addImage(logoData, 'PNG', 24, 14, 10, 10)
    }

    doc.setTextColor(90, 70, 51)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text('FINTECH VINTAGE', logoData ? 38 : 24, 20)

    doc.setTextColor(46, 42, 36)
    doc.setFontSize(18)
    doc.text('Livro de Despesas', 24, 30)
    doc.setFontSize(10)
    doc.setTextColor(107, 98, 90)
    doc.text(`Filtro: ${filterSummary}`, 24, 36)

    const cards = [
      { label: 'TOTAL', value: totalValue },
      { label: 'PAGO', value: paidValue },
      { label: 'EM ABERTO', value: openValue },
    ]
    const cardY = 42
    const cardW = 52
    const cardH = 18
    const cardGap = 6

    cards.forEach((card, index) => {
      const x = 24 + index * (cardW + cardGap)
      doc.setDrawColor(217, 207, 191)
      doc.setFillColor(239, 231, 218)
      doc.roundedRect(x, cardY, cardW, cardH, 2, 2, 'FD')
      doc.setTextColor(138, 127, 116)
      doc.setFontSize(8)
      doc.text(card.label, x + 4, cardY + 6)
      doc.setTextColor(46, 42, 36)
      doc.setFontSize(11)
      doc.text(card.value, x + 4, cardY + 13)
    })

    autoTable(doc, {
      startY: cardY + cardH + 8,
      head: [['Descricao', 'Categoria', 'Metodo', 'Parcelas', 'Valor', 'Data', 'Status', 'Observacao']],
      body: rows.map((row) => [
        row.description,
        row.category,
        formatExportMethod(row.payment_method, row.installments),
        formatExportInstallments(row.payment_method, row.installments, row.installment_index),
        formatBRL(row.amount_cents),
        row.date,
        row.status,
        row.notes,
      ]),
      styles: {
        font: 'helvetica',
        fontSize: 9,
        textColor: [46, 42, 36],
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [244, 239, 230],
        textColor: [125, 115, 104],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 243, 236],
      },
      tableLineColor: [217, 207, 191],
      tableLineWidth: 0.1,
      margin: { left: 24, right: 24 },
    })

    const footerY = (doc as any).lastAutoTable?.finalY
      ? (doc as any).lastAutoTable.finalY + 10
      : 260
    doc.setFontSize(9)
    doc.setTextColor(155, 144, 133)
    doc.text(`Gerado em ${formatDate(new Date())}`, 24, footerY)

    if (includeSignatureValue) {
      const lineY = footerY + 12
      doc.setDrawColor(205, 191, 176)
      doc.line(24, lineY, 95, lineY)
      doc.line(115, lineY, 186, lineY)
      doc.setFontSize(9)
      doc.setTextColor(138, 127, 116)
      doc.text('Assinatura Responsavel', 24, lineY + 5)
      doc.text('Assinatura Financeiro', 115, lineY + 5)
    }

    const blob = doc.output('blob')
    return blob
  }

  const updatePdfUrl = (blob: Blob) => {
    const url = URL.createObjectURL(blob)
    setPdfUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
  }

  const downloadPdf = async () => {
    const blob = await generatePdfBlob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `despesas_${selectedYear || 'todos'}_${selectedMonth || 'todos'}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  }

  const total = expenses.reduce((sum, exp) => sum + exp.amount_cents, 0)
  const paid = expenses.filter((e) => e.status === 'paid').reduce((sum, e) => sum + e.amount_cents, 0)
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

  return (
    <AppLayout>
      <Topbar
        title="Todas as Despesas"
        subtitle="A memória da casa também se faz com cada pequena despesa."
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
        <VintageCard className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            <Select
              label="Mês"
              value={selectedMonth}
              onChange={(value) => {
                setSelectedMonth(value)
                setPage(1)
              }}
              options={MONTHS.map((month) => ({ value: month.value.toString(), label: month.label }))}
              placeholder="Todos"
            />
            <Select
              label="Ano"
              value={selectedYear}
              onChange={(value) => {
                setSelectedYear(value)
                setPage(1)
              }}
              options={getYearOptions()}
              placeholder="Todos"
            />
            <Select
              label="Categoria"
              value={selectedCategory}
              onChange={(value) => {
                setSelectedCategory(value)
                setPage(1)
              }}
              options={[
                { value: '', label: 'Todas' },
                ...categories.map((category) => ({ value: category.name, label: category.name })),
              ]}
            />
            <Select
              label="Status"
              value={selectedStatus}
              onChange={(value) => {
                setSelectedStatus(value)
                setPage(1)
              }}
              options={[
                { value: '', label: 'Todos' },
                { value: 'paid', label: 'Pago' },
                { value: 'open', label: 'Em aberto' },
              ]}
            />
            <Select
              label="Metodo"
              value={selectedPaymentMethod}
              onChange={(value) => {
                setSelectedPaymentMethod(value)
                setPage(1)
              }}
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
                onChange={(event) => {
                  setOnlyInstallments(event.target.checked)
                  setPage(1)
                }}
                className="w-4 h-4 rounded border-border"
              />
              Somente parceladas
            </label>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedMonth('')
                  setSelectedYear('')
                  setSelectedCategory('')
                  setSelectedStatus('')
                  setSelectedPaymentMethod('')
                  setOnlyInstallments(false)
                  setPage(1)
                }}
                className="w-full px-4 py-3 border border-border rounded-lg hover:bg-paper-2 transition-vintage text-sm"
              >
                Limpar filtros
              </button>
            </div>
          </div>
        </VintageCard>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard label="Total do período" value={total} color="terracotta" />
          <StatCard label="Pago" value={paid} color="olive" />
          <StatCard label="Em aberto" value={open} color="default" />
        </div>

        <VintageCard>
          <h3 className="text-lg font-serif text-coffee mb-4">
            Livro completo de despesas
          </h3>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <p className="text-sm text-ink/60 italic">
              Quando tudo se reúne, o mês fica mais claro e a família respira melhor.
            </p>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-ink/70">
                <input
                  type="checkbox"
                  checked={groupByPurchase}
                  onChange={(event) => setGroupByPurchase(event.target.checked)}
                  className="w-4 h-4 rounded border-border"
                />
                Agrupar por compra
              </label>
              <button
                onClick={exportExpenses}
                className="px-4 py-2 border border-border rounded-lg hover:bg-paper-2 transition-vintage text-sm"
              >
                Exportar CSV
              </button>
              <button
                onClick={exportExpensesPdf}
                className="px-4 py-2 border border-border rounded-lg hover:bg-paper-2 transition-vintage text-sm"
              >
                Exportar PDF
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-ink/60">Carregando...</div>
          ) : expenses.length === 0 ? (
            <EmptyState
              icon={<Receipt className="w-16 h-16" />}
              message="Ainda não há despesas registradas."
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
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 bg-paper rounded-lg border border-border hover:shadow-soft transition-vintage"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`w-2 h-2 rounded-full ${expense.status === 'paid' ? 'bg-olive' : 'bg-terracotta'}`} />
                      <h4 className="font-body font-medium">{expense.description}</h4>
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
                    <span className="font-numbers text-lg font-semibold">
                      {formatBRL(expense.amount_cents)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openModal(expense)}
                        className="relative group text-ink/50 hover:text-ink transition-vintage"
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
                        className="relative group text-terracotta/70 hover:text-terracotta transition-vintage"
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
              ))}
            </div>
          )}
        </VintageCard>

        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-ink/60">
            Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="px-3 py-2 border border-border rounded-lg hover:bg-paper-2 transition-vintage text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
              className="px-3 py-2 border border-border rounded-lg hover:bg-paper-2 transition-vintage text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Proxima
            </button>
          </div>
        </div>

      </div>

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
              onChange={(event) => setFormData({ ...formData, description: event.target.value })}
              className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-petrol/50"
              placeholder="Ex: Conta de luz"
            />
          </div>

          <Select
            label="Categoria"
            value={formData.category}
            onChange={(value) => setFormData({ ...formData, category: value })}
            options={categories.map((category) => ({ value: category.name, label: category.name }))}
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
              onChange={(event) => setFormData({ ...formData, amount: event.target.value })}
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
              onChange={(event) => setFormData({ ...formData, date: event.target.value })}
              className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-petrol/50"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.status === 'paid'}
                onChange={(event) => setFormData({ ...formData, status: event.target.checked ? 'paid' : 'open' })}
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
              onChange={(event) => setFormData({ ...formData, notes: event.target.value })}
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

      <Modal
        isOpen={isPdfModalOpen}
        onClose={closePdfModal}
        title="Preview do PDF"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-ink/60">
              {buildFilterSummary()}
            </p>
            <label className="flex items-center gap-2 text-sm text-ink/70">
              <input
                type="checkbox"
                checked={includeSignatures}
                onChange={async (event) => {
                  const nextValue = event.target.checked
                  setIncludeSignatures(nextValue)
                  if (pdfUrl) {
                    const blob = await generatePdfBlob(exportRows, nextValue)
                    updatePdfUrl(blob)
                  }
                }}
                className="w-4 h-4 rounded border-border"
              />
              Assinaturas
            </label>
          </div>
          <div className="border border-border rounded-lg overflow-hidden bg-paper">
            {pdfUrl ? (
              <iframe
                title="PDF preview"
                src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&zoom=90`}
                className="w-full h-[70vh]"
              />
            ) : (
              <div className="w-full h-[70vh] flex items-center justify-center text-sm text-ink/60">
                Clique em &quot;Imprimir ou salvar&quot; para gerar o PDF.
              </div>
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={async () => {
                await downloadPdf()
              }}
              className="px-4 py-2 bg-coffee text-paper rounded-lg hover:bg-coffee/90 transition-vintage text-sm"
            >
              Imprimir ou salvar
            </button>
            <button
              type="button"
              onClick={closePdfModal}
              className="px-4 py-2 border border-border rounded-lg hover:bg-paper-2 transition-vintage text-sm"
            >
              Fechar
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  )
}
