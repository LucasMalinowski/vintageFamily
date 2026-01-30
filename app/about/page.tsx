'use client'

import Link from 'next/link'
import PublicNavbar from '@/components/layout/PublicNavbar'

export default function AboutPage() {
  return (
    <div className="relative h-screen overflow-hidden bg-paper">
      <PublicNavbar color="paper" showWordmark={false} />
      <div className="grid h-full lg:grid-cols-[2fr,1fr]">
        <section
          className="bg-[url('/texture-green.png')] bg-cover bg-center px-6 pb-8 pt-24 sm:px-8 lg:px-10 lg:pb-12 lg:pt-24 text-paper"
        >
          <div className="px-36 pt-10">
            <h1 className="text-[40px] sm:text-[44px] lg:text-[50px] leading-[1.15] font-serif text-paper mb-4">
              Sistema de controle financeiro familiar
            </h1>

            <p className="text-[#C2A45D] italic mb-6 text-[21px] font-light font-serif leading-relaxed">
              O <span className={"text-paper"}>Florim</span> é um sistema de organização financeira familiar criado para trazer clareza, diálogo e
              tranquilidade ao cotidiano da casa.
            </p>

            <div className="space-y-5 text-[#C2A45D] leading-relaxed text-[21px] font-light font-serif">
              <p>
                Ele vai além da gestão de números.
                <br />
                O Florim cuida da vida real. Pois não nasceu em uma sala de reunião, mas <span className={"text-paper"}>dentro de casa</span>.
              </p>
              <p>
                Aqui, entendemos que dinheiro envolve emoções, decisões e relações humanas.
                <br />
                Por isso, o sistema foi desenhado para ser simples, intuítivo e acolhedor.
              </p>
              <p>
                No Florim, a tecnologia está a serviço do cuidado e
                <br />
                nunca do controle excessivo.
              </p>
            </div>

            <div className="mt-10 flex justify-center">
              <Link
                href="/plans"
                className="inline-flex w-86 items-center justify-center rounded-full bg-paper px-12 py-3 text-sm font-semibold text-coffee shadow-soft hover:opacity-90 transition-vintage sm:w-72"
              >
                Conferir nossos Planos
              </Link>
            </div>
          </div>
        </section>

        <section className="relative h-full">
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
  )
}
