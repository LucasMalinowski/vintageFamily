'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import VintageCard from '@/components/ui/VintageCard'
import StatCard from '@/components/ui/StatCard'
import Select from '@/components/ui/Select'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import { getCurrentMonth, getCurrentYear, getMonthRange, getYearOptions, MONTHS } from '@/lib/dates'
import { ChevronDown } from 'lucide-react'

export default function BalancePage() {
  const { familyId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [totals, setTotals] = useState({
    income: 0,
    paid: 0,
    saved: 0,
    balance: 0,
  })

  useEffect(() => {
    if (familyId) {
      loadBalance()
    }
  }, [familyId, selectedMonth, selectedYear])

  const loadBalance = async () => {
    setLoading(true)
    const { start, end } = getMonthRange(selectedMonth, selectedYear)
    const startDate = format(start, 'yyyy-MM-dd')
    const endDate = format(end, 'yyyy-MM-dd')

    const [incomeResult, expenseResult, savingsResult] = await Promise.all([
      supabase
        .from('incomes')
        .select('amount_cents')
        .eq('family_id', familyId!)
        .gte('date', startDate)
        .lte('date', endDate),
      supabase
        .from('expenses')
        .select('amount_cents')
        .eq('family_id', familyId!)
        .eq('status', 'paid')
        .gte('date', startDate)
        .lte('date', endDate),
      supabase
        .from('dream_contributions')
        .select('amount_cents')
        .eq('family_id', familyId!)
        .gte('date', startDate)
        .lte('date', endDate),
    ])

    const totalIncome = incomeResult.data?.reduce((sum, row) => sum + row.amount_cents, 0) || 0
    const totalPaid = expenseResult.data?.reduce((sum, row) => sum + row.amount_cents, 0) || 0
    const totalSaved = savingsResult.data?.reduce((sum, row) => sum + row.amount_cents, 0) || 0
    const balance = totalIncome - totalPaid - totalSaved

    setTotals({
      income: totalIncome,
      paid: totalPaid,
      saved: totalSaved,
      balance,
    })
    setLoading(false)
  }

  return (
    <AppLayout>
      <Topbar
        title="Saldo"
        subtitle="O equilíbrio é a chave para a paz financeira."
        texture
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <VintageCard className="mb-6 paper-texture">
          <p className="text-ink/70 italic font-body">
            Quando o mês fecha, escutamos o silêncio do dinheiro e medimos o que ficou.
          </p>
        </VintageCard>

        <VintageCard className="mb-6">
          <div className="flex items-center justify-between md:hidden mb-3">
            <span className="text-xs uppercase tracking-wide text-ink/50">Filtros</span>
            <button
              type="button"
              onClick={() => setFiltersOpen((prev) => !prev)}
              className="text-petrol hover:text-petrol/80 transition-vintage"
              aria-label="Alternar filtros"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
          <div className={`${filtersOpen ? 'block' : 'hidden'} md:block`}>
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
          </div>
        </VintageCard>

        {loading ? (
          <div className="text-center py-12 text-ink/60">Carregando...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <StatCard label="Total recebido" value={totals.income} color="olive" />
              <StatCard label="Total pago" value={totals.paid} color="terracotta" />
              <StatCard label="Total poupado" value={totals.saved} color="petrol" />
              <StatCard label="Saldo do período" value={totals.balance} color="coffee" />
            </div>

            <VintageCard>
              <h3 className="text-lg font-serif text-coffee mb-2">
                Balanço do período | {MONTHS[selectedMonth - 1]?.label} - {selectedYear}
              </h3>
              <p className="text-sm text-ink/60 italic">
                Total Recebido - Total Pago - Total Poupado = Saldo
              </p>
            </VintageCard>
          </>
        )}
      </div>
    </AppLayout>
  )
}
