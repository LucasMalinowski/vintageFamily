'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import PlanCheckout from '@/components/billing/PlanCheckout'
import PublicNavbar from '@/components/layout/PublicNavbar'
import { getAuthBearerToken } from '@/lib/billing/client'

type PlanSetting = {
  plan_code: 'standard_monthly' | 'standard_yearly' | 'founders_yearly'
  is_visible: boolean
  is_active: boolean
}

type PlanContent = {
  name: string
  teaser: string
  pricePrefix: string
  price: string
  period: string
  benefitsTitle: string
  benefits: string[]
  quote: string
}

const PLAN_CONTENT: Record<PlanSetting['plan_code'], PlanContent> = {
  standard_monthly: {
    name: 'Plano Mensal',
    teaser: 'Ideal para quem quer começar com flexibilidade.',
    pricePrefix: 'R$',
    price: '29,90',
    period: '/ mês',
    benefitsTitle: 'Benefícios:',
    benefits: [
      'Controle de contas a pagar e a receber',
      'Organização de sonhos e poupanças',
      'Visão clara de saldo mensal',
      'Comparativos financeiros',
      'Interface intuitiva e acolhedora',
      'Acesso completo ao sistema',
    ],
    quote: 'Menos do que um jantar fora. Mais do que uma planilha.',
  },
  standard_yearly: {
    name: 'Plano Anual',
    teaser: 'Para famílias que desejam compromisso e continuidade.',
    pricePrefix: 'R$',
    price: '299,00',
    period: '/ ano',
    benefitsTitle: 'Benefícios:',
    benefits: [
      'Equivalente a R$ 24,90/mês',
      'Economia de dois meses',
      'Prioridade em novas funcionalidades',
      'Atualizações contínuas',
      'Estabilidade no valor durante o contrato',
    ],
    quote: 'Um pequeno investimento para cuidar do que sustenta a casa.',
  },
  founders_yearly: {
    name: 'Plano Fundadores',
    teaser: 'Exclusivo para os primeiros usuários do Florim.',
    pricePrefix: 'R$',
    price: '199,00',
    period: '/ ano',
    benefitsTitle: 'Benefícios especiais:',
    benefits: [
      'Valor promocional vitalício',
      'Acesso antecipado a novidades',
      'Participação na evolução do sistema',
      'Reconhecimento como usuário fundador',
    ],
    quote: 'Quem chega primeiro, constrói junto.',
  },
}

const KEY_BENEFITS = [
  'Clareza financeira no dia a dia',
  'Menos conflitos, mais alinhamento',
  'Organização sem pressão',
  'Tecnologia com sensibilidade',
  'Feito para famílias reais',
]

export default function PricingExperience({
  showIntro,
  requireAuth,
}: {
  showIntro: boolean
  requireAuth: boolean
}) {
  const router = useRouter()
  const [step, setStep] = useState<'intro' | 'plans'>(showIntro ? 'intro' : 'plans')
  const [plans, setPlans] = useState<PlanSetting[]>([])
  const [foundersEligible, setFoundersEligible] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanSetting['plan_code'] | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    setStep(showIntro ? 'intro' : 'plans')
  }, [showIntro])

  useEffect(() => {
    const load = async () => {
      const token = await getAuthBearerToken()
      const authenticated = Boolean(token)

      setIsAuthenticated(authenticated)

      if (!authenticated) {
        if (requireAuth) {
          router.replace('/plans')
          return
        }

        setMessage('Faça login para contratar um plano.')
      } else {
        setMessage(null)
      }

      const eligibilityPromise = fetch(
        '/api/billing/eligibility',
        token
          ? {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          : undefined,
      )

      const billingPromise = token
        ? fetch('/api/billing/me', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          })
        : Promise.resolve(null)

      const [eligibilityResponse, billingResponse] = await Promise.all([eligibilityPromise, billingPromise])
      const eligibilityPayload = await eligibilityResponse.json().catch(() => null)

      if (!eligibilityResponse.ok) {
        setMessage(eligibilityPayload?.error || 'Não foi possível carregar os planos.')
        return
      }

      setPlans((eligibilityPayload.plans || []).filter((plan: PlanSetting) => plan.is_visible))
      setFoundersEligible(Boolean(eligibilityPayload.founders_eligible))

      if (!billingResponse) {
        return
      }

      const billingPayload = await billingResponse.json().catch(() => null)

      if (!billingResponse.ok) {
        setMessage(billingPayload?.error || 'Nao foi possivel verificar o acesso.')
        return
      }

      if (!requireAuth && billingPayload?.access?.hasAccess) {
        router.replace('/inicio')
      }
    }

    load()
  }, [requireAuth, router])

  const visiblePlans = useMemo(() => plans, [plans])

  const plansScreen = (
    <>
      <PublicNavbar color="paper" showWordmark={false} />
      <section className="min-h-screen overflow-y-auto bg-paper px-6 pt-32 text-coffee sm:px-12 lg:px-24 xl:px-48">
        <div className="mx-auto flex w-full max-w-6xl flex-col">
          <div className="grid grid-cols-[auto,1fr,auto] items-center">
            {showIntro ? (
              <button
                onClick={() => setStep('intro')}
                className="text-xs text-coffee/70 transition-vintage hover:text-coffee"
                aria-label="Voltar"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : (
              <div aria-hidden="true" />
            )}
            <div className="justify-self-center font-serif text-4xl text-coffee sm:text-5xl">Planos</div>
            <div aria-hidden="true" />
          </div>

          {message ? <p className="mt-8 text-sm text-red-700">{message}</p> : null}

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {visiblePlans.map((plan) => {
              const content = PLAN_CONTENT[plan.plan_code]
              const isFounders = plan.plan_code === 'founders_yearly'
              const foundersLocked = isFounders && !foundersEligible

              return (
                <div
                  key={plan.plan_code}
                  className="rounded-[22px] border border-paper-2/40 bg-paper/80 px-5 py-4 text-coffee shadow-soft"
                >
                  <div className="px-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h3 className="font-serif text-2xl text-gold">{content.name}</h3>
                    </div>
                    <p className="mb-4 text-sm text-lightGray">{content.teaser}</p>
                    <div className="flex items-center justify-center text-base text-coffee/60">
                      {content.pricePrefix}
                      <span className="ml-2 text-4xl font-normal text-coffee">{content.price}</span>
                      <span className="ml-2 text-base text-coffee/60">{content.period}</span>
                    </div>
                    <p className="mt-4 text-center text-sm text-coffee/60">
                      {!plan.is_active
                        ? 'Plano indisponível no momento.'
                        : foundersLocked
                          ? 'Disponível apenas para usuários elegíveis.'
                          : '14 dias grátis. Cancele quando quiser.'}
                    </p>
                    <button
                      disabled={!plan.is_active || foundersLocked}
                      onClick={() => {
                        if (!isAuthenticated) {
                          router.push('/login')
                          return
                        }

                        setSelectedPlan(plan.plan_code)
                      }}
                      className="mt-5 w-full rounded-full bg-gold px-4 py-3 text-sm font-semibold text-sidebar disabled:opacity-60"
                    >
                      {isAuthenticated ? 'Assinar' : 'Entrar para assinar'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-12 grid gap-6 text-base text-coffee/70 lg:grid-cols-3">
            {visiblePlans.map((plan) => {
              const content = PLAN_CONTENT[plan.plan_code]

              return (
                <div key={`${plan.plan_code}-benefits`}>
                  <div className="mb-2 font-medium text-coffee">{content.benefitsTitle}</div>
                  <ul className="space-y-2">
                    {content.benefits.map((benefit) => (
                      <li key={benefit}>• {benefit}</li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>

          <div className="mt-8 grid gap-6 text-center font-serif text-lg italic text-gold/70 lg:grid-cols-3">
            {visiblePlans.map((plan) => (
              <p key={`${plan.plan_code}-quote`} className="flex justify-center text-center">
                {PLAN_CONTENT[plan.plan_code].quote}
              </p>
            ))}
          </div>

          {!isAuthenticated ? (
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <Link
                href="/login"
                className="rounded-full bg-coffee px-5 py-3 text-sm font-semibold text-paper transition-vintage hover:opacity-90"
              >
                Entrar
              </Link>
              <Link
                href="/signup"
                className="rounded-full border border-coffee px-5 py-3 text-sm font-semibold text-coffee transition-vintage hover:bg-coffee hover:text-paper"
              >
                Criar conta
              </Link>
            </div>
          ) : null}

          <div className="mt-16 flex flex-col">
            <div className="mb-8 text-center font-serif text-[40px] text-coffee">Benefícios-chave</div>
            <div className="flex flex-wrap justify-center gap-3">
              {KEY_BENEFITS.map((item) => (
                <div
                  key={item}
                  className="w-full rounded-full bg-paper py-2 text-center text-[15px] text-coffee sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-0.75rem)]"
                >
                  ✓ {item}
                </div>
              ))}
            </div>
          </div>

          {selectedPlan ? (
            <div className="mt-12 rounded-vintage border border-border bg-bg p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-serif text-coffee">Checkout integrado</h3>
                <button className="text-sm text-ink/70" onClick={() => setSelectedPlan(null)}>
                  Fechar
                </button>
              </div>

              <PlanCheckout
                planCode={selectedPlan}
                onSuccess={() => {
                  setMessage('Assinatura criada com sucesso. A confirmação final vem via webhook.')
                  setSelectedPlan(null)
                }}
              />
            </div>
          ) : null}

          <div className="my-24 text-center font-serif text-base italic text-gold/70">
            Cuidar das finanças é cuidar da casa.
            <br />
            O Florim está aqui para ajudar nisso.
          </div>
        </div>
      </section>
    </>
  )

  if (!showIntro) {
    return <div className="min-h-screen bg-paper">{plansScreen}</div>
  }

  return (
    <div className={`relative min-h-screen bg-paper ${step === 'intro' ? 'overflow-hidden' : 'overflow-visible'}`}>
      <div
        className={`absolute inset-0 transition-all duration-500 ease-out ${
          step === 'intro'
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        }`}
      >
        <div className="grid min-h-screen lg:grid-cols-[1fr,2fr]">
          <section className="relative h-full min-h-[40vh] overflow-hidden bg-transparent">
            <video
              className="h-full w-full object-cover bg-transparent border-0 outline-none"
              autoPlay
              muted
              loop
              playsInline
              src="/plans-video.mp4"
            />
          </section>

          <section className="relative min-h-[60vh] bg-sidebar px-8 text-paper sm:px-12 lg:px-14">
            <img src="/logo-florim.png" alt="Florim" className="mt-16 h-40 w-40 object-contain" />
            <div className="absolute inset-0 flex items-center justify-center px-8 text-center sm:px-12 lg:px-14">
              <div className="w-full max-w-2xl border-l-4 border-paper/80 pl-6 pr-4 text-left">
                <div className="font-serif text-[22px] font-light leading-tight text-paper/90 sm:text-[24px] lg:text-[24px]">
                  <p className="mb-4">
                    O Florim foi pensado para caber no orçamento da casa e ser valioso o suficiente para
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
                className="rounded-full border border-gold px-6 py-3 text-sm font-semibold text-gold transition-vintage hover:bg-gold hover:text-sidebar"
              >
                Ver planos
              </button>
            </div>
          </section>
        </div>
      </div>

      <div
        className={`transition-all duration-500 ease-out ${
          step === 'plans'
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        {plansScreen}
      </div>
    </div>
  )
}
