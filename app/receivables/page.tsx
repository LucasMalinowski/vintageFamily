'use client'

import AppLayout from '@/components/layout/AppLayout'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Topbar from '@/components/layout/Topbar'
import VintageCard from '@/components/ui/VintageCard'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import EmptyState from '@/components/ui/EmptyState'
import { formatBRL } from '@/lib/money'
import { formatDate, getCurrentMonth, getCurrentYear, MONTHS, getYearOptions, getMonthRange } from '@/lib/dates'
import { DollarSign } from 'lucide-react'
import { format } from 'date-fns'
import ActionMenu from '@/components/ui/ActionMenu'
import { mergeAttachment, parseAttachment } from '@/lib/attachments'

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
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('')
  const [onlyInstallments, setOnlyInstallments] = useState(false)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingIncome, setEditingIncome] = useState<Income | null>(null)
  const [detailIncome, setDetailIncome] = useState<Income | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [currentAttachmentUrl, setCurrentAttachmentUrl] = useState<string | null>(null)
  
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
      notes: mergeAttachment(formData.notes || null, currentAttachmentUrl),
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

  const openDetails = (income: Income) => {
    setDetailIncome(income)
    setIsDetailOpen(true)
  }

  const handleAttachIncome = async (income: Income, file: File) => {
    if (!familyId) return
    const safeName = file.name.replace(/\s+/g, '-')
    const filePath = `${familyId}/${income.id}/${Date.now()}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('attachments')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      alert('Erro ao enviar arquivo.')
      return
    }

    const { data: publicUrlData } = supabase.storage.from('attachments').getPublicUrl(filePath)
    const { cleanNotes } = parseAttachment(income.notes)
    const mergedNotes = mergeAttachment(cleanNotes || null, publicUrlData.publicUrl)

    await supabase
      .from('incomes')
      .update({ notes: mergedNotes, updated_at: new Date().toISOString() })
      .eq('id', income.id)

    loadIncomes()
  }

  const openModal = (income?: Income) => {
    if (income) {
      const { attachmentUrl, cleanNotes } = parseAttachment(income.notes)
      setEditingIncome(income)
      setCurrentAttachmentUrl(attachmentUrl)
      setFormData({
        description: income.description,
        category: income.category_name,
        amount: (income.amount_cents / 100).toFixed(2),
        date: income.date,
        notes: cleanNotes || '',
      })
    } else {
      setEditingIncome(null)
      setCurrentAttachmentUrl(null)
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
    setCurrentAttachmentUrl(null)
  }

  const total = incomes.reduce((sum, inc) => sum + inc.amount_cents, 0)

  return (
    <AppLayout>
      <div className="min-h-screen flex flex-col">
        <Topbar
          title="Contas a Receber"
          subtitle="O fruto do trabalho em forma de números."
          variant="textured"
          filters={
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 ">
              <Select
                variant="filter"
                label="Mês"
                value={selectedMonth.toString()}
                onChange={(v) => setSelectedMonth(parseInt(v))}
                options={MONTHS.map(m => ({ value: m.value.toString(), label: m.label }))}
              />
              <Select
                variant="filter"
                label="Ano"
                value={selectedYear.toString()}
                onChange={(v) => setSelectedYear(parseInt(v))}
                options={getYearOptions()}
              />
              <Select
                variant="filter"
                label="Categoria"
                value={selectedCategory}
                onChange={setSelectedCategory}
                options={[
                  { value: '', label: 'Todas' },
                  ...categories.map(c => ({ value: c.name, label: c.name }))
                ]}
              />
              <Select
                variant="filter"
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
                variant="filter"
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
              <label className="flex items-center gap-2 text-sm text-gold pt-8">
                <input
                  type="checkbox"
                  checked={onlyInstallments}
                  onChange={(event) => setOnlyInstallments(event.target.checked)}
                  className="w-4 h-4 rounded border-gold/60 accent-gold"
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
                  className="w-full px-4 py-3 rounded-lg bg-paper-2/80 transition-vintage text-sm text-petrol"
                >
                  Limpar filtros
                </button>
              </div>
            </div>
          }
        />

        <div className="flex-1 flex flex-col">
          <div className="px-6 py-4 w-full flex flex-col">
            <div className="flex justify-end mb-4">
              <button
                onClick={() => openModal()}
                className="px-5 py-2 bg-petrol text-white rounded-md hover:bg-petrol/90 transition-vintage text-sm"
              >
                Nova Receita
              </button>
            </div>

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
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-paper rounded-lg border border-border hover:shadow-soft transition-vintage"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xl font-medium text-petrol font-serif">
                        {income.description}
                      </h4>
                      <p className="text-sm text-ink/50">
                        {income.category_name} • {formatDate(income.date)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
                      <span className="font-numbers text-lg font-semibold text-olive">
                        {formatBRL(income.amount_cents)}
                      </span>
                      <ActionMenu
                        onView={() => openDetails(income)}
                        onEdit={() => openModal(income)}
                        onDelete={() => handleDelete(income.id)}
                        onAttach={(file) => handleAttachIncome(income, file)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <footer className="mt-auto w-full">
            <div className="px-6 mb-4">
              <div className="mt-10 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <div className="rounded-[16px] px-10 py-5 bg-olive text-white text-center shadow-soft min-w-[200px]">
                    <div className="text-sm uppercase tracking-wide text-white/80 mb-2">Recebido</div>
                    <div className="font-numbers text-xl font-semibold">{formatBRL(total)}</div>
                  </div>
                </div>
                <div className="text-center md:text-right">
                  <div className="text-sm uppercase tracking-wide text-ink/50">Total</div>
                  <div className="font-numbers text-xl font-semibold text-petrol">{incomes.length}</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
                <button
                  type="button"
                  className="px-4 py-2 rounded-md border border-petrol text-petrol/70 hover:bg-paper-2 hover:text-petrol transition-vintage text-sm"
                >
                  Gerar CSV
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-md border border-petrol text-petrol/70 hover:bg-paper-2 hover:text-petrol transition-vintage text-sm"
                >
                  Gerar PDF
                </button>
              </div>
            </div>
            <div className="h-[76px] bg-texture flex items-center justify-center px-6">
              <p className="text-center text-[13px] text-gold italic">
                Acompanhe o que entra para decidir para onde a vida vai.
              </p>
            </div>
          </footer>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingIncome ? 'Editar Receita' : 'Nova Receita'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-body text-ink mb-2 font-serif">
              Descrição <span className="text-terracotta">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-3 bg-paper-2/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-petrol/50"
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
            <label className="block font-serif font-body text-ink mb-2">
              Valor (R$) <span className="text-terracotta">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-4 py-3 bg-paper-2/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-petrol/50"
              placeholder="0.00"
            />
          </div>

          <div>
            <label className="block font-serif font-body text-ink mb-2">
              Data <span className="text-terracotta">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-4 py-3 bg-paper-2/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-petrol/50"
            />
          </div>

          <div>
            <label className="block font-serif font-body text-ink mb-2">
              Observação
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-3 bg-paper-2/80 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-petrol/50 resize-none"
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
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Detalhes da receita"
      >
        {detailIncome && (() => {
          const { attachmentUrl, cleanNotes } = parseAttachment(detailIncome.notes)
          return (
            <div className="space-y-3 text-sm text-ink/70">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink/50">Descrição</p>
                <p className="text-base text-ink">{detailIncome.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">Categoria</p>
                  <p>{detailIncome.category_name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">Data</p>
                  <p>{formatDate(detailIncome.date)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">Valor</p>
                  <p className="font-numbers">{formatBRL(detailIncome.amount_cents)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-ink/50">Observação</p>
                <p>{cleanNotes || '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-ink/50">Arquivo</p>
                {attachmentUrl ? (
                  <a
                    href={attachmentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-petrol hover:opacity-80 transition-vintage"
                  >
                    Visualizar anexo
                  </a>
                ) : (
                  <p>Sem arquivo anexado</p>
                )}
              </div>
            </div>
          )
        })()}
      </Modal>
    </AppLayout>
  )
}
