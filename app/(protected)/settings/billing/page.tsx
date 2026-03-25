'use client'

import { useEffect, useMemo, useState } from 'react'
import { Info } from 'lucide-react'
import BillingPaymentElement from '@/components/billing/BillingPaymentElement'
import { getAuthBearerToken } from '@/lib/billing/client'
import { DOWNGRADE_PATHS, PLAN_CODES, PLAN_NAME, type PlanCode, UPGRADE_PATHS } from '@/lib/billing/constants'

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
    hasValidSubscription: boolean
    hasActiveTrial: boolean
    hasAccess: boolean
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

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativa',
  trialing: 'Em teste',
  canceled: 'Cancelada',
  incomplete: 'Incompleta',
  incomplete_expired: 'Expirada',
  past_due: 'Em atraso',
  unpaid: 'Não paga',
  paused: 'Pausada',
}

function formatPlanName(planCode: PlanCode | null | undefined) {
  if (!planCode) return 'Sem assinatura'
  return PLAN_NAME[planCode] ?? planCode
}

function formatCurrency(amountInCents: number, currency: string) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amountInCents / 100)
}

function getImmediateAdjustmentLabel(amountInCents: number) {
  if (amountInCents > 0) return 'Cobrança imediata'
  if (amountInCents < 0) return 'Crédito gerado'
  return 'Sem ajuste imediato'
}

function getImmediateAdjustmentHelpText(amountInCents: number) {
  if (amountInCents > 0) {
    return 'Este valor será cobrado agora para concluir a alteração de plano.'
  }

  if (amountInCents < 0) {
    return 'Este valor será mantido como crédito para próximas cobranças. Não há reembolso automático no cartão.'
  }

  return 'Esta alteração não gera cobrança nem crédito imediato.'
}

function getNextRenewalLabel(planCode: PlanCode) {
  if (planCode === 'standard_monthly') return 'Próxima renovação mensal'
  return 'Próxima renovação anual'
}

function getEstimatedNextCharge(recurringAmount: number | null, immediateAdjustment: number) {
  if (recurringAmount === null) return null
  return Math.max(recurringAmount + Math.min(immediateAdjustment, 0), 0)
}

function formatApproximateCycles(creditAmount: number, recurringAmount: number | null) {
  if (creditAmount >= 0 || !recurringAmount || recurringAmount <= 0) return null

  const cycles = Math.abs(creditAmount) / recurringAmount
  if (cycles < 1) return null

  const rounded = Math.floor(cycles)
  const label = rounded === 1 ? 'mês' : 'meses'
  const value = String(rounded)

  return `${value} ${label}`
}

export default function BillingSettingsPage() {
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
  const foundersEligible = Boolean(data?.billing?.founders_eligible)
  const canManage = Boolean(data?.billing?.can_manage)
  const scheduledChange = data?.billing?.scheduled_change ?? null

  const renewalLabel = useMemo(() => {
    if (!data?.subscription) return 'Sem assinatura ativa'
    return data.subscription.cancel_at_period_end ? 'Renovação automática desativada' : 'Renovação automática ativa'
  }, [data?.subscription])

  const load = async () => {
    const token = await getAuthBearerToken()
    if (!token) {
      setMessage('Sessão inválida. Faça login novamente.')
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

    const billingPayload = await billingResponse.json().catch(() => null)
    const invoicesPayload = await invoicesResponse.json().catch(() => null)

    if (!billingResponse.ok) {
      setMessage(billingPayload?.error || 'Não foi possível carregar dados de assinatura.')
      setLoading(false)
      return
    }

    setData(billingPayload)

    if (invoicesResponse.ok) {
      setInvoices(invoicesPayload?.invoices || [])
    } else if (billingPayload?.billing?.can_manage) {
      setMessage(invoicesPayload?.error || 'Não foi possível carregar as faturas.')
    }

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  const withToken = async () => {
    const token = await getAuthBearerToken()
    if (!token) {
      setMessage('Sessão inválida. Faça login novamente.')
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
      setMessage(payload?.error || 'Não foi possível iniciar a atualização do método de pagamento.')
      return
    }

    setPaymentFlow({
      type: 'payment_method',
      clientSecret: payload.client_secret,
      setupIntentId: payload.setup_intent_id,
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
      setMessage(payload?.error || 'Não foi possível atualizar o cancelamento.')
      return
    }

    setMessage(cancelAtPeriodEnd ? 'Assinatura programada para encerrar no fim do período.' : 'Renovação automática reativada com sucesso.')
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
      setMessage(payload?.error || 'Falha ao atualizar assinatura.')
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

    setMessage(`Assinatura atualizada para ${PLAN_NAME[planCode]}.`)
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
      setMessage(payload?.error || 'Falha ao agendar downgrade.')
      return
    }

    setMessage(`Downgrade para ${PLAN_NAME[planCode]} agendado para o fim do período atual.`)
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
      setMessage(payload?.error || 'Falha ao remover alteração agendada.')
      return
    }

    setMessage('Alteração de plano agendada removida com sucesso.')
    await load()
  }

  const resolvePlanChangeAction = (targetPlan: PlanCode) => {
    if (!currentPlan || targetPlan === currentPlan) return 'current'
    if (UPGRADE_PATHS[currentPlan]?.includes(targetPlan)) return 'upgrade'
    if (DOWNGRADE_PATHS[currentPlan]?.includes(targetPlan)) return 'downgrade'
    return 'invalid'
  }

  const selectedPlanAction = selectedPlan ? resolvePlanChangeAction(selectedPlan) : 'invalid'

  const availablePlans = useMemo(() => {
    return PLAN_CODES.filter((planCode) => {
      if (planCode === 'founders_yearly' && !foundersEligible) return false
      const action = resolvePlanChangeAction(planCode)
      return action !== 'invalid' || planCode === currentPlan
    })
  }, [currentPlan, foundersEligible])

  useEffect(() => {
    if (!planPickerOpen || !selectedPlan || selectedPlanAction !== 'downgrade') {
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
        setMessage(payload?.error || 'Não foi possível simular a alteração de plano.')
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
          setMessage(payload?.error || 'Falha ao alterar assinatura.')
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

        setMessage(`Assinatura atualizada para ${PLAN_NAME[selectedPlan]}.`)
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
    if (!selectedPlan) return 'Selecione um plano'
    if (selectedPlanAction === 'upgrade') return `Ir para ${PLAN_NAME[selectedPlan]}`
    if (selectedPlanAction === 'downgrade') {
      return changeTiming === 'now'
        ? `Trocar agora para ${PLAN_NAME[selectedPlan]}`
        : `Agendar ${PLAN_NAME[selectedPlan]}`
    }
    if (selectedPlanAction === 'current' && scheduledChange?.target_plan) return 'Remover alteração agendada'
    if (selectedPlanAction === 'current') return 'Plano atual'
    return 'Alteração indisponível'
  })()

  if (loading) {
    return <div className="rounded-vintage border border-border bg-bg p-6 shadow-vintage text-ink/60">Carregando cobrança...</div>
  }

  return (
    <>
      <div className="rounded-vintage border border-border bg-bg p-6 shadow-vintage">
        <h1 className="mb-2 text-2xl font-serif text-coffee">Assinatura e pagamentos</h1>
        <p className="mb-6 text-sm text-ink/60">Gerencie plano, faturas, método de pagamento e cancelamento sem sair do app.</p>

        {message ? <p className="mb-4 text-sm text-ink/70">{message}</p> : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-paper p-4">
            <h2 className="mb-2 text-sm uppercase tracking-wide text-ink/50">Assinatura atual</h2>
            <p className="text-lg font-semibold text-coffee">{formatPlanName(currentPlan)}</p>
            <p className="mt-1 text-xs text-ink/60">
              Status: {data?.subscription?.status ? STATUS_LABELS[data.subscription.status] || data.subscription.status : 'n/d'}
            </p>
            <p className="mt-1 text-xs text-ink/60">
              Período atual até:{' '}
              {data?.subscription?.current_period_end
                ? new Date(data.subscription.current_period_end).toLocaleDateString('pt-BR')
                : 'n/d'}
            </p>
            <p className="mt-1 text-xs text-ink/60">{renewalLabel}</p>
            {scheduledChange?.target_plan && scheduledChange.effective_at ? (
              <p className="mt-2 text-xs text-ink/60">
                Alteração agendada: {PLAN_NAME[scheduledChange.target_plan]} em{' '}
                {new Date(scheduledChange.effective_at).toLocaleDateString('pt-BR')}
              </p>
            ) : null}
          </div>

          <div className="rounded-lg border border-border bg-paper p-4">
            <h2 className="mb-2 text-sm uppercase tracking-wide text-ink/50">Ações</h2>

            {!canManage ? (
              <p className="text-sm text-ink/60">Somente administradores da família podem gerenciar cobrança.</p>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setSelectedPlan(currentPlan)
                    setPlanPickerOpen(true)
                  }}
                  disabled={!data?.subscription}
                  className="rounded-full border border-border bg-bg px-4 py-2 text-sm text-ink/70 hover:bg-offWhite disabled:opacity-60"
                >
                  Alterar Plano de Assinatura
                </button>
                <button
                  onClick={startPaymentMethodUpdate}
                  disabled={!data?.subscription || actionLoading === 'payment_method'}
                  className="rounded-full border border-border bg-bg px-4 py-2 text-sm text-ink/70 hover:bg-offWhite disabled:opacity-60"
                >
                  {actionLoading === 'payment_method' ? 'Carregando...' : 'Atualizar método de pagamento'}
                </button>
                {scheduledChange?.target_plan ? (
                  <button
                    onClick={clearScheduledChange}
                    disabled={actionLoading === 'clear_schedule'}
                    className="rounded-full border border-border bg-bg px-4 py-2 text-sm text-ink/70 hover:bg-offWhite disabled:opacity-60"
                  >
                    {actionLoading === 'clear_schedule' ? 'Processando...' : 'Remover alteração agendada'}
                  </button>
                ) : null}
                <button
                  onClick={() => updateCancellation(!data?.subscription?.cancel_at_period_end)}
                  disabled={!data?.subscription || actionLoading === 'cancel' || actionLoading === 'resume'}
                  className="rounded-full border border-border bg-bg px-4 py-2 text-sm text-ink/70 hover:bg-offWhite disabled:opacity-60"
                >
                  {actionLoading === 'cancel' || actionLoading === 'resume'
                    ? 'Processando...'
                    : data?.subscription?.cancel_at_period_end
                      ? 'Reativar renovação automática'
                      : 'Cancelar Assinatura'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-border bg-paper p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm uppercase tracking-wide text-ink/50">Faturas</h2>
            <span className="text-xs text-ink/50">{invoices.length} registro(s)</span>
          </div>

          {!canManage ? (
            <p className="text-sm text-ink/60">Somente administradores da família podem visualizar as faturas.</p>
          ) : invoices.length === 0 ? (
            <p className="text-sm text-ink/60">Nenhuma fatura encontrada para esta família.</p>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="flex flex-col gap-3 rounded-lg border border-border px-4 py-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-coffee">
                      {invoice.number || invoice.id}
                    </p>
                    <p className="text-xs text-ink/60">
                      {new Date(invoice.created * 1000).toLocaleDateString('pt-BR')} · {invoice.status || 'sem status'}
                    </p>
                  </div>
                  <div className="text-sm text-ink/70">
                    {formatCurrency(invoice.amount_paid || invoice.amount_due, invoice.currency)}
                  </div>
                  <div className="flex gap-2">
                    {invoice.hosted_invoice_url ? (
                      <a
                        href={invoice.hosted_invoice_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-full border border-border bg-bg px-3 py-2 text-xs text-ink/70 hover:bg-offWhite"
                      >
                        Ver fatura
                      </a>
                    ) : null}
                    <a
                      href={`/api/billing/invoices/${invoice.id}/pdf`}
                      className="rounded-full border border-border bg-bg px-3 py-2 text-xs text-ink/70 hover:bg-offWhite"
                    >
                      Baixar PDF
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
                  <p className="text-xs uppercase tracking-[0.24em] text-coffee/55">Cobrança</p>
                  <h3 className="mt-1 text-2xl font-serif text-coffee">
                    {paymentFlow.type === 'payment_method'
                      ? 'Atualizar método de pagamento'
                      : `Confirmar ${PLAN_NAME[paymentFlow.targetPlan]}`}
                  </h3>
                  <p className="mt-2 text-sm text-ink/65">
                    {paymentFlow.type === 'payment_method'
                      ? 'Informe os novos dados do cartão para futuras cobranças.'
                      : 'Confirme o ajuste de cobrança para concluir a alteração de plano.'}
                  </p>
                </div>
                <button
                  className="rounded-full border border-border bg-bg px-3 py-2 text-sm text-ink/70 transition-vintage hover:bg-offWhite"
                  onClick={() => setPaymentFlow(null)}
                >
                  Fechar
                </button>
              </div>
            </div>

            <div className="px-6 py-6">
              {paymentFlow.type === 'plan_change' ? (
                <div className="mb-5 rounded-[18px] border border-border bg-paper p-4 text-sm text-ink/70">
                  <div className="flex items-center justify-between gap-3">
                    <span>Plano atual</span>
                    <span className="font-medium text-coffee">{PLAN_NAME[paymentFlow.currentPlan]}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span>Novo plano</span>
                    <span className="font-medium text-coffee">{PLAN_NAME[paymentFlow.targetPlan]}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span>{getImmediateAdjustmentLabel(paymentFlow.amountDue)}</span>
                    <span className="flex items-center gap-2 font-semibold text-coffee">
                      <span
                        className="group relative inline-flex h-5 w-5 cursor-help items-center justify-center text-ink/55"
                        aria-label="Informações sobre ajuste imediato"
                      >
                        <Info className="h-4 w-4" />
                        <span className="pointer-events-none absolute right-0 top-full z-10 mt-2 hidden w-72 rounded-[14px] border border-border bg-bg p-3 text-left text-xs font-normal text-ink/70 shadow-soft group-hover:block">
                          {getImmediateAdjustmentHelpText(paymentFlow.amountDue)}
                        </span>
                      </span>
                      {formatCurrency(paymentFlow.amountDue, paymentFlow.currency)}
                    </span>
                  </div>
                  {paymentFlow.targetRecurringAmount !== null ? (
                    <>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <div>
                          <div>Preço base da renovação</div>
                          <div className="text-xs text-ink/55">{getNextRenewalLabel(paymentFlow.targetPlan)}</div>
                        </div>
                        <span className="font-medium text-coffee">
                          {formatCurrency(paymentFlow.targetRecurringAmount, paymentFlow.currency)}
                        </span>
                      </div>
                      {getEstimatedNextCharge(paymentFlow.targetRecurringAmount, paymentFlow.amountDue) !== null ? (
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <div>
                            <div>Estimativa da próxima cobrança</div>
                            <div className="text-xs text-ink/55">Considerando o crédito já gerado nesta alteração.</div>
                          </div>
                          <span className="font-medium text-coffee">
                            {formatCurrency(
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
                submitLabel={paymentFlow.type === 'payment_method' ? 'Salvar cartão' : 'Confirmar mudança de plano'}
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
                      setMessage(payload?.error || 'Não foi possível salvar o método de pagamento.')
                      return
                    }
                  }

                  setPaymentFlow(null)
                  setMessage(
                    paymentFlow.type === 'payment_method'
                      ? 'Método de pagamento atualizado com sucesso.'
                      : `Assinatura atualizada para ${PLAN_NAME[paymentFlow.targetPlan]}.`,
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
                  <p className="text-xs uppercase tracking-[0.24em] text-coffee/55">Cobrança</p>
                  <h3 className="mt-1 text-2xl font-serif text-coffee">Alterar Plano de Assinatura</h3>
                  <p className="mt-2 text-sm text-ink/65">
                    Escolha o plano desejado. Mudanças para planos superiores acontecem agora; mudanças para planos inferiores ficam agendadas para o fim do período.
                  </p>
                </div>
                <button
                  className="rounded-full border border-border bg-bg px-3 py-2 text-sm text-ink/70 transition-vintage hover:bg-offWhite"
                  onClick={() => setPlanPickerOpen(false)}
                >
                  Fechar
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
                            ? 'Plano atual'
                            : isScheduled
                              ? `Alteração já agendada para ${new Date(scheduledChange!.effective_at!).toLocaleDateString('pt-BR')}`
                              : resolvePlanChangeAction(planCode) === 'upgrade'
                                ? 'Mudança imediata'
                                : resolvePlanChangeAction(planCode) === 'downgrade'
                                  ? 'Mudança no fim do período'
                                  : 'Indisponível'}
                        </div>
                      </div>
                      <div className="text-xs text-ink/60">
                        {isCurrent ? 'Atual' : isScheduled ? 'Agendado' : null}
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
                      Trocar no fim do período
                    </button>
                    <button
                      type="button"
                      onClick={() => setChangeTiming('now')}
                      className={`rounded-full border bg-bg px-4 py-2 text-sm ${
                        changeTiming === 'now' ? 'border-sidebar text-coffee' : 'border-border text-ink/70'
                      }`}
                    >
                      Trocar agora
                    </button>
                  </div>

                  {changeTiming === 'period_end' ? (
                    <div className="space-y-2">
                      <div className="rounded-[16px] border border-border bg-offWhite px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <span>Até a troca</span>
                          <span className="font-medium text-coffee">{PLAN_NAME[currentPlan as PlanCode]}</span>
                        </div>
                        <div className="mt-1 text-xs text-ink/55">
                          Seu plano atual permanece ativo até{' '}
                          {new Date(data.subscription.current_period_end).toLocaleDateString('pt-BR')}.
                        </div>
                      </div>

                      {planPreview && planPreview.targetRecurringAmount !== null ? (
                        <div className="rounded-[16px] border border-border bg-offWhite px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <span>Cobrança imediata</span>
                            <span className="font-medium text-coffee">R$ 0,00</span>
                          </div>
                          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                            <div>
                              <div>{getNextRenewalLabel(selectedPlan)}</div>
                              <div className="text-xs text-ink/55">
                                O novo valor passa a valer somente após a data acima.
                              </div>
                            </div>
                            <span className="pt-0.5 text-right font-medium text-coffee">
                              {formatCurrency(planPreview.targetRecurringAmount, planPreview.currency)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          A mudança para {PLAN_NAME[selectedPlan]} será aplicada em{' '}
                          {new Date(data.subscription.current_period_end).toLocaleDateString('pt-BR')}.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {actionLoading === 'preview_change' ? (
                        <div className="flex flex-col items-center justify-center gap-3 rounded-[16px] border border-border bg-offWhite px-4 py-6 text-center text-sm text-ink/70">
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-sidebar/20 border-t-sidebar" />
                          <div>Simulando ajuste de cobrança...</div>
                        </div>
                      ) : null}
                      {actionLoading !== 'preview_change' && planPreview ? (
                        <>
                          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                            <span>{getImmediateAdjustmentLabel(planPreview.immediateAdjustment)}</span>
                            <span className="flex items-center justify-end gap-2 pt-0.5 text-right font-medium text-coffee">
                              <span
                                className="group relative inline-flex h-5 w-5 cursor-help items-center justify-center text-ink/55"
                                aria-label="Informações sobre ajuste imediato"
                              >
                                <Info className="h-4 w-4" />
                                <span className="pointer-events-none absolute right-0 top-full z-10 mt-2 hidden w-72 rounded-[14px] border border-border bg-bg p-3 text-left text-xs font-normal text-ink/70 shadow-soft group-hover:block">
                                  {getImmediateAdjustmentHelpText(planPreview.immediateAdjustment)}
                                </span>
                              </span>
                              {formatCurrency(planPreview.immediateAdjustment, planPreview.currency)}
                            </span>
                          </div>
                          {planPreview.targetRecurringAmount !== null ? (
                            <>
                              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                                <div>
                                  <div>Preço base da renovação</div>
                                  <div className="text-xs text-ink/55">{getNextRenewalLabel(selectedPlan)}</div>
                                </div>
                                <span className="pt-0.5 text-right font-medium text-coffee">
                                  {formatCurrency(planPreview.targetRecurringAmount, planPreview.currency)}
                                </span>
                              </div>
                              {getEstimatedNextCharge(planPreview.targetRecurringAmount, planPreview.immediateAdjustment) !== null ? (
                                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                                  <div>
                                    <div>Estimativa da próxima cobrança</div>
                                    <div className="text-xs text-ink/55">
                                      Considerando o crédito já gerado nesta alteração.
                                    </div>
                                  </div>
                                  <span className="pt-0.5 text-right font-medium text-coffee">
                                    {formatCurrency(
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
                              formatApproximateCycles(planPreview.immediateAdjustment, planPreview.targetRecurringAmount) ? (
                                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                                  <div>
                                    <div>Estimativa de duração do crédito</div>
                                    <div className="text-xs text-ink/55">
                                      Aproximação com base no valor mensal atual, sem considerar futuras mudanças.
                                    </div>
                                  </div>
                                  <span className="pt-0.5 text-right font-medium leading-6 text-coffee">
                                    {formatApproximateCycles(
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

              {selectedPlan === 'founders_yearly' && !foundersEligible ? (
                <div className="rounded-[18px] border border-border bg-paper p-4 text-sm text-ink/70">
                  O Plano Fundadores só fica disponível para famílias habilitadas.
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setPlanPickerOpen(false)}
                  className="rounded-full border border-border bg-bg px-4 py-3 text-sm font-medium text-ink/70 transition-vintage hover:bg-offWhite"
                >
                  Fechar
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
