import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'

export const metadata = {
  title: 'Termos de Uso — Florim',
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-serif text-coffee mb-3">{title}</h2>
      <div className="text-ink/80 font-body leading-relaxed space-y-2">{children}</div>
    </section>
  )
}

export default function TermsPage() {
  return (
    <>
      <PublicNavbar />
      <main className="bg-paper min-h-screen">
        <div className="max-w-3xl mx-auto px-6 pb-16 pt-36">
          <h1 className="text-4xl font-serif text-coffee mb-2">Termos de Uso</h1>
          <p className="text-sm text-ink/50 font-body mb-12">Vigente a partir de 23 de abril de 2026</p>

          <Section title="1. Partes">
            <p>
              Este contrato é celebrado entre <strong>LUCAS BRAZAU MALINOWSKI DESENVOLVIMENTO DE SOFTWARE LTDA</strong> (CNPJ 58.804.959/0001-60), doravante <strong>&quot;Florim&quot;</strong>, e o usuário que aceita estes termos ao criar uma conta, doravante <strong>&quot;Usuário&quot;</strong>.
            </p>
          </Section>

          <Section title="2. Descrição do serviço">
            <p>
              O Florim é um aplicativo de organização financeira familiar que permite aos usuários registrar manualmente receitas, despesas, metas de economia e lembretes.
            </p>
            <p className="bg-white border border-border rounded-lg px-4 py-3 text-sm">
              ⚠️ O Florim <strong>não acessa contas bancárias</strong>, <strong>não realiza transações financeiras</strong> e <strong>não tem acesso a dinheiro real</strong>. Trata-se exclusivamente de uma ferramenta de organização e registro manual.
            </p>
          </Section>

          <Section title="3. Cadastro e conta">
            <p>
              Para usar o Florim, o Usuário deve criar uma conta com informações verdadeiras e manter seus dados atualizados. O Usuário é responsável pela confidencialidade de sua senha. Cada conta é pessoal e intransferível.
            </p>
            <p>
              O cadastro pode ser feito pelo criador da família (que assume o papel de administrador) ou por convite do administrador. Ao aceitar um convite, o Usuário concorda automaticamente com estes Termos.
            </p>
          </Section>

          <Section title="4. Planos e pagamento">
            <p>
              O Florim oferece um período de teste gratuito de 14 dias. Após o término do trial, é necessária a contratação de um plano pago. Os valores e condições dos planos estão disponíveis em{' '}
              <a href="/plans" className="text-coffee underline underline-offset-2 hover:text-coffee/80">florim.app/plans</a>.
            </p>
            <p>
              Os pagamentos são processados pela Stripe, Inc. As assinaturas são renovadas automaticamente ao final de cada período. O cancelamento pode ser feito a qualquer momento pelo painel do aplicativo, com efeito ao final do período vigente.
            </p>
          </Section>

          <Section title="5. Responsabilidades do usuário">
            <p>O Usuário concorda em:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Inserir apenas informações verídicas</li>
              <li>Não utilizar o serviço para fins ilícitos</li>
              <li>Não tentar acessar dados de outras famílias</li>
              <li>Não realizar engenharia reversa, descompilar ou redistribuir o serviço</li>
              <li>Manter sua senha segura e notificar o Florim sobre uso não autorizado</li>
            </ul>
          </Section>

          <Section title="6. Propriedade intelectual">
            <p>
              Todo o conteúdo do Florim (marca, design, código, textos) é propriedade da LUCAS BRAZAU MALINOWSKI DESENVOLVIMENTO DE SOFTWARE LTDA, protegido pela legislação brasileira de propriedade intelectual. O Usuário recebe uma licença limitada, não exclusiva e intransferível para uso pessoal do serviço.
            </p>
          </Section>

          <Section title="7. Dados do usuário">
            <p>
              O Usuário é titular dos dados financeiros que insere no Florim. O Florim trata esses dados exclusivamente para prestação do serviço, conforme a{' '}
              <a href="/privacy" className="text-coffee underline underline-offset-2 hover:text-coffee/80">
                Política de Privacidade
              </a>.
            </p>
          </Section>

          <Section title="8. Disponibilidade e manutenção">
            <p>
              O Florim emprega esforços razoáveis para manter o serviço disponível 24/7, mas não garante disponibilidade ininterrupta. Podemos realizar manutenções programadas com aviso prévio e responder a incidentes imprevistos sem prévia notificação.
            </p>
          </Section>

          <Section title="9. Limitação de responsabilidade">
            <p>
              O Florim não se responsabiliza por:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Decisões financeiras tomadas com base nos dados registrados</li>
              <li>Perda de dados por falha do dispositivo ou do usuário</li>
              <li>Danos indiretos, lucros cessantes ou danos consequentes</li>
            </ul>
            <p>
              A responsabilidade total do Florim perante o Usuário limita-se ao valor pago pelo serviço nos últimos 3 meses.
            </p>
          </Section>

          <Section title="10. Rescisão">
            <p>
              O Usuário pode encerrar sua conta a qualquer momento pelo aplicativo. O Florim pode suspender ou encerrar contas que violem estes Termos, com ou sem aviso prévio dependendo da gravidade da violação.
            </p>
          </Section>

          <Section title="11. Alterações nos termos">
            <p>
              Podemos modificar estes Termos periodicamente. Em caso de alterações materiais, notificaremos por e-mail com antecedência mínima de 15 dias. O uso continuado do serviço após a data de vigência constitui aceitação dos novos termos.
            </p>
          </Section>

          <Section title="12. Lei aplicável e foro">
            <p>
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da Comarca de São Paulo/SP para resolução de quaisquer disputas, com renúncia a qualquer outro, por mais privilegiado que seja.
            </p>
          </Section>

          <Section title="13. Contato">
            <p>
              <a href="mailto:contato@florim.app" className="text-coffee underline underline-offset-2 hover:text-coffee/80">
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
