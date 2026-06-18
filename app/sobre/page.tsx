'use client'

import Image from 'next/image'
import React from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import { useTranslations } from 'next-intl'

export default function InternalAboutPage() {
  const t = useTranslations('sobre')

  const fullWidthTop = [
    { id: 'florim-origin', html: t('p1') },
    { id: 'florim-symbol', html: t('p2') },
  ]

  const floatedParagraphs = [t('p3'), t('p4'), t('p5')]

  return (
    <AppLayout>
      <div className="flex flex-col h-screen bg-paper pl-6">
        <Topbar
          title={t('title')}
          subtitle={t('subtitle')}
          titleClassName="font-light"
          variant="textured"
        />

        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-6">
          <article className="w-full font-body text-[15px] font-light leading-[1.75] tracking-wide text-sidebar/95 lg:pr-8 lg:text-[16px] lg:text-justify">

            <div className="mb-6">
              {fullWidthTop.map((paragraph) => (
                <p key={paragraph.id} className="mb-4" dangerouslySetInnerHTML={{ __html: paragraph.html }} />
              ))}
            </div>

            <div className="overflow-hidden">
              <div
                className="relative mx-auto mb-6 block h-[240px] w-[180px] overflow-hidden border border-border/50 shadow-soft lg:float-right lg:mx-0 lg:mb-0 lg:ml-8 lg:h-[350px] lg:w-[260px]"
                style={{ borderRadius: '50%' }}
              >
                <Image
                  src="/founders_photo.jpg"
                  alt={t('photoAlt')}
                  fill
                  className="object-cover"
                />
              </div>
              {floatedParagraphs.map((text) => (
                <p key={text} className="mb-4">{text}</p>
              ))}
              <div className="clear-both" />
            </div>

            <div>
              <p className="mb-4" dangerouslySetInnerHTML={{ __html: t('p6') }} />
            </div>

          </article>

          <div className="py-6 text-center">
            <p className="font-ptSerif text-xl font-light italic text-gold/80">{t('quote')}</p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
