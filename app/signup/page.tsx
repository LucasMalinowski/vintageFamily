'use client'

import { useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'

export default function SignUpPage() {
  const { signUp } = useAuth()
  const [name, setName] = useState('')
  const [familyName, setFamilyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [agreed, setAgreed] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      await signUp(email, password, name, familyName)
    } catch (err: any) {
      setError(err.message || 'Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col md:items-center md:justify-center md:p-4">

      {/* Header — logo + title (always visible, adjusts sizing per breakpoint) */}
      <div className="pt-12 pb-2 px-7 text-center md:mb-8 md:pt-0 shrink-0">
        <img
          src="/logo.png"
          alt="Florim"
          className="w-[52px] h-[52px] md:w-20 md:h-20 object-contain mx-auto mb-3"
        />
        <h1 className="font-serif text-[26px] md:text-4xl text-coffee mb-2">
          Criar Família
        </h1>
        <p className="text-ink/60 italic font-body text-[13px] md:text-base">
          Uma casa tranquila nasce de pequenas escolhas repetidas.
        </p>
      </div>

      {/* Form — flat on mobile, card on desktop */}
      <div className="flex-1 md:flex-none w-full md:max-w-md md:bg-offWhite md:rounded-vintage md:border md:border-border md:shadow-vintage md:p-8 overflow-y-auto">
        <div className="px-7 pb-10 md:px-0 md:pb-0">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="bg-terracotta/10 border border-terracotta/30 text-terracotta px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-body text-ink mb-2">
                Seu nome
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50 transition-vintage"
                placeholder="João Silva"
              />
            </div>

            <div>
              <label htmlFor="familyName" className="block text-sm font-body text-ink mb-2">
                Nome da família
              </label>
              <input
                id="familyName"
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50 transition-vintage"
                placeholder="Família Silva"
              />
            </div>

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
                className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50 transition-vintage"
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
                minLength={6}
                className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50 transition-vintage"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-body text-ink mb-2">
                Confirmar senha
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-paper border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-paper-2/50 transition-vintage"
                placeholder="••••••••"
              />
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 accent-coffee"
                required
              />
              <span className="text-[12px] md:text-sm font-body text-ink/70 leading-relaxed">
                Li e concordo com os{' '}
                <Link href="/terms" className="text-coffee underline underline-offset-2 hover:text-coffee/80">
                  Termos de Uso
                </Link>{' '}
                e a{' '}
                <Link href="/privacy" className="text-coffee underline underline-offset-2 hover:text-coffee/80">
                  Política de Privacidade
                </Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !agreed}
              className="w-full bg-coffee text-paper py-[14px] rounded-[10px] font-body font-bold text-[15px] hover:bg-coffee/90 transition-vintage disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar família'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <Link
              href="/login"
              className="text-petrol hover:text-petrol/80 transition-vintage text-[13px] md:text-sm font-body"
            >
              Já tem uma conta? Entrar
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
