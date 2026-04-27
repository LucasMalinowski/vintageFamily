'use client'

import Link from 'next/link'
import { useState } from 'react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'
import { ArrowLeft } from 'lucide-react'

const plans = [
  {
    name: 'Plano Mensal',
    description: 'Ideal para quem quer começar com flexibilidade.',
    price: '29,90',
    period: '/ mês',
    benefitsTitle: 'Benefícios:',
    benefits: [
      'Controle de contas a pagar e a receber',
      'Organização de sonhos e poupanças',
      'Visão clara de saldo mensal',
      'Comparativos financeiros',
      'Interface intuitiva e acolhedora',
      'Acesso completo ao sistema',
    ],
    quote: 'Menos do que um jantar fora. Mais do que uma planilha.',
  },
  {
    name: 'Plano Anual',
    description: 'Para famílias que desejam compromisso e continuidade.',
    price: '299,00',
    period: '/ ano',
    benefitsTitle: 'Benefícios:',
    benefits: [
      'Equivalente a R$ 24,90/mês',
      'Economia de dois meses',
      'Prioridade em novas funcionalidades',
      'Atualizações contínuas',
      'Estabilidade no valor durante o contrato',
    ],
    quote: 'Um pequeno investimento para cuidar do que sustenta a casa.',
  },
]

export default function PlansPage() {
  const [step, setStep] = useState<'intro' | 'plans'>('intro')

  return (
    <div className={`relative h-screen bg-paper ${step === 'intro' ? 'overflow-hidden' : 'overflow-visible'}`}>

      {/* ── Intro step ─────────────────────────────────────────── */}
      <div
        className={`absolute inset-0 transition-all duration-500 ease-out ${
          step === 'intro'
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <div className="grid h-screen lg:grid-cols-[1fr,2fr]">
          {/* Video — desktop only */}
          <section className="hidden lg:block relative h-full min-h-0 overflow-hidden bg-transparent">
            <video
              className="h-full w-full object-cover bg-transparent border-0 outline-none"
              autoPlay
              muted
              loop
              playsInline
              src="/plans-video.mp4"
            />
          </section>

          {/* Text — full width on mobile */}
          <section className="bg-sidebar h-full flex flex-col px-7 py-8 sm:px-12 lg:px-14 text-paper">
            {/* Logo — centered on mobile, left-aligned on desktop */}
            <img
              src="/logo-florim.png"
              alt="Florim"
              className="w-28 h-28 md:w-40 md:h-40 object-contain mt-8 md:mt-16 mx-auto lg:mx-0"
            />

            <div className="flex-1 flex items-center justify-center lg:justify-start">
              <div className="w-full max-w-2xl border-l-4 border-paper/80 pl-6 pr-4">
                <div className="text-[20px] sm:text-[22px] lg:text-[24px] font-light font-serif leading-relaxed text-paper/90">
                  <p className="mb-5">
                    O Florim foi pensado para caber no orçamento da casa e ser valioso o suficiente para
                    fazer diferença no dia a dia.
                  </p>
                  <p>
                    Aqui, você não paga por números.
                    <br />
                    Você investe em clareza, diálogo e tranquilidade.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                onClick={() => setStep('plans')}
                className="w-full md:w-auto rounded-full border border-gold px-6 py-3 text-sm font-semibold text-gold hover:bg-gold hover:text-sidebar transition-vintage"
              >
                Ver planos
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* ── Plans step ─────────────────────────────────────────── */}
      <div
        className={`absolute inset-0 transition-all duration-500 ease-out ${
          step === 'plans'
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <PublicNavbar color="sidebar" showWordmark={false} />
        <section className="bg-paper text-coffee overflow-y-auto h-screen">
          <div className="mx-auto w-full max-w-6xl px-5 pt-24 pb-10 sm:px-8 md:px-12 lg:pt-32 lg:px-24">

            {/* Header row */}
            <div className="grid grid-cols-[auto,1fr,auto] items-center mb-8">
              <button
                onClick={() => setStep('intro')}
                className="text-xs text-coffee/70 hover:text-coffee transition-vintage"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="justify-self-center font-serif text-3xl md:text-5xl text-coffee">Planos</div>
              <div aria-hidden="true" />
            </div>

            {/* Plan cards — benefits + quote inside each */}
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className="flex flex-col rounded-[22px] border border-paper-2/40 bg-offWhite px-6 py-6 text-coffee shadow-soft"
                >
                  <h3 className="font-serif text-2xl text-gold mb-2">{plan.name}</h3>
                  <p className="text-sm text-ink/60 mb-5">{plan.description}</p>

                  {/* Price */}
                  <div className="flex items-baseline justify-center gap-1 text-coffee/60 mb-5">
                    <span className="text-base">R$</span>
                    <span className="text-4xl font-normal text-coffee">{plan.price}</span>
                    <span className="text-base">{plan.period}</span>
                  </div>

                  {/* Benefits */}
                  <div className="flex-1 mb-5">
                    <div className="text-[13px] font-semibold text-coffee/70 uppercase tracking-wide mb-2">
                      {plan.benefitsTitle}
                    </div>
                    <ul className="space-y-1.5 text-sm text-coffee/75">
                      {plan.benefits.map((b) => (
                        <li key={b} className="flex items-start gap-2">
                          <span className="text-gold mt-0.5">•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Quote */}
                  <p className="text-center font-ptSerif italic text-[13px] text-gold/75 mb-5 px-2">
                    {plan.quote}
                  </p>

                  {/* CTA */}
                  <Link
                    href="/signup"
                    className="flex w-full items-center justify-center rounded-full bg-gold px-4 py-3 text-sm font-semibold text-sidebar transition-vintage hover:opacity-90"
                  >
                    Entre para testar
                  </Link>
                </div>
              ))}
            </div>

            <div className="my-14 text-center text-base text-gold/70 italic font-serif">
              Cuidar das finanças é cuidar da casa.
              <br />
              O Florim está aqui para ajudar nisso.
            </div>
          </div>

          <PublicFooter color="sidebar" />
        </section>
      </div>
    </div>
  )
}
