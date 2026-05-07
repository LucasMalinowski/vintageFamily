'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Check, X, ChevronDown } from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'

// ── Data ─────────────────────────────────────────────────────────────────────

const COMPARISON_ROWS = [
  { label: 'Contas a pagar c/ parcelamento', free: true, pro: true },
  { label: 'Contas a receber', free: true, pro: true },
  { label: 'Poupança e sonhos', free: true, pro: true },
  { label: 'Lembretes e vencimento', free: true, pro: true },
  { label: 'Família compartilhada', free: true, pro: true },
  { label: 'WhatsApp para registrar lançamentos', free: '75/mês', pro: 'Ilimitado' },
  { label: 'Consultas com IA pelo WhatsApp', free: '15/mês', pro: 'Ilimitado' },
  { label: 'Insights sob demanda', free: '3/mês', pro: 'Ilimitado' },
  { label: 'Insights automáticos', free: '2/mês', pro: 'Frequência ajustável' },
  { label: 'Sugestão de categorias com IA', free: true, pro: true },
  { label: 'Detecção de registros recorrentes', free: true, pro: true },
  { label: 'Importação e exportação', free: '3/mês', pro: 'Ilimitado' },
  { label: 'Histórico nos comparativos', free: '2 meses', pro: 'Completo' },
  { label: 'Prioridade em novidades', free: false, pro: true },
]

const FAQ_ITEMS = [
  {
    q: 'Existe plano gratuito?',
    a: 'Sim. O plano gratuito continua disponível depois do cadastro, com limites mensais para WhatsApp, consultas com IA, insights e importações/exportações. Você pode assinar o Pro quando precisar de uso ilimitado.',
  },
  {
    q: 'Quantas pessoas podem usar a mesma conta?',
    a: 'Você pode convidar membros da sua família. Todos compartilham os mesmos dados em tempo real, tanto no gratuito quanto no Pro.',
  },
  {
    q: 'Posso cancelar a qualquer momento?',
    a: 'Sim. No Pro mensal, você cancela quando quiser e o acesso continua até o fim do período pago. No Pro anual, o cancelamento encerra a renovação automática no próximo ciclo anual.',
  },
  {
    q: 'Meus dados financeiros estão seguros?',
    a: 'Sim. Os dados são armazenados com criptografia em repouso e em trânsito. Nunca vendemos ou compartilhamos informações da sua família com terceiros.',
  },
  {
    q: 'Posso trocar do plano mensal para o anual depois?',
    a: 'Sim. Você pode migrar do Pro mensal para o Pro anual a qualquer momento pela área de configurações da sua conta, sem perder nenhum dado.',
  },
  {
    q: 'O que muda do gratuito para o Pro?',
    a: 'O Pro remove os limites mensais das rotinas principais, libera histórico comparativo completo, importação/exportação ilimitada, WhatsApp e IA para uso contínuo, além de configuração avançada de insights.',
  },
]

// ── Sub-components ───────────────────────────────────────────────────────────

function PlanToggle({
  value,
  onChange,
}: {
  value: 'monthly' | 'annual'
  onChange: (v: 'monthly' | 'annual') => void
}) {
  return (
    <div className="inline-flex items-center gap-1 bg-offWhite border border-border rounded-full p-1">
      <button
        onClick={() => onChange('monthly')}
        className={`px-5 py-2 rounded-full text-sm font-semibold transition-vintage ${
          value === 'monthly'
            ? 'bg-sidebar text-paper shadow-soft'
            : 'text-ink/60 hover:text-ink'
        }`}
      >
        Mensal
      </button>
      <button
        onClick={() => onChange('annual')}
        className={`px-5 py-2 rounded-full text-sm font-semibold transition-vintage flex items-center gap-2 ${
          value === 'annual'
            ? 'bg-sidebar text-paper shadow-soft'
            : 'text-ink/60 hover:text-ink'
        }`}
      >
        Anual
        {value !== 'annual' && (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/20 text-gold font-semibold">
            −17%
          </span>
        )}
      </button>
    </div>
  )
}

function ComparisonValue({ value }: { value: string | boolean }) {
  if (value === true) return <Check size={16} className="inline text-olive" />
  if (value === false) return <X size={15} className="inline text-border" />
  return <span className="text-[11px] md:text-[13px] text-ink/65">{value}</span>
}

function ComparisonTable() {
  const COL = 'grid-cols-[1fr_76px_82px]'

  return (
    <>
      {/* ── Mobile grid (no horizontal scroll) ── */}
      <div className="md:hidden rounded-[18px] border border-border shadow-soft overflow-hidden">
        <div className={`grid ${COL} items-center bg-offWhite border-b border-border px-4 py-3 gap-x-2`}>
          <span className="text-[10px] font-semibold text-ink/40 uppercase tracking-wide">Funcionalidade</span>
          <span className="text-[10px] font-semibold text-coffee text-center leading-tight">Grátis</span>
          <span className="text-[10px] font-semibold text-coffee text-center leading-tight">Pro</span>
        </div>
        {COMPARISON_ROWS.map((row, i) => (
          <div
            key={row.label}
            className={`grid ${COL} items-center px-4 py-3 border-b border-border last:border-0 gap-x-2 ${i % 2 === 0 ? 'bg-paper' : 'bg-offWhite'}`}
          >
            <span className="text-[12px] text-ink/70 leading-snug">{row.label}</span>
            <span className="flex justify-center">
              <ComparisonValue value={row.free} />
            </span>
            <span className="flex justify-center">
              <ComparisonValue value={row.pro} />
            </span>
          </div>
        ))}
        <div className={`grid ${COL} items-center bg-sidebar px-4 py-4 gap-x-2`}>
          <span className="text-[13px] font-semibold text-paper/70">Preço</span>
          <div className="text-center">
            <p className="font-numbers text-[15px] font-normal text-gold leading-tight">0</p>
            <p className="text-paper/45 text-[9px]">/mês</p>
          </div>
          <div className="text-center">
            <p className="font-numbers text-[15px] font-normal text-gold leading-tight">19,90</p>
            <p className="text-paper/45 text-[9px]">/mês</p>
          </div>
        </div>
        <p className="px-4 py-2.5 text-[10px] text-ink/40 bg-offWhite">
          Pro anual: R$ 189,00/ano, equivalente a R$ 15,75/mês.
        </p>
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden md:block overflow-x-auto rounded-[18px] border border-border shadow-soft">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className="bg-offWhite border-b border-border">
              <th className="text-left px-5 py-4 text-[13px] font-semibold text-ink/50 font-body">
                Funcionalidade
              </th>
              <th className="px-5 py-4 text-center text-[13px] font-semibold text-coffee font-body">
                Gratuito
              </th>
              <th className="px-5 py-4 text-center text-[13px] font-semibold text-coffee font-body">
                Florim Pro
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPARISON_ROWS.map((row, i) => (
              <tr
                key={row.label}
                className={`border-b border-border last:border-0 ${i % 2 === 0 ? 'bg-paper' : 'bg-offWhite'}`}
              >
                <td className="px-5 py-3.5 text-[13px] text-ink/75 font-body">{row.label}</td>
                <td className="px-5 py-3.5 text-center">
                  <ComparisonValue value={row.free} />
                </td>
                <td className="px-5 py-3.5 text-center">
                  <ComparisonValue value={row.pro} />
                </td>
              </tr>
            ))}
            <tr className="bg-sidebar">
              <td className="px-5 py-4 text-[13px] font-semibold text-paper/80 font-body">Preço</td>
              <td className="px-5 py-4 text-center">
                <span className="font-numbers text-[22px] font-normal text-gold leading-none">0</span>
                <span className="text-paper/60 text-xs ml-1">/mês</span>
              </td>
              <td className="px-5 py-4 text-center">
                <span className="font-numbers text-[22px] font-normal text-gold leading-none">19,90</span>
                <span className="text-paper/60 text-xs ml-1">/mês</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p className="px-5 py-3 text-[11px] text-ink/40 bg-offWhite rounded-b-[18px]">
          Pro anual: R$ 189,00/ano. Equivalente a R$ 15,75/mês e mais de 2 meses grátis em relação ao mensal.
        </p>
      </div>
    </>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-[15px] md:text-[16px] font-medium text-coffee">{q}</span>
        <ChevronDown
          size={18}
          className={`text-gold shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="pb-5 text-[14px] md:text-[15px] text-ink/65 leading-relaxed">{a}</p>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PlansPage() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual')

  const monthlyPrice = '19,90'
  const annualMonthly = '15,75'
  const annualTotal = '189,00'

  return (
    <div className="flex flex-col bg-paper min-h-screen">
      <PublicNavbar color="sidebar" showWordmark={false} />

      {/* ── Page header ──────────────────────────────────────────── */}
      <section className="pt-28 pb-10 md:pt-36 md:pb-14 px-5 text-center">
        <p className="text-[11px] tracking-[0.2em] uppercase text-gold font-semibold mb-4">
          Planos & preços
        </p>
        <h1 className="font-serif font-light text-[34px] md:text-[54px] text-coffee leading-[1.05] mb-4">
          Simples, transparente e justo.
        </h1>
        <p className="text-ink/55 text-[15px] md:text-[18px] font-light leading-relaxed mb-8 max-w-lg mx-auto">
          Comece no plano gratuito. Assine o Pro quando quiser liberar automações e IA sem limites mensais.
        </p>
        <p className="text-[11px] tracking-[0.18em] uppercase text-ink/35 font-semibold mb-3">
          Cobrança do Pro
        </p>
        <PlanToggle value={billing} onChange={setBilling} />
      </section>

      {/* ── Plan cards ───────────────────────────────────────────── */}
      <section className="px-5 pb-16 md:px-12">
        <div className="max-w-5xl mx-auto grid gap-4 md:grid-cols-3 md:gap-6">

          {/* Free */}
          <div className="flex flex-col rounded-[22px] border border-border bg-offWhite p-6 md:p-8 shadow-soft">
            <h2 className="font-serif text-[24px] text-coffee mb-1">Gratuito</h2>
            <p className="text-sm text-ink/55 mb-5">Para começar e manter a casa organizada.</p>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="text-base text-coffee/60">R$</span>
              <span className="font-numbers text-[48px] font-normal leading-none text-coffee" style={{ fontVariantNumeric: 'tabular-nums' }}>
                0
              </span>
              <span className="text-base text-coffee/60">/mês</span>
            </div>
            <p className="text-[13px] text-ink/45 mb-6">Sem cartão. Seus dados continuam disponíveis.</p>
            <ul className="flex flex-col gap-2 text-sm text-ink/70 mb-7 flex-1">
              {['Registro ilimitado de contas, receitas, poupanças e lembretes', 'Família compartilhada', '75 registros por WhatsApp/mês', '15 consultas com IA/mês', '3 insights sob demanda/mês', '3 importações/exportações/mês', 'Histórico comparativo de 2 meses'].map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <Check size={14} className="text-olive shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="block text-center py-3.5 px-4 rounded-full bg-sidebar text-paper text-sm font-semibold hover:bg-sidebar/80 transition-vintage"
            >
              Criar conta grátis
            </Link>
          </div>

          {/* Monthly Pro */}
          <div
            className={`flex flex-col rounded-[22px] border p-6 md:p-8 shadow-soft transition-vintage ${
              billing === 'monthly'
                ? 'border-sidebar/30 bg-offWhite'
                : 'border-border bg-offWhite opacity-70'
            }`}
          >
            <h2 className="font-serif text-[24px] text-coffee mb-1">Pro Mensal</h2>
            <p className="text-sm text-ink/55 mb-5">Para usar WhatsApp, IA e importações sem travar.</p>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="text-base text-coffee/60">R$</span>
              <span className="font-numbers text-[48px] font-normal leading-none text-coffee" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {monthlyPrice}
              </span>
              <span className="text-base text-coffee/60">/mês</span>
            </div>
            <p className="text-[13px] text-ink/45 mb-6">Cobrado mensalmente. Cancele quando quiser.</p>
            <ul className="flex flex-col gap-2 text-sm text-ink/70 mb-7 flex-1">
              {['Tudo do gratuito', 'WhatsApp e consultas com IA ilimitadas', 'Insights sob demanda ilimitados', 'Importação e exportação ilimitadas', 'Histórico comparativo completo', 'Frequência de insights ajustável', 'Prioridade em novas funcionalidades'].map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <Check size={14} className="text-olive shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="block text-center py-3.5 px-4 rounded-full bg-sidebar text-paper text-sm font-semibold hover:bg-sidebar/80 transition-vintage"
            >
              Assinar Pro mensal
            </Link>
          </div>

          {/* Annual Pro */}
          <div
            className={`flex flex-col rounded-[22px] border p-6 md:p-8 shadow-vintage relative transition-vintage ${
              billing === 'annual'
                ? 'border-gold/40 bg-sidebar'
                : 'border-border bg-offWhite opacity-70'
            }`}
          >
            <div className="absolute -top-3.5 right-6 bg-gold text-sidebar text-[11px] tracking-widest uppercase px-3 py-1 rounded-full font-semibold">
              Mais escolhido
            </div>
            <h2 className={`font-serif text-[24px] mb-1 ${billing === 'annual' ? 'text-gold' : 'text-coffee'}`}>
              Pro Anual
            </h2>
            <p className={`text-sm mb-5 ${billing === 'annual' ? 'text-paper/55' : 'text-ink/55'}`}>
              O mesmo Pro, com 2 meses grátis.
            </p>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className={`text-base ${billing === 'annual' ? 'text-paper/60' : 'text-coffee/60'}`}>R$</span>
              <span
                className={`font-numbers text-[48px] font-normal leading-none ${billing === 'annual' ? 'text-paper' : 'text-coffee'}`}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {annualMonthly}
              </span>
              <span className={`text-base ${billing === 'annual' ? 'text-paper/60' : 'text-coffee/60'}`}>/mês</span>
            </div>
            <p className={`text-[13px] mb-6 ${billing === 'annual' ? 'text-paper/45' : 'text-ink/45'}`}>
              Cobrado como R$ {annualTotal}/ano. Cancele antes da renovação.
            </p>
            <ul className={`flex flex-col gap-2 text-sm mb-7 flex-1 ${billing === 'annual' ? 'text-paper/75' : 'text-ink/70'}`}>
              {[
                'Tudo do Pro mensal',
                'Economia de R$ 49,80 no ano',
                'Preço fixo durante o contrato',
                'Prioridade em novas funcionalidades',
              ].map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <Check size={14} className="text-gold shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="block text-center py-3.5 px-4 rounded-full bg-gold text-sidebar text-sm font-semibold hover:opacity-90 transition-vintage"
            >
              Assinar Pro anual
            </Link>
          </div>
        </div>

        {/* Trust strip */}
        <div className="max-w-3xl mx-auto mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13px] text-ink/50">
          <span className="flex items-center gap-1.5"><Check size={13} className="text-olive" /> Gratuito sem cartão</span>
          <span className="flex items-center gap-1.5"><Check size={13} className="text-olive" /> Cancele quando quiser</span>
          <span className="flex items-center gap-1.5"><Check size={13} className="text-olive" /> Membros ilimitados</span>
          <span className="flex items-center gap-1.5"><Check size={13} className="text-olive" /> Dados seguros</span>
        </div>
      </section>

      {/* ── Feature comparison ───────────────────────────────────── */}
      <section className="bg-offWhite px-5 py-12 md:py-20 md:px-12">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif font-light text-[26px] md:text-[40px] text-coffee text-center mb-3">
            O que está incluído
          </h2>
          <p className="text-center text-ink/50 text-[14px] md:text-[16px] font-light mb-8 md:mb-10">
            O gratuito cobre o essencial. O Pro remove limites e aprofunda automações.
          </p>
          <ComparisonTable />
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section className="px-5 py-12 md:py-20 md:px-12">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-serif font-light text-[26px] md:text-[40px] text-coffee text-center mb-3">
            Perguntas frequentes
          </h2>
          <p className="text-center text-ink/50 text-[14px] font-light mb-10">
            Ficou com dúvida? A gente responde.
          </p>
          <div className="rounded-[18px] border border-border bg-offWhite px-5 md:px-7 shadow-soft">
            {FAQ_ITEMS.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
          <p className="mt-6 text-center text-[13px] text-ink/50">
            Outras dúvidas?{' '}
            <a
              href="mailto:contato@florim.app"
              className="text-gold hover:underline underline-offset-2 transition-vintage"
            >
              Escreva para contato@florim.app
            </a>
          </p>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────── */}
      <section className="bg-sidebar px-5 py-14 md:py-20 md:px-12">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="font-serif font-light text-[28px] md:text-[42px] text-paper mb-4 leading-[1.1]">
            Comece hoje. A família agradece.
          </h2>
          <p className="text-paper/55 text-[14px] md:text-[16px] font-light mb-8">
            Plano gratuito disponível. Sem cartão. Cancele o Pro quando quiser.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="px-8 py-4 rounded-full bg-gold text-sidebar font-bold text-[15px] hover:opacity-90 transition-vintage shadow-vintage text-center"
            >
              Criar conta grátis
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 rounded-full border border-paper/30 text-paper font-semibold text-[15px] hover:bg-paper/10 transition-vintage text-center"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter color="sidebar" />
    </div>
  )
}
