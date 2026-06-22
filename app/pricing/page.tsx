'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import PlanCheckout from '@/components/billing/PlanCheckout'
import { getAuthBearerToken } from '@/lib/billing/client'
import { posthog } from '@/lib/posthog'
import { EVENTS } from '@/components/PostHogProvider'
import { useTranslations } from 'next-intl'

type PlanSetting = {
  plan_code: 'standard_monthly' | 'standard_yearly' | 'founders_monthly' | 'founders_yearly'
  is_visible: boolean
  is_active: boolean
}

export default function PricingPage() {
  const t = useTranslations('pricing')
  const router = useRouter()
  const [plans, setPlans] = useState<PlanSetting[]>([])
  const [foundersEligible, setFoundersEligible] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanSetting['plan_code'] | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [waitingForActivation, setWaitingForActivation] = useState(false)
  const [activationMessage, setActivationMessage] = useState('')

  useEffect(() => {
    setActivationMessage(t('confirming'))
  }, [t])

  useEffect(() => {
    const load = async () => {
      const token = await getAuthBearerToken()

      if (!token) {
        setMessage(t('errors.invalidSession'))
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
        setMessage(payload?.error || t('errors.loadError'))
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
  }, [t])

  useEffect(() => {
    if (!waitingForActivation) return

    let cancelled = false

    const poll = async () => {
      const token = await getAuthBearerToken()

      if (!token) {
        if (!cancelled) {
          setActivationMessage(t('errors.invalidSession'))
          setWaitingForActivation(false)
        }
        return
      }

      for (let attempt = 0; attempt < 20; attempt += 1) {
        if (cancelled) return

        const response = await fetch('/api/billing/checkout-status', {
          method: 'POST',
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
          setActivationMessage(payload?.error || t('errors.activationError'))
          setWaitingForActivation(false)
          return
        }

        await new Promise((resolve) => {
          window.setTimeout(resolve, 2000)
        })
      }

      if (!cancelled) {
        setActivationMessage(t('errors.activationPending'))
        setWaitingForActivation(false)
      }
    }

    poll()

    return () => {
      cancelled = true
    }
  }, [router, waitingForActivation, t])

  const visiblePlans = useMemo(() => plans, [plans])
  const selectedPlanContent = selectedPlan
    ? {
        name: t(`plans.${selectedPlan}.name`),
        teaser: t(`plans.${selectedPlan}.teaser`),
        price: t(`plans.${selectedPlan}.price` as any),
        period: t(`plans.${selectedPlan}.period`),
      }
    : null

  const keyBenefits = (t.raw('keyBenefits') as string[]) ?? []

  return (
    <AppLayout>
      <div className="min-h-screen flex flex-col">
        <Topbar
          title={t('title')}
          subtitle={t('subtitle')}
          variant="textured"
        />

        <div className="flex-1 px-6 pb-6">
          {message ? <p className="mb-6 text-sm text-red-700">{message}</p> : null}

          {loading ? (
            <div className="py-12 text-center text-ink/60">{t('loading')}</div>
          ) : (
            <div className="space-y-8">
              <div className="grid gap-5 xl:grid-cols-3">
                {visiblePlans.map((plan) => {
                  const isFounders = plan.plan_code.startsWith('founders')
                  const planName = t(`plans.${plan.plan_code}.name`)
                  const planTeaser = t(`plans.${plan.plan_code}.teaser`)
                  const planPrice = (t.raw(`plans.${plan.plan_code}`) as any)?.price ?? ''
                  const planPeriod = t(`plans.${plan.plan_code}.period`)

                  return (
                    <div
                      key={plan.plan_code}
                      className="flex h-full flex-col rounded-[18px] border border-border bg-offWhite px-6 py-6 text-coffee shadow-soft"
                    >
                      <div className="flex flex-1 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="font-serif text-2xl text-sidebar">{planName}</h3>
                          {isFounders ? (
                            <span className="rounded-full border border-gold px-2 py-1 text-xs text-gold">{t('foundersTag')}</span>
                          ) : null}
                        </div>
                        <p className="mt-3 min-h-[44px] text-sm text-ink/55">{planTeaser}</p>
                        <div className="mt-6 flex items-end justify-center text-coffee/60">
                          <span>R$</span>
                          <span className="ml-2 text-4xl font-normal leading-none text-sidebar">{planPrice}</span>
                          <span className="ml-2 text-base">{planPeriod}</span>
                        </div>
                        <p className="mt-4 min-h-[28px] text-center text-sm text-ink/60">
                          {plan.is_active ? t('trialNote') : t('unavailable')}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={!plan.is_active}
                        onClick={() => {
                          posthog.capture(EVENTS.CHECKOUT_STARTED, { plan_code: plan.plan_code })
                          setSelectedPlan(plan.plan_code)
                        }}
                        className="mt-6 w-full rounded-full bg-sidebar px-4 py-3 text-sm font-semibold text-white transition-vintage hover:bg-olive/90 disabled:opacity-60"
                      >
                        {t('subscribeCta')}
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="grid gap-6 lg:grid-cols-3">
                {visiblePlans.map((plan) => {
                  const benefits = (t.raw(`plans.${plan.plan_code}.benefits`) as string[]) ?? []
                  const benefitsTitle = t(`plans.${plan.plan_code}.benefitsTitle`)

                  return (
                    <div key={`${plan.plan_code}-benefits`} className="rounded-[18px] border border-border bg-bg p-5">
                      <div className="mb-3 font-medium text-coffee">{benefitsTitle}</div>
                      <ul className="space-y-2 text-sm text-ink/70">
                        {benefits.map((benefit, i) => (
                          <li key={i}>• {benefit}</li>
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
                    {t(`plans.${plan.plan_code}.quote`)}
                  </div>
                ))}
              </div>

              <div className="rounded-[18px] border border-border bg-offWhite px-6 py-8 shadow-soft">
                <div className="mb-6 text-center font-serif text-[34px] text-coffee">{t('keyBenefitsTitle')}</div>
                <div className="flex flex-wrap justify-center gap-3">
                  {keyBenefits.map((item, i) => (
                    <div
                      key={i}
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
                    <p className="text-xs uppercase tracking-[0.24em] text-coffee/55">{t('checkoutLabel')}</p>
                    <h3 className="mt-1 text-2xl font-serif text-coffee">{selectedPlanContent.name}</h3>
                    <p className="mt-2 text-sm text-ink/65">{selectedPlanContent.teaser}</p>
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-border px-3 py-2 text-sm text-ink/70 transition-vintage hover:bg-paper"
                    onClick={() => setSelectedPlan(null)}
                  >
                    {t('closeButton')}
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
                    setActivationMessage(t('confirming'))
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
              <h3 className="text-2xl font-serif text-coffee">{t('activating')}</h3>
              <p className="mt-3 text-sm text-ink/65">{activationMessage}</p>
            </div>
          </div>
        ) : null}
      </div>
    </AppLayout>
  )
}
