'use client'

import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'

const fullWidthTop = [
  "O nome <strong>Florim</strong> carrega raízes profundas na história econômica da Europa. Ele nasce do <span class='italic'>fiorino d'oro</span>, moeda de ouro cunhada em Florença no século XIII e reconhecida por sua pureza, estabilidade e ampla aceitação no comércio internacional.",
  'Ao longo dos séculos, o florim tornou-se símbolo de valor real e confiança. A flor estampada na moeda, o Giglio, emblema de Florença, associava esse valor à beleza, à autenticidade e ao reconhecimento duradouro.',
]

// All paragraphs that should wrap around the photo (3 to fill the height)
const floatedParagraphs = [
  'Hoje, mesmo em um mundo financeiro digital e acelerado, muitos lares ainda enfrentam desafios antigos: conflitos em torno do dinheiro, falta de planejamento e estresse financeiro que afetam diretamente as relações familiares. Não por acaso, questões financeiras figuram entre as principais causas de desgaste entre casais.',
  'Foi a partir dessa realidade que o Florim nasceu, dentro da família Malinowski. Lucas Brazaú Malinowski, Engenheiro de Software, e Nathalia Santos Malinowski, Designer de Interiores, compreenderam que dinheiro não é apenas número. É emoção, escolha, projeto de vida e relação humana.',
  'O Florim foi criado para transformar o controle financeiro em um gesto de cuidado, diálogo e alinhamento. Um sistema que ajuda famílias a viverem com mais clareza, calma e propósito compartilhado.',
]

const fullWidthBottom = [
  'Florim é valor que permanece.<br>Feito por uma família, para famílias.',
]

export default function InternalAboutPage() {
  return (
      <AppLayout>
        <div className="flex flex-col h-screen bg-paper pl-6">
          <Topbar
              title="Sobre o Florim"
              subtitle="Todo grande sonho começa com pequenos passos."
              titleClassName="font-light"
              variant="textured"
          />

          <div className="flex-1 overflow-y-auto px-6 pb-6 pt-6">
            <article className="w-full font-body text-[15px] font-light leading-[1.75] tracking-wide text-sidebar/95 lg:pr-8 lg:text-[16px] lg:text-justify">

              {/* Top full-width paragraphs */}
              <div className="mb-6">
                {fullWidthTop.map((text, index) => (
                    <p key={index} className="mb-4" dangerouslySetInnerHTML={{ __html: text }} />
                ))}
              </div>

              {/* Middle section: photo floats right, text wraps left */}
              <div className="overflow-hidden">
                <div
                    className="mx-auto mb-6 block h-[240px] w-[180px] overflow-hidden border border-border/50 shadow-soft lg:float-right lg:mx-0 lg:mb-0 lg:ml-8 lg:h-[350px] lg:w-[260px]"
                    style={{ borderRadius: '50%' }}
                >
                  <img
                      src="/founders_photo.png"
                      alt="Família Florim"
                      className="h-full w-full object-cover"
                  />
                </div>
                {floatedParagraphs.map((text, index) => (
                    <p key={index} className="mb-4">{text}</p>
                ))}
                <div className="clear-both" />
              </div>

              {/* Bottom full-width paragraphs */}
              <div>
                {fullWidthBottom.map((text, index) => (
                    <p key={index} className="mb-4" dangerouslySetInnerHTML={{ __html: text }} />
                ))}
              </div>

            </article>

            <div className="py-6 text-center">
              <p className="font-ptSerif text-xl font-light italic text-gold/80">Histórias que inspiram</p>
            </div>
          </div>
        </div>
      </AppLayout>
  )
}