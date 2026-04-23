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
        <div className="max-w-3xl mx-auto px-6 pb-16 pt-36">
          <h1 className="text-4xl font-serif text-coffee mb-2">Política de Cookies</h1>
          <p className="text-sm text-ink/50 font-body mb-12">Vigente a partir de 23 de abril de 2026</p>

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
                    <th className="text-left px-4 py-3 font-semibold">Finalidade</th>
                    <th className="text-left px-4 py-3 font-semibold">Consentimento</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border bg-white">
                    <td className="px-4 py-3 font-medium">Essenciais</td>
                    <td className="px-4 py-3">Sessão de login, segurança, funcionamento básico do app</td>
                    <td className="px-4 py-3">Não necessário</td>
                  </tr>
                  <tr className="border-t border-border bg-white">
                    <td className="px-4 py-3 font-medium">Analíticos</td>
                    <td className="px-4 py-3">Estatísticas de uso, páginas visitadas, melhorias do produto</td>
                    <td className="px-4 py-3">Necessário</td>
                  </tr>
                  <tr className="border-t border-border bg-white">
                    <td className="px-4 py-3 font-medium">Funcionais</td>
                    <td className="px-4 py-3">Preferências de idioma, tema, configurações salvas</td>
                    <td className="px-4 py-3">Necessário</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="3. Como gerenciar cookies">
            <p>
              Na primeira visita ao Florim, exibimos um aviso de cookies onde você pode aceitar ou rejeitar cookies não essenciais. Sua escolha é salva localmente e pode ser alterada a qualquer momento limpando os dados do navegador.
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
              O Florim pode utilizar serviços de terceiros que definem seus próprios cookies, como Supabase (autenticação) e Stripe (pagamentos). Esses cookies são regidos pelas políticas de privacidade dos respectivos serviços.
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
      <PublicFooter />
    </>
  )
}
