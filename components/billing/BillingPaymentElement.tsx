'use client'

import { FormEvent, useMemo, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null

function BillingPaymentForm({
  clientSecret,
  submitLabel,
  onSuccess,
  onCancel,
}: {
  clientSecret: string
  submitLabel: string
  onSuccess: (result?: { setupIntentId?: string; paymentIntentId?: string }) => void
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
        setError(result.error.message || 'Não foi possível atualizar o método de pagamento.')
      } else {
        onSuccess({ setupIntentId: result.setupIntent?.id })
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
      setError(result.error.message || 'Não foi possível confirmar o pagamento.')
    } else {
      onSuccess({ paymentIntentId: result.paymentIntent?.id })
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
          {submitting ? 'Processando...' : submitLabel}
        </button>
      </div>
    </form>
  )
}

export default function BillingPaymentElement({
  clientSecret,
  submitLabel,
  onSuccess,
  onCancel,
}: {
  clientSecret: string
  submitLabel: string
  onSuccess: (result?: { setupIntentId?: string; paymentIntentId?: string }) => void
  onCancel: () => void
}) {
  if (!stripePromise) {
    return <p className="text-sm text-red-700">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY nao configurada.</p>
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
      <BillingPaymentForm
        clientSecret={clientSecret}
        submitLabel={submitLabel}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  )
}
