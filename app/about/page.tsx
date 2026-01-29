'use client'

import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="px-6 py-6 md:px-12 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <img src="/logo1.png" alt="Florim" className="w-12 h-12 object-contain" />
          <span className="font-serif text-xl text-olive">Florim</span>
        </Link>
        <Link href="/plans" className="text-sm text-olive hover:text-olive/80 transition-vintage">
          Ver planos
        </Link>
      </header>

      <main className="px-6 pb-16 md:px-12">
        <div className="max-w-3xl bg-paper-2 border border-border rounded-3xl p-8 shadow-soft">
          <h1 className="text-3xl md:text-4xl font-serif text-olive mb-4">Sobre o Florim</h1>
          <p className="text-ink/70 mb-4">
            O Florim nasceu para transformar o controle financeiro em um gesto de cuidado. Um espaço onde a família
            acompanha receitas, despesas e sonhos com calma, beleza e clareza.
          </p>
          <p className="text-ink/70 mb-4">
            Inspirado em histórias reais, o Florim valoriza cada escolha e registra o caminho do tempo que ainda vamos
            viver. Criado para famílias modernas que desejam planejar com delicadeza e firmeza.
          </p>
          <p className="text-ink/70">
            Um livro digital para guardar conquistas, organizar rotinas e compartilhar o futuro.
          </p>
        </div>
      </main>
    </div>
  )
}
