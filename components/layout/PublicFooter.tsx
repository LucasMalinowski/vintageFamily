import Link from 'next/link'

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
    <footer className={`w-full ${theme.wrapper}`} style={{ padding: '56px 48px 32px' }}>
      <div className="max-w-6xl mx-auto grid gap-10" style={{ gridTemplateColumns: '1.4fr 1fr 1fr 1fr' }}>
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
    </footer>
  )
}
