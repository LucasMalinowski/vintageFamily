export function formatBRL(cents: number): string {
  const value = cents / 100
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
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
