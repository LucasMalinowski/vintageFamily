import type { Metadata } from 'next'
import Link from 'next/link'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'
import { getUserLocale } from '@/lib/i18n/getLocale'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUserLocale()
  const msgs = (await import(`@/messages/${locale}.json`)).default as any
  return {
    title: msgs.support.title,
    description: msgs.seo.support.description,
  }
}

export default async function SupportPage() {
  const locale = await getUserLocale()
  const msgs = (await import(`@/messages/${locale}.json`)).default as any
  const s = msgs.support
  const faq: Array<{ q: string; a: string }> = s.faq

  return (
    <>
      <PublicNavbar />
      <main className="bg-paper min-h-screen">
        <div className="max-w-3xl mx-auto px-5 pb-20 pt-24 md:px-6 md:pt-36">

          <h1 className="text-4xl font-serif text-coffee mb-2">{s.title}</h1>
          <p className="text-ink/60 font-body mb-14">
            {s.subtitle}
          </p>

          {/* Contact channels */}
          <section className="mb-14">
            <h2 className="text-xl font-serif text-coffee mb-5">{s.contactTitle}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <a
                href="mailto:contato@florim.app"
                className="flex flex-col gap-1 rounded-xl border border-border bg-white px-6 py-5 transition hover:border-forest/40"
              >
                <span className="text-sm font-medium font-body text-coffee">{s.generalEmailLabel}</span>
                <span className="text-base font-body text-ink/70">contato@florim.app</span>
                <span className="mt-1 text-xs text-ink/40 font-body">{s.generalEmailNote}</span>
              </a>

              <a
                href="mailto:privacidade@florim.app"
                className="flex flex-col gap-1 rounded-xl border border-border bg-white px-6 py-5 transition hover:border-forest/40"
              >
                <span className="text-sm font-medium font-body text-coffee">{s.privacyEmailLabel}</span>
                <span className="text-base font-body text-ink/70">privacidade@florim.app</span>
                <span className="mt-1 text-xs text-ink/40 font-body">{s.privacyEmailNote}</span>
              </a>
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-xl font-serif text-coffee mb-5">{s.faqTitle}</h2>
            <div className="space-y-4">
              {faq.map(({ q, a }) => (
                <div key={q} className="rounded-xl border border-border bg-white px-6 py-5">
                  <h3 className="font-medium font-body text-coffee mb-2">{q}</h3>
                  <p className="text-sm text-ink/70 font-body leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Legal links */}
          <div className="mt-14 flex flex-wrap gap-4 text-sm font-body text-ink/50">
            <Link href="/privacy" className="hover:text-coffee transition">{s.privacyLink}</Link>
            <Link href="/terms" className="hover:text-coffee transition">{s.termsLink}</Link>
            <Link href="/cookies" className="hover:text-coffee transition">{s.cookiesLink}</Link>
          </div>

        </div>
      </main>
      <PublicFooter color="sidebar" />
    </>
  )
}
