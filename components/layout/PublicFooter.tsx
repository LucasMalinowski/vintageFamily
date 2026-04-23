import Link from 'next/link'

export default function PublicFooter() {
  return (
    <footer className="bg-paper border-t border-coffee/10 px-6 py-8 text-center text-xs text-coffee/50">
      <p className="mb-1">
        <span className="font-medium text-coffee/70">Florim</span> é um produto da{' '}
        <span className="font-medium text-coffee/70">MALINOWSKI SOFTWARES</span>
      </p>
      <p className="mb-1">
        LUCAS BRAZAU MALINOWSKI DESENVOLVIMENTO DE SOFTWARE LTDA &middot; CNPJ 58.804.959/0001-60
      </p>
      <p className="mb-3">
        Av. Paulista, 1106, Sala 01, Andar 16 &middot; Bela Vista &middot; São Paulo, SP &middot; CEP 01310-914
      </p>
      <p className="mb-3">
        <a href="mailto:financasflorim@gmail.com" className="hover:text-coffee transition-vintage">
          financasflorim@gmail.com
        </a>
      </p>
      <p className="text-coffee/40">
        &copy; {new Date().getFullYear()} Florim &middot;{' '}
        <Link href="/termos-e-servicos" className="hover:text-coffee transition-vintage">
          Termos de Uso
        </Link>
      </p>
    </footer>
  )
}
