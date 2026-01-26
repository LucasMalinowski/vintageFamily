'use client'

import AppLayout from '@/components/layout/AppLayout'
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
import { DollarSign, Pencil, Trash2 } from 'lucide-react'
import { format } from 'date-fns'

interface Income {
  id: string
  description: string
  category_name: string
  amount_cents: number
  date: string
  notes: string | null
}

interface Category {
  name: string
}

export default function ReceivablesPage() {
  const { familyId } = useAuth()
  const [incomes, setIncomes] = useState<Income[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())
  const [selectedCategory, setSelectedCategory] = useState('')
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIncome, setEditingIncome] = useState<Income | null>(null)
  
  const [formData, setFormData] = useState({
    description: '',
    category: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  })

  useEffect(() => {
    if (familyId) {
      loadCategories()
      loadIncomes()
    }
  }, [familyId, selectedMonth, selectedYear, selectedCategory])

  const loadCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('name')
      .eq('family_id', familyId!)
      .eq('kind', 'income')
      .order('name')

    if (data) {
      setCategories(data)
    }
  }

  const loadIncomes = async () => {
    setLoading(true)
    const { start, end } = getMonthRange(selectedMonth, selectedYear)

    let query = supabase
      .from('incomes')
      .select('*')
      .eq('family_id', familyId!)
      .gte('date', format(start, 'yyyy-MM-dd'))
      .lte('date', format(end, 'yyyy-MM-dd'))
      .order('date', { ascending: false })

    if (selectedCategory) {
      query = query.eq('category_name', selectedCategory)
    }

    const { data } = await query

    if (data) {
      setIncomes(data)
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const amountCents = Math.round(parseFloat(formData.amount) * 100)

    const incomeData = {
      family_id: familyId!,
      description: formData.description,
      category_name: formData.category,
      amount_cents: amountCents,
      date: formData.date,
      notes: formData.notes || null,
    }

    if (editingIncome) {
      await supabase
        .from('incomes')
        .update({ ...incomeData, updated_at: new Date().toISOString() })
        .eq('id', editingIncome.id)
    } else {
      await supabase.from('incomes').insert(incomeData)
    }

    closeModal()
    loadIncomes()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Remover este registro?')) {
      await supabase.from('incomes').delete().eq('id', id)
      loadIncomes()
    }
  }

  const openModal = (income?: Income) => {
    if (income) {
      setEditingIncome(income)
      setFormData({
        description: income.description,
        category: income.category_name,
        amount: (income.amount_cents / 100).toFixed(2),
        date: income.date,
        notes: income.notes || '',
      })
    } else {
      setEditingIncome(null)
      setFormData({
        description: '',
        category: '',
        amount: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingIncome(null)
  }

  const total = incomes.reduce((sum, inc) => sum + inc.amount_cents, 0)

  return (
    <AppLayout>
      <Topbar 
        title="Contas a Receber" 
        subtitle="O fruto do trabalho honesto."
        actions={
          <button
            onClick={() => openModal()}
            className="px-4 py-2 bg-fab-green text-white rounded-lg hover:bg-fab-green/90 transition-vintage text-sm"
          >
            + Nova receita
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <VintageCard className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div className="flex items-end">
              <button
                onClick={() => setSelectedCategory('')}
                className="w-full px-4 py-3 border border-border rounded-lg hover:bg-paper-2 transition-vintage text-sm"
              >
                Limpar filtros
              </button>
            </div>
          </div>
        </VintageCard>

        <div className="grid grid-cols-1 md:grid-cols-1 gap-4 mb-6">
          <StatCard label="Total recebido" value={total} color="olive" />
        </div>

        <VintageCard>
          <h3 className="text-lg font-serif text-coffee mb-4">
            Total recebido | {MONTHS[selectedMonth - 1]?.label} - {selectedYear}
          </h3>
          <p className="text-sm text-ink/60 italic mb-6">
            O trabalho em família floresce quando cada receita encontra seu lugar.
          </p>

          {loading ? (
            <div className="text-center py-12 text-ink/60">Carregando...</div>
          ) : incomes.length === 0 ? (
            <EmptyState 
              icon={<DollarSign className="w-16 h-16" />}
              message="Ainda não há receitas registradas."
              submessage="Use o botão + para adicionar uma receita."
            />
          ) : (
            <div className="space-y-3">
              {incomes.map((income) => (
                <div
                  key={income.id}
                  className="flex items-center justify-between p-4 bg-paper rounded-lg border border-border hover:shadow-soft transition-vintage"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="w-2 h-2 rounded-full bg-olive" />
                      <h4 className="font-body font-medium">{income.description}</h4>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-ink/60">
                      <span>{income.category_name}</span>
                      <span>•</span>
                      <span>{formatDate(income.date)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-numbers text-lg font-semibold text-olive">
                      {formatBRL(income.amount_cents)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openModal(income)}
                        className="relative group text-ink/50 hover:text-ink transition-vintage"
                        aria-label={`Editar ${income.description}`}
                      >
                        <Pencil className="w-5 h-5" />
                        <span className="pointer-events-none absolute -top-8 right-0 whitespace-nowrap rounded-md bg-coffee text-paper text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-vintage">
                          Editar {income.description}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(income.id)}
                        className="relative group text-terracotta/70 hover:text-terracotta transition-vintage"
                        aria-label={`Deletar ${income.description}`}
                      >
                        <Trash2 className="w-5 h-5" />
                        <span className="pointer-events-none absolute -top-8 right-0 whitespace-nowrap rounded-md bg-terracotta text-paper text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-vintage">
                          Deletar {income.description}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </VintageCard>

      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingIncome ? 'Editar Receita' : 'Nova Receita'}
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
              placeholder="Ex: Salário"
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
    </AppLayout>
  )
}
