'use client'

import Link from 'next/link'
import {
  BanknoteArrowDown,
  BanknoteArrowUp,
  PiggyBank,
  Users,
  ChartColumnBig,
  Bell,
  FileUp,
  Check,
  ArrowRight,
  MessageCircle,
} from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'
import Typewriter from '@/components/Typewriter'

// ── Data ─────────────────────────────────────────────────────────────────────

const PROBLEMS = [
  {
    headline: 'O dinheiro vai embora. Ninguém sabe para onde.',
    body: 'Sem uma visão compartilhada, cada membro da família enxerga metade — e as decisões acontecem no escuro.',
  },
  {
    headline: 'Os sonhos ficam sempre para o próximo mês.',
    body: 'Viagem, reforma, escola: sem uma meta visível e em comum, o dinheiro sempre vai para outro lugar antes de chegar lá.',
  },
  {
    headline: 'Planilha ninguém atualiza duas vezes.',
    body: 'Elas não se adaptam a parcelas, pedem atualização constante e são esquecidas depois do primeiro mês.',
  },
]

const WA_EXAMPLES = [
  { msg: 'Gastei 50 no mercado no pix', result: 'Despesa registrada automaticamente' },
  { msg: 'Comprei um tênis de 150 em 3x', result: '3 parcelas criadas no sistema' },
  { msg: 'Recebi 1500 de salário', result: 'Receita lançada na família' },
  { msg: 'Guardei 200 para a viagem', result: 'Poupança atualizada' },
  { msg: 'Quanto gastei esse mês?', result: 'Resumo enviado em segundos' },
]

const FEATURES = [
  {
    icon: BanknoteArrowDown,
    title: 'Contas a Pagar',
    copy: 'Despesas com parcelamento automático, controle de status e histórico claro.',
  },
  {
    icon: BanknoteArrowUp,
    title: 'Contas a Receber',
    copy: 'Salários, rendas extras e entradas previstas — visíveis para toda a família.',
  },
  {
    icon: PiggyBank,
    title: 'Poupança & Sonhos',
    copy: 'Metas com nome e valor: viagem, escola, reforma. Os sonhos ficam à vista.',
  },
  {
    icon: ChartColumnBig,
    title: 'Comparativos',
    copy: 'Gráficos de barras e pizza com histórico mensal e anual. Sem pressão.',
  },
  {
    icon: Bell,
    title: 'Lembretes',
    copy: 'Alertas por categoria e vencimento. Nenhuma conta passa em branco.',
  },
  {
    icon: Users,
    title: 'Família Compartilhada',
    copy: 'Convide cônjuge, filhos ou pais. Uma assinatura, dados em tempo real para todos.',
  },
  {
    icon: FileUp,
    title: 'Importação de Extrato',
    copy: 'Importe extratos em OFX direto do banco. Menos digitação, mais agilidade.',
  },
]

const STEPS = [
  {
    number: '01',
    title: 'Cadastre sua família',
    body: 'Crie uma conta, dê um nome para a família e convide quem quiser — cônjuge, filhos, pais.',
  },
  {
    number: '02',
    title: 'Registre receitas e despesas',
    body: 'Lance contas, parcelas e poupanças no app — ou mande uma mensagem no WhatsApp.',
  },
  {
    number: '03',
    title: 'Acompanhe juntos',
    body: 'Gráficos, comparativos mensais e saldo da família em tempo real — de qualquer dispositivo.',
  },
]

const PLANS = [
  {
    name: 'Plano Mensal',
    tag: 'Para começar com flexibilidade.',
    price: '29,90',
    per: '/ mês',
    featured: false,
    savingsBadge: null,
    bullets: [
      'Contas a pagar e a receber',
      'Poupança e sonhos',
      'Comparativos e gráficos',
      'WhatsApp com IA',
      'Família compartilhada',
      'Acesso completo',
    ],
  },
  {
    name: 'Plano Anual',
    tag: 'Compromisso e economia.',
    price: '299,00',
    per: '/ ano',
    featured: true,
    savingsBadge: 'R$ 24,90/mês · 2 meses grátis',
    bullets: [
      'Tudo do plano mensal',
      'Economia de R$ 59,80 no ano',
      'Preço fixo durante o contrato',
      'Prioridade em novas funcionalidades',
    ],
  },
]

// ── WhatsApp chat mockup ──────────────────────────────────────────────────────

function WaMessage({ from, text, time }: { from: 'user' | 'bot'; text: string; time: string }) {
  const isUser = from === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[78%] rounded-[14px] px-3 py-2 shadow-sm text-[11.5px] leading-snug ${
          isUser
            ? 'bg-[#dcf8c6] text-ink rounded-br-[4px]'
            : 'bg-white text-ink rounded-bl-[4px]'
        }`}
      >
        <p className="whitespace-pre-line">{text}</p>
        <p className={`text-[10px] mt-0.5 text-ink/35 ${isUser ? 'text-right' : 'text-left'}`}>
          {time}{isUser ? ' ✓✓' : ''}
        </p>
      </div>
    </div>
  )
}

function WhatsAppMockup() {
  return (
    <div className="relative w-full max-w-[380px] mx-auto md:max-w-[420px] md:mx-0 md:ml-auto">
      {/* Glow */}
      <div className="absolute inset-0 rounded-[32px] blur-2xl bg-olive/20 scale-95 translate-y-4" />
      {/* Phone shell */}
      <div className="relative rounded-[28px] border-[3px] border-ink/10 overflow-hidden shadow-vintage bg-[#ece5dd]">
        {/* WA header */}
        <div className="flex items-center gap-2.5 px-4 py-3" style={{ background: '#075e54' }}>
          <div className="w-8 h-8 rounded-full bg-olive flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold font-serif">F</span>
          </div>
          <div>
            <p className="text-white text-[13px] font-semibold leading-tight">Florim</p>
            <p className="text-white/55 text-[10px]">online</p>
          </div>
        </div>
        {/* Chat area */}
        <div className="px-3 py-4 space-y-2.5 min-h-[320px]">
          <WaMessage
            from="user"
            text="Gastei 50 no mercado no pix"
            time="09:41"
          />
          <WaMessage
            from="bot"
            text={`✅ Criados:\n💸 R$ 50,00 — mercado\n   (Alimentação) · pago`}
            time="09:41"
          />
          <WaMessage
            from="user"
            text="Comprei tênis de 150 em 3x"
            time="09:43"
          />
          <WaMessage
            from="bot"
            text={`✅ Criados:\n💸 R$ 150,00 — tênis\n   (R$ 50,00 × 3 — 1ª paga)`}
            time="09:43"
          />
          <WaMessage
            from="user"
            text="Quanto gastei esse mês?"
            time="09:45"
          />
          <WaMessage
            from="bot"
            text={`📊 Maio:\n💸 Despesas: R$ 200,00\n💰 Receitas: R$ 4.200,00\n📍 Saldo: +R$ 4.000,00`}
            time="09:45"
          />
        </div>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <div className="flex flex-col">

      {/* ── 1. Hero ────────────────────────── bg-paper ────────── */}
      <div className="relative overflow-hidden bg-paper h-[440px] md:h-[88vh]">
        <PublicNavbar color="sidebar" showWordmark={false} />

        {/* Mobile — full-bleed video */}
        <div className="md:hidden absolute inset-0 flex flex-col justify-end px-7 pb-10">
          <video
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay muted loop playsInline
            src="/main-video.mp4"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/35 to-transparent" />
          <div className="relative z-10">
            <h1 className="font-serif font-light text-[36px] leading-[1.05] text-paper mb-3">
              Cuide das finanças da família, juntos.
            </h1>
            <p className="text-paper/80 text-[14px] leading-relaxed mb-6">
              Despesas, sonhos e combinados — num só lugar. Sem pressão, sem cartão no teste.
            </p>
            <div className="flex gap-[10px]">
              <Link href="/signup" className="px-5 py-3 rounded-full bg-gold text-paper font-bold text-[14px] hover:opacity-90 transition-vintage">
                Criar conta grátis
              </Link>
              <Link href="/plans" className="px-5 py-3 rounded-full border-[1.5px] border-paper/60 text-paper text-[14px] hover:bg-white/10 transition-vintage">
                Ver planos
              </Link>
            </div>
          </div>
        </div>

        {/* Desktop — two-column */}
        <div className="hidden md:grid h-full lg:grid-cols-[2fr,1fr]">
          <section className="bg-paper flex flex-col justify-center pt-[52px] pb-12 pl-24 pr-12 lg:pl-32 lg:pr-16">
            <div className="max-w-[560px]">
              <p className="text-[11px] tracking-[0.2em] uppercase text-gold font-semibold mb-4">
                Sistema financeiro familiar
              </p>
              <h1 className="font-serif font-light text-[54px] leading-[1.04] text-sidebar mb-5 tracking-tight">
                Cuide das finanças<br />da família, juntos.
              </h1>
              <p className="text-sidebar/70 font-light text-[17px] leading-relaxed mb-7 max-w-[440px]">
                O Florim organiza contas, receitas, poupanças e lembretes — com dados
                compartilhados em tempo real. Para que a família decida com clareza.
              </p>
              <div className="flex gap-3 mb-7">
                <Link href="/signup" className="px-7 py-3.5 rounded-full bg-gold text-coffee font-semibold text-[15px] hover:opacity-90 transition-vintage">
                  14 dias grátis
                </Link>
                <Link href="/plans" className="px-7 py-3.5 rounded-full bg-sidebar text-paper font-semibold text-[15px] hover:bg-sidebar/80 transition-vintage">
                  Ver planos
                </Link>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-sidebar/50">
                <span className="flex items-center gap-1.5"><Check size={13} className="text-olive" />Sem cartão de crédito</span>
                <span className="flex items-center gap-1.5"><Check size={13} className="text-olive" />Cancele quando quiser</span>
                <span className="flex items-center gap-1.5"><Check size={13} className="text-olive" />Para toda a família</span>
              </div>
            </div>
          </section>
          <section className="relative h-full">
            <video className="h-full w-full object-cover" autoPlay muted loop playsInline src="/about-video.mp4" />
          </section>
        </div>
      </div>

      {/* ── 2. Problems ────────────────────── bg-sidebar ──────── */}
      <section className="bg-sidebar py-12 px-5 md:py-20 md:px-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif font-light text-[26px] md:text-[42px] text-paper text-center mb-3 md:mb-4">
            Todo mês a mesma história.
          </h2>
          <p className="text-center text-paper/50 text-[13px] md:text-[17px] font-light mb-8 md:mb-12">
            Três problemas que toda família conhece — e que o Florim resolve.
          </p>
          <div className="grid gap-4 md:grid-cols-3 md:gap-6">
            {PROBLEMS.map((p) => (
              <div key={p.headline} className="rounded-[18px] bg-paper p-5 md:p-7 shadow-vintage">
                <h3 className="font-serif text-[16px] md:text-[19px] text-coffee mb-3 leading-snug">
                  {p.headline}
                </h3>
                <p className="text-[13px] md:text-[14px] text-ink/60 leading-relaxed">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3. WhatsApp ────────────────────── bg-paper ─────────── */}
      <section className="bg-paper py-12 px-5 md:py-24 md:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">

            {/* Text */}
            <div>
              <div className="inline-flex items-center gap-2 bg-olive/15 rounded-full px-3 py-1.5 mb-5">
                <MessageCircle size={14} className="text-olive" />
                <span className="text-[11px] tracking-[0.15em] uppercase text-olive font-semibold">
                  WhatsApp · com inteligência artificial
                </span>
              </div>
              <h2 className="font-serif font-light text-[28px] md:text-[42px] text-coffee leading-[1.08] mb-4">
                Registre tudo pelo WhatsApp.<br className="hidden md:block" />
                Em linguagem natural.
              </h2>
              <p className="text-[14px] md:text-[16px] font-light text-ink/65 leading-relaxed mb-7">
                Sem precisar abrir o app. É só mandar uma mensagem como você falaria com alguém.
                O Florim entende — e lança despesas, receitas, parcelas, poupanças e lembretes
                automaticamente para toda a família.
              </p>
              <ul className="space-y-3">
                {WA_EXAMPLES.map(({ msg, result }) => (
                  <li key={msg} className="flex items-start gap-3">
                    <span className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-olive mt-[7px]" />
                    <div className="min-w-0">
                      <span className="text-[13px] text-ink/80 font-medium italic">&ldquo;{msg}&rdquo;</span>
                      <span className="text-[13px] text-ink/40"> → {result}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-[12px] text-ink/40 leading-relaxed">
                Também dá para consultar saldos, editar e apagar registros — tudo pelo WhatsApp.
              </p>
            </div>

            {/* Phone mockup */}
            <WhatsAppMockup />
          </div>
        </div>
      </section>

      {/* ── 4. Features ────────────────────── bg-sidebar ──────── */}
      <section id="features" className="bg-sidebar py-12 px-5 md:py-24 md:px-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif font-light text-[26px] md:text-[44px] text-paper text-center mb-3 md:mb-4">
            Tudo em um só lugar.
          </h2>
          <p className="text-center text-paper/50 text-[13px] md:text-[17px] font-light mb-8 md:mb-14">
            Sete ferramentas conectadas para o dia a dia da sua casa.
          </p>
          <div className="flex flex-col gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="flex items-start gap-4 md:flex-col bg-paper border border-paper/20 rounded-[14px] md:rounded-vintage p-4 md:p-6 shadow-soft"
              >
                <div className="w-10 h-10 rounded-xl bg-sidebar/10 flex items-center justify-center text-coffee shrink-0 md:mb-3">
                  <f.icon size={18} />
                </div>
                <div>
                  <h3 className="font-serif text-[15px] md:text-[18px] font-normal text-ink mb-1 md:mb-2">
                    {f.title}
                  </h3>
                  <p className="text-[12px] md:text-[13px] text-ink/55 leading-relaxed">{f.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. How it works ─────────────────── bg-paper ─────────── */}
      <section className="bg-paper py-12 px-5 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif font-light text-[26px] md:text-[44px] text-coffee text-center mb-3 md:mb-4">
            Simples de começar.
          </h2>
          <p className="text-center text-ink/50 text-[13px] md:text-[17px] font-light mb-8 md:mb-14">
            Três passos. Cinco minutos. Clareza para toda a família.
          </p>
          <div className="grid gap-8 md:grid-cols-3 md:gap-10">
            {STEPS.map((s) => (
              <div key={s.number} className="flex flex-col">
                <div className="font-serif text-[56px] md:text-[72px] font-light text-gold/22 leading-none mb-3">
                  {s.number}
                </div>
                <h3 className="font-serif text-[18px] md:text-[22px] text-coffee mb-2">{s.title}</h3>
                <p className="text-[13px] md:text-[14px] text-ink/55 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 md:mt-16 text-center">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-sidebar text-paper font-semibold text-[15px] hover:bg-sidebar/80 transition-vintage"
            >
              Começar grátis <ArrowRight size={16} />
            </Link>
            <p className="mt-3 text-[12px] text-ink/40">14 dias grátis. Sem cartão de crédito.</p>
          </div>
        </div>
      </section>

      {/* ── 6. Pricing teaser ───────────────── bg-sidebar ──────── */}
      <section className="bg-sidebar py-12 px-5 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif font-normal text-[26px] md:text-[44px] text-gold text-center mb-2 md:mb-3">
            Planos
          </h2>
          <p className="text-center text-paper/50 text-[13px] md:text-[16px] font-light mb-8 md:mb-12">
            Menos do que um jantar fora. Mais do que uma planilha.
          </p>
          <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-5 md:max-w-2xl md:mx-auto">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className="rounded-[18px] p-5 md:p-7 shadow-vintage relative"
                style={{
                  background: p.featured ? '#F5F1EB' : 'rgba(245,241,235,0.07)',
                  color: p.featured ? '#3E5F4B' : '#F5F1EB',
                  border: p.featured ? '1px solid transparent' : '1px solid rgba(245,241,235,0.16)',
                }}
              >
                {p.featured && (
                  <div className="absolute -top-3 right-6 bg-gold text-sidebar text-[10px] md:text-[11px] tracking-widest uppercase px-3 py-1 rounded-full font-semibold">
                    Mais escolhido
                  </div>
                )}
                <h3 className="font-serif text-[20px] md:text-[24px] font-normal text-gold mb-1">{p.name}</h3>
                <p className="text-[12px] md:text-sm mb-4 opacity-70">{p.tag}</p>
                {p.savingsBadge ? (
                  <div className="inline-block text-[11px] px-3 py-1 rounded-full bg-gold/20 text-gold mb-3 font-medium">
                    {p.savingsBadge}
                  </div>
                ) : null}
                <div className="flex items-baseline gap-1.5 mb-4">
                  <span className="text-sm opacity-70">R$</span>
                  <span className="font-numbers text-[40px] md:text-[44px] font-normal leading-none" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {p.price}
                  </span>
                  <span className="text-sm opacity-70">{p.per}</span>
                </div>
                <ul className="flex flex-col gap-1.5 text-[12px] md:text-sm mb-5" style={{ opacity: 0.85 }}>
                  {p.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2">
                      <Check size={13} className="text-gold shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="block text-center py-3 px-4 rounded-full text-[13px] md:text-sm font-bold hover:opacity-90 transition-vintage"
                  style={{ background: p.featured ? '#3E5F4B' : '#C2A45D', color: '#F5F1EB' }}
                >
                  Começar 14 dias grátis
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center mt-6 md:mt-8">
            <Link href="/plans" className="text-gold/65 text-[13px] hover:text-gold transition-vintage underline underline-offset-2">
              Ver comparação completa e perguntas frequentes →
            </Link>
          </p>
        </div>
      </section>

      {/* ── 7. Origin story ─────────────────── bg-paper ─────────── */}
      <section className="bg-paper py-12 px-5 md:py-24 md:px-12">
        <div className="max-w-4xl mx-auto">
          <div className="md:grid md:grid-cols-[1fr,1.6fr] md:gap-16 md:items-center">
            <div className="mb-7 md:mb-0">
              <p className="text-[11px] tracking-[0.2em] uppercase text-gold font-semibold mb-4">
                Nossa história
              </p>
              <h2 className="font-serif font-light text-[26px] md:text-[36px] text-coffee leading-[1.1]">
                Feito por uma família,<br />para famílias.
              </h2>
            </div>
            <div>
              <p className="text-[14px] md:text-[16px] font-light text-ink/60 leading-relaxed mb-4">
                O Florim nasceu dentro de casa. Lucas, engenheiro de software, e Nathalia, designer
                de interiores, perceberam que nenhuma ferramenta existente tratava as finanças como
                o que elas são: uma conversa entre pessoas que constroem algo juntas.
              </p>
              <p className="text-[14px] md:text-[16px] font-light text-ink/60 leading-relaxed mb-6">
                O nome vem do <em>fiorino d&apos;oro</em> — a moeda dourada das famílias florentinas do
                século XIII. Valor sólido, baseado em confiança. Essa é a nossa referência.
              </p>
              <p className="font-ptSerif italic text-[16px] md:text-[20px] text-gold leading-relaxed min-h-[3em]">
                &ldquo;<Typewriter
                  texts="O Florim trata dinheiro como escolha, projeto e relação humana."
                  speedMs={45}
                  pauseMs={4000}
                  startDelay={300}
                />&rdquo;
              </p>
              <p className="mt-3 text-[11px] tracking-widest uppercase text-ink/35">
                Lucas &amp; Nathalia Malinowski, fundadores
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. Final CTA ────────────────────── bg-sidebar ──────── */}
      <section className="bg-sidebar py-16 px-5 md:py-20 md:px-12">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="font-serif font-light text-[30px] md:text-[44px] text-paper mb-4 leading-[1.1]">
            Comece hoje.<br className="md:hidden" /> A família agradece.
          </h2>
          <p className="text-paper/55 text-[14px] md:text-[16px] font-light leading-relaxed mb-8">
            14 dias grátis. Sem cartão de crédito. Cancele quando quiser.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-full bg-gold text-sidebar font-bold text-[16px] hover:opacity-90 transition-vintage shadow-vintage"
          >
            Criar conta grátis
          </Link>
        </div>
      </section>

      <PublicFooter color="sidebar" />
    </div>
  )
}
