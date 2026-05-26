import type { Metadata } from 'next'
import Link from 'next/link'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'

export const metadata: Metadata = {
  title: 'Página não encontrada',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <>
      <PublicNavbar />
      <main className="bg-paper min-h-screen flex flex-col items-center justify-center px-5 text-center">
        <p className="text-8xl font-serif text-coffee/20 select-none mb-6">404</p>
        <h1 className="text-3xl font-serif text-coffee mb-3">Página não encontrada</h1>
        <p className="text-ink/60 font-body mb-8 max-w-sm">
          O endereço que você acessou não existe ou foi movido.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/"
            className="rounded-full bg-forest px-6 py-2.5 text-sm font-medium font-body text-paper transition hover:bg-forest/90"
          >
            Ir para o início
          </Link>
          <Link
            href="/support"
            className="rounded-full border border-border px-6 py-2.5 text-sm font-medium font-body text-coffee transition hover:border-forest/40"
          >
            Suporte
          </Link>
        </div>
      </main>
      <PublicFooter color="sidebar" />
    </>
  )
}
