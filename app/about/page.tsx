import type { Metadata } from 'next'
import Link from 'next/link'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'
import { getUserLocale } from '@/lib/i18n/getLocale'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUserLocale()
  const msgs = (await import(`@/messages/${locale}.json`)).default as any
  const s = msgs.seo.about
  return {
    title: s.title,
    description: s.description,
    alternates: { canonical: '/about' },
    openGraph: {
      title: s.ogTitle,
      description: s.ogDescription,
      url: 'https://florim.app/about',
    },
  }
}

export default async function AboutPage() {
  const locale = await getUserLocale()
  const msgs = (await import(`@/messages/${locale}.json`)).default as any
  const a = msgs.about

  return (
    <div className="flex flex-col">
      <div className="relative overflow-hidden bg-sidebar lg:h-screen">
        <PublicNavbar color="paper" showWordmark={false} />

        <div className="grid lg:h-full lg:grid-cols-[2fr,1fr]">
          {/* Content - full page on mobile, left column on desktop */}
          <section className="bg-sidebar px-6 pt-24 pb-12 sm:px-8 lg:px-10 lg:pb-12 lg:pt-24 text-paper">
            <div className="pt-4 lg:px-24 lg:pt-14 max-w-2xl lg:max-w-none mx-auto">
              <h1 className="text-[24px] sm:text-[28px] lg:text-[34px] leading-[1.15] font-normal font-serif text-paper mb-5">
                {a.title}
              </h1>

              <p className="text-[#C2A45D] italic mb-5 text-[17px] lg:text-[20px] font-light font-serif leading-relaxed">
                {a.tagline}
              </p>

              <div className="space-y-3 text-[#C2A45D] italic leading-relaxed text-[17px] lg:text-[20px] font-light font-serif">
                <p>
                  {a.body1a}
                  <br />
                  {a.body1b}
                </p>
                <p>
                  {a.body2a}
                  <br />
                  {a.body2b}
                </p>
                <p>
                  {a.body3}
                </p>
              </div>

              <div className="mt-8 lg:mt-10">
                <Link
                  href="/plans"
                  className="flex w-full md:w-auto items-center justify-center rounded-full bg-paper px-8 py-3 text-sm font-medium text-coffee shadow-soft hover:opacity-90 transition-vintage"
                >
                  {a.viewPlans}
                </Link>
              </div>
            </div>
          </section>

          {/* Video - desktop only */}
          <section className="hidden lg:block relative h-full">
            <video
              className="h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              src="/about-video.mp4"
              aria-label={a.videoLabel}
            />
          </section>
        </div>
      </div>

      <PublicFooter color="paper" />
    </div>
  )
}
