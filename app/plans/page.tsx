import type { Metadata } from 'next'
import PlansContent from './PlansContent'
import PublicFooter from '@/components/layout/PublicFooter'
import { getUserLocale } from '@/lib/i18n/getLocale'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUserLocale()
  const msgs = (await import(`@/messages/${locale}.json`)).default as any
  const s = msgs.seo.plansPage
  return {
    title: s.title,
    description: s.description,
    alternates: { canonical: '/plans' },
    openGraph: {
      title: s.ogTitle,
      description: s.ogDescription,
      url: 'https://florim.app/plans',
    },
  }
}

export default function PlansPage() {
  return <PlansContent footer={<PublicFooter color="sidebar" />} />
}
