import type { Metadata } from 'next'
import Link from 'next/link'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'
import { getUserLocale } from '@/lib/i18n/getLocale'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUserLocale()
  const msgs = (await import(`@/messages/${locale}.json`)).default as any
  return {
    title: msgs.notFound.title,
    robots: { index: false, follow: false },
  }
}

export default async function NotFound() {
  const locale = await getUserLocale()
  const msgs = (await import(`@/messages/${locale}.json`)).default as any
  const nf = msgs.notFound

  return (
    <>
      <PublicNavbar />
      <main className="bg-paper min-h-screen flex flex-col items-center justify-center px-5 text-center">
        <p className="text-8xl font-serif text-coffee/20 select-none mb-6">404</p>
        <h1 className="text-3xl font-serif text-coffee mb-3">{nf.title}</h1>
        <p className="text-ink/60 font-body mb-8 max-w-sm">
          {nf.description}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link
            href="/"
            className="rounded-full bg-forest px-6 py-2.5 text-sm font-medium font-body text-paper transition hover:bg-forest/90"
          >
            {nf.backHome}
          </Link>
          <Link
            href="/support"
            className="rounded-full border border-border px-6 py-2.5 text-sm font-medium font-body text-coffee transition hover:border-forest/40"
          >
            {nf.support}
          </Link>
        </div>
      </main>
      <PublicFooter color="sidebar" />
    </>
  )
}
