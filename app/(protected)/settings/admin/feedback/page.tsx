'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { getAuthBearerToken } from '@/lib/billing/client'
import { supabase } from '@/lib/supabase'

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

type FeedbackRow = {
  id: string
  type: 'bug' | 'feedback' | 'suggestion'
  location: string | null
  description: string
  name: string | null
  email: string | null
  phone: string | null
  created_at: string
}

const TYPE_LABELS: Record<string, string> = {
  bug: 'Bug 🐛',
  feedback: 'Feedback 💬',
  suggestion: 'Sugestão 💡',
}

const TYPE_COLORS: Record<string, string> = {
  bug: 'bg-terracotta/10 text-terracotta border-terracotta/20',
  feedback: 'bg-sage/10 text-sage border-sage/20',
  suggestion: 'bg-coffee/10 text-coffee border-coffee/20',
}

function dateBR(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminFeedbackPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const pageSize = 25

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return
      const { data: allowed } = await supabase.rpc('is_super_admin')
      setIsSuperAdmin(Boolean(allowed))
      setChecking(false)
      if (!allowed) router.replace('/settings/profile')
    }
    checkAdmin()
  }, [user, router])

  const loadFeedbacks = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    const token = await getAuthBearerToken()
    if (!token) { setLoadError('Sessão inválida.'); setLoading(false); return }

    const params = new URLSearchParams({ page: String(page) })
    if (typeFilter) params.set('type', typeFilter)
    if (locationFilter) params.set('location', locationFilter)

    const res = await fetch(`/api/admin/feedback?${params}`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json().catch(() => null)
    if (!res.ok) { setLoadError(data?.error || 'Erro ao carregar feedbacks.'); setLoading(false); return }

    setFeedbacks(data.feedbacks)
    setTotal(data.total)
    setLoading(false)
  }, [page, typeFilter, locationFilter])

  useEffect(() => {
    if (isSuperAdmin) loadFeedbacks()
  }, [isSuperAdmin, loadFeedbacks])

  const handleFilter = () => { setPage(1); loadFeedbacks() }

  if (checking) {
    return <div className="bg-bg border border-border rounded-vintage shadow-vintage p-6"><p className="text-sm text-ink/60">Carregando...</p></div>
  }
  if (!isSuperAdmin) return null

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-6">
      <div className="bg-bg border border-border rounded-vintage shadow-vintage p-6">
        <h1 className="text-2xl font-serif text-coffee mb-1">Feedbacks dos usuários</h1>
        <p className="text-sm text-ink/60">{total} registro{total !== 1 ? 's' : ''} no total</p>
      </div>

      <div className="bg-bg border border-border rounded-vintage shadow-vintage p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-ink/60 mb-1">Tipo</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="border border-border rounded bg-bg px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-coffee"
            >
              <option value="">Todos</option>
              <option value="bug">Bug 🐛</option>
              <option value="feedback">Feedback 💬</option>
              <option value="suggestion">Sugestão 💡</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-ink/60 mb-1">Local</label>
            <select
              value={locationFilter}
              onChange={e => setLocationFilter(e.target.value)}
              className="border border-border rounded bg-bg px-3 py-1.5 text-sm text-ink focus:outline-none focus:border-coffee min-w-[200px]"
            >
              <option value="">Todos</option>
              {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <button
            onClick={handleFilter}
            className="bg-coffee text-paper text-sm font-medium px-4 py-1.5 rounded hover:bg-coffee/90 transition-colors"
          >
            Filtrar
          </button>
        </div>
      </div>

      {loadError && (
        <div className="bg-terracotta/10 border border-terracotta/30 text-terracotta px-4 py-3 rounded text-sm">{loadError}</div>
      )}

      <div className="bg-bg border border-border rounded-vintage shadow-vintage overflow-hidden">
        {loading ? (
          <p className="text-sm text-ink/60 p-6">Carregando...</p>
        ) : feedbacks.length === 0 ? (
          <p className="text-sm text-ink/60 p-6">Nenhum feedback encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-paper border-b border-border">
                <tr className="text-left text-ink/60">
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Local</th>
                  <th className="px-4 py-3 font-medium">Descrição</th>
                  <th className="px-4 py-3 font-medium">Contato</th>
                </tr>
              </thead>
              <tbody>
                {feedbacks.map(fb => (
                  <tr key={fb.id} className="border-b border-border last:border-b-0 align-top hover:bg-paper/50">
                    <td className="px-4 py-3 text-xs text-ink/50 whitespace-nowrap">{dateBR(fb.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${TYPE_COLORS[fb.type] ?? ''}`}>
                        {TYPE_LABELS[fb.type] ?? fb.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink/70">{fb.location ?? <span className="text-ink/30">—</span>}</td>
                    <td className="px-4 py-3 max-w-xs">
                      {expanded === fb.id ? (
                        <div>
                          <p className="text-ink/80 whitespace-pre-wrap text-xs leading-relaxed">{fb.description}</p>
                          <button onClick={() => setExpanded(null)} className="text-xs text-coffee underline mt-1">Recolher</button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-ink/80 line-clamp-2 text-xs">{fb.description}</p>
                          {fb.description.length > 80 && (
                            <button onClick={() => setExpanded(fb.id)} className="text-xs text-coffee underline mt-0.5">Ver tudo</button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-0.5 text-xs text-ink/70">
                        {fb.name && <p className="font-medium">{fb.name}</p>}
                        {fb.email && <a href={`mailto:${fb.email}`} className="text-coffee underline">{fb.email}</a>}
                        {fb.phone && <p>{fb.phone}</p>}
                        {!fb.name && !fb.email && !fb.phone && <span className="text-ink/30">—</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-ink/60">Página {page} de {totalPages}</p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1.5 border border-border rounded text-ink/70 hover:bg-paper disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Anterior
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 border border-border rounded text-ink/70 hover:bg-paper disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Próxima →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
