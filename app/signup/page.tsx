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
    <div className="min-h-screen bg-moss text-white flex items-center justify-center p-6">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        <div className="space-y-6">
          <img src="/logo1.png" alt="Florim" className="w-20 h-20 object-contain" />
          <p className="text-gold text-lg italic max-w-sm">
            Uma casa tranquila nasce de pequenas escolhas repetidas.
          </p>
        </div>

        <div className="bg-paper-2 text-ink rounded-3xl p-8 shadow-xl border border-border">
          <h1 className="text-3xl font-serif text-olive mb-6">Criar família</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-terracotta/10 border border-terracotta/40 text-terracotta px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm text-olive mb-2">
                Seu nome
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-warm border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-gold/40"
                placeholder="João Silva"
              />
            </div>

            <div>
              <label htmlFor="familyName" className="block text-sm text-olive mb-2">
                Nome da família
              </label>
              <input
                id="familyName"
                type="text"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                required
                className="w-full px-4 py-3 bg-warm border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-gold/40"
                placeholder="Família Silva"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm text-olive mb-2">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-warm border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-gold/40"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm text-olive mb-2">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-warm border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-gold/40"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm text-olive mb-2">
                Confirmar senha
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-warm border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-gold/40"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-olive text-white py-3 rounded-full font-medium hover:bg-olive/90 transition-vintage disabled:opacity-50"
            >
              {loading ? 'Criando...' : 'Criar família'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-olive/70">
            Já tem uma conta?{' '}
            <Link href="/login" className="text-gold hover:text-gold/80 transition-vintage">
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
