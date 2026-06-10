'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import ForecastCard from '@/components/dashboard/ForecastCard'

interface ForecastSheetProps {
  open: boolean
  onClose: () => void
}

export default function ForecastSheet({ open, onClose }: ForecastSheetProps) {
  const [mounted, setMounted] = useState(false)
  const [animated, setAnimated] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      const t = setTimeout(() => setAnimated(true), 10)
      return () => clearTimeout(t)
    } else {
      setAnimated(false)
      const t = setTimeout(() => setMounted(false), 300)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!mounted) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 backdrop-blur-[2px] z-40 transition-opacity duration-300 ${
          animated ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Panel — bottom sheet on mobile, right sidebar on md+ */}
      <div
        className={`
          fixed z-50 bg-offWhite flex flex-col
          transition-transform duration-300 ease-out

          bottom-0 left-0 right-0 rounded-t-[22px] max-h-[85svh]
          md:top-0 md:bottom-0 md:left-auto md:right-0 md:w-[400px] md:rounded-none md:rounded-l-[18px] md:max-h-full

          ${animated
            ? 'translate-y-0 md:translate-x-0'
            : 'translate-y-full md:translate-x-full'
          }
        `}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Drag handle — mobile only */}
        <div className="w-9 h-1 rounded-full bg-ink/20 mx-auto mt-3 mb-1 shrink-0 md:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0 border-b border-border/50">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.15em] uppercase text-ink/40 mb-0.5">
              Florim · Inteligência
            </p>
            <h2 className="font-serif text-[20px] text-coffee leading-tight">Previsão do próximo mês</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-ink/[0.06] flex items-center justify-center hover:bg-ink/[0.12] transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4 text-ink/60" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <ForecastCard />

          <p className="text-[11px] text-ink/35 text-center mt-5 leading-relaxed">
            Previsão baseada nos seus histórico de gastos e padrões recorrentes.<br />
            Atualizada automaticamente a cada mês.
          </p>
        </div>
      </div>
    </>
  )
}
