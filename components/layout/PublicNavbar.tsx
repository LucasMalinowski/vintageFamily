'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

type PublicNavbarColor = 'sidebar' | 'paper'

const styles: Record<
  PublicNavbarColor,
  {
    wrapper: string
    link: string
    active: string
    primary: string
    secondary: string
    scrollbarThumb: string
  }
> = {
  dark: {
    wrapper: 'bg-sidebar/80',
    link: 'text-paper/80 hover:text-paper',
    active: '!text-gold',
    primary: 'bg-gold text-sidebar',
    secondary: 'border-gold text-gold hover:bg-gold hover:text-sidebar',
    scrollbarThumb: 'var(--coffee)',
  },
  light: {
    wrapper: 'bg-paper/80',
    link: 'text-coffee/70 hover:text-coffee',
    active: '!text-gold',
    primary: 'bg-coffee text-paper',
    secondary: 'border-coffee text-coffee hover:bg-coffee hover:text-paper',
    scrollbarThumb: 'var(--paper)',
  },
}

interface PublicNavbarProps {
  color?: PublicNavbarColor
  showWordmark?: boolean
}

const themeByColor: Record<PublicNavbarColor, keyof typeof styles> = {
  sidebar: 'dark',
  paper: 'light',
}

export default function PublicNavbar({ color = 'sidebar', showWordmark = true }: PublicNavbarProps) {
  const theme = styles[themeByColor[color]]
  const pathname = usePathname()
  const isAbout = pathname.startsWith('/about')
  const isPlans = pathname.startsWith('/plans')

  useEffect(() => {
    const root = document.documentElement
    const previous = {
      thumb: root.style.getPropertyValue('--scrollbar-thumb'),
    }

    root.style.setProperty('--scrollbar-thumb', theme.scrollbarThumb)

    return () => {
      if (previous.thumb) {
        root.style.setProperty('--scrollbar-thumb', previous.thumb)
      } else {
        root.style.removeProperty('--scrollbar-thumb')
      }
    }
  }, [theme.scrollbarThumb])

  return (
    <header className="absolute top-0 left-0 right-0 z-10">
      <div
        className={`w-full px-6 py-5 flex items-center justify-between backdrop-blur-sm ${theme.wrapper}`}
      >
        <div className="flex items-center">
          <img src="/logo.png" alt="Florim" className="w-16 h-16 object-contain" />
          {showWordmark ? (
            <span className="font-serif text-lg font-thin tracking-wide text-gold">FLORIM</span>
          ) : null}
        </div>
        <nav className="hidden md:flex items-center gap-20 text-lg font-body">
          <Link
            href="/about"
            className={`${theme.link} transition-vintage ${isAbout ? theme.active : ''}`}
            aria-current={isAbout ? 'page' : undefined}
          >
            Sobre nós
          </Link>
          <Link
            href="/plans"
            className={`${theme.link} transition-vintage ${isPlans ? theme.active : ''}`}
            aria-current={isPlans ? 'page' : undefined}
          >
            Planos
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/signup"
            className={`px-5 py-2 rounded-full text-sm font-semibold hover:opacity-90 transition-vintage ${theme.primary}`}
          >
            Teste grátis
          </Link>
          <Link
            href="/login"
            className={`px-5 py-2 rounded-full border text-sm font-semibold transition-vintage ${theme.secondary}`}
          >
            Entrar
          </Link>
        </div>
      </div>
    </header>
  )
}
