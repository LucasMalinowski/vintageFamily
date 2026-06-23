'use client'

import { useEffect, useRef, useState } from 'react'
import { useLocale } from 'next-intl'
import { formatMoney } from '@/lib/money'

function centsToDisplay(cents: number, currency: string, locale: string): string {
  return formatMoney(cents, currency, locale)
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
  currency?: string
  placeholder?: string
  className?: string
  required?: boolean
  disabled?: boolean
  'aria-label'?: string
  id?: string
}

export default function CurrencyInput({
  value,
  onChange,
  currency = 'BRL',
  placeholder,
  className = '',
  required,
  disabled,
  'aria-label': ariaLabel,
  id,
}: CurrencyInputProps) {
  const locale = useLocale()
  const [cents, setCents] = useState(() => valueToCents(value))
  const skipSync = useRef(false)

  // Sync when parent sets a new value (e.g. loading edit data)
  useEffect(() => {
    if (skipSync.current) {
      skipSync.current = false
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCents(valueToCents(value))
  }, [value])

  const displayValue = cents > 0 ? centsToDisplay(cents, currency, locale) : ''
  const resolvedPlaceholder = placeholder ?? formatMoney(0, currency, locale)

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
      placeholder={resolvedPlaceholder}
      className={className}
      required={required}
      disabled={disabled}
      aria-label={ariaLabel}
      id={id}
    />
  )
}
