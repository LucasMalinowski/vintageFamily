'use client'

import { useAuth } from '@/components/AuthProvider'

export default function PaymentSettingsPage() {
  const { trialEndsAt, isTrialExpired } = useAuth()

  return (
    <div className="bg-paper border border-border rounded-3xl p-6 shadow-soft">
      <h1 className="text-2xl font-serif text-olive mb-2">Assinatura</h1>
      <p className="text-sm text-ink/70 mb-6">
        Gerencie seu plano, acompanhe o período de teste e mantenha o Florim sempre ativo.
      </p>

      <div className="bg-paper-2 rounded-2xl border border-border p-4 mb-6">
        <p className="text-sm text-ink/70">
          Status:{' '}
          <span className={`font-semibold ${isTrialExpired ? 'text-terracotta' : 'text-olive'}`}>
            {isTrialExpired ? 'Teste encerrado' : 'Teste ativo'}
          </span>
        </p>
        {trialEndsAt && (
          <p className="text-xs text-ink/50 mt-2">
            Validade do teste: {trialEndsAt.toLocaleDateString('pt-BR')}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border rounded-2xl p-4">
          <h2 className="font-serif text-lg text-olive">Plano mensal</h2>
          <p className="text-sm text-ink/60 mt-2">Acesso completo com renovação mensal.</p>
          <button className="mt-4 px-4 py-2 rounded-full bg-olive text-white text-sm">
            Assinar
          </button>
        </div>
        <div className="border border-border rounded-2xl p-4">
          <h2 className="font-serif text-lg text-olive">Plano anual</h2>
          <p className="text-sm text-ink/60 mt-2">Economize com pagamento anual.</p>
          <button className="mt-4 px-4 py-2 rounded-full bg-olive text-white text-sm">
            Assinar
          </button>
        </div>
      </div>
    </div>
  )
}
