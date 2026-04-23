import Link from 'next/link'

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

export default function PublicFooter() {
  return (
    <footer className="bg-coffee text-paper" style={{ padding: '56px 48px 32px' }}>
      <div className="max-w-6xl mx-auto grid gap-10" style={{ gridTemplateColumns: '1.4fr 1fr 1fr 1fr' }}>
        {/* Brand column */}
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <img src="/logo.png" alt="Florim" className="w-12 h-12 object-contain" />
            <span className="font-serif text-lg font-light tracking-widest text-gold">FLORIM</span>
          </div>
          <p className="text-sm text-paper/75 leading-relaxed max-w-xs">
            Feito por uma família, para famílias. Organizar dinheiro junto, com calma.
          </p>
        </div>

        {/* Link columns */}
        {columns.map((col) => (
          <div key={col.title}>
            <div className="text-[11px] tracking-widest uppercase text-gold font-semibold mb-4">
              {col.title}
            </div>
            <ul className="flex flex-col gap-2">
              {col.items.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    className="text-sm text-paper/75 hover:text-paper transition-vintage"
                  >
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
        className="max-w-6xl mx-auto flex justify-between items-center text-[13px] text-paper/55"
        style={{ marginTop: 40, borderTop: '1px solid rgba(245,241,235,0.10)', paddingTop: 20 }}
      >
        <span>LUCAS BRAZAU MALINOWSKI DESENVOLVIMENTO DE SOFTWARE LTDA · CNPJ 58.804.959/0001-60</span>
        <span>© {new Date().getFullYear()} Florim</span>
      </div>
    </footer>
  )
}
