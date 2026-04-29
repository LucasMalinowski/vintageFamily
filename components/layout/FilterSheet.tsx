'use client'

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { getMonthOptions, getYearOptions } from '@/lib/dates'

interface FilterSheetProps {
  open: boolean
  onClose: () => void
  month: number
  year: number
  status?: string
  method?: string
  onApply: (month: number, year: number, status?: string, method?: string) => void
  showStatus?: boolean
  showMethod?: boolean
  statusOptions?: Array<{ value: string; label: string }>
}

const DEFAULT_STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'paid', label: 'Pago' },
  { value: 'open', label: 'Em aberto' },
]

const METHOD_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'PIX', label: 'PIX' },
  { value: 'Credito', label: 'Crédito' },
  { value: 'Debito', label: 'Débito' },
]

export default function FilterSheet({
  open,
  onClose,
  month,
  year,
  status = '',
  method = '',
  onApply,
  showStatus = false,
  showMethod = false,
  statusOptions = DEFAULT_STATUS_OPTIONS,
}: FilterSheetProps) {
  const [mounted, setMounted] = useState(false)
  const [animated, setAnimated] = useState(false)
  const [localMonth, setLocalMonth] = useState(month)
  const [localYear, setLocalYear] = useState(year)
  const [localStatus, setLocalStatus] = useState(status)
  const [localMethod, setLocalMethod] = useState(method)
  const monthOptions = getMonthOptions(true)
  const yearOptions = getYearOptions(2020, true)

  useEffect(() => {
    if (open) {
      setLocalMonth(month)
      setLocalYear(year)
      setLocalStatus(status)
      setLocalMethod(method)
      setMounted(true)
      const t = setTimeout(() => setAnimated(true), 10)
      return () => clearTimeout(t)
    } else {
      setAnimated(false)
      const t = setTimeout(() => setMounted(false), 300)
      return () => clearTimeout(t)
    }
  }, [open, month, year, status, method])

  const handleApply = () => {
    onApply(
      localMonth,
      localYear,
      showStatus ? localStatus : undefined,
      showMethod ? localMethod : undefined
    )
    onClose()
  }

  const handleClear = () => {
    const now = new Date()
    setLocalMonth(now.getMonth() + 1)
    setLocalYear(now.getFullYear())
    setLocalStatus('')
    setLocalMethod('')
  }

  if (!mounted) return null

  return (
    <div className="md:hidden">
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/38 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          animated ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-offWhite rounded-t-[22px] max-h-[85vh] flex flex-col transition-transform duration-300 ${
          animated ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Drag handle */}
        <div className="w-9 h-1 rounded-full bg-ink/20 mx-auto mt-3 mb-1 shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0">
          <span className="text-base font-semibold text-ink font-serif">Filtros</span>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-ink/5 text-ink/60"
            aria-label="Fechar filtros"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-6">
          {/* Mês */}
          <div>
            <p className="text-xs uppercase tracking-wide text-ink/50 mb-3 font-medium">Mês</p>
            <button
              type="button"
              onClick={() => setLocalMonth(0)}
              className={`w-full px-3 py-2.5 rounded-[12px] border text-sm font-medium transition-vintage mb-2 ${
                localMonth === 0
                  ? 'bg-coffee text-paper border-coffee'
                  : 'bg-transparent text-ink border-border'
              }`}
            >
              Todos os meses
            </button>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {monthOptions.filter((option) => option.value !== '0').map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setLocalMonth(parseInt(m.value, 10))}
                  className={`px-2 py-2 rounded-[10px] border text-sm font-medium transition-vintage ${
                    localMonth === parseInt(m.value, 10)
                      ? 'bg-coffee text-paper border-coffee'
                      : 'bg-transparent text-ink border-border'
                  }`}
                >
                  {m.label.slice(0, 3)}
                </button>
              ))}
            </div>
            <p className="text-xs text-ink/40 mt-2">Escolha um mês ou veja todos os meses de um ano.</p>
          </div>

          {/* Ano */}
          <div>
            <p className="text-xs uppercase tracking-wide text-ink/50 mb-3 font-medium">Ano</p>
            <button
              type="button"
              onClick={() => setLocalYear(0)}
              className={`w-full px-3 py-2.5 rounded-[12px] border text-sm font-medium transition-vintage mb-2 ${
                localYear === 0
                  ? 'bg-coffee text-paper border-coffee'
                  : 'bg-transparent text-ink border-border'
              }`}
            >
              Todos os anos
            </button>
            <div className="flex gap-2 flex-wrap">
              {yearOptions.filter((option) => option.value !== '0').map((y) => (
                <button
                  key={y.value}
                  type="button"
                  onClick={() => setLocalYear(parseInt(y.value, 10))}
                  className={`px-4 py-2 rounded-[10px] border text-sm font-medium transition-vintage ${
                    localYear === parseInt(y.value, 10)
                      ? 'bg-coffee text-paper border-coffee'
                      : 'bg-transparent text-ink border-border'
                  }`}
                >
                  {y.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          {showStatus && (
            <div>
              <p className="text-xs uppercase tracking-wide text-ink/50 mb-3 font-medium">Status</p>
              <div className="flex gap-2 flex-wrap">
                  {statusOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLocalStatus(opt.value)}
                    className={`px-4 py-2 rounded-[10px] border text-sm font-medium transition-vintage ${
                      localStatus === opt.value
                        ? 'bg-petrol/10 text-petrol border-petrol'
                        : 'bg-transparent text-ink border-border'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Método */}
          {showMethod && (
            <div>
              <p className="text-xs uppercase tracking-wide text-ink/50 mb-3 font-medium">Método</p>
              <div className="flex gap-2 flex-wrap">
                {METHOD_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setLocalMethod(opt.value)}
                    className={`px-4 py-2 rounded-[10px] border text-sm font-medium transition-vintage ${
                      localMethod === opt.value
                        ? 'bg-petrol/10 text-petrol border-petrol'
                        : 'bg-transparent text-ink border-border'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 px-5 py-4 border-t border-border shrink-0">
          <button
            type="button"
            onClick={handleClear}
            className="flex-1 border border-border rounded-[12px] py-[13px] text-sm font-medium text-ink transition-vintage hover:bg-paper"
          >
            Limpar
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-[2] bg-coffee text-paper rounded-[12px] py-[13px] text-sm font-semibold transition-vintage hover:bg-coffee/90"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  )
}
