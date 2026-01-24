'use client'

import { formatBRL } from '@/lib/money'

interface StatCardProps {
  label: string
  value: number // em centavos
  color?: 'olive' | 'terracotta' | 'petrol' | 'coffee' | 'default'
  size?: 'sm' | 'md' | 'lg'
}

export default function StatCard({ label, value, color = 'default', size = 'md' }: StatCardProps) {
  const colorClasses = {
    olive: 'bg-olive text-white',
    terracotta: 'bg-terracotta text-white',
    petrol: 'bg-petrol text-white',
    coffee: 'bg-coffee text-white',
    default: 'bg-paper-2 text-ink border border-border',
  }

  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  const textSizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  }

  return (
    <div className={`rounded-vintage shadow-soft ${colorClasses[color]} ${sizeClasses[size]}`}>
      <div className={`text-xs uppercase tracking-wide mb-2 ${color === 'default' ? 'text-ink/60' : 'text-white/80'}`}>
        {label}
      </div>
      <div className={`font-numbers font-semibold ${textSizeClasses[size]}`}>
        {formatBRL(value)}
      </div>
    </div>
  )
}
