'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Check, X, ChevronDown } from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'

// ── Data ─────────────────────────────────────────────────────────────────────

const COMPARISON_ROWS = [
  { label: 'Contas a pagar c/ parcelamento', monthly: true, annual: true },
  { label: 'Contas a receber', monthly: true, annual: true },
  { label: 'Poupança e sonhos', monthly: true, annual: true },
  { label: 'Lembretes e vencimento', monthly: true, annual: true },
  { label: 'Comparativos e gráficos', monthly: true, annual: true },
  { label: 'Família compartilhada', monthly: true, annual: true },
  { label: 'Importação de extrato (OFX)', monthly: true, annual: true },
  { label: 'Exportação PDF e CSV', monthly: true, annual: true },
  { label: 'Categorias personalizadas', monthly: true, annual: true },
  { label: 'Acesso em qualquer dispositivo', monthly: true, annual: true },
  { label: 'Preço fixo no contrato', monthly: false, annual: true },
  { label: 'Prioridade em novidades', monthly: false, annual: true },
]

const FAQ_ITEMS = [
  {
    q: 'Preciso de cartão de crédito para testar?',
    a: 'Não. Os 14 dias de teste são completamente gratuitos e sem necessidade de cartão. Você só será cobrado se decidir continuar após o período de teste.',
  },
  {
    q: 'Quantas pessoas podem usar a mesma conta?',
    a: 'Você pode convidar quantos membros quiser para a sua família. Todos compartilham os mesmos dados em tempo real com uma única assinatura.',
  },
  {
    q: 'Posso cancelar a qualquer momento?',
    a: 'Sim. No plano mensal, você cancela quando quiser e o acesso continua até o fim do período pago. No plano anual, o cancelamento encerra a renovação automática no próximo ciclo anual.',
  },
  {
    q: 'Meus dados financeiros estão seguros?',
    a: 'Sim. Os dados são armazenados com criptografia em repouso e em trânsito. Nunca vendemos ou compartilhamos informações da sua família com terceiros.',
  },
  {
    q: 'Posso trocar do plano mensal para o anual depois?',
    a: 'Sim. Você pode migrar do plano mensal para o anual a qualquer momento pela área de configurações da sua conta, sem perder nenhum dado.',
  },
  {
    q: 'O que acontece depois dos 14 dias de teste?',
    a: 'Você recebe um aviso e pode escolher o plano que preferir para continuar. Se não assinar, o acesso fica suspenso, mas seus dados ficam salvos por 30 dias.',
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

function ComparisonTable({ billing }: { billing: 'monthly' | 'annual' }) {
  const COL = 'grid-cols-[1fr_48px_48px]'

  return (
    <>
      {/* ── Mobile grid (no horizontal scroll) ── */}
      <div className="md:hidden rounded-[18px] border border-border shadow-soft overflow-hidden">
        <div className={`grid ${COL} items-center bg-offWhite border-b border-border px-4 py-3 gap-x-2`}>
          <span className="text-[10px] font-semibold text-ink/40 uppercase tracking-wide">Funcionalidade</span>
          <span className="text-[10px] font-semibold text-coffee text-center leading-tight">Mensal</span>
          <span className="text-[10px] font-semibold text-coffee text-center leading-tight">Anual</span>
        </div>
        {COMPARISON_ROWS.map((row, i) => (
          <div
            key={row.label}
            className={`grid ${COL} items-center px-4 py-3 border-b border-border last:border-0 gap-x-2 ${i % 2 === 0 ? 'bg-paper' : 'bg-offWhite'}`}
          >
            <span className="text-[12px] text-ink/70 leading-snug">{row.label}</span>
            <span className="flex justify-center">
              {row.monthly ? <Check size={14} className="text-olive" /> : <X size={13} className="text-border" />}
            </span>
            <span className="flex justify-center">
              {row.annual ? <Check size={14} className="text-olive" /> : <X size={13} className="text-border" />}
            </span>
          </div>
        ))}
        <div className={`grid ${COL} items-center bg-sidebar px-4 py-4 gap-x-2`}>
          <span className="text-[13px] font-semibold text-paper/70">Preço</span>
          <div className="text-center">
            <p className="font-numbers text-[15px] font-normal text-gold leading-tight">29,90</p>
            <p className="text-paper/45 text-[9px]">/mês</p>
          </div>
          <div className="text-center">
            <p className="font-numbers text-[15px] font-normal text-gold leading-tight">24,90</p>
            <p className="text-paper/45 text-[9px]">/mês*</p>
          </div>
        </div>
        <p className="px-4 py-2.5 text-[10px] text-ink/40 bg-offWhite">
          * Cobrado como R$ 299,00/ano. 2 meses grátis em relação ao mensal.
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
                Plano Mensal
              </th>
              <th className="px-5 py-4 text-center text-[13px] font-semibold text-coffee font-body">
                Plano Anual
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
                  {row.monthly ? <Check size={16} className="inline text-olive" /> : <X size={15} className="inline text-border" />}
                </td>
                <td className="px-5 py-3.5 text-center">
                  {row.annual ? <Check size={16} className="inline text-olive" /> : <X size={15} className="inline text-border" />}
                </td>
              </tr>
            ))}
            <tr className="bg-sidebar">
              <td className="px-5 py-4 text-[13px] font-semibold text-paper/80 font-body">Preço</td>
              <td className="px-5 py-4 text-center">
                <span className="font-numbers text-[22px] font-normal text-gold leading-none">29,90</span>
                <span className="text-paper/60 text-xs ml-1">/mês</span>
              </td>
              <td className="px-5 py-4 text-center">
                <span className="font-numbers text-[22px] font-normal text-gold leading-none">24,90</span>
                <span className="text-paper/60 text-xs ml-1">/mês*</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p className="px-5 py-3 text-[11px] text-ink/40 bg-offWhite rounded-b-[18px]">
          * Cobrado como R$ 299,00/ano. Equivalente a 2 meses grátis em relação ao plano mensal.
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

  const monthlyPrice = '29,90'
  const annualMonthly = '24,90'
  const annualTotal = '299,00'

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
          14 dias grátis sem cartão. Uma assinatura para toda a família.
        </p>
        <PlanToggle value={billing} onChange={setBilling} />
      </section>

      {/* ── Plan cards ───────────────────────────────────────────── */}
      <section className="px-5 pb-16 md:px-12">
        <div className="max-w-3xl mx-auto grid gap-4 md:grid-cols-2 md:gap-6">

          {/* Monthly */}
          <div
            className={`flex flex-col rounded-[22px] border p-6 md:p-8 shadow-soft transition-vintage ${
              billing === 'monthly'
                ? 'border-sidebar/30 bg-offWhite'
                : 'border-border bg-offWhite opacity-70'
            }`}
          >
            <h2 className="font-serif text-[24px] text-coffee mb-1">Plano Mensal</h2>
            <p className="text-sm text-ink/55 mb-5">Flexibilidade para começar sem compromisso.</p>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="text-base text-coffee/60">R$</span>
              <span className="font-numbers text-[48px] font-normal leading-none text-coffee" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {monthlyPrice}
              </span>
              <span className="text-base text-coffee/60">/mês</span>
            </div>
            <p className="text-[13px] text-ink/45 mb-6">Cobrado mensalmente. Cancele quando quiser.</p>
            <ul className="flex flex-col gap-2 text-sm text-ink/70 mb-7 flex-1">
              {['Contas a pagar e a receber', 'Poupança e sonhos', 'Comparativos e gráficos', 'Lembretes', 'Família compartilhada', 'Importação de extrato (OFX)', 'Exportação PDF e CSV'].map((b) => (
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
              Começar grátis por 14 dias
            </Link>
          </div>

          {/* Annual */}
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
              Plano Anual
            </h2>
            <p className={`text-sm mb-5 ${billing === 'annual' ? 'text-paper/55' : 'text-ink/55'}`}>
              Compromisso e economia. Equivale a 2 meses grátis.
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
                'Tudo do plano mensal',
                'Economia de R$ 59,80 no ano',
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
              Começar grátis por 14 dias
            </Link>
          </div>
        </div>

        {/* Trust strip */}
        <div className="max-w-3xl mx-auto mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13px] text-ink/50">
          <span className="flex items-center gap-1.5"><Check size={13} className="text-olive" /> Sem cartão no teste</span>
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
            Ambos os planos incluem acesso completo ao sistema.
          </p>
          <ComparisonTable billing={billing} />
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
            14 dias grátis. Sem cartão. Cancele quando quiser.
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
