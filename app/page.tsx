'use client'

import AppLayout from '@/components/layout/AppLayout'
import Dashboard from '@/components/pages/Dashboard'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'

export default function Home() {
  const { user } = useAuth()

  if (!user) {
    return (
      <div className="min-h-screen bg-moss text-white">
        <header className="flex items-center justify-between px-6 py-4 md:px-10">
          <div className="flex items-center gap-3">
            <img src="/logo1.png" alt="Florim" className="w-12 h-12 object-contain" />
            <span className="font-serif text-xl tracking-wide">Florim</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-white/80">
            <Link href="/about" className="hover:text-white transition-vintage">Sobre nós</Link>
            <Link href="/plans" className="hover:text-white transition-vintage">Planos</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/signup"
              className="gold-pill text-white px-5 py-2 rounded-full text-sm font-medium"
            >
              Teste
            </Link>
            <Link
              href="/login"
              className="gold-pill text-white px-5 py-2 rounded-full text-sm font-medium"
            >
              Entrar
            </Link>
          </div>
        </header>

        <main className="px-6 pb-16 md:px-10">
          <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 shadow-xl">
            <video
              className="w-full h-[320px] md:h-[520px] object-cover"
              src="/main-video.mp4"
              autoPlay
              muted
              loop
              playsInline
            />
          </div>
          <div className="mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-5xl font-serif text-white">
                Organize o livro financeiro da sua família
              </h1>
              <p className="text-white/70 mt-3 max-w-xl">
                Um espaço elegante para planejar, sonhar e acompanhar cada passo do futuro familiar.
              </p>
            </div>
            <Link
              href="/plans"
              className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-white text-moss font-medium shadow-lg"
            >
              Ver planos
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <AppLayout>
      <Dashboard />
    </AppLayout>
  )
}
