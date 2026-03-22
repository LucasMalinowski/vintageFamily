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
}: {
  clientSecret: string
  onSuccess: () => void
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="w-full rounded-full bg-gold px-4 py-3 text-sidebar font-semibold disabled:opacity-60"
      >
        {submitting ? 'Processando...' : 'Confirmar assinatura'}
      </button>
    </form>
  )
}

export default function PlanCheckout({
  planCode,
  onSuccess,
}: {
  planCode: string
  onSuccess: () => void
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
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CheckoutForm clientSecret={clientSecret} onSuccess={onSuccess} />
    </Elements>
  )
}
