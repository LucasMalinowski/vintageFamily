'use client'

import * as Icons from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Pencil, Search, Tag, X } from 'lucide-react'
import clsx from 'clsx'

const PINNED_ICONS = [
  'House', 'Utensils', 'Smile', 'HousePlus', 'Car', 'HeartPlus', 'Shirt',
  'MonitorPlay', 'Book', 'Guitar', 'Receipt', 'Banknote', 'WalletCards',
  'BadgeDollarSign', 'TreePalm',
]

const ALL_ICON_NAMES: string[] = Object.keys(Icons).filter((key) => {
  if (!(/^[A-Z]/.test(key))) return false
  const val = (Icons as Record<string, any>)[key]
  return val != null && typeof val === 'object' && typeof val.displayName === 'string'
})

interface IconPickerProps {
  value: string | null
  onSelect: (name: string | null) => void
}

export default function IconPicker({ value, onSelect }: IconPickerProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({})
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  const updatePosition = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 6,
      left: rect.left,
      zIndex: 9999,
    })
  }

  useEffect(() => {
    if (!open) return
    updatePosition()
    const handleScroll = () => updatePosition()
    window.addEventListener('scroll', handleScroll, true)
    return () => window.removeEventListener('scroll', handleScroll, true)
  }, [open])

  useEffect(() => {
    if (!open) return
    const handler = (event: MouseEvent) => {
      if (
        !triggerRef.current?.contains(event.target as Node) &&
        !dropdownRef.current?.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const filteredIcons = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) {
      const rest = ALL_ICON_NAMES.filter((n) => !PINNED_ICONS.includes(n))
      return [...PINNED_ICONS, ...rest]
    }
    return ALL_ICON_NAMES.filter((n) => n.toLowerCase().includes(query))
  }, [search])

  const CurrentIcon = value ? (Icons as Record<string, any>)[value] : null

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="w-96 rounded-[16px] border border-border/70 bg-offWhite shadow-vintage"
    >
      <div className="p-3 border-b border-border/50">
        <div className="flex items-center gap-2 rounded-[10px] border border-border/70 bg-paper px-3 py-2">
          <Search className="w-3.5 h-3.5 shrink-0 text-ink/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar ícone..."
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink/35 focus:outline-none"
            autoFocus
          />
          {search && (
            <button type="button" onClick={() => setSearch('')}>
              <X className="w-3.5 h-3.5 text-ink/40 hover:text-ink/70" />
            </button>
          )}
        </div>
      </div>

      <div className="p-2">
        <button
          type="button"
          onClick={() => { onSelect(null); setOpen(false) }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink/60 hover:bg-paper transition-vintage mb-1"
        >
          <X className="w-4 h-4" /> Nenhum ícone
        </button>

        <div className="grid grid-cols-6 gap-1 max-h-72 overflow-y-auto pr-1">
          {filteredIcons.map((name) => {
            const Icon = (Icons as Record<string, any>)[name]
            if (!Icon) return null
            const isSelected = name === value
            return (
              <button
                key={name}
                type="button"
                title={name}
                onClick={() => { onSelect(name); setOpen(false) }}
                className={clsx(
                  'flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-vintage text-[9px] leading-tight text-ink/50',
                  isSelected
                    ? 'bg-coffee/15 text-coffee border border-coffee/30'
                    : 'hover:bg-paper hover:text-ink/80'
                )}
              >
                <Icon className={clsx('w-4 h-4', isSelected ? 'text-coffee' : 'text-ink/60')} />
                <span className="truncate w-full text-center">{name}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  ) : null

  return (
    <div className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={clsx(
          'relative flex items-center justify-center w-9 h-9 rounded-lg border transition-vintage',
          value
            ? 'border-coffee/40 bg-offWhite text-sidebar hover:border-coffee/60'
            : 'border-border/70 bg-paper text-ink/40 hover:border-coffee/35'
        )}
        aria-label="Escolher ícone"
        title={value || 'Sem ícone'}
      >
        {CurrentIcon ? <CurrentIcon className="w-4 h-4" /> : <Tag className="w-4 h-4" />}
        <span className="pointer-events-none absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-coffee text-paper shadow-sm">
          <Pencil className="w-2 h-2" />
        </span>
      </button>

      {typeof document !== 'undefined' && dropdown && createPortal(dropdown, document.body)}
    </div>
  )
}
