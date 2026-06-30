import { getTranslations } from 'next-intl/server'
import Image from 'next/image'
import Link from 'next/link'
import CookiePreferencesLink from './CookiePreferencesLink'
import AppStoreBadges from './AppStoreBadges'

type PublicFooterColor = 'sidebar' | 'paper'

const styles: Record<
  PublicFooterColor,
  {
    wrapper: string
    title: string
    link: string
    muted: string
    border: string
    brand: string
    bottom: string
  }
> = {
  sidebar: {
    wrapper: 'bg-sidebar text-paper',
    title: 'text-gold',
    link: 'text-paper/90 hover:text-paper',
    muted: 'text-paper/90',
    border: 'border-paper/10',
    brand: 'text-gold',
    bottom: 'text-paper/80',
  },
  paper: {
    wrapper: 'bg-paper text-coffee',
    title: 'text-gold',
    link: 'text-coffee/90 hover:text-coffee',
    muted: 'text-coffee/90',
    border: 'border-border/80',
    brand: 'text-gold',
    bottom: 'text-coffee/70',
  },
}

interface PublicFooterProps {
  color?: PublicFooterColor
}

export default async function PublicFooter({ color = 'sidebar' }: PublicFooterProps) {
  const t = await getTranslations()
  const theme = styles[color]

  const columns = [
    {
      key: 'product',
      title: t('publicFooter.productColumn'),
      items: [
        { label: t('publicFooter.features'), href: '/#features' },
        { label: t('publicFooter.plans'), href: '/plans' },
        { label: t('publicNav.about'), href: '/about' },
      ],
    },
    {
      key: 'support',
      title: t('publicFooter.supportColumn'),
      items: [
        { label: t('publicFooter.helpCenter'), href: '/support' },
        { label: t('publicFooter.contact'), href: 'mailto:contato@florim.app' },
        { label: t('publicFooter.privacy'), href: 'mailto:privacidade@florim.app' },
      ],
    },
    {
      key: 'legal',
      title: t('publicFooter.legalColumn'),
      items: [
        { label: t('publicFooter.terms'), href: '/terms' },
        { label: t('publicFooter.privacy'), href: '/privacy' },
        { label: t('publicFooter.cookies'), href: '/cookies' },
      ],
    },
  ]

  return (
    <footer className={`w-full ${theme.wrapper}`}>

      {/* ── Mobile layout ──────────────────────────────────────── */}
      <div className="md:hidden flex flex-col items-center gap-5 px-5 py-8">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Florim" width={40} height={40} className="w-10 h-10 object-contain" />
          <span className={`font-serif text-lg font-light tracking-widest ${theme.brand}`}>FLORIM</span>
        </div>
        <AppStoreBadges />
        <div className="flex flex-wrap justify-center gap-5">
          <Link href="/about" className={`text-[13px] transition-vintage ${theme.link}`}>{t('publicNav.about')}</Link>
          <Link href="/plans" className={`text-[13px] transition-vintage ${theme.link}`}>{t('publicFooter.plans')}</Link>
          <Link href="/privacy" className={`text-[13px] transition-vintage ${theme.link}`}>{t('publicFooter.privacy')}</Link>
          <Link href="/terms" className={`text-[13px] transition-vintage ${theme.link}`}>{t('publicFooter.terms')}</Link>
          <Link href="/cookies" className={`text-[13px] transition-vintage ${theme.link}`}>{t('publicFooter.cookies')}</Link>
        </div>
        <p suppressHydrationWarning className={`text-[12px] ${theme.bottom}`}>© {new Date().getFullYear()} Florim</p>
      </div>

      {/* ── Desktop layout ─────────────────────────────────────── */}
      <div className="hidden md:block px-12" style={{ paddingTop: 56, paddingBottom: 32 }}>
        <div
          className="max-w-6xl mx-auto grid gap-10"
          style={{ gridTemplateColumns: '1.4fr 1fr 1fr 1fr' }}
        >
          {/* Brand column */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <Image src="/logo.png" alt="Florim" width={48} height={48} className="w-12 h-12 object-contain" />
              <span className={`font-serif text-lg font-light tracking-widest ${theme.brand}`}>FLORIM</span>
            </div>
            <p className={`text-sm leading-relaxed max-w-xs ${theme.muted}`}>
              {t('publicFooter.tagline')}
            </p>
            <div className="mt-5">
              <AppStoreBadges />
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.key}>
              <div className={`text-[11px] tracking-widest uppercase font-semibold mb-4 ${theme.title}`}>
                {col.title}
              </div>
              <ul className="flex flex-col gap-2">
                {col.items.map((item) => (
                  <li key={item.label}>
                    <Link href={item.href} className={`text-sm transition-vintage ${theme.link}`}>
                      {item.label}
                    </Link>
                  </li>
                ))}
                {col.key === 'legal' && (
                  <li>
                    <CookiePreferencesLink className={`text-sm transition-vintage ${theme.link}`} />
                  </li>
                )}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          className={`max-w-6xl mx-auto flex justify-between items-center text-[13px] ${theme.bottom} border-t ${theme.border}`}
          style={{ marginTop: 40, paddingTop: 20 }}
        >
          <span>LUCAS BRAZAU MALINOWSKI DESENVOLVIMENTO DE SOFTWARE LTDA · CNPJ 58.804.959/0001-60</span>
          <span suppressHydrationWarning>© {new Date().getFullYear()} Florim · {t('publicFooter.rights')}</span>
        </div>
      </div>
    </footer>
  )
}
