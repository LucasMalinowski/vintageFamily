'use client'

import { useEffect, useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'

interface FilterSidebarProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  showToggle?: boolean
  expandedWidthClass?: string
  collapsedWidthClass?: string
  activeFiltersCount?: number
  onClearFilters?: () => void
  clearLabel?: string
}

export default function FilterSidebar({
  children,
  open: controlledOpen,
  onOpenChange,
  showToggle = true,
  expandedWidthClass = 'w-72',
  collapsedWidthClass = 'w-14',
  activeFiltersCount = 0,
  onClearFilters,
  clearLabel = 'Limpar filtros',
}: FilterSidebarProps) {
  const [internalOpen, setInternalOpen] = useState(true)
  const storageKey = 'filters-sidebar-open'
  const isControlled = typeof controlledOpen === 'boolean'
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = (next: boolean) => {
    if (isControlled) {
      onOpenChange?.(next)
      return
    }
    setInternalOpen(next)
  }

  useEffect(() => {
    if (isControlled) return
    const stored = window.localStorage.getItem(storageKey)
    if (stored === '0') setOpen(false)
    if (stored === '1') setOpen(true)
  }, [isControlled])

  useEffect(() => {
    if (isControlled) return
    window.localStorage.setItem(storageKey, open ? '1' : '0')
  }, [open, isControlled])

  return (
    <aside className={`${open ? expandedWidthClass : collapsedWidthClass} shrink-0 transition-all duration-300 overflow-hidden ${open ? 'h-full' : ''}`}>
      <div className="sticky top-4 h-[calc(100vh-210px)] flex flex-col">
        {showToggle ? (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-3 rounded-md border border-border bg-bg text-petrol hover:bg-paper transition-vintage"
            aria-label={open ? 'Fechar filtros' : 'Abrir filtros'}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {open && <span className="text-sm font-semibold">Filtros</span>}
          </button>
        ) : null}

        {open ? (
          <div className={`${showToggle ? 'mt-3' : ''} flex-1 rounded-[18px] border-2 border-border/40 bg-offWhite p-3`}>
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-lg leading-none font-semibold text-petrol">
                Filtros <span className="text-ink/60 text-base">({activeFiltersCount})</span>
              </div>
              {onClearFilters ? (
                <button
                  type="button"
                  onClick={onClearFilters}
                  className="px-3 py-2 rounded-md border border-border bg-bg text-petrol hover:bg-paper transition-vintage text-xs whitespace-nowrap"
                >
                  {clearLabel}
                </button>
              ) : null}
            </div>
            <div className="space-y-4 h-[calc(100%-52px)] overflow-auto pr-1">
              {children}
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  )
}
