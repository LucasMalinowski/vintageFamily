'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { Info } from 'lucide-react'
import BillingPaymentElement from '@/components/billing/BillingPaymentElement'
import { getAuthBearerToken } from '@/lib/billing/client'
import { DOWNGRADE_PATHS, PLAN_CODES, PLAN_NAME, type PlanCode, UPGRADE_PATHS } from '@/lib/billing/constants'
import { posthog } from '@/lib/posthog'
import { EVENTS } from '@/components/PostHogProvider'

type BillingResponse = {
  subscription: {
    plan_code: PlanCode | null
    status: string | null
    current_period_start: string | null
    current_period_end: string | null
    cancel_at_period_end: boolean | null
  } | null
  billing: {
    can_manage: boolean
    founders_eligible: boolean
    scheduled_change: {
      target_plan: PlanCode | null
      effective_at: string | null
    } | null
  }
  access: {
    hasLifetimeAccess: boolean
    hasValidSubscription: boolean
    hasActiveTrial: boolean
    hasAccess: boolean
    isPaidTier: boolean
    isFreeTier: boolean
    trialExpiresAt: string | null
  }
}

type Invoice = {
  id: string
  number: string | null
  status: string | null
  currency: string
  amount_paid: number
  amount_due: number
  created: number
  hosted_invoice_url: string | null
}

type PaymentFlow =
  | {
      type: 'subscription'
      clientSecret: string
      targetPlan: PlanCode
    }
  | { type: 'payment_method'; clientSecret: string; setupIntentId: string }
  | {
      type: 'plan_change'
      clientSecret: string
      targetPlan: PlanCode
      currentPlan: PlanCode
      amountDue: number
      currency: string
      currentRecurringAmount: number | null
      targetRecurringAmount: number | null
    }
  | null

type Translator = ReturnType<typeof useTranslations>

function getStatusLabel(t: Translator, status: string) {
  const knownStatuses = ['active', 'trialing', 'canceled', 'incomplete', 'incomplete_expired', 'past_due', 'unpaid', 'paused']
  if (knownStatuses.includes(status)) return t(`billing.page.statusLabels.${status}`)
  return status
}

function formatPlanName(t: Translator, planCode: PlanCode | null | undefined) {
  if (!planCode) return t('billing.page.noSubscription')
  return PLAN_NAME[planCode] ?? planCode
}

function formatAccessPlanName(t: Translator, access: BillingResponse['access'] | undefined, planCode: PlanCode | null) {
  if (planCode) return formatPlanName(t, planCode)
  if (access?.hasLifetimeAccess) return t('billing.page.lifetimeAccess')
  if (access?.hasActiveTrial) return t('billing.page.freeTrial')
  return t('billing.page.freePlan')
}

function formatCurrency(locale: string, amountInCents: number, currency: string) {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountInCents / 100)
}

function getImmediateAdjustmentLabel(t: Translator, amountInCents: number) {
  if (amountInCents > 0) return t('billing.page.immediateCharge')
  if (amountInCents < 0) return t('billing.page.creditGenerated')
  return t('billing.page.noImmediateAdjustment')
}

function getImmediateAdjustmentHelpText(t: Translator, amountInCents: number) {
  if (amountInCents > 0) {
    return t('billing.page.immediateChargeHelp')
  }

  if (amountInCents < 0) {
    return t('billing.page.creditGeneratedHelp')
  }

  return t('billing.page.noImmediateAdjustmentHelp')
}

function getNextRenewalLabel(t: Translator, planCode: PlanCode) {
  if (planCode === 'standard_monthly') return t('billing.page.nextRenewalMonthly')
  return t('billing.page.nextRenewalAnnual')
}

function getEstimatedNextCharge(recurringAmount: number | null, immediateAdjustment: number) {
  if (recurringAmount === null) return null
  return Math.max(recurringAmount + Math.min(immediateAdjustment, 0), 0)
}

function formatApproximateCycles(t: Translator, creditAmount: number, recurringAmount: number | null) {
  if (creditAmount >= 0 || !recurringAmount || recurringAmount <= 0) return null

  const cycles = Math.abs(creditAmount) / recurringAmount
  if (cycles < 1) return null

  const rounded = Math.floor(cycles)
  const label = rounded === 1 ? t('billing.page.month') : t('billing.page.months')

  return `${rounded} ${label}`
}

export default function BillingSettingsPage() {
  const t = useTranslations()
  const locale = useLocale()
  const [data, setData] = useState<BillingResponse | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [paymentFlow, setPaymentFlow] = useState<PaymentFlow>(null)
  const [planPickerOpen, setPlanPickerOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanCode | null>(null)
  const [changeTiming, setChangeTiming] = useState<'now' | 'period_end'>('period_end')
  const [planPreview, setPlanPreview] = useState<{
    prorationDate: number
    immediateAdjustment: number
    currency: string
    targetRecurringAmount: number | null
  } | null>(null)

  const currentPlan = data?.subscription?.plan_code ?? null
  const hasStripeSubscription = Boolean(data?.subscription)
  const access = data?.access
  const foundersEligible = Boolean(data?.billing?.founders_eligible)
  const canManage = Boolean(data?.billing?.can_manage)
  const scheduledChange = data?.billing?.scheduled_change ?? null

  const renewalLabel = useMemo(() => {
    if (!data?.subscription) {
      if (data?.access?.hasLifetimeAccess) return t('billing.page.noRecurringCharge')
      if (data?.access?.hasActiveTrial) return t('billing.page.activeTrial')
      return t('billing.page.noActiveSubscription')
    }
    return data.subscription.cancel_at_period_end ? t('billing.page.autoRenewDisabled') : t('billing.page.autoRenewEnabled')
  }, [data?.access?.hasActiveTrial, data?.access?.hasLifetimeAccess, data?.subscription, t])

  const load = async () => {
    const token = await getAuthBearerToken()
    if (!token) {
      setMessage(t('common.sessionExpired'))
      setLoading(false)
      return
    }

    const [billingResponse, invoicesResponse] = await Promise.all([
      fetch('/api/billing/me', {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch('/api/billing/invoices', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])

	    const [billingPayload, invoicesPayload] = await Promise.all([
	      billingResponse.json().catch(() => null),
	      invoicesResponse.json().catch(() => null),
	    ])

    if (!billingResponse.ok) {
      setMessage(billingPayload?.error || t('billing.page.errorLoadSubscription'))
      setLoading(false)
      return
    }

    setData(billingPayload)

    if (invoicesResponse.ok) {
      setInvoices(invoicesPayload?.invoices || [])
    } else if (billingPayload?.billing?.can_manage) {
      setMessage(invoicesPayload?.error || t('billing.page.errorLoadInvoices'))
    }

    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [])

  const withToken = async () => {
    const token = await getAuthBearerToken()
    if (!token) {
      setMessage(t('common.sessionExpired'))
      return null
    }

    return token
  }

  const startPaymentMethodUpdate = async () => {
    const token = await withToken()
    if (!token) return

    setActionLoading('payment_method')
    setMessage(null)

    const response = await fetch('/api/billing/create-payment-method-setup', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })

    const payload = await response.json().catch(() => null)
    setActionLoading(null)

    if (!response.ok || !payload?.client_secret) {
      setMessage(payload?.error || t('billing.page.errorStartPaymentMethodUpdate'))
      return
    }

    setPaymentFlow({
      type: 'payment_method',
      clientSecret: payload.client_secret,
      setupIntentId: payload.setup_intent_id,
    })
  }

  const createSubscription = async (planCode: PlanCode) => {
    const token = await withToken()
    if (!token) return

    setActionLoading(`subscribe:${planCode}`)
    setMessage(null)

    const response = await fetch('/api/billing/create-subscription', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ plan_code: planCode }),
    })

    const payload = await response.json().catch(() => null)
    setActionLoading(null)

    if (!response.ok || !payload?.client_secret) {
      setMessage(payload?.error || t('billing.page.errorStartSubscription'))
      return
    }

    setPaymentFlow({
      type: 'subscription',
      clientSecret: payload.client_secret,
      targetPlan: planCode,
    })
  }

  const updateCancellation = async (cancelAtPeriodEnd: boolean) => {
    const token = await withToken()
    if (!token) return

    setActionLoading(cancelAtPeriodEnd ? 'cancel' : 'resume')
    setMessage(null)

    const response = await fetch('/api/billing/cancel-subscription', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cancel_at_period_end: cancelAtPeriodEnd }),
    })

    const payload = await response.json().catch(() => null)
    setActionLoading(null)

    if (!response.ok) {
      setMessage(payload?.error || t('billing.page.errorUpdateCancellation'))
      return
    }

    if (cancelAtPeriodEnd) posthog.capture(EVENTS.CANCELLATION_STARTED)
    setMessage(cancelAtPeriodEnd ? t('billing.page.cancellationScheduled') : t('billing.page.autoRenewResumed'))
    await load()
  }

  const upgrade = async (planCode: 'standard_yearly' | 'founders_yearly') => {
    const token = await withToken()
    if (!token) return

    setActionLoading(planCode)
    setMessage(null)

    const response = await fetch('/api/billing/upgrade-subscription', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ plan_code: planCode }),
    })

    const payload = await response.json().catch(() => null)
    setActionLoading(null)

    if (!response.ok) {
      setMessage(payload?.error || t('billing.page.errorUpdateSubscription'))
      return
    }

    if (payload?.client_secret) {
      setPaymentFlow({
        type: 'plan_change',
        clientSecret: payload.client_secret,
        targetPlan: planCode,
        currentPlan: currentPlan as PlanCode,
        amountDue: payload?.upgrade_preview?.amount_due ?? 0,
        currency: payload?.upgrade_preview?.currency ?? 'brl',
        currentRecurringAmount: payload?.upgrade_preview?.current_recurring_amount ?? null,
        targetRecurringAmount: payload?.upgrade_preview?.target_recurring_amount ?? null,
      })
      return
    }

    setMessage(t('billing.page.subscriptionUpdatedTo', { plan: PLAN_NAME[planCode] }))
    await load()
  }

  const downgrade = async (planCode: 'standard_monthly' | 'standard_yearly') => {
    const token = await withToken()
    if (!token) return

    setActionLoading(`downgrade:${planCode}`)
    setMessage(null)

    const response = await fetch('/api/billing/downgrade-subscription', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ plan_code: planCode }),
    })

    const payload = await response.json().catch(() => null)
    setActionLoading(null)

    if (!response.ok) {
      setMessage(payload?.error || t('billing.page.errorScheduleDowngrade'))
      return
    }

    setMessage(t('billing.page.downgradeScheduledTo', { plan: PLAN_NAME[planCode] }))
    await load()
  }

  const clearScheduledChange = async () => {
    const token = await withToken()
    if (!token) return

    setActionLoading('clear_schedule')
    setMessage(null)

    const response = await fetch('/api/billing/clear-scheduled-change', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const payload = await response.json().catch(() => null)
    setActionLoading(null)

    if (!response.ok) {
      setMessage(payload?.error || t('billing.page.errorClearScheduledChange'))
      return
    }

    setMessage(t('billing.page.scheduledChangeCleared'))
    await load()
  }

  const resolvePlanChangeAction = useCallback((targetPlan: PlanCode) => {
    if (!currentPlan) return 'subscribe'
    if (targetPlan === currentPlan) return 'current'
    if (UPGRADE_PATHS[currentPlan]?.includes(targetPlan)) return 'upgrade'
    if (DOWNGRADE_PATHS[currentPlan]?.includes(targetPlan)) return 'downgrade'
    return 'invalid'
  }, [currentPlan])

  const selectedPlanAction = selectedPlan ? resolvePlanChangeAction(selectedPlan) : 'invalid'

  const availablePlans = useMemo(() => {
    if (!currentPlan) {
      return PLAN_CODES.filter((planCode) => {
        if (planCode.startsWith('founders_') && !foundersEligible) return false
        return true
      })
    }

    return PLAN_CODES.filter((planCode) => {
      if (planCode.startsWith('founders_') && !foundersEligible) return false
      const action = resolvePlanChangeAction(planCode)
      return action !== 'invalid' || planCode === currentPlan
    })
  }, [currentPlan, foundersEligible, resolvePlanChangeAction])

  useEffect(() => {
    if (!planPickerOpen || !selectedPlan || selectedPlanAction !== 'downgrade') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlanPreview(null)
      return
    }

    let cancelled = false

    const run = async () => {
      const token = await withToken()
      if (!token) return

      setPlanPreview(null)
      setActionLoading('preview_change')

      const response = await fetch('/api/billing/preview-plan-change', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan_code: selectedPlan }),
      })

      const payload = await response.json().catch(() => null)

      if (cancelled) return

      setActionLoading(null)

      if (!response.ok) {
        setPlanPreview(null)
        setMessage(payload?.error || t('billing.page.errorSimulatePlanChange'))
        return
      }

      setPlanPreview({
        prorationDate: payload?.preview?.proration_date ?? Math.floor(Date.now() / 1000),
        immediateAdjustment: payload?.preview?.immediate_adjustment ?? 0,
        currency: payload?.preview?.currency ?? 'brl',
        targetRecurringAmount: payload?.preview?.target_recurring_amount ?? null,
      })
    }

    run()

    return () => {
      cancelled = true
    }
  }, [changeTiming, planPickerOpen, selectedPlan, selectedPlanAction])

  const submitPlanChange = async () => {
    if (!selectedPlan) return

    if (selectedPlanAction === 'subscribe') {
      await createSubscription(selectedPlan)
      setPlanPickerOpen(false)
      return
    }

    if (selectedPlanAction === 'upgrade') {
      await upgrade(selectedPlan as 'standard_yearly' | 'founders_yearly')
      setPlanPickerOpen(false)
      return
    }

    if (selectedPlanAction === 'downgrade') {
      if (changeTiming === 'now') {
        const token = await withToken()
        if (!token) return

        setActionLoading('change_now')
        setMessage(null)

        const response = await fetch('/api/billing/change-subscription-now', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            plan_code: selectedPlan,
            proration_date: planPreview?.prorationDate,
          }),
        })

        const payload = await response.json().catch(() => null)
        setActionLoading(null)

        if (!response.ok) {
          setMessage(payload?.error || t('billing.page.errorChangeSubscription'))
          return
        }

        if (payload?.client_secret) {
          setPaymentFlow({
            type: 'plan_change',
            clientSecret: payload.client_secret,
            targetPlan: selectedPlan,
            currentPlan: currentPlan as PlanCode,
            amountDue: payload?.change_preview?.immediate_adjustment ?? 0,
            currency: payload?.change_preview?.currency ?? 'brl',
            currentRecurringAmount: null,
            targetRecurringAmount: payload?.change_preview?.target_recurring_amount ?? null,
          })
          setPlanPickerOpen(false)
          return
        }

        setMessage(t('billing.page.subscriptionUpdatedTo', { plan: PLAN_NAME[selectedPlan] }))
        await load()
        setPlanPickerOpen(false)
        return
      }

      await downgrade(selectedPlan as 'standard_monthly' | 'standard_yearly')
      setPlanPickerOpen(false)
      return
    }

    if (selectedPlanAction === 'current' && scheduledChange?.target_plan) {
      await clearScheduledChange()
      setPlanPickerOpen(false)
    }
  }

  const planActionLabel = (() => {
    if (!selectedPlan) return t('billing.page.selectPlan')
    if (selectedPlanAction === 'subscribe') return t('billing.page.subscribeTo', { plan: PLAN_NAME[selectedPlan] })
    if (selectedPlanAction === 'upgrade') return t('billing.page.goToPlan', { plan: PLAN_NAME[selectedPlan] })
    if (selectedPlanAction === 'downgrade') {
      return changeTiming === 'now'
        ? t('billing.page.switchNowTo', { plan: PLAN_NAME[selectedPlan] })
        : t('billing.page.scheduleTo', { plan: PLAN_NAME[selectedPlan] })
    }
    if (selectedPlanAction === 'current' && scheduledChange?.target_plan) return t('billing.page.removeScheduledChange')
    if (selectedPlanAction === 'current') return t('billing.page.currentPlan')
    return t('billing.page.changeUnavailable')
  })()

  if (loading) {
    return <div className="rounded-vintage border border-border bg-bg p-6 shadow-vintage text-ink/60">{t('billing.page.loadingBilling')}</div>
  }

  return (
    <>
      <div className="rounded-vintage border border-border bg-bg p-6 shadow-vintage">
        <h1 className="mb-2 text-2xl font-serif text-coffee">{t('billing.page.title')}</h1>
        <p className="mb-6 text-sm text-ink/60">{t('billing.page.subtitle')}</p>

        {message ? <p className="mb-4 text-sm text-ink/70">{message}</p> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-paper p-4">
            <h2 className="mb-2 text-sm uppercase tracking-wide text-ink/50">{t('billing.page.currentSubscription')}</h2>
            <p className="text-lg font-semibold text-coffee">{formatAccessPlanName(t, access, currentPlan)}</p>
            <p className="mt-1 text-xs text-ink/60">
              {t('billing.page.statusLabel')}:{' '}
              {data?.subscription?.status
                ? getStatusLabel(t, data.subscription.status) || data.subscription.status
                : access?.hasActiveTrial
                  ? t('billing.page.statusLabels.trialing')
                  : access?.hasLifetimeAccess
                    ? t('billing.page.lifetimeStatus')
                    : t('billing.page.freeStatus')}
            </p>
            <p className="mt-1 text-xs text-ink/60">
              {access?.hasActiveTrial && !data?.subscription?.current_period_end ? t('billing.page.trialUntil') : t('billing.page.currentPeriodUntil')}:{' '}
              {data?.subscription?.current_period_end
                ? new Date(data.subscription.current_period_end).toLocaleDateString(locale)
                : access?.trialExpiresAt
                  ? new Date(access.trialExpiresAt).toLocaleDateString(locale)
                  : t('billing.page.notAvailable')}
            </p>
            <p className="mt-1 text-xs text-ink/60">{renewalLabel}</p>
            {!hasStripeSubscription && canManage ? (
              <p className="mt-3 text-xs text-ink/60">
                {t('billing.page.choosePlanToActivate')}
              </p>
            ) : null}
            {scheduledChange?.target_plan && scheduledChange.effective_at ? (
              <p className="mt-2 text-xs text-ink/60">
                {t('billing.page.scheduledChangeLabel', {
                  plan: PLAN_NAME[scheduledChange.target_plan],
                  date: new Date(scheduledChange.effective_at).toLocaleDateString(locale),
                })}
              </p>
            ) : null}
          </div>

          <div className="rounded-lg border border-border bg-paper p-4">
            <h2 className="mb-2 text-sm uppercase tracking-wide text-ink/50">{t('billing.page.actions')}</h2>

            {!canManage ? (
              <p className="text-sm text-ink/60">{t('billing.page.onlyAdminsCanManage')}</p>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlan(currentPlan ?? 'standard_monthly')
                    setPlanPickerOpen(true)
                  }}
                  className="rounded-full border border-border bg-bg px-4 py-2 text-sm text-ink/70 hover:bg-offWhite disabled:opacity-60"
                >
                  {hasStripeSubscription ? t('billing.page.changeSubscriptionPlan') : t('billing.page.choosePlan')}
                </button>
                <button
                  type="button"
                  onClick={startPaymentMethodUpdate}
                  disabled={!data?.subscription || actionLoading === 'payment_method'}
                  className="rounded-full border border-border bg-bg px-4 py-2 text-sm text-ink/70 hover:bg-offWhite disabled:opacity-60"
                >
                  {actionLoading === 'payment_method' ? t('billing.page.loadingEllipsis') : t('billing.page.updatePaymentMethod')}
                </button>
                {scheduledChange?.target_plan ? (
                  <button
                    type="button"
                    onClick={clearScheduledChange}
                    disabled={actionLoading === 'clear_schedule'}
                    className="rounded-full border border-border bg-bg px-4 py-2 text-sm text-ink/70 hover:bg-offWhite disabled:opacity-60"
                  >
                    {actionLoading === 'clear_schedule' ? t('billing.page.processingEllipsis') : t('billing.page.removeScheduledChange')}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => updateCancellation(!data?.subscription?.cancel_at_period_end)}
                  disabled={!data?.subscription || actionLoading === 'cancel' || actionLoading === 'resume'}
                  className="rounded-full border border-border bg-bg px-4 py-2 text-sm text-ink/70 hover:bg-offWhite disabled:opacity-60"
                >
                  {actionLoading === 'cancel' || actionLoading === 'resume'
                    ? t('billing.page.processingEllipsis')
                    : data?.subscription?.cancel_at_period_end
                      ? t('billing.page.resumeAutoRenew')
                      : t('billing.page.cancelSubscription')}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-border bg-paper p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm uppercase tracking-wide text-ink/50">{t('billing.page.invoices')}</h2>
            <span className="text-xs text-ink/50">{t('billing.page.recordsCount', { count: invoices.length })}</span>
          </div>

          {!canManage ? (
            <p className="text-sm text-ink/60">{t('billing.page.onlyAdminsCanViewInvoices')}</p>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-ink/60">{t('billing.page.noInvoicesFound')}</p>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-coffee">
                      {invoice.number || invoice.id}
                    </p>
                    <p className="text-xs text-ink/60">
                      {new Date(invoice.created * 1000).toLocaleDateString(locale)} · {invoice.status || t('billing.page.noStatus')}
                    </p>
                  </div>
                  <div className="text-sm text-ink/70">
                    {formatCurrency(locale, invoice.amount_paid || invoice.amount_due, invoice.currency)}
                  </div>
                  <div className="flex gap-2">
                    {invoice.hosted_invoice_url ? (
                      <a
                        href={invoice.hosted_invoice_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-border bg-bg px-3 py-2 text-xs text-ink/70 hover:bg-offWhite"
                      >
                        {t('billing.page.viewInvoice')}
                      </a>
                    ) : null}
                    <a
                      href={`/api/billing/invoices/${invoice.id}/pdf`}
                      className="rounded-full border border-border bg-bg px-3 py-2 text-xs text-ink/70 hover:bg-offWhite"
                    >
                      {t('billing.page.downloadPdf')}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {paymentFlow ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/35 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-[24px] border border-border bg-bg shadow-vintage">
            <div className="border-b border-border bg-offWhite px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-coffee/55">{t('billing.page.billingLabel')}</p>
                  <h3 className="mt-1 text-2xl font-serif text-coffee">
                    {paymentFlow.type === 'payment_method'
                      ? t('billing.page.updatePaymentMethod')
                      : paymentFlow.type === 'subscription'
                        ? t('billing.page.subscribeTo', { plan: PLAN_NAME[paymentFlow.targetPlan] })
                        : t('billing.page.confirmPlan', { plan: PLAN_NAME[paymentFlow.targetPlan] })}
                  </h3>
                  <p className="mt-2 text-sm text-ink/65">
                    {paymentFlow.type === 'payment_method'
                      ? t('billing.page.enterNewCardDetails')
                      : paymentFlow.type === 'subscription'
                        ? t('billing.page.enterPaymentDetails')
                        : t('billing.page.confirmBillingAdjustment')}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-border bg-bg px-3 py-2 text-sm text-ink/70 transition-vintage hover:bg-offWhite"
                  onClick={() => setPaymentFlow(null)}
                >
                  {t('common.close')}
                </button>
              </div>
            </div>

            <div className="px-6 py-6">
              {paymentFlow.type === 'plan_change' ? (
                <div className="mb-5 rounded-[18px] border border-border bg-paper p-4 text-sm text-ink/70">
                  <div className="flex items-center justify-between gap-3">
                    <span>{t('billing.page.currentPlanLabel')}</span>
                    <span className="font-medium text-coffee">{PLAN_NAME[paymentFlow.currentPlan]}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span>{t('billing.page.newPlanLabel')}</span>
                    <span className="font-medium text-coffee">{PLAN_NAME[paymentFlow.targetPlan]}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span>{getImmediateAdjustmentLabel(t, paymentFlow.amountDue)}</span>
                    <span className="flex items-center gap-2 font-semibold text-coffee">
                      <span
                        className="group relative inline-flex h-5 w-5 cursor-help items-center justify-center text-ink/55"
                        aria-label={t('billing.immediateAdjustmentInfo')}
                      >
                        <Info className="h-4 w-4" />
                        <span className="pointer-events-none absolute right-0 top-full z-10 mt-2 hidden w-72 rounded-[14px] border border-border bg-bg p-3 text-left text-xs font-normal text-ink/70 shadow-soft group-hover:block">
                          {getImmediateAdjustmentHelpText(t, paymentFlow.amountDue)}
                        </span>
                      </span>
                      {formatCurrency(locale, paymentFlow.amountDue, paymentFlow.currency)}
                    </span>
                  </div>
                  {paymentFlow.targetRecurringAmount !== null ? (
                    <>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <div>
                          <div>{t('billing.page.baseRenewalPrice')}</div>
                          <div className="text-xs text-ink/55">{getNextRenewalLabel(t, paymentFlow.targetPlan)}</div>
                        </div>
                        <span className="font-medium text-coffee">
                          {formatCurrency(locale, paymentFlow.targetRecurringAmount, paymentFlow.currency)}
                        </span>
                      </div>
                      {getEstimatedNextCharge(paymentFlow.targetRecurringAmount, paymentFlow.amountDue) !== null ? (
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <div>
                            <div>{t('billing.page.estimatedNextCharge')}</div>
                            <div className="text-xs text-ink/55">{t('billing.page.consideringCreditGenerated')}</div>
                          </div>
                          <span className="font-medium text-coffee">
                            {formatCurrency(
                              locale,
                              getEstimatedNextCharge(paymentFlow.targetRecurringAmount, paymentFlow.amountDue) || 0,
                              paymentFlow.currency,
                            )}
                          </span>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              ) : null}

              <BillingPaymentElement
                clientSecret={paymentFlow.clientSecret}
                submitLabel={
                  paymentFlow.type === 'payment_method'
                    ? t('billing.page.saveCard')
                    : paymentFlow.type === 'subscription'
                      ? t('billing.page.confirmSubscription')
                      : t('billing.page.confirmPlanChange')
                }
                onCancel={() => setPaymentFlow(null)}
                onSuccess={async (result) => {
                  if (paymentFlow.type === 'payment_method') {
                    const token = await withToken()
                    if (!token) return

                    const response = await fetch('/api/billing/confirm-payment-method-setup', {
                      method: 'POST',
                      headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        setup_intent_id: result?.setupIntentId || paymentFlow.setupIntentId,
                      }),
                    })

                    const payload = await response.json().catch(() => null)
                    if (!response.ok) {
                      setMessage(payload?.error || t('billing.page.errorSavePaymentMethod'))
                      return
                    }
                  }

                  setPaymentFlow(null)
                  setMessage(
                    paymentFlow.type === 'payment_method'
                      ? t('billing.page.paymentMethodUpdated')
                      : paymentFlow.type === 'subscription'
                        ? t('billing.page.subscriptionStartedOn', { plan: PLAN_NAME[paymentFlow.targetPlan] })
                        : t('billing.page.subscriptionUpdatedTo', { plan: PLAN_NAME[paymentFlow.targetPlan] }),
                  )
                  await load()
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {planPickerOpen ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/35 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-[24px] border border-border bg-bg shadow-vintage">
            <div className="border-b border-border bg-offWhite px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-coffee/55">{t('billing.page.billingLabel')}</p>
                  <h3 className="mt-1 text-2xl font-serif text-coffee">{t('billing.page.changeSubscriptionPlan')}</h3>
                  <p className="mt-2 text-sm text-ink/65">
                    {currentPlan
                      ? t('billing.page.choosePlanDescription')
                      : t('billing.page.choosePlanToActivateDescription')}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-border bg-bg px-3 py-2 text-sm text-ink/70 transition-vintage hover:bg-offWhite"
                  onClick={() => setPlanPickerOpen(false)}
                >
                  {t('common.close')}
                </button>
              </div>
            </div>

            <div className="space-y-4 px-6 py-6">
              <div className="space-y-3">
                {availablePlans.map((planCode) => {
                  const isCurrent = planCode === currentPlan
                  const isScheduled = scheduledChange?.target_plan === planCode
                  return (
                    <button
                      key={planCode}
                      type="button"
                      onClick={() => setSelectedPlan(planCode)}
                      className={`flex w-full items-center justify-between rounded-[18px] border px-4 py-4 text-left transition-vintage ${
                        selectedPlan === planCode
                          ? 'border-sidebar bg-bg'
                          : 'border-border bg-bg hover:bg-offWhite'
                      }`}
                    >
                      <div>
                        <div className="font-medium text-coffee">{PLAN_NAME[planCode]}</div>
                        <div className="mt-1 text-xs text-ink/60">
                          {isCurrent
                            ? t('billing.page.currentPlan')
                            : isScheduled
                              ? t('billing.page.changeAlreadyScheduledFor', { date: new Date(scheduledChange!.effective_at!).toLocaleDateString(locale) })
                              : resolvePlanChangeAction(planCode) === 'subscribe'
                                ? t('billing.page.startSubscription')
                                : resolvePlanChangeAction(planCode) === 'upgrade'
                                  ? t('billing.page.immediateChange')
                                  : resolvePlanChangeAction(planCode) === 'downgrade'
                                    ? t('billing.page.changeAtPeriodEnd')
                                    : t('billing.page.unavailable')}
                        </div>
                      </div>
                      <div className="text-xs text-ink/60">
                        {isCurrent ? t('billing.page.currentBadge') : isScheduled ? t('billing.page.scheduledBadge') : null}
                      </div>
                    </button>
                  )
                })}
              </div>

              {selectedPlan && selectedPlanAction === 'downgrade' && data?.subscription?.current_period_end ? (
                <div className="rounded-[18px] border border-border bg-paper p-4 text-sm text-ink/70 space-y-3">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setChangeTiming('period_end')}
                      className={`rounded-full border bg-bg px-4 py-2 text-sm ${
                        changeTiming === 'period_end' ? 'border-sidebar text-coffee' : 'border-border text-ink/70'
                      }`}
                    >
                      {t('billing.page.switchAtPeriodEnd')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setChangeTiming('now')}
                      className={`rounded-full border bg-bg px-4 py-2 text-sm ${
                        changeTiming === 'now' ? 'border-sidebar text-coffee' : 'border-border text-ink/70'
                      }`}
                    >
                      {t('billing.page.switchNow')}
                    </button>
                  </div>

                  {changeTiming === 'period_end' ? (
                    <div className="space-y-2">
                      <div className="rounded-[16px] border border-border bg-offWhite px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <span>{t('billing.page.untilSwitch')}</span>
                          <span className="font-medium text-coffee">{PLAN_NAME[currentPlan as PlanCode]}</span>
                        </div>
                        <div className="mt-1 text-xs text-ink/55">
                          {t('billing.page.currentPlanActiveUntil', {
                            date: new Date(data.subscription.current_period_end).toLocaleDateString(locale),
                          })}
                        </div>
                      </div>

                      {planPreview && planPreview.targetRecurringAmount !== null ? (
                        <div className="rounded-[16px] border border-border bg-offWhite px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <span>{t('billing.page.immediateCharge')}</span>
                            <span className="font-medium text-coffee">{formatCurrency(locale, 0, planPreview.currency)}</span>
                          </div>
                          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                            <div>
                              <div>{getNextRenewalLabel(t, selectedPlan)}</div>
                              <div className="text-xs text-ink/55">
                                {t('billing.page.newValueAppliesAfterDate')}
                              </div>
                            </div>
                            <span className="pt-0.5 text-right font-medium text-coffee">
                              {formatCurrency(locale, planPreview.targetRecurringAmount, planPreview.currency)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {t('billing.page.changeToPlanWillApplyOn', {
                            plan: PLAN_NAME[selectedPlan],
                            date: new Date(data.subscription.current_period_end).toLocaleDateString(locale),
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {actionLoading === 'preview_change' ? (
                        <div className="flex flex-col items-center justify-center gap-3 rounded-[16px] border border-border bg-offWhite px-4 py-6 text-center text-sm text-ink/70">
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sidebar/20 border-t-sidebar" />
                          <div>{t('billing.page.simulatingBillingAdjustment')}</div>
                        </div>
                      ) : null}
                      {actionLoading !== 'preview_change' && planPreview ? (
                        <>
                          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                            <span>{getImmediateAdjustmentLabel(t, planPreview.immediateAdjustment)}</span>
                            <span className="flex items-center justify-end gap-2 pt-0.5 text-right font-medium text-coffee">
                              <span
                                className="group relative inline-flex h-5 w-5 cursor-help items-center justify-center text-ink/55"
                                aria-label={t('billing.immediateAdjustmentInfo')}
                              >
                                <Info className="h-4 w-4" />
                                <span className="pointer-events-none absolute right-0 top-full z-10 mt-2 hidden w-72 rounded-[14px] border border-border bg-bg p-3 text-left text-xs font-normal text-ink/70 shadow-soft group-hover:block">
                                  {getImmediateAdjustmentHelpText(t, planPreview.immediateAdjustment)}
                                </span>
                              </span>
                              {formatCurrency(locale, planPreview.immediateAdjustment, planPreview.currency)}
                            </span>
                          </div>
                          {planPreview.targetRecurringAmount !== null ? (
                            <>
                              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                                <div>
                                  <div>{t('billing.page.baseRenewalPrice')}</div>
                                  <div className="text-xs text-ink/55">{getNextRenewalLabel(t, selectedPlan)}</div>
                                </div>
                                <span className="pt-0.5 text-right font-medium text-coffee">
                                  {formatCurrency(locale, planPreview.targetRecurringAmount, planPreview.currency)}
                                </span>
                              </div>
                              {getEstimatedNextCharge(planPreview.targetRecurringAmount, planPreview.immediateAdjustment) !== null ? (
                                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                                  <div>
                                    <div>{t('billing.page.estimatedNextCharge')}</div>
                                    <div className="text-xs text-ink/55">
                                      {t('billing.page.consideringCreditGenerated')}
                                    </div>
                                  </div>
                                  <span className="pt-0.5 text-right font-medium text-coffee">
                                    {formatCurrency(
                                      locale,
                                      getEstimatedNextCharge(
                                        planPreview.targetRecurringAmount,
                                        planPreview.immediateAdjustment,
                                      ) || 0,
                                      planPreview.currency,
                                    )}
                                  </span>
                                </div>
                              ) : null}
                              {selectedPlan === 'standard_monthly' &&
                              formatApproximateCycles(t, planPreview.immediateAdjustment, planPreview.targetRecurringAmount) ? (
                                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                                  <div>
                                    <div>{t('billing.page.estimatedCreditDuration')}</div>
                                    <div className="text-xs text-ink/55">
                                      {t('billing.page.creditDurationApproximationNote')}
                                    </div>
                                  </div>
                                  <span className="pt-0.5 text-right font-medium leading-6 text-coffee">
                                    {formatApproximateCycles(
                                      t,
                                      planPreview.immediateAdjustment,
                                      planPreview.targetRecurringAmount,
                                    )}
                                  </span>
                                </div>
                              ) : null}
                            </>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : null}

              {selectedPlan?.startsWith('founders_') && !foundersEligible ? (
                <div className="rounded-[18px] border border-border bg-paper p-4 text-sm text-ink/70">
                  {t('billing.page.foundersOnlyAvailable')}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setPlanPickerOpen(false)}
                  className="rounded-full border border-border bg-bg px-4 py-3 text-sm font-medium text-ink/70 transition-vintage hover:bg-offWhite"
                >
                  {t('common.close')}
                </button>
                <button
                  type="button"
                  onClick={submitPlanChange}
                  disabled={
                    !selectedPlan ||
                    selectedPlanAction === 'invalid' ||
                    (selectedPlanAction === 'current' && !scheduledChange?.target_plan) ||
                    (selectedPlanAction === 'downgrade' && changeTiming === 'now' && actionLoading === 'preview_change') ||
                    actionLoading !== null
                  }
                  className="rounded-full border border-sidebar bg-bg px-5 py-3 text-sm font-semibold text-coffee disabled:opacity-60"
                >
                  {planActionLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
