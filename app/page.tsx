'use client'

import Link from 'next/link'
import { BanknoteArrowDown, PiggyBank, Users, ChartColumnBig, Check } from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'

const features = [
  {
    icon: BanknoteArrowDown,
    title: 'Contas a pagar',
    copy: 'Saiba o que precisa ser pago, sem sustos e celebre cada conta que se fecha.',
  },
  {
    icon: PiggyBank,
    title: 'Sonhos em comum',
    copy: 'Guarde dinheiro para viagens, escola, reforma. Os sonhos ficam à vista da família.',
  },
  {
    icon: Users,
    title: 'Tudo em família',
    copy: 'Convide quem precisa acompanhar. Uma casa, uma assinatura, várias mãos.',
  },
  {
    icon: ChartColumnBig,
    title: 'Comparativos',
    copy: 'Olhe para trás com calma. Entenda padrões, sem gráficos agressivos.',
  },
]

const plans = [
  {
    name: 'Plano Mensal',
    tag: 'Para começar com flexibilidade.',
    price: '29,90',
    per: '/ mês',
    featured: false,
    bullets: ['Contas a pagar e a receber', 'Sonhos e poupanças', 'Saldo mensal claro', 'Acesso completo'],
  },
  {
    name: 'Plano Anual',
    tag: 'Compromisso e continuidade.',
    price: '299,00',
    per: '/ ano',
    featured: true,
    bullets: ['Equivalente a R$ 24,90/mês', 'Economia de 2 meses', 'Prioridade em novidades', 'Valor estável no contrato'],
  },
  {
    name: 'Plano Fundadores',
    tag: 'Para os primeiros do Florim.',
    price: '199,00',
    per: '/ ano',
    featured: false,
    bullets: ['Valor vitalício promocional', 'Acesso antecipado', 'Participação na evolução', 'Reconhecimento fundador'],
  },
]

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero — two-column split like /about */}
      <div className="relative h-screen overflow-hidden bg-paper">
        <PublicNavbar color="sidebar" showWordmark={false} />
        <div className="grid h-full lg:grid-cols-[2fr,1fr]">
          {/* Left — dark green with marketing copy */}
          <section className="bg-paper flex flex-col justify-center pt-[52px] pb-12 pl-24 pr-12 lg:pl-32 lg:pr-16 text-sidebar">
            <div className="max-w-[540px]">
              <h1 className="font-serif font-light text-[52px] leading-[1.05] text-sidebar mb-5 tracking-tight">
                Um sistema de<br />finanças para a casa.
              </h1>
              <p className="text-sidebar/80 font-light text-[17px] leading-relaxed mb-7">
                O Florim organiza contas, sonhos e combinados da família com calma. Sem pressão,
                sem cartão no teste, só clareza para o dia a dia.
              </p>
              <div className="flex gap-3 mb-7">
                <Link
                  href="/signup"
                  className="px-7 py-3.5 rounded-full bg-gold text-coffee font-semibold text-[15px] hover:opacity-90 transition-vintage"
                >
                  Teste 15 dias grátis
                </Link>
                <Link
                  href="/plans"
                  className="px-7 py-3.5 rounded-full bg-sidebar text-paper font-semibold text-[15px] hover:bg-sidebar/80 transition-vintage"
                >
                  Ver planos
                </Link>
              </div>
              <p className="font-ptSerif italic text-[18px] text-gold">
                &ldquo;Cuidar do dinheiro da casa é cuidar do tempo juntos.&rdquo;
              </p>
            </div>
          </section>

          {/* Right — video */}
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

      {/* Feature row */}
      <section className="bg-sidebar py-24 px-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif font-light text-[44px] text-gold text-center mb-3">
            Feito para famílias.
          </h2>
          <p className="text-center text-paper text-[17px] font-light mb-14">
            Quatro ferramentas, uma só conversa em casa.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-offWhite border border-border rounded-vintage p-6 shadow-soft"
              >
                <div className="w-11 h-11 rounded-xl bg-gold/15 flex items-center justify-center text-sidebar mb-4">
                  <f.icon size={22} />
                </div>
                <h3 className="font-serif text-[20px] font-normal text-ink mb-2">{f.title}</h3>
                <p className="text-sm text-sidebar leading-relaxed">{f.copy}</p>
              </div>
            ))}
          </div>

          <div className="flex text-center max-w-3xl mt-10 mx-auto">
            <p className="font-ptSerif italic text-[28px] leading-relaxed text-gold font-normal">
              &ldquo;O Florim nasceu dentro de uma família, para famílias, e trata dinheiro como
              escolha, projeto e relação humana.&rdquo;

              <p className="mt-5 text-[13px] tracking-widest uppercase text-paper/80">
                Lucas &amp; Nathalia, fundadores
              </p>
            </p>
          </div>
        </div>
      </section>

      {/* Plan cards */}
      <section className="bg-paper py-24 px-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif font-normal text-[48px] text-coffee text-center mb-3">Planos</h2>
          <p className="text-center text-ink/70 text-base font-light mb-14">
            Sem cartão no teste. Sem pressa para decidir.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {plans.map((p) => (
              <div
                key={p.name}
                className="rounded-[22px] p-7 shadow-soft relative"
                style={{
                  background: p.featured ? '#3E5F4B' : '#faf9f7',
                  color: p.featured ? '#F5F1EB' : '#3E5F4B',
                  border: p.featured ? '1px solid transparent' : '1px solid rgba(186,172,138,0.40)',
                }}
              >
                {p.featured && (
                  <div className="absolute -top-3 right-6 bg-gold text-coffee text-[11px] tracking-widest uppercase px-3 py-1 rounded-full font-semibold">
                    Mais escolhido
                  </div>
                )}
                <h3 className="font-serif text-[26px] font-normal text-gold mb-2">{p.name}</h3>
                <p className="text-sm mb-5" style={{ opacity: 0.7 }}>{p.tag}</p>
                <div className="flex items-baseline gap-1.5 mb-5">
                  <span className="text-sm" style={{ opacity: 0.7 }}>R$</span>
                  <span className="font-numbers text-[44px] font-normal" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {p.price}
                  </span>
                  <span className="text-sm" style={{ opacity: 0.7 }}>{p.per}</span>
                </div>
                <ul className="flex flex-col gap-2 text-sm mb-6" style={{ opacity: 0.85 }}>
                  {p.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2">
                      <Check size={16} color={p.featured ? '#C2A45D' : '#6FBF8A'} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="block text-center py-3 px-4 rounded-full bg-gold text-coffee text-sm font-semibold hover:opacity-90 transition-vintage"
                >
                  Entre para testar
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center mt-12 font-ptSerif italic text-base text-gold/75">
            Menos do que um jantar fora. Mais do que uma planilha.
          </p>
        </div>
      </section>

      <PublicFooter color="sidebar" />
    </div>
  )
}
