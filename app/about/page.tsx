'use client'

import Link from 'next/link'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'

export default function AboutPage() {
  return (
    <div className="flex flex-col">
      <div className="relative overflow-hidden bg-sidebar lg:h-screen">
        <PublicNavbar color="paper" showWordmark={false} />

        <div className="grid lg:h-full lg:grid-cols-[2fr,1fr]">
          {/* Content — full page on mobile, left column on desktop */}
          <section className="bg-sidebar px-6 pt-24 pb-12 sm:px-8 lg:px-10 lg:pb-12 lg:pt-24 text-paper">
            <div className="pt-4 lg:px-24 lg:pt-14 max-w-2xl lg:max-w-none mx-auto">
              <h1 className="text-[24px] sm:text-[28px] lg:text-[34px] leading-[1.15] font-normal font-serif text-paper mb-5">
                Sistema de controle <br className="hidden sm:block" /> financeiro familiar
              </h1>

              <p className="text-[#C2A45D] italic mb-5 text-[17px] lg:text-[20px] font-light font-serif leading-relaxed">
                O Florim é um sistema de organização financeira familiar criado para trazer clareza, diálogo e
                tranquilidade ao cotidiano da casa.
              </p>

              <div className="space-y-3 text-[#C2A45D] italic leading-relaxed text-[17px] lg:text-[20px] font-light font-serif">
                <p>
                  Ele vai além da gestão de números.
                  <br />
                  O Florim cuida da vida real. Pois não nasceu em uma sala de reunião, mas dentro de casa.
                </p>
                <p>
                  Aqui, entendemos que dinheiro envolve emoções, decisões e relações humanas.
                  <br />
                  Por isso, o sistema foi desenhado para ser simples, intuítivo e acolhedor.
                </p>
                <p>
                  No Florim, a tecnologia está a serviço do cuidado e
                  nunca do controle excessivo.
                </p>
              </div>

              <div className="mt-8 lg:mt-10">
                <Link
                  href="/plans"
                  className="flex w-full items-center justify-center rounded-full bg-paper px-8 py-3 text-sm font-medium text-coffee shadow-soft hover:opacity-90 transition-vintage"
                >
                  Ver planos
                </Link>
              </div>
            </div>
          </section>

          {/* Video — desktop only */}
          <section className="hidden lg:block relative h-full">
            <video
              className="h-full w-full object-cover"
              autoPlay
              muted
              loop
              playsInline
              src="/about-video.mp4"
            />
          </section>
        </div>
      </div>

      <PublicFooter color="paper" />
    </div>
  )
}
