'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { getAuthBearerToken } from '@/lib/billing/client'

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null

function CheckoutForm({
  clientSecret,
  onSuccess,
  onCancel,
}: {
  clientSecret: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSetupIntent = useMemo(() => clientSecret.startsWith('seti_'), [clientSecret])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) return

    setSubmitting(true)
    setError(null)

    if (isSetupIntent) {
      const result = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
      })

      if (result.error) {
        setError(result.error.message || 'Pagamento não pôde ser confirmado.')
      } else {
        onSuccess()
      }

      setSubmitting(false)
      return
    }

    const result = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        return_url: `${window.location.origin}/settings/billing`,
      },
    })

    if (result.error) {
      setError(result.error.message || 'Pagamento não pôde ser confirmado.')
    } else {
      onSuccess()
    }

    setSubmitting(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-[18px] border border-border bg-paper p-4 shadow-soft">
        <PaymentElement />
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-border px-4 py-3 text-sm font-medium text-ink/70 transition-vintage hover:bg-paper"
        >
          Fechar
        </button>
        <button
          type="submit"
          disabled={!stripe || submitting}
          className="rounded-full bg-sidebar px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? 'Processando...' : 'Confirmar assinatura'}
        </button>
      </div>
    </form>
  )
}

export default function PlanCheckout({
  planCode,
  onSuccess,
  onCancel,
}: {
  planCode: string
  onSuccess: () => void
  onCancel: () => void
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      setError(null)
      setClientSecret(null)

      const token = await getAuthBearerToken()
      if (!token) {
        setError('Sessão inválida. Faça login novamente.')
        setLoading(false)
        return
      }

      const response = await fetch('/api/billing/create-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ plan_code: planCode }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setError(payload?.error || 'Não foi possível iniciar a assinatura.')
        setLoading(false)
        return
      }

      setClientSecret(payload.client_secret)
      setLoading(false)
    }

    run()
  }, [planCode])

  if (loading) {
    return <p className="text-sm text-ink/60">Inicializando checkout...</p>
  }

  if (!stripePromise) {
    return <p className="text-sm text-red-700">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY nao configurada.</p>
  }

  if (error || !clientSecret) {
    return <p className="text-sm text-red-700">{error || 'Erro no checkout.'}</p>
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#3E5F4B',
            colorBackground: '#F5F1EB',
            colorText: '#2F3B33',
            colorDanger: '#b84f3c',
            borderRadius: '14px',
            fontFamily: 'Inter, sans-serif',
          },
          rules: {
            '.Input': {
              border: '1px solid #E4D7C2',
              boxShadow: 'none',
            },
            '.Input:focus': {
              border: '1px solid #3E5F4B',
              boxShadow: '0 0 0 1px #3E5F4B',
            },
            '.Label': {
              color: '#2F3B33',
              fontWeight: '500',
            },
          },
        },
      }}
    >
      <CheckoutForm clientSecret={clientSecret} onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  )
}
