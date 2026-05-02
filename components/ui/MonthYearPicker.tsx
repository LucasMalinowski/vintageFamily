'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MONTHS, getCurrentMonth, getCurrentYear, ALL_MONTHS_VALUE } from '@/lib/dates'

interface MonthYearPickerProps {
  month: number
  year: number
  onChange: (month: number, year: number) => void
  minYear?: number
  allowAll?: boolean
}

export default function MonthYearPicker({
  month,
  year,
  onChange,
  minYear = 2020,
  allowAll = true,
}: MonthYearPickerProps) {
  const [open, setOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(year > 0 ? year : getCurrentYear())
  const ref = useRef<HTMLDivElement>(null)
  const maxYear = getCurrentYear()

  useEffect(() => {
    if (open) setPickerYear(year > 0 ? year : getCurrentYear())
  }, [open, year])

  useEffect(() => {
    if (!open) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const isAll = month === ALL_MONTHS_VALUE
  const canPrev = !isAll && !(month === 1 && year <= minYear)
  const canNext = !isAll && !(month === getCurrentMonth() && year >= maxYear)

  const goPrev = () => {
    if (!canPrev) return
    if (month === 1) onChange(12, year - 1)
    else onChange(month - 1, year)
  }

  const goNext = () => {
    if (!canNext) return
    if (month === 12) onChange(1, year + 1)
    else onChange(month + 1, year)
  }

  const monthName = MONTHS.find((m) => m.value === month)?.label.slice(0, 3) ?? ''
  const label = isAll ? `Todos / ${year > 0 ? year : '—'}` : `${monthName} ${year > 0 ? year : ''}`

  return (
    <div className="relative" ref={ref}>
      <div className="flex items-center gap-0.5 rounded-[10px] border border-border bg-bg px-1 py-1">
        <button
          type="button"
          onClick={goPrev}
          disabled={!canPrev}
          className="w-7 h-7 rounded-[8px] flex items-center justify-center text-ink/40 hover:bg-paper hover:text-ink disabled:opacity-25 transition-vintage"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex-1 text-center text-sm font-medium text-ink px-1 py-1 rounded-[8px] hover:bg-paper transition-vintage whitespace-nowrap"
        >
          {label}
        </button>

        <button
          type="button"
          onClick={goNext}
          disabled={!canNext}
          className="w-7 h-7 rounded-[8px] flex items-center justify-center text-ink/40 hover:bg-paper hover:text-ink disabled:opacity-25 transition-vintage"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-offWhite rounded-[14px] border border-border shadow-lg w-52 p-3 animate-popup-in">
          {/* Year row */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setPickerYear((y) => Math.max(minYear, y - 1))}
              disabled={pickerYear <= minYear}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-ink/40 hover:bg-paper disabled:opacity-25 transition-vintage"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-sm font-semibold text-ink">{pickerYear}</span>
            <button
              type="button"
              onClick={() => setPickerYear((y) => Math.min(maxYear, y + 1))}
              disabled={pickerYear >= maxYear}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-ink/40 hover:bg-paper disabled:opacity-25 transition-vintage"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-3 gap-1 mb-2">
            {MONTHS.map((m) => {
              const active = !isAll && month === m.value && year === pickerYear
              const future = pickerYear === maxYear && m.value > getCurrentMonth()
              return (
                <button
                  key={m.value}
                  type="button"
                  disabled={future}
                  onClick={() => { onChange(m.value, pickerYear); setOpen(false) }}
                  className={`py-2 rounded-[8px] text-xs font-medium transition-vintage ${
                    active
                      ? 'bg-coffee text-paper'
                      : future
                      ? 'text-ink/20 cursor-not-allowed'
                      : 'text-ink hover:bg-paper'
                  }`}
                >
                  {m.label.slice(0, 3)}
                </button>
              )
            })}
          </div>

          {allowAll && (
            <button
              type="button"
              onClick={() => { onChange(ALL_MONTHS_VALUE, pickerYear); setOpen(false) }}
              className={`w-full text-xs py-2 rounded-[8px] font-medium transition-vintage ${
                isAll ? 'bg-coffee/10 text-coffee' : 'text-ink/45 hover:bg-paper'
              }`}
            >
              Todos os meses
            </button>
          )}
        </div>
      )}
    </div>
  )
}
