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
import { ChevronDown } from 'lucide-react'

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
  const [filtersOpen, setFiltersOpen] = useState(false)
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

  const renderBarChart = (totals: Totals) => {
    const values = [
      { label: 'Recebido', value: totals.income, color: '#3E5F4B' },
      { label: 'Pago', value: totals.paid, color: '#6FBF8A' },
      { label: 'Poupado', value: totals.saved, color: '#2F6F7E' },
      { label: 'Saldo', value: totals.balance, color: totals.balance >= 0 ? '#C2A45D' : '#6FBF8A' },
    ]
    const maxValue = Math.max(1, ...values.map((item) => Math.abs(item.value)))
    return (
      <div className="grid grid-cols-4 gap-4 items-end h-40">
        {values.map((item) => {
          const height = Math.round((Math.abs(item.value) / maxValue) * 100)
          return (
            <div key={item.label} className="flex flex-col items-center gap-2">
              <div className="w-full bg-paper-2 rounded-2xl border border-border h-28 flex items-end overflow-hidden">
                <div
                  className="w-full rounded-2xl"
                  style={{ height: `${height}%`, backgroundColor: item.color }}
                />
              </div>
              <span className="text-xs text-ink/60">{item.label}</span>
            </div>
          )
        })}
      </div>
    )
  }

  const renderPieChart = (totals: Totals) => {
    const values = [
      { label: 'Recebido', value: totals.income, color: '#3E5F4B' },
      { label: 'Pago', value: totals.paid, color: '#6FBF8A' },
      { label: 'Poupado', value: totals.saved, color: '#2F6F7E' },
      { label: 'Saldo', value: Math.max(0, totals.balance), color: '#C2A45D' },
    ]
    const total = values.reduce((sum, item) => sum + Math.abs(item.value), 0) || 1
    let offset = 0
    const radius = 44
    const circumference = 2 * Math.PI * radius

    return (
      <div className="flex flex-col md:flex-row items-center gap-6">
        <svg width="140" height="140" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#F3ECDD" strokeWidth="20" />
          {values.map((slice) => {
            const value = Math.abs(slice.value)
            const dash = (value / total) * circumference
            const circle = (
              <circle
                key={slice.label}
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth="20"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
              />
            )
            offset += dash
            return circle
          })}
        </svg>
        <div className="space-y-2 text-sm text-ink/70">
          {values.map((slice) => (
            <div key={slice.label} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: slice.color }} />
              <span>{slice.label}</span>
              <span className="ml-auto font-numbers">{formatBRL(slice.value)}</span>
            </div>
          ))}
        </div>
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
        title="Dashboard"
        subtitle="Entender o passado nos ajuda a construir o futuro."
        texture
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <VintageCard className="mb-6 paper-texture">
          <p className="text-ink/70 italic font-body">
            As cifras contam a história: meses que crescem e anos que ensinam.
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
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderBarChart(monthlyTotals)}
                {renderPieChart(monthlyTotals)}
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
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {renderBarChart(yearlyTotals)}
                {renderPieChart(yearlyTotals)}
              </div>
            </VintageCard>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
