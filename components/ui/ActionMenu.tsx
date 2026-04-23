'use client'

import { useEffect, useRef, useState } from 'react'
import { MoreVertical, Eye, Pencil, Trash2, Paperclip, TrendingUp, TrendingDown } from 'lucide-react'

interface ActionMenuProps {
  onEdit?: () => void
  onDelete?: () => void
  onView?: () => void
  onAttach?: (file: File) => void
  onDeposit?: () => void
  onWithdrawal?: () => void
  disabled?: boolean
}

export default function ActionMenu({ onEdit, onDelete, onView, onAttach, onDeposit, onWithdrawal, disabled }: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const triggerFileSelect = () => {
    if (disabled) return
    fileInputRef.current?.click()
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        disabled={disabled}
        className="text-gold flex items-center justify-center hover:bg-paper transition-vintage disabled:opacity-60"
        aria-label="Mais ações"
      >
        <MoreVertical className="w-6 h-6" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-lg border border-border bg-bg shadow-vintage z-20">
          {onDeposit && (
            <button
              type="button"
              onClick={() => { onDeposit(); setOpen(false) }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ink/70 hover:bg-paper transition-vintage"
            >
              <TrendingUp className="w-4 h-4 text-olive" /> Guardar
            </button>
          )}
          {onWithdrawal && (
            <button
              type="button"
              onClick={() => { onWithdrawal(); setOpen(false) }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ink/70 hover:bg-paper transition-vintage"
            >
              <TrendingDown className="w-4 h-4 text-terracotta" /> Resgatar
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onView?.()
              setOpen(false)
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ink/70 hover:bg-paper transition-vintage"
          >
            <Eye className="w-4 h-4" /> Ver detalhes
          </button>
          <button
            type="button"
            onClick={() => {
              onEdit?.()
              setOpen(false)
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ink/70 hover:bg-paper transition-vintage"
          >
            <Pencil className="w-4 h-4" /> Editar
          </button>
          <button
            type="button"
            onClick={() => {
              triggerFileSelect()
              setOpen(false)
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ink/70 hover:bg-paper transition-vintage"
          >
            <Paperclip className="w-4 h-4" /> Inserir arquivo
          </button>
          <button
            type="button"
            onClick={() => {
              onDelete?.()
              setOpen(false)
            }}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-terracotta hover:bg-paper transition-vintage"
          >
            <Trash2 className="w-4 h-4" /> Excluir
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (!file) return
          onAttach?.(file)
          event.target.value = ''
        }}
      />
    </div>
  )
}
