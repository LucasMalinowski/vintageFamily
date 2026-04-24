import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'

export const metadata = {
  title: 'Política de Privacidade — Florim',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-serif text-coffee mb-3">{title}</h2>
      <div className="text-ink/80 font-body leading-relaxed space-y-2">{children}</div>
    </section>
  )
}

export default function PrivacyPage() {
  return (
    <>
      <PublicNavbar />
      <main className="bg-paper min-h-screen">
        <div className="max-w-3xl mx-auto px-6 pb-16 pt-36">
          <h1 className="text-4xl font-serif text-coffee mb-2">Política de Privacidade</h1>
          <p className="text-sm text-ink/50 font-body mb-12">Vigente a partir de 23 de abril de 2026</p>

          <Section title="1. Quem somos">
            <p>
              <strong>LUCAS BRAZAU MALINOWSKI DESENVOLVIMENTO DE SOFTWARE LTDA</strong><br />
              CNPJ: 58.804.959/0001-60<br />
              Endereço: Avenida Paulista, 1106, Sala 01, Andar 16, Bela Vista, São Paulo/SP, CEP 01310-914<br />
              E-mail do encarregado: <a href="mailto:privacidade@florim.app" className="text-coffee underline underline-offset-2 hover:text-coffee/80">privacidade@florim.app</a>
            </p>
          </Section>

          <Section title="2. O que é o Florim">
            <p>
              O Florim é uma ferramenta de organização financeira familiar. Os dados financeiros são <strong>inseridos manualmente pelos próprios usuários</strong>.
            </p>
            <p className="bg-white border border-border rounded-lg px-4 py-3 text-sm">
              ⚠️ O Florim <strong>não acessa contas bancárias</strong>, <strong>não realiza transações financeiras</strong> e <strong>não tem acesso a dinheiro real</strong>. Todos os registros são de responsabilidade exclusiva do usuário.
            </p>
          </Section>

          <Section title="3. Dados coletados">
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Dados de cadastro:</strong> nome, e-mail e telefone</li>
              <li><strong>Dados financeiros:</strong> despesas, receitas, metas e lembretes inseridos manualmente</li>
              <li><strong>Dados técnicos:</strong> endereço IP, logs de acesso e dados de sessão</li>
              <li><strong>Cookies:</strong> essenciais e analíticos (com consentimento)</li>
            </ul>
            <p>Não coletamos dados sensíveis como CPF, documentos de identidade ou dados bancários.</p>
          </Section>

          <Section title="4. Finalidade e base legal (LGPD, art. 7º)">
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Execução de contrato:</strong> prestação do serviço contratado</li>
              <li><strong>Interesse legítimo:</strong> segurança, prevenção de fraudes e melhoria do produto</li>
              <li><strong>Consentimento:</strong> cookies analíticos e comunicações opcionais</li>
            </ul>
          </Section>

          <Section title="5. Compartilhamento de dados">
            <p>Seus dados são compartilhados apenas com:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Supabase:</strong> banco de dados e autenticação (servidores nos EUA — cláusulas contratuais padrão aplicadas)</li>
              <li><strong>Resend:</strong> envio de e-mails transacionais</li>
              <li><strong>Stripe:</strong> processamento de pagamentos (não recebe dados financeiros do Florim)</li>
            </ul>
            <p>Não vendemos nem alugamos seus dados a terceiros.</p>
          </Section>

          <Section title="6. Seus direitos (LGPD, art. 18)">
            <p>Você pode, a qualquer momento, exercer os seguintes direitos:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Acesso:</strong> solicitar cópia dos seus dados</li>
              <li><strong>Correção:</strong> atualizar dados incompletos ou desatualizados</li>
              <li><strong>Exclusão:</strong> apagar seus dados pessoais</li>
              <li><strong>Portabilidade:</strong> receber seus dados em formato estruturado</li>
              <li><strong>Revogação do consentimento:</strong> retirar consentimento a qualquer momento</li>
              <li><strong>Informação:</strong> saber com quem seus dados são compartilhados</li>
            </ul>
            <p>
              Para exercer seus direitos, entre em contato via{' '}
              <a href="mailto:privacidade@florim.app" className="text-coffee underline underline-offset-2 hover:text-coffee/80">
                privacidade@florim.app
              </a>. Respondemos em até 15 dias úteis.
            </p>
          </Section>

          <Section title="7. Retenção de dados">
            <p>
              Seus dados são mantidos enquanto sua conta estiver ativa ou pelo tempo necessário para cumprimento de obrigações legais. Após a exclusão da conta, os dados pessoais são removidos em até 30 dias corridos, salvo obrigações legais que exijam retenção por prazo maior.
            </p>
          </Section>

          <Section title="8. Segurança">
            <p>
              Adotamos medidas técnicas e administrativas razoáveis para proteger seus dados contra acessos não autorizados, perda ou destruição, incluindo criptografia em trânsito (HTTPS) e controle de acesso. Nenhum sistema é 100% seguro; agimos com diligência para minimizar riscos e notificaremos você em caso de incidentes relevantes.
            </p>
          </Section>

          <Section title="9. Cookies">
            <p>
              Utilizamos cookies essenciais (necessários ao funcionamento) e cookies analíticos (com seu consentimento). Veja nossa{' '}
              <a href="/cookies" className="text-coffee underline underline-offset-2 hover:text-coffee/80">
                Política de Cookies
              </a>{' '}
              para mais detalhes.
            </p>
          </Section>

          <Section title="10. Alterações a esta política">
            <p>
              Podemos atualizar esta política periodicamente. Em caso de alterações materiais, notificaremos por e-mail ou aviso no aplicativo. O uso continuado do serviço após a notificação constitui aceitação das alterações.
            </p>
          </Section>

          <Section title="11. Contato">
            <p>
              <strong>Encarregado de Proteção de Dados (DPO):</strong>{' '}
              <a href="mailto:privacidade@florim.app" className="text-coffee underline underline-offset-2 hover:text-coffee/80">
                privacidade@florim.app
              </a>
            </p>
            <p>
              <strong>Contato geral:</strong>{' '}
              <a href="mailto:contato@florim.app" className="text-coffee underline underline-offset-2 hover:text-coffee/80">
                contato@florim.app
              </a>
            </p>
            <p>
              Autoridade Nacional de Proteção de Dados (ANPD):{' '}
              <a
                href="https://www.gov.br/anpd"
                target="_blank"
                rel="noopener noreferrer"
                className="text-coffee underline underline-offset-2 hover:text-coffee/80"
              >
                www.gov.br/anpd
              </a>
            </p>
          </Section>
        </div>
      </main>
      <PublicFooter color="sidebar" />
    </>
  )
}
