'use client'

import * as Icons from 'lucide-react'

interface CategoryIconProps {
  name: string | null | undefined
  className?: string
}

export default function CategoryIcon({ name, className = 'w-4 h-4' }: CategoryIconProps) {
  if (!name) return null
  const Icon = (Icons as Record<string, any>)[name]
  if (!Icon || typeof Icon.displayName !== 'string') return null
  return <Icon className={className} />
}
