'use client'

import { useState } from 'react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import { ArrowLeft } from 'lucide-react'

export default function PlansPage() {
  const [step, setStep] = useState<'intro' | 'plans'>('intro')

  return (
    <div className="relative h-screen bg-paper">
      <PublicNavbar color={step === 'intro' ? 'paper' : 'sidebar'} showWordmark={false} />
      {step === 'intro' ? (
        <div className="grid h-screen lg:grid-cols-[1fr,2fr]">
          <section className="relative h-full min-h-0 overflow-hidden bg-transparent">
            <video
              className="h-full w-full object-cover bg-transparent border-0 outline-none"
              autoPlay
              muted
              loop
              playsInline
              src="/plans-video.mp4"
            />
          </section>

          <section className="relative h-full min-h-0 bg-texture-sidebar-muted bg-cover bg-center px-8 pt-24 pb-10 sm:px-12 lg:px-14 text-paper">
            <div className="flex h-full items-center justify-center text-center">
              <div className="w-full max-w-2xl border-l-4 border-paper/40 pl-6 pr-4 text-left">
                <div className="text-[26px] sm:text-[30px] lg:text-[34px] font-thin font-serif leading-tight text-paper/90">
                  <p className="mb-4">
                    O Florim foi pensado para caber no orçamento da casa e, ser valioso o suficiente para
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
            <div className="absolute bottom-8 right-8">
              <button
                onClick={() => setStep('plans')}
                className="rounded-full border border-gold px-6 py-3 text-sm font-semibold text-gold hover:bg-gold hover:text-sidebar transition-vintage"
              >
                Ver planos
              </button>
            </div>
          </section>
        </div>
      ) : (
        <section className="min-h-screen bg-texture-muted bg-cover bg-center px-24 pt-28 sm:px-24 lg:px-64 text-coffee">
          <div className="mx-auto flex w-full max-w-6xl flex-col">
            <div className="grid grid-cols-[auto,1fr,auto] items-center">
              <button
                onClick={() => setStep('intro')}
                className="text-xs text-coffee/70 hover:text-coffee transition-vintage"
              >
                <ArrowLeft className={"h-5 w-5"}/>
              </button>
              <div className="justify-self-center font-serif text-5xl text-coffee">Planos</div>
              <div aria-hidden="true" />
            </div>

            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              <div className="rounded-[22px] border border-gold/40 bg-paper-2/80 px-5 py-4 text-coffee shadow-soft">
                <div className="px-4">
                  <h3 className="font-serif text-2xl text-gold mb-3">Plano Mensal</h3>
                  <p className="text-sm text-coffee/60 mb-4">Ideal para quem quer começar com flexibilidade.</p>
                  <div className="text-2xl font-semibold text-coffee justify-center items-center flex">
                    R$ <span className="text-4xl ml-2">29,90</span> <span className="text-base ml-2 text-coffee/60">/ mês</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-gold/40 bg-paper-2/80 px-5 py-4 text-coffee shadow-soft">
                <div className="px-4">
                  <h3 className="font-serif text-2xl text-gold mb-3">Plano Anual</h3>
                  <p className="text-sm text-coffee/60 mb-4">Para famílias que desejam compromisso e continuidade.</p>
                  <div className="text-2xl font-semibold text-coffee justify-center items-center flex">
                    R$ <span className="text-4xl ml-2">299,00</span> <span className="text-base ml-2 text-coffee/60">/ ano</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[22px] border border-gold/40 bg-paper-2/80 px-5 py-4 text-coffee shadow-soft">
                <div className="px-4">
                  <h3 className="font-serif text-2xl text-gold mb-3">Plano Fundadores</h3>
                  <p className="text-sm text-coffee/60 mb-4">Exclusivo para os primeiros usuários do Florim.</p>
                  <div className="text-2xl font-semibold text-coffee justify-center items-center flex">
                    R$ <span className="text-4xl ml-2">199,00</span> <span className="text-base ml-2 text-coffee/60">/ ano</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-3 text-base text-coffee/70">
              <div>
                <div className="text-coffee font-semibold mb-2">Benefícios:</div>
                <ul className="space-y-2">
                  <li>• Controle de contas a pagar e a receber</li>
                  <li>• Organização de sonhos e poupanças</li>
                  <li>• Visão clara de saldo mensal</li>
                  <li>• Comparativos financeiros</li>
                  <li>• Interface intuitiva e acolhedora</li>
                  <li>• Acesso completo ao sistema</li>
                </ul>
              </div>
              <div>
                <div className="text-coffee font-semibold mb-2">Benefícios:</div>
                <ul className="space-y-2">
                  <li>• Equivalente a R$ 24,90/mês</li>
                  <li>• Economia de dois meses</li>
                  <li>• Prioridade em novas funcionalidades</li>
                  <li>• Atualizações contínuas</li>
                  <li>• Estabilidade no valor durante o contrato</li>
                </ul>
              </div>
              <div>
                <div className="text-coffee font-semibold mb-2">Benefícios especiais:</div>
                <ul className="space-y-2">
                  <li>• Valor promocional vitalício</li>
                  <li>• Acesso antecipado a novidades</li>
                  <li>• Participação na evolução do sistema</li>
                  <li>• Reconhecimento como usuário fundador</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 grid gap-6 lg:grid-cols-3 text-lg italic text-gold/70 font-serif">
              <p className={"flex justify-center text-center"}>Menos do que um jantar fora. <br/> Mais do que uma planilha.</p>
              <p className={"flex justify-center text-center"}>Um pequeno investimento para cuidar do que sustenta a casa.</p>
              <p className={"flex justify-center text-center"}>Quem chega primeiro, constrói junto.</p>
            </div>

            <div className="flex flex-col text-center mt-10">
              <div className="font-serif text-4xl text-coffee mb-4">Benefícios-chave</div>
              <div className="flex flex-wrap justify-center gap-3 px-32">
                {[
                  'Clareza financeira no dia a dia',
                  'Menos conflitos, mais alinhamento',
                  'Organização sem pressão',
                  'Tecnologia com sensibilidade',
                  'Feito para famílias reais',
                ].map((item) => (
                  <div
                    key={item}
                    className="w-full rounded-full border border-gold/60 bg-paper-2 py-2 text-center text-xs text-coffee sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-0.75rem)]"
                  >
                    ✓ {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="my-10 text-center text-base text-gold/70 italic">
              Cuidar das finanças é cuidar da casa.
              <br />
              O Florim está aqui para ajudar nisso.
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
