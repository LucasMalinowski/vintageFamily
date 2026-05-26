import type { Metadata } from 'next'
import Link from 'next/link'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'

export const metadata: Metadata = {
  title: 'Suporte',
  description: 'Central de suporte do Florim. Entre em contato com nossa equipe ou encontre respostas para as dúvidas mais comuns.',
}

const FAQ = [
  {
    q: 'Como cancelo minha assinatura?',
    a: 'No app ou site, acesse Configurações → Assinatura → Gerenciar plano. O cancelamento é imediato e você mantém acesso até o fim do período pago.',
  },
  {
    q: 'Posso pedir reembolso?',
    a: 'Sim. Aceitamos pedidos de reembolso em até 7 dias após a cobrança. Entre em contato pelo e-mail abaixo informando o motivo.',
  },
  {
    q: 'Como adiciono um membro da família?',
    a: 'Em Configurações → Família, toque em "Convidar membro" e informe o e-mail da pessoa. Ela receberá um link de convite válido por 7 dias.',
  },
  {
    q: 'O Florim acessa minha conta bancária?',
    a: 'Não. O Florim é 100% manual, você registra seus lançamentos e a gente organiza. Nunca conectamos a bancos nem realizamos transações.',
  },
  {
    q: 'Como excluo minha conta?',
    a: 'Acesse Configurações → Perfil → Excluir conta. Todos os seus dados são removidos permanentemente, conforme nossa Política de Privacidade.',
  },
  {
    q: 'Meus dados são seguros?',
    a: 'Sim. Os dados são armazenados na Supabase (infraestrutura AWS), com criptografia em trânsito e em repouso. Consulte nossa Política de Privacidade para detalhes.',
  },
]

export default function SupportPage() {
  return (
    <>
      <PublicNavbar />
      <main className="bg-paper min-h-screen">
        <div className="max-w-3xl mx-auto px-5 pb-20 pt-24 md:px-6 md:pt-36">

          <h1 className="text-4xl font-serif text-coffee mb-2">Suporte</h1>
          <p className="text-ink/60 font-body mb-14">
            Estamos aqui para ajudar. Resposta em até 1 dia útil.
          </p>

          {/* Contact channels */}
          <section className="mb-14">
            <h2 className="text-xl font-serif text-coffee mb-5">Fale conosco</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <a
                href="mailto:contato@florim.app"
                className="flex flex-col gap-1 rounded-xl border border-border bg-white px-6 py-5 transition hover:border-forest/40"
              >
                <span className="text-sm font-medium font-body text-coffee">E-mail geral</span>
                <span className="text-base font-body text-ink/70">contato@florim.app</span>
                <span className="mt-1 text-xs text-ink/40 font-body">Dúvidas, sugestões e parcerias</span>
              </a>

              <a
                href="mailto:privacidade@florim.app"
                className="flex flex-col gap-1 rounded-xl border border-border bg-white px-6 py-5 transition hover:border-forest/40"
              >
                <span className="text-sm font-medium font-body text-coffee">Privacidade & dados</span>
                <span className="text-base font-body text-ink/70">privacidade@florim.app</span>
                <span className="mt-1 text-xs text-ink/40 font-body">Exportação, exclusão e LGPD</span>
              </a>
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-xl font-serif text-coffee mb-5">Perguntas frequentes</h2>
            <div className="space-y-4">
              {FAQ.map(({ q, a }) => (
                <div key={q} className="rounded-xl border border-border bg-white px-6 py-5">
                  <h3 className="font-medium font-body text-coffee mb-2">{q}</h3>
                  <p className="text-sm text-ink/70 font-body leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Legal links */}
          <div className="mt-14 flex flex-wrap gap-4 text-sm font-body text-ink/50">
            <Link href="/privacy" className="hover:text-coffee transition">Política de Privacidade</Link>
            <Link href="/terms" className="hover:text-coffee transition">Termos de Uso</Link>
            <Link href="/cookies" className="hover:text-coffee transition">Política de Cookies</Link>
          </div>

        </div>
      </main>
      <PublicFooter color="sidebar" />
    </>
  )
}
