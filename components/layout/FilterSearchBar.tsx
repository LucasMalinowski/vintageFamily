'use client'

import { Search, SlidersHorizontal } from 'lucide-react'

interface FilterSearchBarProps {
  value: string
  onChange: (value: string) => void
  onToggleFilters: () => void
  filtersOpen: boolean
  placeholder?: string
  rightSlot?: React.ReactNode
}

export default function FilterSearchBar({
  value,
  onChange,
  onToggleFilters,
  filtersOpen,
  placeholder = 'Buscar por nome ou categoria',
  rightSlot,
}: FilterSearchBarProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-3 w-full lg:w-auto">
        <button
          type="button"
          onClick={onToggleFilters}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-bg text-petrol hover:bg-paper transition-vintage"
          aria-label={filtersOpen ? 'Esconder filtros' : 'Mostrar filtros'}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-petrol" />
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            className="h-10 w-full rounded-md border border-border text-sm bg-bg pl-10 pr-4 text-ink placeholder:text-ink/45 focus:outline-none focus:ring-2 focus:ring-petrol/30"
          />
        </div>
      </div>
      {rightSlot ? <div className="flex flex-wrap items-center gap-3 lg:justify-end">{rightSlot}</div> : null}
    </div>
  )
}
