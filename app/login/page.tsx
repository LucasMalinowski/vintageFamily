'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const { signIn, user } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      router.push('/inicio')
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[url('/texture-green.png')] bg-cover bg-center text-paper flex items-center justify-center px-6 py-10 relative">
      <img
        src="/logo-florim.png"
        alt="Florim"
        className="w-32 h-32 object-contain absolute left-8 top-8"
      />
      <div className="w-full max-w-6xl flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
        <div className="text-center md:text-left">
          <p className="text-2xl md:text-2xl font-serif italic text-gold leading-relaxed max-w-sm mx-auto md:mx-0">
            Organizar o dinheiro é cuidar do tempo que ainda vamos viver.
          </p>
        </div>

        <div className="bg-paper/80 backdrop-blur-sm rounded-[28px] border border-border/70 shadow-vintage p-12 w-full md:max-w-xl md:-translate-y-6">
          <h2 className="text-2xl font-serif text-coffee mb-6">Entre na sua conta</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-gold/10 border border-gold/30 text-gold px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-body text-ink mb-2">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/70 border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-petrol/40 transition-vintage"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-body text-ink mb-2">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white/70 border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-petrol/40 transition-vintage"
                placeholder="••••••••"
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                className="text-sm text-gold hover:opacity-80 transition-vintage"
              >
                Esqueci minha senha
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sidebar text-paper py-3 rounded-full font-semibold hover:opacity-90 transition-vintage disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Acessar'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-ink/60">
            Ainda não tem uma conta?{' '}
            <Link
              href="/signup"
              className="text-gold hover:opacity-80 transition-vintage"
            >
              Criar agora
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
