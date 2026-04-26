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
    <div className="min-h-screen bg-sidebar text-paper relative">

      {/* ── Mobile layout ──────────────────────────────────────── */}
      <div className="flex flex-col min-h-screen md:hidden">
        {/* Logo — bigger and more prominent */}
        <div className="flex flex-col items-center pt-10 pb-2 shrink-0">
          <img src="/logo-florim.png" alt="Florim" className="h-24 object-contain" />
        </div>

        {/* Quote — fixed padding, not flex-1 */}
        <div className="px-10 pt-5 pb-7 text-center shrink-0">
          <p className="font-serif italic text-[20px] text-gold text-center leading-[1.55]">
            &ldquo;Organizar o dinheiro é cuidar do tempo que ainda vamos viver.&rdquo;
          </p>
        </div>

        {/* Form card — flex-1 so it fills all remaining space */}
        <div className="flex-1 bg-paper rounded-t-[28px] px-7 pt-8 pb-10">
          <h2 className="font-serif text-[24px] text-coffee mb-5">Entre na sua conta</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-[14px]">
            {error && (
              <div className="bg-gold/10 border border-gold/30 text-gold px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-[15px] font-body text-ink mb-2">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3.5 bg-offWhite text-ink/80 border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-paper-2/40 transition-vintage text-[15px]"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className="block text-[15px] font-body text-ink mb-2">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3.5 bg-offWhite text-ink/80 border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-paper-2/40 transition-vintage text-[15px]"
                placeholder="••••••••"
              />
            </div>
            <div className="text-right">
              <button type="button" className="text-[14px] text-gold hover:opacity-80 transition-vintage">
                Esqueci minha senha
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-sidebar text-paper py-[15px] rounded-full font-bold text-[16px] hover:opacity-90 transition-vintage disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Acessar'}
            </button>
          </form>
          <div className="mt-5 text-center text-[15px] text-ink/55">
            Não tem conta?{' '}
            <Link href="/signup" className="text-gold font-semibold hover:opacity-80 transition-vintage">
              Criar agora
            </Link>
          </div>
        </div>
      </div>

      {/* ── Desktop layout ─────────────────────────────────────── */}
      <div className="hidden md:flex min-h-screen items-center justify-center px-6 py-10 relative">
        <img
          src="/logo-florim.png"
          alt="Florim"
          className="w-44 h-44 object-contain absolute left-8 top-8"
        />

        <div className="w-full max-w-6xl flex flex-col gap-10 md:flex-row md:items-center md:justify-between">
          <div className="text-center md:text-left">
            <p className="text-2xl font-serif italic text-gold leading-relaxed max-w-sm mx-auto md:mx-0">
              Organizar o dinheiro é cuidar do tempo que ainda vamos viver.
            </p>
          </div>

          <div className="bg-paper backdrop-blur-sm rounded-[28px] border border-border/70 shadow-vintage p-12 w-full md:max-w-xl md:-translate-y-6">
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
                  className="w-full px-4 py-3 bg-white/70 text-ink/80 border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-paper-2/40 transition-vintage"
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
                  className="w-full px-4 py-3 bg-white/70 text-ink/80 border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-paper-2/40 transition-vintage"
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
                className="w-full bg-sidebar/90 text-paper py-3 rounded-full font-semibold hover:opacity-90 transition-vintage disabled:opacity-50"
              >
                {loading ? 'Entrando...' : 'Acessar'}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-ink/60">
              Ainda não tem uma conta?{' '}
              <Link href="/signup" className="text-gold hover:opacity-80 transition-vintage">
                Criar agora
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
