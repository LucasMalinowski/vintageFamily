'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
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
import { PiggyBank } from 'lucide-react'

interface Dream {
  id: string
  name: string
  target_cents: number | null
}

interface Contribution {
  id: string
  dream_id: string
  amount_cents: number
  date: string
  notes: string | null
}

export default function DreamsPage() {
  const { familyId } = useAuth()
  const [dreams, setDreams] = useState<Dream[]>([])
  const [contributions, setContributions] = useState<Contribution[]>([])
  const [loading, setLoading] = useState(true)

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    dreamId: '',
    dreamName: '',
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
  })

  useEffect(() => {
    if (familyId) {
      loadDreams()
      loadContributions()
    }
  }, [familyId, selectedMonth, selectedYear])

  const loadDreams = async () => {
    const { data } = await supabase
      .from('dreams')
      .select('*')
      .eq('family_id', familyId!)
      .order('name')

    setDreams(data || [])
  }

  const loadContributions = async () => {
    setLoading(true)
    const { start, end } = getMonthRange(selectedMonth, selectedYear)
    const { data } = await supabase
      .from('dream_contributions')
      .select('*')
      .eq('family_id', familyId!)
      .gte('date', format(start, 'yyyy-MM-dd'))
      .lte('date', format(end, 'yyyy-MM-dd'))
      .order('date', { ascending: false })

    setContributions(data || [])
    setLoading(false)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setFormData({
      dreamId: '',
      dreamName: '',
      amount: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const amountCents = Math.round(parseFloat(formData.amount) * 100)
    let dreamId = formData.dreamId

    if (dreamId === '__new__') {
      const dreamName = formData.dreamName.trim()
      if (!dreamName) return
      const { data: newDream } = await supabase
        .from('dreams')
        .insert({ family_id: familyId!, name: dreamName })
        .select('id')
        .single()

      if (!newDream?.id) return
      dreamId = newDream.id
    }

    if (!dreamId) return

    await supabase.from('dream_contributions').insert({
      family_id: familyId!,
      dream_id: dreamId,
      amount_cents: amountCents,
      date: formData.date,
      notes: formData.notes || null,
    })

    closeModal()
    loadDreams()
    loadContributions()
  }

  const dreamTotals = useMemo(() => {
    const totals = new Map<string, { total: number; count: number; lastDate: string | null }>()
    dreams.forEach((dream) => {
      totals.set(dream.id, { total: 0, count: 0, lastDate: null })
    })

    contributions.forEach((contribution) => {
      const existing = totals.get(contribution.dream_id)
      if (!existing) return
      totals.set(contribution.dream_id, {
        total: existing.total + contribution.amount_cents,
        count: existing.count + 1,
        lastDate: existing.lastDate || contribution.date,
      })
    })

    return totals
  }, [dreams, contributions])

  const totalSaved = contributions.reduce((sum, contribution) => sum + contribution.amount_cents, 0)

  return (
    <AppLayout>
      <Topbar
        title="Poupança / Sonhos"
        subtitle="Todo grande sonho começa com pequenos passos."
        actions={
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-fab-green text-white rounded-lg hover:bg-fab-green/90 transition-vintage text-sm"
          >
            + Nova poupança
          </button>
        }
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <VintageCard className="mb-6">
          <p className="text-ink/70 italic font-body">
            Guardar hoje para viver amanhã: cada contribuição carrega um desejo em silêncio.
          </p>
        </VintageCard>

        <VintageCard className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Mês"
              value={selectedMonth.toString()}
              onChange={(value) => setSelectedMonth(parseInt(value))}
              options={MONTHS.map((month) => ({ value: month.value.toString(), label: month.label }))}
            />
            <Select
              label="Ano"
              value={selectedYear.toString()}
              onChange={(value) => setSelectedYear(parseInt(value))}
              options={getYearOptions()}
            />
          </div>
        </VintageCard>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard label="Total poupado no período" value={totalSaved} color="petrol" />
        </div>

        <VintageCard>
          <h3 className="text-lg font-serif text-coffee mb-4">
            Sonhos guardados | {MONTHS[selectedMonth - 1]?.label} - {selectedYear}
          </h3>

          {loading ? (
            <div className="text-center py-12 text-ink/60">Carregando...</div>
          ) : dreams.length === 0 ? (
            <EmptyState
              icon={<PiggyBank className="w-16 h-16" />}
              message="Ainda não há sonhos cadastrados."
              submessage="Use o botão + para adicionar um sonho e registrar um valor poupado."
            />
          ) : (
            <div className="space-y-3">
              {dreams.map((dream) => {
                const totals = dreamTotals.get(dream.id)
                const total = totals?.total ?? 0
                const count = totals?.count ?? 0
                const lastDate = totals?.lastDate

                return (
                  <div
                    key={dream.id}
                    className="flex items-center justify-between p-4 bg-paper rounded-lg border border-border hover:shadow-soft transition-vintage"
                  >
                    <div>
                      <h4 className="font-body font-medium">{dream.name}</h4>
                      <p className="text-sm text-ink/60 italic">
                        {count === 0 ? 'Sem aportes neste período.' : `${count} aporte${count > 1 ? 's' : ''} no período.`}
                      </p>
                      {lastDate && (
                        <p className="text-xs text-ink/50">Último aporte: {formatDate(lastDate)}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-numbers text-lg font-semibold text-petrol">
                        {formatBRL(total)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </VintageCard>

      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Nova Poupança"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Select
            label="Categoria do sonho"
            value={formData.dreamId}
            onChange={(value) => setFormData({ ...formData, dreamId: value })}
            options={[
              { value: '__new__', label: 'Nova categoria' },
              ...dreams.map((dream) => ({ value: dream.id, label: dream.name })),
            ]}
            required
          />

          {formData.dreamId === '__new__' && (
            <div>
              <label className="block text-sm font-body text-ink mb-2">
                Nome da nova categoria <span className="text-terracotta">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.dreamName}
                onChange={(event) => setFormData({ ...formData, dreamName: event.target.value })}
                className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-petrol/50"
                placeholder="Ex: Reforma da casa"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-body text-ink mb-2">
              Valor poupado (R$) <span className="text-terracotta">*</span>
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
    </AppLayout>
  )
}
