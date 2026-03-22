'use client'

import { useEffect, useState } from 'react'
import { getAuthBearerToken } from '@/lib/billing/client'

type BillingResponse = {
  subscription: {
    plan_code: string | null
    status: string | null
    current_period_start: string | null
    current_period_end: string | null
    cancel_at_period_end: boolean | null
  } | null
  access: {
    hasValidSubscription: boolean
    hasActiveTrial: boolean
    hasAccess: boolean
  }
}

export default function BillingSettingsPage() {
  const [data, setData] = useState<BillingResponse | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = async () => {
    const token = await getAuthBearerToken()
    if (!token) {
      setMessage('Sessão inválida. Faça login novamente.')
      return
    }

    const response = await fetch('/api/billing/me', {
      headers: { Authorization: `Bearer ${token}` },
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      setMessage(payload?.error || 'Não foi possível carregar dados de assinatura.')
      return
    }

    setData(payload)
  }

  useEffect(() => {
    load()
  }, [])

  const openPortal = async () => {
    const token = await getAuthBearerToken()
    if (!token) return

    const response = await fetch('/api/billing/create-portal-session', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok || !payload?.url) {
      setMessage(payload?.error || 'Não foi possível abrir o portal de cobrança.')
      return
    }

    window.location.href = payload.url
  }

  const upgrade = async (planCode: 'standard_yearly' | 'founders_yearly') => {
    const token = await getAuthBearerToken()
    if (!token) return

    const response = await fetch('/api/billing/upgrade-subscription', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ plan_code: planCode }),
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      setMessage(payload?.error || 'Falha ao atualizar assinatura.')
      return
    }

    setMessage('Upgrade solicitado com sucesso.')
    await load()
  }

  return (
    <div className="bg-bg border border-border rounded-vintage shadow-vintage p-6">
      <h1 className="text-2xl font-serif text-coffee mb-2">Assinatura & Pagamentos</h1>
      <p className="text-sm text-ink/60 mb-6">Gerencie faturas, método de pagamento, cancelamento e upgrade.</p>

      {message ? <p className="mb-4 text-sm text-ink/70">{message}</p> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="border border-border rounded-lg p-4 bg-paper">
          <h2 className="text-sm uppercase tracking-wide text-ink/50 mb-2">Assinatura atual</h2>
          <p className="text-lg font-semibold text-coffee">{data?.subscription?.plan_code || 'Sem assinatura'}</p>
          <p className="text-xs text-ink/60 mt-1">Status: {data?.subscription?.status || 'n/a'}</p>
          <p className="text-xs text-ink/60 mt-1">
            Período atual até:{' '}
            {data?.subscription?.current_period_end
              ? new Date(data.subscription.current_period_end).toLocaleDateString('pt-BR')
              : 'n/a'}
          </p>
          <p className="text-xs text-ink/60 mt-1">
            Cancelamento no fim do período: {data?.subscription?.cancel_at_period_end ? 'Sim' : 'Não'}
          </p>
        </div>

        <div className="border border-border rounded-lg p-4 bg-paper">
          <h2 className="text-sm uppercase tracking-wide text-ink/50 mb-2">Ações</h2>
          <div className="flex flex-col gap-2">
            <button
              onClick={openPortal}
              className="rounded-full border border-border px-4 py-2 text-sm text-ink/70 hover:bg-paper"
            >
              Abrir portal Stripe
            </button>
            <button
              onClick={() => upgrade('standard_yearly')}
              className="rounded-full border border-border px-4 py-2 text-sm text-ink/70 hover:bg-paper"
            >
              Upgrade para Standard Anual
            </button>
            <button
              onClick={() => upgrade('founders_yearly')}
              className="rounded-full border border-border px-4 py-2 text-sm text-ink/70 hover:bg-paper"
            >
              Upgrade para Founders Anual
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
