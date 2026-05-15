import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'

export const metadata = {
  title: 'Política de Cookies — Florim',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-serif text-coffee mb-3">{title}</h2>
      <div className="text-ink/80 font-body leading-relaxed space-y-2">{children}</div>
    </section>
  )
}

export default function CookiesPage() {
  return (
    <>
      <PublicNavbar />
      <main className="bg-paper min-h-screen">
        <div className="max-w-3xl mx-auto px-5 pb-16 pt-24 md:px-6 md:pt-36">
          <h1 className="text-4xl font-serif text-coffee mb-2">Política de Cookies</h1>
          <p className="text-sm text-ink/50 font-body mb-12">Vigente a partir de 14 de maio de 2026</p>

          <Section title="1. O que são cookies">
            <p>
              Cookies são pequenos arquivos de texto armazenados no seu dispositivo quando você visita um site. Eles permitem que o serviço reconheça seu navegador e lembre preferências entre visitas.
            </p>
          </Section>

          <Section title="2. Cookies que utilizamos">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-coffee text-paper">
                    <th className="text-left px-4 py-3 font-semibold">Tipo</th>
                    <th className="text-left px-4 py-3 font-semibold">Nome / Identificador</th>
                    <th className="text-left px-4 py-3 font-semibold">Provedor</th>
                    <th className="text-left px-4 py-3 font-semibold">Finalidade</th>
                    <th className="text-left px-4 py-3 font-semibold">Retenção</th>
                    <th className="text-left px-4 py-3 font-semibold">Consentimento</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border bg-white">
                    <td className="px-4 py-3 font-medium">Essencial</td>
                    <td className="px-4 py-3 font-mono text-xs">sb-*-auth-token</td>
                    <td className="px-4 py-3">Supabase</td>
                    <td className="px-4 py-3">Sessão de login e autenticação</td>
                    <td className="px-4 py-3">Sessão</td>
                    <td className="px-4 py-3">Não necessário</td>
                  </tr>
                  <tr className="border-t border-border bg-white">
                    <td className="px-4 py-3 font-medium">Essencial</td>
                    <td className="px-4 py-3 font-mono text-xs">florim_cookie_consent</td>
                    <td className="px-4 py-3">Florim</td>
                    <td className="px-4 py-3">Armazena sua escolha de consentimento</td>
                    <td className="px-4 py-3">1 ano</td>
                    <td className="px-4 py-3">Não necessário</td>
                  </tr>
                  <tr className="border-t border-border bg-white">
                    <td className="px-4 py-3 font-medium">Analítico</td>
                    <td className="px-4 py-3 font-mono text-xs">ph_*_posthog</td>
                    <td className="px-4 py-3">PostHog, Inc. (EUA)</td>
                    <td className="px-4 py-3">Identificação de sessão analítica e comportamento de uso</td>
                    <td className="px-4 py-3">1 ano</td>
                    <td className="px-4 py-3">Necessário</td>
                  </tr>
                  <tr className="border-t border-border bg-white">
                    <td className="px-4 py-3 font-medium">Analítico</td>
                    <td className="px-4 py-3 font-mono text-xs">ph_*_window_id</td>
                    <td className="px-4 py-3">PostHog, Inc. (EUA)</td>
                    <td className="px-4 py-3">Identificação de janela para análise de fluxo</td>
                    <td className="px-4 py-3">Sessão</td>
                    <td className="px-4 py-3">Necessário</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="3. Como gerenciar cookies">
            <p>
              Na primeira visita ao Florim, exibimos um aviso de cookies onde você pode aceitar, rejeitar ou gerenciar individualmente os cookies não essenciais. Sua escolha é salva localmente. Você pode alterar suas preferências a qualquer momento clicando em <strong>Preferências de cookies</strong> no rodapé do site.
            </p>
            <p>
              Você também pode configurar seu navegador para bloquear ou alertar sobre cookies. Note que desativar cookies essenciais pode impedir o funcionamento correto do aplicativo.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>Chrome:</strong> Configurações → Privacidade e segurança → Cookies</li>
              <li><strong>Firefox:</strong> Preferências → Privacidade e segurança</li>
              <li><strong>Safari:</strong> Preferências → Privacidade</li>
            </ul>
          </Section>

          <Section title="4. Cookies de terceiros">
            <p>
              O Florim utiliza os seguintes serviços de terceiros que podem definir seus próprios cookies: <strong>Supabase</strong> (autenticação e banco de dados), <strong>Stripe</strong> (processamento de pagamentos) e <strong>PostHog, Inc.</strong> (análises de uso — apenas com consentimento). Esses cookies são regidos pelas políticas de privacidade dos respectivos serviços.
            </p>
          </Section>

          <Section title="5. Alterações a esta política">
            <p>
              Podemos atualizar esta política periodicamente. Alterações significativas serão comunicadas por aviso no aplicativo.
            </p>
          </Section>

          <Section title="6. Contato">
            <p>
              Dúvidas sobre nossa política de cookies:{' '}
              <a
                href="mailto:contato@florim.app"
                className="text-coffee underline underline-offset-2 hover:text-coffee/80"
              >
                contato@florim.app
              </a>
            </p>
          </Section>
        </div>
      </main>
      <PublicFooter color="sidebar" />
    </>
  )
}
