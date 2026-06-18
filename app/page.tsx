import type { Metadata } from 'next'
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
  Lightbulb,
  Repeat2,
  WandSparkles,
  Tags,
} from 'lucide-react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'
import Typewriter from '@/components/Typewriter'
import { getUserLocale } from '@/lib/i18n/getLocale'

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getUserLocale()
  const msgs = (await import(`@/messages/${locale}.json`)).default as any
  const s = msgs.seo.landing
  return {
    title: { absolute: s.title },
    description: s.description,
    alternates: { canonical: '/' },
    openGraph: {
      title: s.ogTitle,
      description: s.ogDescription,
      url: 'https://florim.app',
    },
  }
}

const FEATURE_ICONS = [
  BanknoteArrowDown,
  BanknoteArrowUp,
  PiggyBank,
  ChartColumnBig,
  Lightbulb,
  Tags,
  Repeat2,
  Bell,
  Users,
  FileUp,
  WandSparkles,
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

function WhatsAppMockup({ msgs }: { msgs: { msg1User: string; msg1Bot: string; msg2User: string; msg2Bot: string; msg3User: string; msg3Bot: string } }) {
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
          <WaMessage from="user" text={msgs.msg1User} time="09:41" />
          <WaMessage from="bot" text={msgs.msg1Bot} time="09:41" />
          <WaMessage from="user" text={msgs.msg2User} time="09:43" />
          <WaMessage from="bot" text={msgs.msg2Bot} time="09:43" />
          <WaMessage from="user" text={msgs.msg3User} time="09:45" />
          <WaMessage from="bot" text={msgs.msg3Bot} time="09:45" />
        </div>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function Home() {
  const locale = await getUserLocale()
  const msgs = (await import(`@/messages/${locale}.json`)).default as any
  const L = msgs.landing

  const PROBLEMS: Array<{ headline: string; body: string }> = L.problems.items
  const WA_EXAMPLES: Array<{ msg: string; result: string }> = L.whatsapp.examples
  const FEATURES: Array<{ title: string; copy: string }> = L.features.items
  const STEPS: Array<{ number: string; title: string; body: string }> = L.howItWorks.steps
  const PLANS: Array<{ name: string; tag: string; price: string; per: string; featured: boolean; savingsBadge: string | null; bullets: string[] }> = [
    { ...L.pricing.plans[0], featured: false },
    { ...L.pricing.plans[1], featured: false },
    { ...L.pricing.plans[2], featured: true },
  ]

  return (
    <main className="flex flex-col">

      {/* ── 1. Hero ────────────────────────── bg-paper ────────── */}
      <div className="relative overflow-hidden bg-paper h-[440px] md:h-[88vh]">
        <PublicNavbar color="sidebar" showWordmark={false} />

        {/* Mobile - full-bleed video */}
        <div className="md:hidden absolute inset-0 flex flex-col justify-end px-7 pb-10">
          <video
            className="absolute inset-0 w-full h-full object-cover"
            autoPlay muted loop playsInline
            src="/main-video.mp4"
            aria-label={L.hero.videoAlt}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/35 to-transparent" />
          <div className="relative z-10">
            <h1 className="font-serif font-light text-[36px] leading-[1.05] text-paper mb-3">
              {L.hero.title}
            </h1>
            <p className="text-paper/80 text-[14px] leading-relaxed mb-6">
              {L.hero.subtitleMobile}
            </p>
            <div className="flex gap-[10px]">
              <Link href="/signup" className="px-5 py-3 rounded-full bg-gold text-paper font-bold text-[14px] hover:opacity-90 transition-vintage">
                {L.hero.ctaPrimary}
              </Link>
              <Link href="/plans" className="px-5 py-3 rounded-full border-[1.5px] border-paper/60 text-paper text-[14px] hover:bg-white/10 transition-vintage">
                {L.hero.ctaSecondary}
              </Link>
            </div>
          </div>
        </div>

        {/* Desktop - two-column */}
        <div className="hidden md:grid h-full lg:grid-cols-[2fr,1fr]">
          <section className="bg-paper flex flex-col justify-center pt-[52px] pb-12 pl-24 pr-12 lg:pl-32 lg:pr-16">
            <div className="max-w-[560px]">
              <p className="text-[11px] tracking-[0.2em] uppercase text-gold font-semibold mb-4">
                {L.hero.label}
              </p>
              <h1 className="font-serif font-light text-[54px] leading-[1.04] text-sidebar mb-5 tracking-tight">
                {L.hero.title}
              </h1>
              <p className="text-sidebar/70 font-light text-[17px] leading-relaxed mb-7 max-w-[440px]">
                {L.hero.subtitle}
              </p>
              <div className="flex gap-3 mb-7">
                <Link href="/signup" className="px-7 py-3.5 rounded-full bg-gold text-coffee font-semibold text-[15px] hover:opacity-90 transition-vintage">
                  {L.hero.ctaPrimary}
                </Link>
                <Link href="/plans" className="px-7 py-3.5 rounded-full bg-sidebar text-paper font-semibold text-[15px] hover:bg-sidebar/80 transition-vintage">
                  {L.hero.ctaSecondary}
                </Link>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-sidebar/50">
                <span className="flex items-center gap-1.5"><Check size={13} className="text-olive" />{L.hero.check1}</span>
                <span className="flex items-center gap-1.5"><Check size={13} className="text-olive" />{L.hero.check2}</span>
                <span className="flex items-center gap-1.5"><Check size={13} className="text-olive" />{L.hero.check3}</span>
              </div>
            </div>
          </section>
          <section className="relative h-full">
            <video className="h-full w-full object-cover" autoPlay muted loop playsInline src="/about-video.mp4" aria-label={L.hero.videoAltDesktop} />
          </section>
        </div>
      </div>

      {/* ── 2. Problems ────────────────────── bg-sidebar ──────── */}
      <section className="bg-sidebar py-12 px-5 md:py-20 md:px-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif font-light text-[26px] md:text-[42px] text-paper text-center mb-3 md:mb-4">
            {L.problems.title}
          </h2>
          <p className="text-center text-paper/50 text-[13px] md:text-[17px] font-light mb-8 md:mb-12">
            {L.problems.subtitle}
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
                  {L.whatsapp.badge}
                </span>
              </div>
              <h2 className="font-serif font-light text-[28px] md:text-[42px] text-coffee leading-[1.08] mb-4">
                {L.whatsapp.title}
              </h2>
              <p className="text-[14px] md:text-[16px] font-light text-ink/65 leading-relaxed mb-7">
                {L.whatsapp.body}
              </p>
              <ul className="space-y-3">
                {WA_EXAMPLES.map(({ msg, result }: { msg: string; result: string }) => (
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
                {L.whatsapp.footnote}
              </p>
            </div>

            {/* Phone mockup */}
            <WhatsAppMockup msgs={L.whatsapp.mockup} />
          </div>
        </div>
      </section>

      {/* ── 4. Features ────────────────────── bg-sidebar ──────── */}
      <section id="features" className="bg-sidebar py-12 px-5 md:py-24 md:px-12">
        <div className="max-w-6xl mx-auto">
          <h2 className="font-serif font-light text-[26px] md:text-[44px] text-paper text-center mb-3 md:mb-4">
            {L.features.title}
          </h2>
          <p className="text-center text-paper/50 text-[13px] md:text-[17px] font-light mb-8 md:mb-14">
            {L.features.subtitle}
          </p>
          <div className="flex flex-col gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-5">
            {FEATURES.map((f, i) => {
              const Icon = FEATURE_ICONS[i] ?? BanknoteArrowDown
              return (
                <div
                  key={f.title}
                  className="flex items-start gap-4 md:flex-col bg-paper border border-paper/20 rounded-[14px] md:rounded-vintage p-4 md:p-6 shadow-soft"
                >
                  <div className="w-10 h-10 rounded-xl bg-sidebar/10 flex items-center justify-center text-coffee shrink-0 md:mb-3">
                    <Icon size={18} />
                  </div>
                  <div>
                    <h3 className="font-serif text-[15px] md:text-[18px] font-normal text-ink mb-1 md:mb-2">
                      {f.title}
                    </h3>
                    <p className="text-[12px] md:text-[13px] text-ink/55 leading-relaxed">{f.copy}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── 5. How it works ─────────────────── bg-paper ─────────── */}
      <section className="bg-paper py-12 px-5 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif font-light text-[26px] md:text-[44px] text-coffee text-center mb-3 md:mb-4">
            {L.howItWorks.title}
          </h2>
          <p className="text-center text-ink/50 text-[13px] md:text-[17px] font-light mb-8 md:mb-14">
            {L.howItWorks.subtitle}
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
              {L.howItWorks.cta} <ArrowRight size={16} />
            </Link>
            <p className="mt-3 text-[12px] text-ink/40">{L.howItWorks.ctaFootnote}</p>
          </div>
        </div>
      </section>

      {/* ── 6. Pricing teaser ───────────────── bg-sidebar ──────── */}
      <section className="bg-sidebar py-12 px-5 md:py-24 md:px-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif font-normal text-[26px] md:text-[44px] text-gold text-center mb-2 md:mb-3">
            {L.pricing.title}
          </h2>
          <p className="text-center text-paper/50 text-[13px] md:text-[16px] font-light mb-8 md:mb-12">
            {L.pricing.subtitle}
          </p>
          <div className="flex flex-col gap-3 md:grid md:grid-cols-3 md:gap-5">
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
                    {L.pricing.featured}
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
                  {p.bullets.map((b: string) => (
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
                  {L.pricing.ctaButton}
                </Link>
              </div>
            ))}
          </div>
          <p className="text-center mt-6 md:mt-8">
            <Link href="/plans" className="text-gold/65 text-[13px] hover:text-gold transition-vintage underline underline-offset-2">
              {L.pricing.seeAll}
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
                {L.origin.label}
              </p>
              <h2 className="font-serif font-light text-[26px] md:text-[36px] text-coffee leading-[1.1]">
                {L.origin.title}
              </h2>
            </div>
            <div>
              <p className="text-[14px] md:text-[16px] font-light text-ink/60 leading-relaxed mb-4">
                {L.origin.body1}
              </p>
              <p className="text-[14px] md:text-[16px] font-light text-ink/60 leading-relaxed mb-6">
                {L.origin.body2}
              </p>
              <p className="font-ptSerif italic text-[16px] md:text-[20px] text-gold leading-relaxed min-h-[3em]">
                &ldquo;<Typewriter
                  texts={L.origin.quote}
                  speedMs={45}
                  pauseMs={4000}
                  startDelay={300}
                />&rdquo;
              </p>
              <p className="mt-3 text-[11px] tracking-widest uppercase text-ink/35">
                {L.origin.founders}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 8. Final CTA ────────────────────── bg-sidebar ──────── */}
      <section className="bg-sidebar py-16 px-5 md:py-20 md:px-12">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="font-serif font-light text-[30px] md:text-[44px] text-paper mb-4 leading-[1.1]">
            {L.finalCta.title}
          </h2>
          <p className="text-paper/80 text-[14px] md:text-[16px] font-light leading-relaxed mb-8">
            {L.finalCta.subtitle}
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-full bg-gold text-sidebar font-bold text-[16px] hover:opacity-90 transition-vintage shadow-vintage"
          >
            {L.finalCta.button}
          </Link>
        </div>
      </section>

      <PublicFooter color="sidebar" />
    </main>
  )
}
