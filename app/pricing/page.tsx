'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import PlanCheckout from '@/components/billing/PlanCheckout'
import { getAuthBearerToken } from '@/lib/billing/client'
import { posthog } from '@/lib/posthog'
import { EVENTS } from '@/components/PostHogProvider'

type PlanSetting = {
  plan_code: 'standard_monthly' | 'standard_yearly' | 'founders_monthly' | 'founders_yearly'
  is_visible: boolean
  is_active: boolean
}

type PlanContent = {
  name: string
  teaser: string
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
    price: '19,90',
    period: '/ mês',
    benefitsTitle: 'Benefícios:',
    benefits: [
      'Controle ilimitado de contas a pagar e a receber',
      'Organização de sonhos e poupanças',
      'Visão clara de saldo mensal',
      'Comparativos históricos completos',
      'WhatsApp ilimitado + consultas com IA',
      'Importação e exportação ilimitadas',
    ],
    quote: 'Menos do que um café por semana. Mais do que uma planilha.',
  },
  standard_yearly: {
    name: 'Plano Anual',
    teaser: 'Para famílias que desejam compromisso e continuidade.',
    price: '189,00',
    period: '/ ano',
    benefitsTitle: 'Benefícios:',
    benefits: [
      'Equivalente a R$ 15,75/mês',
      'Economia de R$ 49,80 no ano',
      'Prioridade em novas funcionalidades',
      'Atualizações contínuas',
      'Estabilidade no valor durante o contrato',
    ],
    quote: 'Um pequeno investimento para cuidar do que sustenta a casa.',
  },
  founders_monthly: {
    name: 'Plano Fundadores Mensal',
    teaser: 'Exclusivo para famílias selecionadas.',
    price: '14,90',
    period: '/ mês',
    benefitsTitle: 'Benefícios especiais:',
    benefits: [
      'Valor promocional vitalício',
      'Acesso antecipado a novidades',
      'Participação na evolução do sistema',
      'Reconhecimento como usuário fundador',
    ],
    quote: 'Quem chega primeiro, constrói junto.',
  },
  founders_yearly: {
    name: 'Plano Fundadores Anual',
    teaser: 'Exclusivo para famílias selecionadas.',
    price: '149,00',
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
  'Feito para famílias',
]

export default function PricingPage() {
  const router = useRouter()
  const [plans, setPlans] = useState<PlanSetting[]>([])
  const [foundersEligible, setFoundersEligible] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanSetting['plan_code'] | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [waitingForActivation, setWaitingForActivation] = useState(false)
  const [activationMessage, setActivationMessage] = useState('Confirmando seus dados...')

  useEffect(() => {
    const load = async () => {
      const token = await getAuthBearerToken()

      if (!token) {
        setMessage('Sessão inválida. Faça login novamente.')
        setLoading(false)
        return
      }

      const response = await fetch('/api/billing/eligibility', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        setMessage(payload?.error || 'Não foi possível carregar os planos.')
        setLoading(false)
        return
      }

      const foundersOk = Boolean(payload?.founders_eligible)
      setFoundersEligible(foundersOk)
      setPlans(
        (payload?.plans || []).filter((plan: PlanSetting) => {
          if (!plan.is_visible) return false
          if (plan.plan_code.startsWith('founders')) return foundersOk
          return true
        }),
      )
      setLoading(false)
      posthog.capture(EVENTS.PRICING_PAGE_VIEWED)
    }

    load()
  }, [])

  useEffect(() => {
    if (!waitingForActivation) return

    let cancelled = false

    const poll = async () => {
      const token = await getAuthBearerToken()

      if (!token) {
        if (!cancelled) {
          setActivationMessage('Sessão inválida. Faça login novamente.')
          setWaitingForActivation(false)
        }
        return
      }

      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (cancelled) return

        const response = await fetch('/api/billing/checkout-status', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const payload = await response.json().catch(() => null)

        if (response.ok && payload?.ready) {
          router.push('/inicio')
          return
        }

        if (!response.ok) {
          setActivationMessage(payload?.error || 'Falha ao confirmar a assinatura.')
          setWaitingForActivation(false)
          return
        }

        await new Promise((resolve) => {
          window.setTimeout(resolve, 2000)
        })
      }

      if (!cancelled) {
        setActivationMessage('Pagamento confirmado, mas a sincronização ainda está pendente. Tente novamente em alguns instantes.')
        setWaitingForActivation(false)
      }
    }

    poll()

    return () => {
      cancelled = true
    }
  }, [router, waitingForActivation])

  const visiblePlans = useMemo(() => plans, [plans])
  const selectedPlanContent = selectedPlan ? PLAN_CONTENT[selectedPlan] : null

  return (
    <AppLayout>
      <div className="min-h-screen flex flex-col">
        <Topbar
          title="Planos"
          subtitle="Escolha o plano que melhor acompanha o ritmo da sua família."
          variant="textured"
        />

        <div className="flex-1 px-6 pb-6">
          {message ? <p className="mb-6 text-sm text-red-700">{message}</p> : null}

          {loading ? (
            <div className="py-12 text-center text-ink/60">Carregando...</div>
          ) : (
            <div className="space-y-8">
              <div className="grid gap-5 xl:grid-cols-3">
                {visiblePlans.map((plan) => {
                  const content = PLAN_CONTENT[plan.plan_code]
                  const isFounders = plan.plan_code.startsWith('founders')

                  return (
                    <div
                      key={plan.plan_code}
                      className="flex h-full flex-col rounded-[18px] border border-border bg-offWhite px-6 py-6 text-coffee shadow-soft"
                    >
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-serif text-2xl text-sidebar">{content.name}</h3>
                          {isFounders ? (
                            <span className="rounded-full border border-gold px-2 py-1 text-xs text-gold">Fundadores</span>
                          ) : null}
                        </div>
                        <p className="mt-3 min-h-[44px] text-sm text-ink/55">{content.teaser}</p>
                        <div className="mt-6 flex items-end justify-center text-coffee/60">
                          <span>R$</span>
                          <span className="ml-2 text-4xl font-normal leading-none text-sidebar">{content.price}</span>
                          <span className="ml-2 text-base">{content.period}</span>
                        </div>
                        <p className="mt-4 min-h-[28px] text-center text-sm text-ink/60">
                          {plan.is_active ? '30 dias grátis. Cancele quando quiser.' : 'Plano indisponível no momento.'}
                        </p>
                      </div>
                      <button
                        disabled={!plan.is_active}
                        onClick={() => {
                          posthog.capture(EVENTS.CHECKOUT_STARTED, { plan_code: plan.plan_code })
                          setSelectedPlan(plan.plan_code)
                        }}
                        className="mt-6 w-full rounded-full bg-sidebar px-4 py-3 text-sm font-semibold text-white transition-vintage hover:bg-olive/90 disabled:opacity-60"
                      >
                        Assinar
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                {visiblePlans.map((plan) => {
                  const content = PLAN_CONTENT[plan.plan_code]

                  return (
                    <div key={`${plan.plan_code}-benefits`} className="rounded-[18px] border border-border bg-bg p-5">
                      <div className="mb-3 font-medium text-coffee">{content.benefitsTitle}</div>
                      <ul className="space-y-2 text-sm text-ink/70">
                        {content.benefits.map((benefit) => (
                          <li key={benefit}>• {benefit}</li>
                        ))}
                      </ul>
                    </div>
                  )
                })}
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {visiblePlans.map((plan) => (
                  <div
                    key={`${plan.plan_code}-quote`}
                    className="rounded-[18px] bg-paper px-5 py-6 text-center font-serif text-lg italic text-gold/80 shadow-soft"
                  >
                    {PLAN_CONTENT[plan.plan_code].quote}
                  </div>
                ))}
              </div>

              <div className="rounded-[18px] border border-border bg-offWhite px-6 py-8 shadow-soft">
                <div className="mb-6 text-center font-serif text-[34px] text-coffee">Benefícios-chave</div>
                <div className="flex flex-wrap justify-center gap-3">
                  {KEY_BENEFITS.map((item) => (
                    <div
                      key={item}
                      className="w-full rounded-full bg-paper py-2 text-center text-[15px] text-coffee sm:w-[calc(50%-0.75rem)] xl:w-[calc(33.333%-0.75rem)]"
                    >
                      ✓ {item}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>

        {selectedPlan && selectedPlanContent ? (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 px-4 py-6 backdrop-blur-sm">
            <div className="w-full max-w-2xl overflow-hidden rounded-[24px] border border-border bg-bg shadow-vintage">
              <div className="border-b border-border bg-offWhite px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-coffee/55">Checkout</p>
                    <h3 className="mt-1 text-2xl font-serif text-coffee">{selectedPlanContent.name}</h3>
                    <p className="mt-2 text-sm text-ink/65">{selectedPlanContent.teaser}</p>
                  </div>
                  <button
                    className="rounded-full border border-border px-3 py-2 text-sm text-ink/70 transition-vintage hover:bg-paper"
                    onClick={() => setSelectedPlan(null)}
                  >
                    Fechar
                  </button>
                </div>
                <div className="mt-4 inline-flex items-end rounded-full bg-paper px-4 py-2 text-coffee/70">
                  <span className="text-sm">R$</span>
                  <span className="ml-2 text-3xl leading-none text-sidebar">{selectedPlanContent.price}</span>
                  <span className="ml-2 text-sm">{selectedPlanContent.period}</span>
                </div>
              </div>

              <div className="px-6 py-6">
                <PlanCheckout
                  planCode={selectedPlan}
                  onCancel={() => setSelectedPlan(null)}
                  onSuccess={() => {
                    posthog.capture(EVENTS.CHECKOUT_COMPLETED, { plan_code: selectedPlan })
                    setSelectedPlan(null)
                    setActivationMessage('Confirmando seus dados...')
                    setWaitingForActivation(true)
                  }}
                />
              </div>
            </div>
          </div>
        ) : null}

        {waitingForActivation ? (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/35 px-4 py-6 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-[24px] border border-border bg-bg px-8 py-10 text-center shadow-vintage">
              <div className="mx-auto mb-5 h-12 w-12 rounded-full border-4 border-sidebar/20 border-t-sidebar animate-spin" />
              <h3 className="text-2xl font-serif text-coffee">Ativando assinatura</h3>
              <p className="mt-3 text-sm text-ink/65">{activationMessage}</p>
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  )
}
