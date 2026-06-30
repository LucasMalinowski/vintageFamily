'use client'

import { useState } from 'react'
import { Mail, ArrowRight, CheckCircle } from 'lucide-react'

type State = 'idle' | 'loading' | 'success' | 'error'

export default function AndroidEarlyAccessForm() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (state === 'loading' || state === 'success') return

    setState('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/android-early-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error ?? 'Erro ao cadastrar. Tente novamente.')
        setState('error')
        return
      }

      setAlreadyRegistered(!!data.already)
      setState('success')
    } catch {
      setErrorMsg('Erro de conexão. Tente novamente.')
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div className="w-full max-w-sm flex flex-col items-center gap-3 py-4">
        <CheckCircle size={40} className="text-forest" strokeWidth={1.5} />
        <p className="font-serif text-xl text-coffee">
          {alreadyRegistered ? 'Você já está na lista!' : 'Você está na lista!'}
        </p>
        <p className="font-body text-[14px] text-ink/60">
          {alreadyRegistered
            ? 'Esse e-mail já estava cadastrado. Avisaremos quando o app estiver disponível.'
            : 'Avisaremos assim que o Florim para Android estiver disponível.'}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-3">
      <div className="relative">
        <Mail
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); if (state === 'error') setState('idle') }}
          placeholder="seu@email.com"
          required
          autoComplete="email"
          className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-border bg-white font-body text-[15px] text-coffee placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-gold/50 transition-vintage"
        />
      </div>

      {state === 'error' && errorMsg && (
        <p className="text-[13px] text-red-500 font-body">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={state === 'loading'}
        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-sidebar text-paper font-body font-semibold text-[15px] transition-vintage hover:opacity-90 disabled:opacity-60"
      >
        {state === 'loading' ? (
          <span className="inline-block w-4 h-4 border-2 border-paper/40 border-t-paper rounded-full animate-spin" />
        ) : (
          <>
            Quero acesso antecipado
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </form>
  )
}
