'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Check, X, ChevronDown } from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'
import { PLANS_CONTENT, type ComparisonRow } from './PlansContent.content'
import type { AppLocale } from '@/lib/i18n/getLocale'

// ── Sub-components ───────────────────────────────────────────────────────────

function PlanToggle({
  value,
  onChange,
  t,
}: {
  value: 'monthly' | 'annual'
  onChange: (v: 'monthly' | 'annual') => void
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <div className="inline-flex items-center gap-1 bg-offWhite border border-border rounded-full p-1">
      <button
        type="button"
        onClick={() => onChange('monthly')}
        className={`px-5 py-2 rounded-full text-sm font-semibold transition-vintage ${
          value === 'monthly'
            ? 'bg-sidebar text-paper shadow-soft'
            : 'text-ink/60 hover:text-ink'
        }`}
      >
        {t('plans.monthly')}
      </button>
      <button
        type="button"
        onClick={() => onChange('annual')}
        className={`px-5 py-2 rounded-full text-sm font-semibold transition-vintage flex items-center gap-2 ${
          value === 'annual'
            ? 'bg-sidebar text-paper shadow-soft'
            : 'text-ink/60 hover:text-ink'
        }`}
      >
        {t('plans.annual')}
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

function ComparisonTable({ rows, t }: { rows: ComparisonRow[]; t: ReturnType<typeof useTranslations> }) {
  const COL = 'grid-cols-[1fr_76px_82px]'

  return (
    <>
      {/* ── Mobile grid (no horizontal scroll) ── */}
      <div className="md:hidden rounded-[18px] border border-border shadow-soft overflow-hidden">
        <div className={`grid ${COL} items-center bg-offWhite border-b border-border px-4 py-3 gap-x-2`}>
          <span className="text-[10px] font-semibold text-ink/40 uppercase tracking-wide">{t('plans.tableFeature')}</span>
          <span className="text-[10px] font-semibold text-coffee text-center leading-tight">{t('plans.tableFree')}</span>
          <span className="text-[10px] font-semibold text-coffee text-center leading-tight">{t('plans.tablePro')}</span>
        </div>
        {rows.map((row, i) => (
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
          <span className="text-[13px] font-semibold text-paper/70">{t('plans.tablePrice')}</span>
          <div className="text-center">
            <p className="font-numbers text-[15px] font-normal text-gold leading-tight">0</p>
            <p className="text-paper/45 text-[9px]">{t('plans.perMonth')}</p>
          </div>
          <div className="text-center">
            <p className="font-numbers text-[15px] font-normal text-gold leading-tight">19,90</p>
            <p className="text-paper/45 text-[9px]">{t('plans.perMonth')}</p>
          </div>
        </div>
        <p className="px-4 py-2.5 text-[10px] text-ink/40 bg-offWhite">
          {t('plans.tableAnnualNoteMobile')}
        </p>
      </div>

      {/* ── Desktop table ── */}
      <div className="hidden md:block overflow-x-auto rounded-[18px] border border-border shadow-soft">
        <table className="w-full min-w-[520px]">
          <thead>
            <tr className="bg-offWhite border-b border-border">
              <th className="text-left px-5 py-4 text-[13px] font-semibold text-ink/50 font-body">
                {t('plans.tableFeature')}
              </th>
              <th className="px-5 py-4 text-center text-[13px] font-semibold text-coffee font-body">
                {t('plans.tableFreeFull')}
              </th>
              <th className="px-5 py-4 text-center text-[13px] font-semibold text-coffee font-body">
                {t('plans.tableProFull')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
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
              <td className="px-5 py-4 text-[13px] font-semibold text-paper/80 font-body">{t('plans.tablePrice')}</td>
              <td className="px-5 py-4 text-center">
                <span className="font-numbers text-[22px] font-normal text-gold leading-none">0</span>
                <span className="text-paper/60 text-xs ml-1">{t('plans.perMonth')}</span>
              </td>
              <td className="px-5 py-4 text-center">
                <span className="font-numbers text-[22px] font-normal text-gold leading-none">19,90</span>
                <span className="text-paper/60 text-xs ml-1">{t('plans.perMonth')}</span>
              </td>
            </tr>
          </tbody>
        </table>
        <p className="px-5 py-3 text-[11px] text-ink/40 bg-offWhite rounded-b-[18px]">
          {t('plans.tableAnnualNoteDesktop')}
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
        type="button"
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

export default function PlansContent() {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual')
  const t = useTranslations()
  const locale = useLocale() as AppLocale
  const content = PLANS_CONTENT[locale]

  const monthlyPrice = '19,90'
  const annualMonthly = '15,75'
  const annualTotal = '189,00'

  return (
    <div className="flex flex-col bg-paper min-h-screen">
      <PublicNavbar color="sidebar" showWordmark={false} />

      {/* ── Page header ──────────────────────────────────────────── */}
      <section className="pt-28 pb-10 md:pt-36 md:pb-14 px-5 text-center">
        <p className="text-[11px] tracking-[0.2em] uppercase text-gold font-semibold mb-4">
          {t('plans.kicker')}
        </p>
        <h1 className="font-serif font-light text-[34px] md:text-[54px] text-coffee leading-[1.05] mb-4">
          {t('plans.heroTitle')}
        </h1>
        <p className="text-ink/55 text-[15px] md:text-[18px] font-light leading-relaxed mb-8 max-w-lg mx-auto">
          {t('plans.heroSubtitle')}
        </p>
        <p className="text-[11px] tracking-[0.18em] uppercase text-ink/35 font-semibold mb-3">
          {t('plans.billingLabel')}
        </p>
        <PlanToggle value={billing} onChange={setBilling} t={t} />
      </section>

      {/* ── Plan cards ───────────────────────────────────────────── */}
      <section className="px-5 pb-16 md:px-12">
        <div className="max-w-5xl mx-auto grid gap-4 md:grid-cols-3 md:gap-6">

          {/* Free */}
          <div className="flex flex-col rounded-[22px] border border-border bg-offWhite p-6 md:p-8 shadow-soft">
            <h2 className="font-serif text-[24px] text-coffee mb-1">{t('plans.freeTitle')}</h2>
            <p className="text-sm text-ink/55 mb-5">{t('plans.freeSubtitle')}</p>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="text-base text-coffee/60">R$</span>
              <span className="font-numbers text-[48px] font-normal leading-none text-coffee" style={{ fontVariantNumeric: 'tabular-nums' }}>
                0
              </span>
              <span className="text-base text-coffee/60">{t('plans.perMonth')}</span>
            </div>
            <p className="text-[13px] text-ink/45 mb-6">{t('plans.freeNote')}</p>
            <ul className="flex flex-col gap-2 text-sm text-ink/70 mb-7 flex-1">
              {content.freeBullets.map((b) => (
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
              {t('plans.createFreeAccount')}
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
            <h2 className="font-serif text-[24px] text-coffee mb-1">{t('plans.monthlyProTitle')}</h2>
            <p className="text-sm text-ink/55 mb-5">{t('plans.monthlyProSubtitle')}</p>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="text-base text-coffee/60">R$</span>
              <span className="font-numbers text-[48px] font-normal leading-none text-coffee" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {monthlyPrice}
              </span>
              <span className="text-base text-coffee/60">{t('plans.perMonth')}</span>
            </div>
            <p className="text-[13px] text-ink/45 mb-6">{t('plans.monthlyProNote')}</p>
            <ul className="flex flex-col gap-2 text-sm text-ink/70 mb-7 flex-1">
              {content.monthlyProBullets.map((b) => (
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
              {t('plans.subscribeMonthly')}
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
              {t('plans.mostChosen')}
            </div>
            <h2 className={`font-serif text-[24px] mb-1 ${billing === 'annual' ? 'text-gold' : 'text-coffee'}`}>
              {t('plans.annualProTitle')}
            </h2>
            <p className={`text-sm mb-5 ${billing === 'annual' ? 'text-paper/55' : 'text-ink/55'}`}>
              {t('plans.annualProSubtitle')}
            </p>
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className={`text-base ${billing === 'annual' ? 'text-paper/60' : 'text-coffee/60'}`}>R$</span>
              <span
                className={`font-numbers text-[48px] font-normal leading-none ${billing === 'annual' ? 'text-paper' : 'text-coffee'}`}
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {annualMonthly}
              </span>
              <span className={`text-base ${billing === 'annual' ? 'text-paper/60' : 'text-coffee/60'}`}>{t('plans.perMonth')}</span>
            </div>
            <p className={`text-[13px] mb-6 ${billing === 'annual' ? 'text-paper/45' : 'text-ink/45'}`}>
              {t('plans.annualProNote', { total: annualTotal })}
            </p>
            <ul className={`flex flex-col gap-2 text-sm mb-7 flex-1 ${billing === 'annual' ? 'text-paper/75' : 'text-ink/70'}`}>
              {content.annualProBullets.map((b) => (
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
              {t('plans.subscribeAnnual')}
            </Link>
          </div>
        </div>

        {/* Trust strip */}
        <div className="max-w-3xl mx-auto mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13px] text-ink/50">
          <span className="flex items-center gap-1.5"><Check size={13} className="text-olive" /> {t('plans.trustNoCard')}</span>
          <span className="flex items-center gap-1.5"><Check size={13} className="text-olive" /> {t('plans.trustCancelAnytime')}</span>
          <span className="flex items-center gap-1.5"><Check size={13} className="text-olive" /> {t('plans.trustUnlimitedMembers')}</span>
          <span className="flex items-center gap-1.5"><Check size={13} className="text-olive" /> {t('plans.trustSecureData')}</span>
        </div>
      </section>

      {/* ── Feature comparison ───────────────────────────────────── */}
      <section className="bg-offWhite px-5 py-12 md:py-20 md:px-12">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif font-light text-[26px] md:text-[40px] text-coffee text-center mb-3">
            {t('plans.includedTitle')}
          </h2>
          <p className="text-center text-ink/50 text-[14px] md:text-[16px] font-light mb-8 md:mb-10">
            {t('plans.includedSubtitle')}
          </p>
          <ComparisonTable rows={content.comparisonRows} t={t} />
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────── */}
      <section className="px-5 py-12 md:py-20 md:px-12">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-serif font-light text-[26px] md:text-[40px] text-coffee text-center mb-3">
            {t('plans.faqTitle')}
          </h2>
          <p className="text-center text-ink/50 text-[14px] font-light mb-10">
            {t('plans.faqSubtitle')}
          </p>
          <div className="rounded-[18px] border border-border bg-offWhite px-5 md:px-7 shadow-soft">
            {content.faqItems.map((item) => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
          <p className="mt-6 text-center text-[13px] text-ink/50">
            {t('plans.otherQuestions')}{' '}
            <a
              href="mailto:contato@florim.app"
              className="text-gold hover:underline underline-offset-2 transition-vintage"
            >
              {t('plans.writeToUs')}
            </a>
          </p>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────── */}
      <section className="bg-sidebar px-5 py-14 md:py-20 md:px-12">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="font-serif font-light text-[28px] md:text-[42px] text-paper mb-4 leading-[1.1]">
            {t('plans.finalCtaTitle')}
          </h2>
          <p className="text-paper/55 text-[14px] md:text-[16px] font-light mb-8">
            {t('plans.finalCtaSubtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="px-8 py-4 rounded-full bg-gold text-sidebar font-bold text-[15px] hover:opacity-90 transition-vintage shadow-vintage text-center"
            >
              {t('plans.createFreeAccount')}
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 rounded-full border border-paper/30 text-paper font-semibold text-[15px] hover:bg-paper/10 transition-vintage text-center"
            >
              {t('plans.alreadyHaveAccount')}
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter color="sidebar" />
    </div>
  )
}
