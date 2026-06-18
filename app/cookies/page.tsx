import type { Metadata } from 'next'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'
import { getUserLocale } from '@/lib/i18n/getLocale'
import { COOKIES_CONTENT, buildCookiesSections } from './cookies.content'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUserLocale()
  return {
    title: COOKIES_CONTENT[locale].metaTitle,
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-serif text-coffee mb-3">{title}</h2>
      <div className="text-ink/80 font-body leading-relaxed space-y-2">{children}</div>
    </section>
  )
}

export default async function CookiesPage() {
  const locale = await getUserLocale()
  const content = COOKIES_CONTENT[locale]
  const sections = buildCookiesSections(locale, content)

  return (
    <>
      <PublicNavbar />
      <main className="bg-paper min-h-screen">
        <div className="max-w-3xl mx-auto px-5 pb-16 pt-24 md:px-6 md:pt-36">
          <h1 className="text-4xl font-serif text-coffee mb-2">{content.pageTitle}</h1>
          <p className="text-sm text-ink/50 font-body mb-12">{content.effectiveDate}</p>

          {sections.map((section) => (
            <Section key={section.title} title={section.title}>
              {section.content}
            </Section>
          ))}
        </div>
      </main>
      <PublicFooter color="sidebar" />
    </>
  )
}
