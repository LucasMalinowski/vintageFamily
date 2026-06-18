import type { Metadata } from 'next'
import { getUserLocale } from '@/lib/i18n/getLocale'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUserLocale()
  const msgs = (await import(`@/messages/${locale}.json`)).default as any
  const s = msgs.seo.sobre
  return {
    title: s.title,
    description: s.description,
    alternates: { canonical: '/sobre' },
    openGraph: {
      title: s.ogTitle,
      description: s.ogDescription,
      url: 'https://florim.app/sobre',
    },
  }
}

export default function SobreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
