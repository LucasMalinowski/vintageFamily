'use client'

import { useState } from 'react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'

const LOCATIONS = [
  'WhatsApp — Criar registro',
  'WhatsApp — Consultar dados',
  'WhatsApp — Editar/Apagar registro',
  'App — Despesas',
  'App — Receitas',
  'App — Poupanças',
  'App — Lembretes',
  'App — Importar Extrato',
  'App — Configurações',
  'Outro',
]

const TYPES = [
  { value: 'bug', label: 'Bug 🐛', description: 'Algo quebrou ou não funcionou como esperado' },
  { value: 'suggestion', label: 'Sugestão 💡', description: 'Uma ideia para melhorar o Florim' },
  { value: 'feedback', label: 'Feedback 💬', description: 'Uma opinião geral sobre o produto' },
] as const

type FeedbackType = (typeof TYPES)[number]['value']

export default function FeedbackPage() {
  const [type, setType] = useState<FeedbackType>('bug')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, location: location || undefined, description, name: name || undefined, email: email || undefined, phone: phone || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao enviar')
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PublicNavbar />
      <main className="bg-paper min-h-screen">
        <div className="max-w-xl mx-auto px-5 pb-16 pt-24 md:px-6 md:pt-36">
          <h1 className="text-4xl font-serif text-coffee mb-2">Feedback</h1>
          <p className="text-sm text-ink/60 font-body mb-10">
            Encontrou um problema ou tem uma sugestão? Conta pra gente — cada feedback nos ajuda a melhorar.
          </p>

          {success ? (
            <div className="bg-sage/10 border border-sage/30 rounded-vintage p-6 text-center">
              <p className="text-2xl mb-2">🙏</p>
              <p className="font-serif text-coffee text-lg mb-1">Obrigado!</p>
              <p className="text-sm text-ink/70 font-body">Seu feedback foi enviado. Vamos analisar e melhorar.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-ink mb-3">Tipo <span className="text-terracotta">*</span></label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {TYPES.map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setType(t.value)}
                      className={`text-left px-4 py-3 rounded-vintage border text-sm transition-colors ${
                        type === t.value
                          ? 'border-coffee bg-coffee/5 text-coffee'
                          : 'border-border bg-bg text-ink/70 hover:border-coffee/50'
                      }`}
                    >
                      <span className="font-medium block">{t.label}</span>
                      <span className="text-xs text-ink/50 mt-0.5 block">{t.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-ink mb-1.5">
                  Onde aconteceu?
                </label>
                <select
                  id="location"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full border border-border rounded-vintage bg-bg px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-coffee"
                >
                  <option value="">Selecione (opcional)</option>
                  {LOCATIONS.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-ink mb-1.5">
                  O que aconteceu? <span className="text-terracotta">*</span>
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  placeholder="Descreva com detalhes o que deu errado ou a sua sugestão..."
                  className="w-full border border-border rounded-vintage bg-bg px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-coffee resize-none"
                  required
                />
                <p className="text-xs text-ink/40 mt-1 text-right">{description.length}/2000</p>
              </div>

              <div className="border-t border-border pt-5">
                <p className="text-xs text-ink/50 font-body mb-4">Dados de contato (opcionais) — preencha se quiser que a gente entre em contato:</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="name" className="block text-xs font-medium text-ink/70 mb-1">Nome</label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Seu nome"
                      className="w-full border border-border rounded-vintage bg-bg px-3 py-2 text-sm text-ink focus:outline-none focus:border-coffee"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-xs font-medium text-ink/70 mb-1">E-mail</label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full border border-border rounded-vintage bg-bg px-3 py-2 text-sm text-ink focus:outline-none focus:border-coffee"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-xs font-medium text-ink/70 mb-1">Telefone</label>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="(00) 00000-0000"
                      className="w-full border border-border rounded-vintage bg-bg px-3 py-2 text-sm text-ink focus:outline-none focus:border-coffee"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-terracotta/10 border border-terracotta/30 text-terracotta px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || description.trim().length === 0}
                className="w-full bg-coffee text-paper font-medium py-3 rounded-vintage hover:bg-coffee/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? 'Enviando...' : 'Enviar feedback'}
              </button>
            </form>
          )}
        </div>
      </main>
      <PublicFooter />
    </>
  )
}
