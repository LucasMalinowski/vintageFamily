'use client'

import { useEffect, useMemo, useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import PlanCheckout from '@/components/billing/PlanCheckout'
import { getAuthBearerToken } from '@/lib/billing/client'

type PlanSetting = {
  plan_code: 'standard_monthly' | 'standard_yearly' | 'founders_yearly'
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

export default function PricingPage() {
  const [plans, setPlans] = useState<PlanSetting[]>([])
  const [foundersEligible, setFoundersEligible] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanSetting['plan_code'] | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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

      setPlans((payload?.plans || []).filter((plan: PlanSetting) => plan.is_visible))
      setFoundersEligible(Boolean(payload?.founders_eligible))
      setLoading(false)
    }

    load()
  }, [])

  const visiblePlans = useMemo(() => plans, [plans])

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
                  const isFounders = plan.plan_code === 'founders_yearly'
                  const foundersLocked = isFounders && !foundersEligible

                  return (
                    <div
                      key={plan.plan_code}
                      className="flex h-full flex-col rounded-[18px] border border-border bg-offWhite px-6 py-6 text-coffee shadow-soft"
                    >
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-serif text-2xl text-sidebar">{content.name}</h3>
                          {isFounders ? (
                            <span className="rounded-full border border-gold px-2 py-1 text-xs text-gold">
                              Founders
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 min-h-[44px] text-sm text-ink/55">{content.teaser}</p>
                        <div className="mt-6 flex items-end justify-center text-coffee/60">
                          <span>R$</span>
                          <span className="ml-2 text-4xl font-normal leading-none text-sidebar">{content.price}</span>
                          <span className="ml-2 text-base">{content.period}</span>
                        </div>
                        <p className="mt-4 min-h-[28px] text-center text-sm text-ink/60">
                          {!plan.is_active
                            ? 'Plano indisponível no momento.'
                            : foundersLocked
                              ? 'Disponível apenas para usuários elegíveis.'
                              : '14 dias grátis. Cancele quando quiser.'}
                        </p>
                      </div>
                      <button
                        disabled={!plan.is_active || foundersLocked}
                        onClick={() => setSelectedPlan(plan.plan_code)}
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

              {selectedPlan ? (
                <div className="rounded-vintage border border-border bg-bg p-6 shadow-vintage">
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
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
