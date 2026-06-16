'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, BanknoteArrowUp, BanknoteArrowDown, PiggyBank, ChartColumnBig } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function BottomNav() {
  const pathname = usePathname()
  const t = useTranslations()

  const tabs = [
    { icon: Home, label: t('nav.home'), href: '/inicio' },
    { icon: BanknoteArrowUp, label: t('nav.expenses'), href: '/expenses' },
    { icon: BanknoteArrowDown, label: t('nav.incomes'), href: '/incomes' },
    { icon: PiggyBank, label: t('nav.savings'), href: '/savings' },
    { icon: ChartColumnBig, label: t('nav.comparatives'), href: '/comparatives' },
  ]

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-offWhite border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-[72px]">
        {tabs.map(({ icon: Icon, label, href }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 flex-1 py-2 transition-vintage ${
                isActive ? 'text-coffee' : 'text-ink/[0.28]'
              }`}
            >
              <Icon className="w-[22px] h-[22px]" />
              <span className="text-[10.5px] font-medium leading-none">{label}</span>
            </Link>
          )
        })}
      </div>
      <div className="w-[100px] h-1 rounded-full bg-black/[0.12] mx-auto mb-1" />
    </nav>
  )
}
