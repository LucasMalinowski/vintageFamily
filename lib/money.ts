export function formatBRL(cents: number): string {
  const value = cents / 100
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Family financial data is always stored as integer cents (2 decimal places),
// regardless of currency — so we force 2 fraction digits here rather than
// letting Intl pick the currency's "natural" precision (e.g. 0 for JPY, 3 for
// BHD). Zero/three-decimal currencies will still display as if they had 2
// decimals; correcting that would require migrating the underlying cents
// storage convention, which is out of scope for this formatting fix.
export function formatMoney(cents: number, currency: string = 'BRL', locale: string = 'pt-BR'): string {
  const value = cents / 100
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return formatBRL(cents)
  }
}

export function parseBRL(value: string): number {
  const cleanValue = value.replace(/[^\d,]/g, '').replace(',', '.')
  const parsed = parseFloat(cleanValue)
  return isNaN(parsed) ? 0 : Math.round(parsed * 100)
}

export function formatBRLInput(value: string): string {
  const cents = parseBRL(value)
  return formatBRL(cents)
}
