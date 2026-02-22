'use client'

import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'

const paragraphs = [
  'O nome Florim carrega raízes profundas na história econômica da Europa. Ele nasce do fiorino d’oro, moeda de ouro cunhada em Florença no século XIII e reconhecida por sua pureza, estabilidade e ampla aceitação no comércio internacional.',
  'Ao longo dos séculos, o florim tornou-se símbolo de valor real e confiança. A flor estampada na moeda, o Giglio, emblema de Florença, associava esse valor à beleza, à autenticidade e ao reconhecimento duradouro. Hoje, mesmo em um mundo financeiro digital e acelerado, muitos lares ainda enfrentam desafios antigos: conflitos em torno do dinheiro, falta de planejamento e estresse financeiro que afetam diretamente as relações familiares. Não por acaso, questões financeiras figuram entre as principais causas de desgaste entre casais.',
  'Foi a partir dessa realidade que o Florim nasceu, dentro da família Malinowski. Lucas Brazaú Malinowski, Engenheiro de Software, e Nathalia Santos Malinowski, Designer de Interiores, compreenderam que dinheiro não é apenas número. É emoção, escolha, projeto de vida e relação humana.',
  'O Florim foi criado para transformar o controle financeiro em um gesto de cuidado, diálogo e alinhamento. Um sistema que ajuda famílias a viverem com mais clareza, calma e propósito compartilhado.',
  'Florim é valor que permanece.',
  'Feito por uma família, para famílias.',
]

export default function InternalAboutPage() {
  return (
    <AppLayout>
      <Topbar
        title="Sobre o Florim"
        subtitle="Todo grande sonho começa com pequenos passos."
        titleClassName="font-light"
        subtitleClassName="font-light"
      />

      <div className="min-h-screen bg-offWhite px-6 pb-6">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col">
          <div className="grid flex-1 grid-cols-1 gap-8 pt-2 lg:grid-cols-[minmax(0,1fr)_250px]">
            <div className="space-y-6 pr-0 lg:pr-6">
              {paragraphs.map((text, index) => (
                <p
                  key={index}
                  className="font-body text-[15px] font-light leading-relaxed text-sidebar/95 md:text-base"
                >
                  {text}
                </p>
              ))}
            </div>

            <div className="lg:pt-40">
              <div
                className="mx-auto h-[390px] w-[245px] overflow-hidden border border-border/70 shadow-soft"
                style={{ clipPath: 'ellipse(48% 50% at 50% 50%)' }}
              >
                <img
                  src="/founders_photo.png"
                  alt="Família Florim"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>

          <div className="mt-auto pt-10 pb-2 text-center">
            <p className="font-ptSerif text-xl font-light italic text-gold/80">Histórias que inspiram</p>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
