'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'

type InviteInfo = {
  email: string
  familyName: string
}

function InvitePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, acceptInvite } = useAuth()
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const token = searchParams.get('token')

  useEffect(() => {
    if (user) {
      router.push('/inicio')
    }
  }, [user, router])

  useEffect(() => {
    const fetchInvite = async () => {
      if (!token) {
        setError('Convite inválido.')
        setLoading(false)
        return
      }

      const response = await fetch(`/api/invites/lookup?token=${token}`)
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        setError(payload?.error || 'Convite inválido.')
        setLoading(false)
        return
      }

      const payload = await response.json()
      setInviteInfo({ email: payload.email, familyName: payload.familyName })
      setLoading(false)
    }

    fetchInvite()
  }, [token])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (!inviteInfo || !token) return

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.')
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setSubmitting(true)

    try {
      await acceptInvite(token, inviteInfo.email, name, password)
    } catch (err: any) {
      setError(err.message || 'Erro ao aceitar convite.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-sidebar text-paper flex items-center justify-center px-6 py-10 relative">
      <img
        src="/logo-florim.png"
        alt="Florim"
        className="w-32 h-32 object-contain absolute left-8 top-8"
      />
      <div className="w-full max-w-6xl flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
        <div className="text-center md:text-left">
          <p className="text-2xl md:text-2xl font-serif italic text-gold leading-relaxed max-w-sm mx-auto md:mx-0">
            Aceite o convite e compartilhe o cuidado financeiro do seu lar.
          </p>
        </div>

        <div className="bg-paper backdrop-blur-sm rounded-[28px] border border-border/70 shadow-vintage p-12 w-full md:max-w-xl md:-translate-y-6">
          <h2 className="text-2xl font-serif text-coffee mb-6">Aceitar convite</h2>
          {loading ? (
            <p className="text-sm text-ink/60 font-body">Carregando convite...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-gold/10 border border-gold/30 text-gold px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {inviteInfo && (
                <div className="bg-paper border border-border rounded-lg px-4 py-3 text-sm text-ink/70 font-body">
                  Você foi convidado para <strong>{inviteInfo.familyName}</strong>.
                </div>
              )}

              <div>
                <label className="block text-sm font-body text-ink mb-2">Email</label>
                <input
                  type="email"
                  value={inviteInfo?.email ?? ''}
                  disabled
                  className="w-full px-4 py-3 bg-white/70 border border-border rounded-full text-ink/60"
                />
              </div>

              <div>
                <label className="block text-sm font-body text-ink mb-2">Seu nome</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  className="w-full px-4 py-3 bg-white/70 border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-petrol/40 transition-vintage"
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <label className="block text-sm font-body text-ink mb-2">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-white/70 border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-petrol/40 transition-vintage"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-body text-ink mb-2">Confirmar senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-white/70 border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-petrol/40 transition-vintage"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-sidebar text-paper py-3 rounded-full font-semibold hover:opacity-90 transition-vintage disabled:opacity-50"
              >
                {submitting ? 'Criando...' : 'Aceitar convite'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-4">Carregando...</div>}>
      <InvitePageContent />
    </Suspense>
  )
}
