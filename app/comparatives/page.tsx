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
import { formatBRL } from '@/lib/money'

interface Totals {
  income: number
  paid: number
  saved: number
  balance: number
}

export default function ComparativesPage() {
  const { familyId } = useAuth()
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())
  const [selectedYear, setSelectedYear] = useState(getCurrentYear())
  const [monthlyTotals, setMonthlyTotals] = useState<Totals>({
    income: 0,
    paid: 0,
    saved: 0,
    balance: 0,
  })
  const [yearlyTotals, setYearlyTotals] = useState<Totals>({
    income: 0,
    paid: 0,
    saved: 0,
    balance: 0,
  })

  const renderBars = (totals: Totals) => {
    const values = [
      { label: 'Recebido', value: totals.income, color: 'bg-olive' },
      { label: 'Pago', value: totals.paid, color: 'bg-terracotta' },
      { label: 'Poupado', value: totals.saved, color: 'bg-petrol' },
      { label: 'Saldo', value: totals.balance, color: totals.balance >= 0 ? 'bg-coffee' : 'bg-terracotta' },
    ]
    const maxValue = Math.max(1, ...values.map((item) => Math.abs(item.value)))

    return (
      <div className="space-y-3">
        {values.map((item) => {
          const width = Math.round((Math.abs(item.value) / maxValue) * 100)
          return (
            <div key={item.label} className="space-y-1">
              <div className="flex items-center justify-between text-sm text-ink/70">
                <span>{item.label}</span>
                <span className="font-numbers">{formatBRL(item.value)}</span>
              </div>
              <div className="h-2 rounded-full bg-paper-2 border border-border overflow-hidden">
                <div className={`h-full ${item.color}`} style={{ width: `${width}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  useEffect(() => {
    if (familyId) {
      loadComparatives()
    }
  }, [familyId, selectedMonth, selectedYear])

  const loadTotals = async (startDate: string, endDate: string): Promise<Totals> => {
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

    const income = incomeResult.data?.reduce((sum, row) => sum + row.amount_cents, 0) || 0
    const paid = expenseResult.data?.reduce((sum, row) => sum + row.amount_cents, 0) || 0
    const saved = savingsResult.data?.reduce((sum, row) => sum + row.amount_cents, 0) || 0

    return {
      income,
      paid,
      saved,
      balance: income - paid - saved,
    }
  }

  const loadComparatives = async () => {
    setLoading(true)
    const { start, end } = getMonthRange(selectedMonth, selectedYear)
    const startDate = format(start, 'yyyy-MM-dd')
    const endDate = format(end, 'yyyy-MM-dd')
    const yearStart = format(new Date(selectedYear, 0, 1), 'yyyy-MM-dd')
    const yearEnd = format(new Date(selectedYear, 11, 31), 'yyyy-MM-dd')

    const [monthly, yearly] = await Promise.all([
      loadTotals(startDate, endDate),
      loadTotals(yearStart, yearEnd),
    ])

    setMonthlyTotals(monthly)
    setYearlyTotals(yearly)
    setLoading(false)
  }

  return (
    <AppLayout>
      <Topbar
        title="Comparativos"
        subtitle="Entender o passado nos ajuda a construir o futuro."
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <VintageCard className="mb-6">
          <p className="text-ink/70 italic font-body">
            As cifras contam a história: meses que crescem e anos que ensinam.
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

        {loading ? (
          <div className="text-center py-12 text-ink/60">Carregando...</div>
        ) : (
          <div className="space-y-6">
            <VintageCard>
              <h3 className="text-lg font-serif text-coffee mb-4">
                Comparativo mensal | {MONTHS[selectedMonth - 1]?.label} - {selectedYear}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard label="Recebido" value={monthlyTotals.income} color="olive" size="sm" />
                <StatCard label="Pago" value={monthlyTotals.paid} color="terracotta" size="sm" />
                <StatCard label="Poupado" value={monthlyTotals.saved} color="petrol" size="sm" />
                <StatCard label="Saldo" value={monthlyTotals.balance} color="coffee" size="sm" />
              </div>
              <div className="mt-6">
                {renderBars(monthlyTotals)}
              </div>
            </VintageCard>

            <VintageCard>
              <h3 className="text-lg font-serif text-coffee mb-4">
                Comparativo anual | {selectedYear}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard label="Recebido" value={yearlyTotals.income} color="olive" size="sm" />
                <StatCard label="Pago" value={yearlyTotals.paid} color="terracotta" size="sm" />
                <StatCard label="Poupado" value={yearlyTotals.saved} color="petrol" size="sm" />
                <StatCard label="Saldo" value={yearlyTotals.balance} color="coffee" size="sm" />
              </div>
              <div className="mt-6">
                {renderBars(yearlyTotals)}
              </div>
            </VintageCard>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
