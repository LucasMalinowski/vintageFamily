import Link from 'next/link'
import CookiePreferencesLink from './CookiePreferencesLink'

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
    link: 'text-paper/75 hover:text-paper',
    muted: 'text-paper/75',
    border: 'border-paper/10',
    brand: 'text-gold',
    bottom: 'text-paper/55',
  },
  paper: {
    wrapper: 'bg-paper text-coffee',
    title: 'text-gold',
    link: 'text-coffee/75 hover:text-coffee',
    muted: 'text-coffee/75',
    border: 'border-border/80',
    brand: 'text-gold',
    bottom: 'text-coffee/55',
  },
}

const columns = [
  {
    title: 'Produto',
    items: [
      { label: 'Funcionalidades', href: '/#features' },
      { label: 'Planos', href: '/plans' },
      { label: 'Sobre nós', href: '/about' },
    ],
  },
  {
    title: 'Suporte',
    items: [
      { label: 'Contato', href: 'mailto:contato@florim.app' },
      { label: 'Privacidade', href: 'mailto:privacidade@florim.app' },
    ],
  },
  {
    title: 'Legal',
    items: [
      { label: 'Termos de Uso', href: '/terms' },
      { label: 'Privacidade', href: '/privacy' },
      { label: 'Cookies', href: '/cookies' },
    ],
  },
]

interface PublicFooterProps {
  color?: PublicFooterColor
}

export default function PublicFooter({ color = 'sidebar' }: PublicFooterProps) {
  const theme = styles[color]

  return (
    <footer className={`w-full ${theme.wrapper}`}>

      {/* ── Mobile layout ──────────────────────────────────────── */}
      <div className="md:hidden flex flex-col items-center gap-5 px-5 py-8">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="Florim" className="w-10 h-10 object-contain" />
          <span className={`font-serif text-lg font-light tracking-widest ${theme.brand}`}>FLORIM</span>
        </div>
        <div className="flex flex-wrap justify-center gap-5">
          <Link href="/about" className={`text-[13px] transition-vintage ${theme.link}`}>Sobre</Link>
          <Link href="/plans" className={`text-[13px] transition-vintage ${theme.link}`}>Planos</Link>
          <Link href="/privacy" className={`text-[13px] transition-vintage ${theme.link}`}>Privacidade</Link>
          <Link href="/terms" className={`text-[13px] transition-vintage ${theme.link}`}>Termos</Link>
          <Link href="/cookies" className={`text-[13px] transition-vintage ${theme.link}`}>Cookies</Link>
        </div>
        <p className={`text-[12px] ${theme.bottom}`}>© {new Date().getFullYear()} Florim</p>
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
              <img src="/logo.png" alt="Florim" className="w-12 h-12 object-contain" />
              <span className={`font-serif text-lg font-light tracking-widest ${theme.brand}`}>FLORIM</span>
            </div>
            <p className={`text-sm leading-relaxed max-w-xs ${theme.muted}`}>
              Feito por uma família, para famílias. Organizar dinheiro junto, com calma.
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
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
                {col.title === 'Legal' && (
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
          <span>© {new Date().getFullYear()} Florim</span>
        </div>
      </div>
    </footer>
  )
}
