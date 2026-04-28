'use client'

import { useEffect, useRef, useState } from 'react'

function centsToDisplay(cents: number): string {
  const reais = Math.floor(cents / 100)
  const centavos = cents % 100
  const reaisFormatted = reais.toLocaleString('pt-BR')
  return `R$ ${reaisFormatted},${centavos.toString().padStart(2, '0')}`
}

function valueToCents(value: string): number {
  if (!value) return 0
  const num = parseFloat(value)
  if (isNaN(num)) return 0
  return Math.round(num * 100)
}

interface CurrencyInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  required?: boolean
  disabled?: boolean
}

export default function CurrencyInput({
  value,
  onChange,
  placeholder = 'R$ 0,00',
  className = '',
  required,
  disabled,
}: CurrencyInputProps) {
  const [cents, setCents] = useState(() => valueToCents(value))
  const skipSync = useRef(false)

  // Sync when parent sets a new value (e.g. loading edit data)
  useEffect(() => {
    if (skipSync.current) {
      skipSync.current = false
      return
    }
    setCents(valueToCents(value))
  }, [value])

  const displayValue = cents > 0 ? centsToDisplay(cents) : ''

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '')
    const nextCents = digits ? Math.min(parseInt(digits, 10), 999_999_999) : 0
    setCents(nextCents)
    skipSync.current = true
    onChange(nextCents > 0 ? (nextCents / 100).toFixed(2) : '')
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      required={required}
      disabled={disabled}
    />
  )
}
