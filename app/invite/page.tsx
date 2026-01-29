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
      router.push('/')
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
    <div className="min-h-screen bg-moss text-white flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <div className="space-y-6">
          <img src="/logo1.png" alt="Florim" className="w-20 h-20 object-contain" />
          <p className="text-gold text-lg italic max-w-sm">
            Entre para a sua nova família financeira.
          </p>
        </div>

        <div className="bg-paper-2 text-ink rounded-3xl p-8 shadow-xl border border-border">
          <h1 className="text-3xl font-serif text-olive mb-6">Aceitar convite</h1>

          {loading ? (
            <p className="text-sm text-ink/60">Carregando convite...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-terracotta/10 border border-terracotta/40 text-terracotta px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {inviteInfo && (
                <div className="bg-warm border border-border rounded-full px-4 py-3 text-sm text-ink/70">
                  Você foi convidado para <strong>{inviteInfo.familyName}</strong>.
                </div>
              )}

              <div>
                <label className="block text-sm text-olive mb-2">Email</label>
                <input
                  type="email"
                  value={inviteInfo?.email ?? ''}
                  disabled
                  className="w-full px-4 py-3 bg-warm border border-border rounded-full text-ink/60"
                />
              </div>

              <div>
                <label className="block text-sm text-olive mb-2">Seu nome</label>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  className="w-full px-4 py-3 bg-warm border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-gold/40"
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <label className="block text-sm text-olive mb-2">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-warm border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-gold/40"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm text-olive mb-2">Confirmar senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 bg-warm border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-gold/40"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-olive text-white py-3 rounded-full font-medium hover:bg-olive/90 transition-vintage disabled:opacity-50"
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
