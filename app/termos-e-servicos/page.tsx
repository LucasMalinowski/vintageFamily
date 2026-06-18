import type { Metadata } from 'next'
import Link from 'next/link'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'
import { getUserLocale } from '@/lib/i18n/getLocale'
import { TERMOS_E_SERVICOS_CONTENT, type LegalSection } from './termos-e-servicos.content'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUserLocale()
  const content = TERMOS_E_SERVICOS_CONTENT[locale]
  return {
    title: content.metaTitle,
    description: content.metaDescription,
  }
}

function SectionCard({
  title,
  paragraphs,
  highlight = false,
}: {
  title: string
  paragraphs: string[]
  highlight?: boolean
}) {
  return (
    <article
      className={`border-t pt-8 first:border-t-0 first:pt-0 ${
        highlight ? 'border-gold/40' : 'border-border/80'
      }`}
    >
      <h2 className="font-serif text-2xl font-medium text-sidebar">{title}</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-8 text-ink/85 sm:text-base">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </article>
  )
}

export default async function TermsAndServicesPage() {
  const locale = await getUserLocale()
  const content = TERMOS_E_SERVICOS_CONTENT[locale]

  return (
    <div className="min-h-screen bg-paper text-ink">
      <PublicNavbar color="paper" />

      <main className="px-5 pb-16 pt-24 sm:px-8 sm:pt-32 lg:px-12">
        <div className="mx-auto max-w-4xl">
          <section className="border-b border-border/80 pb-10">
            <h1 className="mt-5 max-w-4xl font-serif text-4xl font-medium leading-tight sm:text-5xl">
              {content.pageTitle}
            </h1>
            <p className="mt-5 max-w-4xl text-base leading-8 text-ink/80 sm:text-lg">
              {content.pageIntro}
            </p>
            <p className="mt-4 text-sm uppercase tracking-[0.22em] text-gold/90">
              {content.lastUpdatedLabel}
            </p>
          </section>

          <section className="py-6 border-b border-border/60">
            <p className="text-sm text-ink/65 leading-7">
              {content.relatedDocsIntro}{' '}
              <Link href="/privacy" className="text-coffee underline underline-offset-2">{content.privacyLinkLabel}</Link>
              {' · '}
              <Link href="/terms" className="text-coffee underline underline-offset-2">{content.termsLinkLabel}</Link>
              {' · '}
              <Link href="/cookies" className="text-coffee underline underline-offset-2">{content.cookiesLinkLabel}</Link>
            </p>
          </section>

          <section className="py-8">
            <div className="mt-12">
              <section>
                <div className="mb-8">
                  <h2 className="font-serif text-3xl text-sidebar">{content.termsHeading}</h2>
                  <p className="mt-2 text-sm text-ink/65">
                    {content.termsSubheading}
                  </p>
                </div>

                <div className="space-y-8">
                {content.termsSections.map((section: LegalSection) => (
                  <SectionCard
                    key={section.title}
                    title={section.title}
                    paragraphs={section.paragraphs}
                  />
                ))}
                </div>
              </section>

              <section className="mt-16">
                <div className="mb-8">
                  <h2 className="font-serif text-3xl text-sidebar">{content.privacyHeading}</h2>
                  <p className="mt-2 text-sm text-ink/65">
                    {content.privacySubheading}
                  </p>
                </div>

                <div className="space-y-8">
                {content.privacySections.map((section: LegalSection) => (
                  <SectionCard
                    key={section.title}
                    title={section.title}
                    paragraphs={section.paragraphs}
                    highlight={section.highlight}
                  />
                ))}
                </div>
              </section>
            </div>

            <div className="mt-14 border-t border-border/80 pt-8">
              <p className="max-w-3xl text-sm leading-7 text-ink/75 sm:text-base">
                {content.closingParagraph}
              </p>
              <Link
                href="/signup"
                className="mt-5 inline-flex rounded-full bg-sidebar px-5 py-3 text-sm font-semibold text-paper transition-vintage hover:opacity-90"
              >
                {content.ctaLabel}
              </Link>
            </div>
          </section>
        </div>
      </main>
      <PublicFooter color="paper" />
    </div>
  )
}
