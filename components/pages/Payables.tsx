'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/layout/Topbar'
import VintageCard from '@/components/ui/VintageCard'
import StatCard from '@/components/ui/StatCard'
import FabButton from '@/components/ui/FabButton'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { formatBRL } from '@/lib/money'
import { formatDate, getCurrentMonth, getCurrentYear, MONTHS, getYearOptions, getMonthRange } from '@/lib/dates'
import { MoreVertical, Receipt } from 'lucide-react'
import { format } from 'date-fns'

interface Expense {
  id: string
  description: string
  category_name: string
  amount_cents: number
  date: string
  status: 'open' | 'paid'
  paid_at: string | null
  notes: string | null
}

interface Category {
  name: string
}

export default function Payables() {
  const { familyId } = useAuth()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filtros
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  
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
  })

  useEffect(() => {
    if (familyId) {
      loadCategories()
      loadExpenses()
    }
  }, [familyId, selectedMonth, selectedYear, selectedCategory, selectedStatus])

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
    const { start, end } = getMonthRange(selectedMonth, selectedYear)

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

    const { data } = await query

    if (data) {
      setExpenses(data)
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const amountCents = Math.round(parseFloat(formData.amount) * 100)

    const expenseData = {
      family_id: familyId!,
      description: formData.description,
      category_name: formData.category,
      amount_cents: amountCents,
      date: formData.date,
      status: formData.status,
      paid_at: formData.status === 'paid' ? new Date().toISOString() : null,
      notes: formData.notes || null,
    }

    if (editingExpense) {
      await supabase
        .from('expenses')
        .update({ ...expenseData, updated_at: new Date().toISOString() })
        .eq('id', editingExpense.id)
    } else {
      await supabase.from('expenses').insert(expenseData)
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

  return (
    <>
      <Topbar 
        title="Contas a Pagar" 
        subtitle="Compromissos honrados constroem segurança."
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filtros */}
        <VintageCard className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Select
              label="Mês"
              value={selectedMonth.toString()}
              onChange={(v) => setSelectedMonth(parseInt(v))}
              options={MONTHS.map(m => ({ value: m.value.toString(), label: m.label }))}
            />
            <Select
              label="Ano"
              value={selectedYear.toString()}
              onChange={(v) => setSelectedYear(parseInt(v))}
              options={getYearOptions()}
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
            <div className="flex items-end">
              <button
                onClick={() => {
                  setSelectedCategory('')
                  setSelectedStatus('')
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
            Total recebido | {MONTHS[selectedMonth - 1]?.label} - {selectedYear}
          </h3>

          {loading ? (
            <div className="text-center py-12 text-ink/60">Carregando...</div>
          ) : expenses.length === 0 ? (
            <EmptyState 
              icon={<Receipt className="w-16 h-16" />}
              message="Ainda não há despesas aqui — um bom começo."
              submessage="Use o botão + para adicionar uma despesa."
            />
          ) : (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 bg-paper rounded-lg border border-border hover:shadow-soft transition-vintage"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`w-2 h-2 rounded-full ${
                        expense.status === 'paid' ? 'bg-olive' : 'bg-terracotta'
                      }`} />
                      <h4 className="font-body font-medium">{expense.description}</h4>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-ink/60">
                      <span>{expense.category_name}</span>
                      <span>•</span>
                      <span>{formatDate(expense.date)}</span>
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
                    <button className="text-ink/40 hover:text-ink transition-vintage">
                      <MoreVertical 
                        className="w-5 h-5 cursor-pointer"
                        onClick={() => {
                          const action = confirm('Editar ou Remover?\n\nOK = Editar\nCancelar = Remover')
                          if (action) {
                            openModal(expense)
                          } else {
                            handleDelete(expense.id)
                          }
                        }}
                      />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </VintageCard>

        <FabButton onClick={() => openModal()} label="Nova despesa" />
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
