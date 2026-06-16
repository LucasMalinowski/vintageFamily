'use client'

import { useState } from 'react'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'
import { useTranslations } from 'next-intl'

type FeedbackType = 'bug' | 'suggestion' | 'feedback'

export default function FeedbackPage() {
  const t = useTranslations('feedback')
  const [type, setType] = useState<FeedbackType>('bug')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const LOCATIONS = [
    { key: 'waRecord', value: t('locations.waRecord') },
    { key: 'waQuery', value: t('locations.waQuery') },
    { key: 'waEdit', value: t('locations.waEdit') },
    { key: 'appExpenses', value: t('locations.appExpenses') },
    { key: 'appIncomes', value: t('locations.appIncomes') },
    { key: 'appGoals', value: t('locations.appGoals') },
    { key: 'appReminders', value: t('locations.appReminders') },
    { key: 'appImport', value: t('locations.appImport') },
    { key: 'appSettings', value: t('locations.appSettings') },
    { key: 'other', value: t('locations.other') },
  ]

  const TYPES: Array<{ value: FeedbackType; label: string; description: string }> = [
    { value: 'bug', label: t('types.bug.label'), description: t('types.bug.description') },
    { value: 'suggestion', label: t('types.suggestion.label'), description: t('types.suggestion.description') },
    { value: 'feedback', label: t('types.feedback.label'), description: t('types.feedback.description') },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, location: location || undefined, description, name: name || undefined, email: email || undefined, phone: phone || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? t('sendError'))
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('sendError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PublicNavbar />
      <main className="bg-paper min-h-screen">
        <div className="max-w-xl mx-auto px-5 pb-16 pt-24 md:px-6 md:pt-36">
          <h1 className="text-4xl font-serif text-coffee mb-2">{t('title')}</h1>
          <p className="text-sm text-ink/60 font-body mb-10">
            {t('subtitle')}
          </p>

          {success ? (
            <div className="bg-sage/10 border border-sage/30 rounded-vintage p-6 text-center">
              <p className="text-2xl mb-2">🙏</p>
              <p className="font-serif text-coffee text-lg mb-1">{t('successTitle')}</p>
              <p className="text-sm text-ink/70 font-body">{t('successMessage')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <span className="block text-sm font-medium text-ink mb-3">{t('typeLabel')} <span className="text-terracotta">*</span></span>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {TYPES.map(tp => (
                    <button
                      key={tp.value}
                      type="button"
                      onClick={() => setType(tp.value)}
                      className={`text-left px-4 py-3 rounded-vintage border text-sm transition-colors ${
                        type === tp.value
                          ? 'border-coffee bg-coffee/5 text-coffee'
                          : 'border-border bg-bg text-ink/70 hover:border-coffee/50'
                      }`}
                    >
                      <span className="font-medium block">{tp.label}</span>
                      <span className="text-xs text-ink/50 mt-0.5 block">{tp.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-ink mb-1.5">
                  {t('locationLabel')}
                </label>
                <select
                  id="location"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full border border-border rounded-vintage bg-bg px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-coffee"
                >
                  <option value="">{t('locationPlaceholder')}</option>
                  {LOCATIONS.map(l => (
                    <option key={l.key} value={l.value}>{l.value}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-ink mb-1.5">
                  {t('descriptionLabel')} <span className="text-terracotta">*</span>
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  placeholder={t('descriptionPlaceholder')}
                  className="w-full border border-border rounded-vintage bg-bg px-3 py-2.5 text-sm text-ink focus:outline-none focus:border-coffee resize-none"
                  required
                />
                <p className="text-xs text-ink/40 mt-1 text-right">{description.length}/2000</p>
              </div>

              <div className="border-t border-border pt-5">
                <p className="text-xs text-ink/50 font-body mb-4">{t('contactNote')}</p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="name" className="block text-xs font-medium text-ink/70 mb-1">{t('nameLabel')}</label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder={t('namePlaceholder')}
                      className="w-full border border-border rounded-vintage bg-bg px-3 py-2 text-sm text-ink focus:outline-none focus:border-coffee"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-xs font-medium text-ink/70 mb-1">{t('emailLabel')}</label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      className="w-full border border-border rounded-vintage bg-bg px-3 py-2 text-sm text-ink focus:outline-none focus:border-coffee"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-xs font-medium text-ink/70 mb-1">{t('phoneLabel')}</label>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder={t('phonePlaceholder')}
                      className="w-full border border-border rounded-vintage bg-bg px-3 py-2 text-sm text-ink focus:outline-none focus:border-coffee"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-terracotta/10 border border-terracotta/30 text-terracotta px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || description.trim().length === 0}
                className="w-full bg-coffee text-paper font-medium py-3 rounded-vintage hover:bg-coffee/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {loading ? t('sendingButton') : t('submitButton')}
              </button>
            </form>
          )}
        </div>
      </main>
      <PublicFooter />
    </>
  )
}
