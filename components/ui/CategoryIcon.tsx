'use client'

import { ICON_MAP } from '@/lib/icon-registry'

interface CategoryIconProps {
  name: string | null | undefined
  className?: string
}

export default function CategoryIcon({ name, className = 'w-4 h-4' }: CategoryIconProps) {
  if (!name) return null
  const Icon = ICON_MAP.get(name)
  if (!Icon) return null
  return <Icon className={className} />
}
