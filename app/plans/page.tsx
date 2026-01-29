'use client'

import Link from 'next/link'

export default function PlansPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="flex items-center justify-between px-6 py-6 md:px-12">
        <Link href="/" className="flex items-center gap-3">
          <img src="/logo1.png" alt="Florim" className="w-12 h-12 object-contain" />
          <span className="font-serif text-xl text-olive">Florim</span>
        </Link>
        <Link
          href="/login"
          className="text-sm text-olive hover:text-olive/80 transition-vintage"
        >
          Já tenho conta
        </Link>
      </header>

      <main className="px-6 pb-16 md:px-12">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-serif text-olive">Planos para cada fase</h1>
          <p className="mt-3 text-ink/70">
            Experimente o Florim gratuitamente por 7 dias. Depois, escolha o plano ideal para manter o livro financeiro sempre aberto.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-paper-2 border border-border rounded-3xl p-6 shadow-soft flex flex-col">
            <span className="text-xs uppercase tracking-widest text-olive/70">Teste</span>
            <h2 className="text-2xl font-serif text-olive mt-2">Plano gratuito</h2>
            <p className="text-ink/70 mt-2">Acesso completo por 7 dias para conhecer todas as funções.</p>
            <ul className="mt-6 space-y-2 text-sm text-ink/70">
              <li>✔️ Todas as funcionalidades</li>
              <li>✔️ Até 5 membros da família</li>
              <li>✔️ Suporte por e-mail</li>
            </ul>
            <Link
              href="/signup"
              className="mt-auto inline-flex justify-center rounded-full bg-olive text-white py-2.5 px-4 text-sm font-medium"
            >
              Começar teste
            </Link>
          </div>

          <div className="bg-white border border-gold/50 rounded-3xl p-6 shadow-lg flex flex-col">
            <span className="text-xs uppercase tracking-widest text-gold">Mensal</span>
            <h2 className="text-2xl font-serif text-olive mt-2">Plano essencial</h2>
            <p className="text-ink/70 mt-2">Para quem deseja acompanhar o mês com cuidado e clareza.</p>
            <div className="mt-5 text-3xl font-semibold text-olive">R$ --</div>
            <span className="text-sm text-ink/50">por mês</span>
            <ul className="mt-6 space-y-2 text-sm text-ink/70">
              <li>✔️ Acesso completo</li>
              <li>✔️ Atualizações contínuas</li>
              <li>✔️ Suporte prioritário</li>
            </ul>
            <button className="mt-auto inline-flex justify-center rounded-full bg-olive text-white py-2.5 px-4 text-sm font-medium">
              Assinar
            </button>
          </div>

          <div className="bg-paper-2 border border-border rounded-3xl p-6 shadow-soft flex flex-col">
            <span className="text-xs uppercase tracking-widest text-olive/70">Anual</span>
            <h2 className="text-2xl font-serif text-olive mt-2">Plano completo</h2>
            <p className="text-ink/70 mt-2">Economize e planeje o ano inteiro com serenidade.</p>
            <div className="mt-5 text-3xl font-semibold text-olive">R$ --</div>
            <span className="text-sm text-ink/50">por ano</span>
            <ul className="mt-6 space-y-2 text-sm text-ink/70">
              <li>✔️ Acesso completo</li>
              <li>✔️ Consultas ilimitadas</li>
              <li>✔️ Bônus de planejamento anual</li>
            </ul>
            <button className="mt-auto inline-flex justify-center rounded-full bg-olive text-white py-2.5 px-4 text-sm font-medium">
              Assinar
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
