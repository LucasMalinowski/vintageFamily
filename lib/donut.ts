import { DonutSlice } from '@/components/ui/DonutChart'

export const DONUT_OTHERS_COLOR = '#9C9388'

/**
 * Builds donut slices from a list of categories sorted by value (desc),
 * collapsing everything beyond `maxSlices` into a single "Outros" slice
 * so the chart's total always matches the true sum of all values.
 */
export function buildDonutSlices(
  items: Array<{ label: string; value: number; color: string }>,
  maxSlices: number
): DonutSlice[] {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1
  const visible = items.slice(0, maxSlices)
  const rest = items.slice(maxSlices)

  const slices: DonutSlice[] = visible.map((item) => ({
    label: item.label,
    value: item.value,
    pct: Math.round((item.value / total) * 100),
    color: item.color,
  }))

  const othersValue = rest.reduce((sum, item) => sum + item.value, 0)
  if (othersValue > 0) {
    slices.push({
      label: 'Outros',
      value: othersValue,
      pct: Math.round((othersValue / total) * 100),
      color: DONUT_OTHERS_COLOR,
    })
  }

  return slices
}
