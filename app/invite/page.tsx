'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'

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
  const [agreed, setAgreed] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const submittedRef = useRef(false)

  const token = searchParams.get('token')

  useEffect(() => {
    if (submittedRef.current) return
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

  useEffect(() => {
    if (!token) return
    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)
    if (!isMobile) return
    window.location.href = `florim://invite?token=${token}`
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

    submittedRef.current = true
    setSubmitting(true)

    try {
      await acceptInvite(token, inviteInfo.email, name, password)
    } catch (err: any) {
      submittedRef.current = false
      setError(err.message || 'Erro ao aceitar convite.')
    } finally {
      setSubmitting(false)
    }
  }

  const formBody = loading ? (
    <p className="text-sm text-ink/60 font-body">Carregando convite...</p>
  ) : (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[14px]">
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
          className="w-full px-4 py-3 bg-offWhite border border-border rounded-full text-ink/60"
        />
      </div>

      <div>
        <label className="block text-sm font-body text-ink mb-2">Seu nome</label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          className="w-full px-4 py-3 bg-offWhite border border-border rounded-full text-ink/80 focus:outline-none focus:ring-2 focus:ring-paper-2/40 transition-vintage"
          placeholder="Nome completo"
        />
      </div>

      <div>
        <label className="block text-sm font-body text-ink mb-2">Senha</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3 pr-11 bg-offWhite border border-border rounded-full text-ink/80 focus:outline-none focus:ring-2 focus:ring-paper-2/40 transition-vintage"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/70 transition-vintage"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-body text-ink mb-2">Confirmar senha</label>
        <div className="relative">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3 pr-11 bg-offWhite border border-border rounded-full text-ink/80 focus:outline-none focus:ring-2 focus:ring-paper-2/40 transition-vintage"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(v => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/70 transition-vintage"
            tabIndex={-1}
          >
            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
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
        disabled={submitting || !agreed}
        className="w-full bg-sidebar text-paper py-[14px] rounded-full font-bold text-[15px] hover:opacity-90 transition-vintage disabled:opacity-50"
      >
        {submitting ? 'Criando...' : 'Aceitar convite'}
      </button>
    </form>
  )

  return (
    <div className="min-h-screen bg-sidebar text-paper relative">

      {/* ── Mobile layout ──────────────────────────────────────── */}
      <div className="flex flex-col min-h-screen md:hidden">
        {/* Logo centered at top */}
        <div className="flex justify-center pt-12 shrink-0">
          <img src="/logo-florim.png" alt="Florim" className="h-[72px] object-contain" />
        </div>

        {/* Quote / invite context */}
        <div className="flex-1 flex items-center justify-center px-10 py-8">
          <p className="font-serif italic text-[18px] text-gold text-center leading-[1.55]">
            &ldquo;Aceite o convite e compartilhe o cuidado financeiro do seu lar.&rdquo;
          </p>
        </div>

        {/* Form card - bottom sheet */}
        <div className="bg-paper rounded-t-[28px] px-7 pt-8 pb-10 shrink-0 overflow-y-auto max-h-[72vh]">
          <h2 className="font-serif text-[22px] text-coffee mb-5">Aceitar convite</h2>
          {formBody}
        </div>
      </div>

      {/* ── Desktop layout ─────────────────────────────────────── */}
      <div className="hidden md:flex min-h-screen items-center justify-center px-6 py-10 relative">
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
                    className="w-full px-4 py-3 bg-white/70 border border-border rounded-full text-ink/80 focus:outline-none focus:ring-2 focus:ring-paper-2/40 transition-vintage"
                    placeholder="Nome completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-body text-ink mb-2">Senha</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 pr-11 bg-white/70 border border-border rounded-full text-ink/80 focus:outline-none focus:ring-2 focus:ring-paper-2/40 transition-vintage"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/70 transition-vintage"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-body text-ink mb-2">Confirmar senha</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      required
                      minLength={6}
                      className="w-full px-4 py-3 pr-11 bg-white/70 border border-border rounded-full text-ink/80 focus:outline-none focus:ring-2 focus:ring-paper-2/40 transition-vintage"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(v => !v)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/40 hover:text-ink/70 transition-vintage"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-1 accent-coffee"
                    required
                  />
                  <span className="text-sm font-body text-ink/70 leading-relaxed">
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
                  disabled={submitting || !agreed}
                  className="w-full bg-sidebar text-paper py-3 rounded-full font-semibold hover:opacity-90 transition-vintage disabled:opacity-50"
                >
                  {submitting ? 'Criando...' : 'Aceitar convite'}
                </button>
              </form>
            )}
          </div>
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
