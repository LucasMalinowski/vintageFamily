'use client'

import { Search, SlidersHorizontal, X } from 'lucide-react'

interface FilterSearchBarProps {
  value: string
  onChange: (value: string) => void
  onToggleFilters: () => void
  filtersOpen: boolean
  placeholder?: string
  filterChips?: Array<{
    key: string
    label: string
    onRemove: () => void
    disabled?: boolean
  }>
  rightSlot?: React.ReactNode
}

export default function FilterSearchBar({
  value,
  onChange,
  onToggleFilters,
  filtersOpen,
  placeholder = 'Buscar por nome ou categoria',
  filterChips = [],
  rightSlot,
}: FilterSearchBarProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex flex-wrap items-center gap-3 w-full lg:flex-1 lg:min-w-0">
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
            className="h-10 w-full rounded-md border border-border text-sm bg-bg pl-10 pr-4 text-ink placeholder:text-ink/45 focus:outline-none focus:ring-2 focus:ring-paper-2/30"
          />
        </div>
        {filterChips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {filterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={chip.onRemove}
                disabled={chip.disabled}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition-vintage ${
                  chip.disabled
                    ? 'border-border bg-paper text-ink/50 cursor-default'
                    : 'border-border bg-gold/30 text-ink hover:bg-paper'
                }`}
              >
                <span>{chip.label}</span>
                {!chip.disabled ? <X className="h-3 w-3" /> : null}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {rightSlot ? <div className="flex items-center gap-3 lg:justify-end lg:shrink-0">{rightSlot}</div> : null}
    </div>
  )
}
