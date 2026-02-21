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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Ornament */}
        <div className="text-center mb-8">
          <div className="inline-block">
            <svg width="80" height="40" viewBox="0 0 80 40" fill="none" className="mx-auto mb-4">
              <path d="M0 20 Q 20 10, 40 20 T 80 20" stroke="#5A4633" strokeWidth="1" fill="none" />
              <circle cx="40" cy="20" r="3" fill="#5A4633" />
            </svg>
          </div>
          <h1 className="text-4xl font-serif text-coffee mb-2">
            Criar Família
          </h1>
          <p className="text-ink/60 italic font-body">
            Uma casa tranquila nasce de pequenas escolhas repetidas.
          </p>
        </div>

        {/* Card */}
        <div className="bg-bg rounded-vintage border border-border shadow-vintage p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-coffee text-paper py-3 rounded-lg font-body hover:bg-coffee/90 transition-vintage disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar família'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-petrol hover:text-petrol/80 transition-vintage text-sm font-body"
            >
              Já tem uma conta? Entrar
            </Link>
          </div>
        </div>

        {/* Footer ornament */}
        <div className="mt-8 text-center">
          <svg width="60" height="20" viewBox="0 0 60 20" fill="none" className="mx-auto">
            <path d="M0 10 L 60 10" stroke="#D9CFBF" strokeWidth="1" />
          </svg>
        </div>
      </div>
    </div>
  )
}
