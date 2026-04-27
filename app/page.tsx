'use client'

import Link from 'next/link'
import { BanknoteArrowDown, PiggyBank, Users, ChartColumnBig, Check } from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'
import Typewriter from '@/components/Typewriter'

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
]

export default function Home() {
  return (
    <div className="flex flex-col">

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-paper h-[400px] md:h-[85vh]">
        <PublicNavbar color="sidebar" showWordmark={false} />

        {/* Mobile hero — texture-green background with text overlay */}
        <div
          className="md:hidden absolute inset-0 flex flex-col justify-end px-7 pb-8 bg-paper"
        >
          {/* Dark gradient so text is always readable */}
          <div className="relative z-10">
            <h1 className="font-serif font-light text-[34px] leading-[1.1] text-sidebar mb-3">
              Um sistema de finanças para familias
            </h1>
            <p className="text-sidebar/75 text-[14px] leading-relaxed mb-5">
              Organize contas, sonhos e combinados. Sem pressão.
            </p>
            <div className="flex gap-[10px]">
              <Link
                href="/signup"
                className="px-5 py-3 rounded-full bg-gold text-paper font-bold text-[14px] hover:opacity-90 transition-vintage"
              >
                Teste grátis
              </Link>
              <Link
                href="/plans"
                className="px-5 py-3 rounded-full border-[1.5px] border-ink/50 text-ink text-[14px] hover:bg-ink/10 transition-vintage"
              >
                Ver planos
              </Link>
            </div>
          </div>
        </div>

        {/* Desktop hero — two-column split */}
        <div className="hidden md:grid h-full lg:grid-cols-[2fr,1fr]">
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

      {/* ── Feature row ──────────────────────────────────────────── */}
      <section className="bg-sidebar py-8 px-5 md:py-24 md:px-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif font-light text-[26px] md:text-[44px] text-gold text-center mb-6 md:mb-8">
            Feito para famílias.
          </h2>
          <p className="text-center text-paper/65 text-[14px] md:text-[17px] font-light mb-8 md:mb-14">
            Quatro ferramentas, uma só conversa em casa.
          </p>
          <div className="flex flex-col gap-4 md:grid md:grid-cols-2 lg:grid-cols-4 md:gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="flex items-center gap-[14px] md:flex-col md:items-start bg-offWhite border border-border rounded-[14px] md:rounded-vintage p-4 md:p-6 shadow-soft"
              >
                <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-gold/15 flex items-center justify-center text-sidebar shrink-0 md:mb-4 md:w-auto md:h-auto md:p-2.5">
                  <f.icon size={18} />
                </div>
                <div>
                  <h3 className="font-serif text-[15px] md:text-[20px] font-normal text-ink mb-1 md:mb-2">{f.title}</h3>
                  <p className="text-[12px] md:text-sm text-sidebar/70 leading-relaxed">{f.copy}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col text-center max-w-3xl mt-12 md:mt-14 mx-auto px-4 md:px-0">
            <p className="font-ptSerif italic text-[18px] md:text-[28px] leading-relaxed text-gold font-normal min-h-[4.5em] md:min-h-[3em]">
              &ldquo;<Typewriter
                texts="O Florim nasceu dentro de uma família, para famílias, e trata dinheiro como escolha, projeto e relação humana."
                speedMs={45}
                pauseMs={3500}
                startDelay={400}
              />&rdquo;</p>
            <p className="mt-4 md:mt-5 text-[11px] md:text-[13px] tracking-widest uppercase text-paper/80">
              Lucas &amp; Nathalia, fundadores
            </p>
          </div>
        </div>
      </section>

      {/* ── Plan cards ───────────────────────────────────────────── */}
      <section className="bg-paper py-8 px-5 md:py-24 md:px-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif font-normal text-[26px] md:text-[48px] text-coffee text-center mb-2 md:mb-3">
            Planos
          </h2>
          <p className="text-center text-ink/70 text-[13px] md:text-base font-light mb-6 md:mb-14">
            Sem cartão no teste. Sem pressa para decidir.
          </p>
          <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-5 md:max-w-2xl md:mx-auto">
            {plans.map((p) => (
              <div
                key={p.name}
                className="rounded-[18px] p-5 md:p-7 shadow-soft relative"
                style={{
                  background: p.featured ? '#3E5F4B' : '#faf9f7',
                  color: p.featured ? '#F5F1EB' : '#3E5F4B',
                  border: p.featured ? '1px solid transparent' : '1px solid rgba(186,172,138,0.40)',
                }}
              >
                {p.featured && (
                  <div className="absolute -top-3 right-6 bg-gold text-coffee text-[10px] md:text-[11px] tracking-widest uppercase px-3 py-1 rounded-full font-semibold">
                    Mais escolhido
                  </div>
                )}
                <h3 className="font-serif text-[20px] md:text-[26px] font-normal text-gold mb-1 md:mb-2">
                  {p.name}
                </h3>
                <p className="text-[12px] md:text-sm mb-3 md:mb-5" style={{ opacity: 0.7 }}>{p.tag}</p>
                <div className="flex items-baseline gap-1.5 mb-4 md:mb-5">
                  <span className="text-sm" style={{ opacity: 0.7 }}>R$</span>
                  <span className="font-numbers text-[36px] md:text-[44px] font-normal" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {p.price}
                  </span>
                  <span className="text-sm" style={{ opacity: 0.7 }}>{p.per}</span>
                </div>
                <ul className="flex flex-col gap-1.5 md:gap-2 text-[12px] md:text-sm mb-5 md:mb-6" style={{ opacity: 0.85 }}>
                  {p.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2">
                      <Check size={14} color={p.featured ? '#C2A45D' : '#6FBF8A'} />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="block text-center py-3 px-4 rounded-full bg-gold text-coffee text-[13px] md:text-sm font-bold hover:opacity-90 transition-vintage"
                >
                  Entre para testar
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center mt-8 md:mt-12 font-ptSerif italic text-[16px] md:text-base text-gold/75">
            Menos do que um jantar fora. Mais do que uma planilha.
          </p>
        </div>
      </section>

      <PublicFooter color="sidebar" />
    </div>
  )
}
