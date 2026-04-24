import type { Metadata } from 'next'
import Link from 'next/link'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'

export const metadata: Metadata = {
  title: 'Termos de Uso e Aviso de Privacidade | Florim',
  description:
    'Documento público com os termos de uso do Florim e o aviso de privacidade aplicável ao tratamento de dados pessoais na plataforma.',
}

const termsSections = [
  {
    title: '1. Apresentação do serviço',
    paragraphs: [
      'O Florim é uma plataforma digital de organização financeira familiar. Por meio do aplicativo, o usuário pode criar e gerenciar sua família digital, registrar receitas e despesas, organizar categorias, acompanhar sonhos e metas, manter lembretes, convidar integrantes e, quando disponível, contratar plano pago e importar extratos bancários.',
      'Este documento disciplina o uso do site, do aplicativo e das funcionalidades disponibilizadas pelo Florim. Ao acessar ou utilizar a plataforma, o usuário declara que leu, compreendeu e concorda com estes Termos de Uso e com o Aviso de Privacidade abaixo.',
    ],
  },
  {
    title: '2. Cadastro, acesso e elegibilidade',
    paragraphs: [
      'Para utilizar as áreas autenticadas do Florim, o usuário deverá criar uma conta com informações verdadeiras, completas e atualizadas, especialmente nome e e-mail, além de definir credenciais de acesso pessoais e intransferíveis.',
      'À medida que os fluxos de cadastro e relacionamento evoluírem, a plataforma também poderá solicitar telefone para identificação, contato, segurança da conta e comunicações relacionadas ao serviço.',
      'O usuário é responsável por manter a confidencialidade de sua senha e por toda atividade realizada a partir de sua conta. Sempre que identificar uso indevido, acesso não autorizado ou suspeita de comprometimento da conta, deverá adotar as medidas cabíveis para proteção de seu acesso e comunicar o suporte do serviço pelos canais oficiais disponíveis.',
      'Ao convidar terceiros para a família digital, o usuário declara que possui legitimidade para compartilhar o e-mail do convidado para essa finalidade específica.',
    ],
  },
  {
    title: '3. Regras de uso da plataforma',
    paragraphs: [
      'O usuário compromete-se a utilizar o Florim de forma lícita, ética e compatível com a finalidade da plataforma, abstendo-se de praticar atos que violem a legislação aplicável, direitos de terceiros, regras de propriedade intelectual, segurança da informação ou a integridade técnica do serviço.',
      'É vedado utilizar o Florim para tentativa de acesso indevido, engenharia reversa, extração automatizada de dados sem autorização, fraude, envio de conteúdo malicioso, compartilhamento indevido de credenciais ou qualquer conduta que possa comprometer a disponibilidade, confidencialidade ou segurança da plataforma e de outros usuários.',
    ],
  },
  {
    title: '4. Conteúdo, registros financeiros e arquivos enviados',
    paragraphs: [
      'Os dados, lançamentos, descrições, observações, anexos e arquivos enviados ou cadastrados pelo usuário permanecem sob sua responsabilidade. O usuário deve garantir que possui legitimidade para inserir tais conteúdos e que eles não violam direitos de terceiros.',
      'Nas funcionalidades de importação de extratos, o usuário reconhece que poderá enviar arquivos financeiros, como CSV e OFX, cujo tratamento é realizado para leitura, pré-visualização, categorização e registro das movimentações compatíveis com o serviço.',
    ],
  },
  {
    title: '5. Planos pagos e serviços de terceiros',
    paragraphs: [
      'Parte das funcionalidades do Florim pode depender de contratação de plano pago. Quando aplicável, a cobrança, a gestão de meios de pagamento, a emissão de faturas e operações correlatas poderão envolver prestadores especializados, inclusive processadores de pagamento.',
      'Ao utilizar recursos integrados a terceiros, o usuário também poderá estar sujeito aos termos e políticas desses fornecedores, naquilo que for aplicável à funcionalidade utilizada.',
    ],
  },
  {
    title: '6. Disponibilidade, alterações e suspensão',
    paragraphs: [
      'O Florim poderá, a qualquer tempo, atualizar, alterar, suspender ou descontinuar funcionalidades, layouts, fluxos, planos, integrações e características técnicas da plataforma, de forma temporária ou definitiva, por razões operacionais, comerciais, de segurança, regulatórias ou legais.',
      'Embora sejam adotados esforços razoáveis para manter a disponibilidade do serviço, poderão ocorrer falhas, lentidão, indisponibilidades, interrupções para manutenção ou limitações causadas por fatores internos ou por serviços de terceiros.',
    ],
  },
  {
    title: '7. Limitação de responsabilidade',
    paragraphs: [
      'O Florim é uma ferramenta de apoio à organização financeira e não constitui consultoria jurídica, contábil, tributária, bancária ou de investimentos. As informações apresentadas na plataforma dependem dos dados inseridos ou enviados pelo próprio usuário e não substituem validações independentes quando necessárias.',
      'O Florim não se responsabiliza por danos decorrentes de informações incorretas, desatualizadas ou incompletas fornecidas pelo usuário, por falhas em dispositivos, redes, conexão à internet, sistemas de terceiros, eventos de força maior ou por uso inadequado da conta e compartilhamento indevido de credenciais.',
    ],
  },
  {
    title: '8. Propriedade intelectual',
    paragraphs: [
      'A estrutura do aplicativo, sua identidade visual, marca, software, bases organizadas, textos, interfaces e demais elementos protegíveis vinculados ao Florim são de titularidade de seus responsáveis ou licenciados, conforme a legislação aplicável.',
      'Estes Termos não cedem ao usuário qualquer direito de propriedade intelectual, exceto a licença limitada, não exclusiva, revogável e intransferível para uso regular da plataforma conforme sua finalidade.',
    ],
  },
  {
    title: '9. Encerramento de acesso',
    paragraphs: [
      'O acesso do usuário poderá ser suspenso, restringido ou encerrado em caso de violação destes Termos, uso fraudulento, tentativa de violação de segurança, descumprimento legal, ordem de autoridade competente ou conduta que gere risco à plataforma, a outros usuários ou a terceiros.',
      'Mesmo após o encerramento da conta, determinados dados poderão ser conservados pelo prazo necessário ao cumprimento de obrigações legais, regulatórias, contratuais e ao exercício regular de direitos.',
    ],
  },
  {
    title: '10. Atualizações e legislação aplicável',
    paragraphs: [
      'Estes Termos poderão ser alterados periodicamente. A versão vigente será aquela disponibilizada nesta rota, com indicação da última atualização.',
      'Este documento será regido pelas leis da República Federativa do Brasil, especialmente pelo Código Civil, pelo Marco Civil da Internet, pelo Código de Defesa do Consumidor, quando aplicável, e pela Lei Geral de Proteção de Dados Pessoais.',
    ],
  },
]

const privacySections = [
  {
    title: '1. Identificação do tratamento',
    paragraphs: [
      'Este Aviso de Privacidade informa, de forma objetiva e transparente, como os dados pessoais tratados no contexto do Florim são coletados, utilizados, armazenados, compartilhados e protegidos.',
      'Controlador dos dados: LUCAS BRAZAU MALINOWSKI DESENVOLVIMENTO DE SOFTWARE LTDA, inscrita no CNPJ sob o nº 58.804.959/0001-60, com nome fantasia MALINOWSKI SOFTWARES, sediada na Rua Pio XII 1723 Bloco B 05, Neva, Cascavel, Paraná, Brazil.',
      'Para solicitações relacionadas à privacidade, proteção de dados, exercício de direitos do titular ou dúvidas sobre este aviso, o canal de atendimento disponibilizado é financasflorim@gmail.com.',
    ],
    highlight: true,
  },
  {
    title: '2. Quais dados podem ser tratados',
    paragraphs: [
      'De acordo com as funcionalidades atualmente implementadas no produto e com os campos previstos para evolução do cadastro, o Florim pode tratar dados cadastrais e de conta, como nome, e-mail e telefone; dados de vínculo familiar, como identificação da família, papel do usuário na família e dados necessários ao envio e aceite de convites; dados de autenticação e sessão; dados de uso estritamente técnicos; e dados inseridos pelo próprio usuário para organização financeira.',
      'Também podem ser tratados dados financeiros e organizacionais inseridos ou importados pelo usuário, como receitas, despesas, descrições, categorias, metas, lembretes, anexos e dados contidos em arquivos de importação de extrato bancário.',
      'Quando houver contratação de plano pago, o Florim poderá tratar dados de assinatura, identificadores de cliente e assinatura em processador de pagamento, status de cobrança, faturas e metadados de transação. Os dados completos do cartão tendem a ser processados diretamente pelo provedor de pagamento, e não armazenados diretamente pelo Florim, conforme o fluxo técnico integrado atualmente.',
    ],
  },
  {
    title: '3. Para quais finalidades os dados são tratados',
    paragraphs: [
      'Os dados podem ser tratados para criar e manter a conta do usuário; autenticar o acesso; viabilizar o uso da plataforma; criar a família digital; gerenciar permissões e convites; armazenar e exibir lançamentos e relatórios financeiros; importar e processar arquivos de extrato; manter preferências de navegação; prevenir fraudes e abusos; atender solicitações de suporte; cumprir obrigações legais e regulatórias; e exercer direitos em processos administrativos, arbitrais ou judiciais.',
      'Os dados também podem ser utilizados para comunicações operacionais relacionadas ao funcionamento do serviço, como envio de convite por e-mail, confirmações necessárias ao uso da conta e notificações relacionadas à assinatura.',
    ],
  },
  {
    title: '4. Bases legais aplicáveis',
    paragraphs: [
      'O tratamento de dados pessoais no Florim poderá se apoiar, conforme o contexto, nas bases legais previstas na LGPD, especialmente: execução de contrato ou de procedimentos preliminares relacionados ao contrato; cumprimento de obrigação legal ou regulatória; exercício regular de direitos; legítimo interesse, quando cabível e observado o balanceamento exigido pela lei; e consentimento, quando ele for efetivamente necessário para determinada operação.',
      'Sempre que o tratamento depender de consentimento, o titular poderá revogá-lo nos limites legais e operacionais aplicáveis, sem prejuízo dos tratamentos já realizados com fundamento válido anterior.',
    ],
  },
  {
    title: '5. Compartilhamento de dados',
    paragraphs: [
      'Os dados pessoais poderão ser compartilhados, quando necessário, com provedores de infraestrutura, autenticação, hospedagem, banco de dados, envio de e-mails, armazenamento, suporte técnico e processamento de pagamentos, além de autoridades públicas e judiciais, quando houver obrigação legal, regulatória ou ordem válida.',
      'No contexto atual do produto, o uso de autenticação e banco de dados por serviços especializados, bem como de provedor de pagamentos para assinatura, integra a prestação do serviço e pode demandar compartilhamento operacional de dados estritamente necessários à execução dessas atividades.',
    ],
  },
  {
    title: '6. Transferência internacional',
    paragraphs: [
      'Dependendo da infraestrutura tecnológica e dos prestadores contratados para autenticação, hospedagem, armazenamento, comunicação e pagamento, poderá ocorrer transferência internacional de dados pessoais ou acesso remoto a dados armazenados fora do Brasil.',
      'Nessas hipóteses, o Florim deverá observar os requisitos legais aplicáveis à transferência internacional de dados, inclusive mediante adoção de salvaguardas contratuais e operacionais compatíveis com a LGPD.',
    ],
  },
  {
    title: '7. Retenção e eliminação',
    paragraphs: [
      'Os dados pessoais serão mantidos pelo tempo necessário para cumprir as finalidades informadas, para preservar registros relacionados à prestação do serviço, para cumprir obrigações legais ou regulatórias e para o exercício regular de direitos.',
      'Quando aplicável e possível, os dados serão eliminados, anonimizados ou bloqueados após o encerramento do tratamento, ressalvadas as hipóteses legais de conservação previstas na legislação.',
    ],
  },
  {
    title: '8. Cookies, sessão e armazenamento local',
    paragraphs: [
      'O Florim utiliza recursos técnicos de sessão, autenticação e armazenamento local do navegador para manter o funcionamento da conta, registrar preferências de interface e viabilizar a experiência da aplicação. Esses mecanismos podem incluir cookies técnicos, identificadores de sessão, armazenamento local e tecnologias equivalentes.',
      'Na leitura atual do código-fonte, esses recursos aparecem vinculados principalmente à autenticação, persistência de sessão e preferências de navegação, e não a perfis publicitários.',
    ],
  },
  {
    title: '9. Segurança da informação',
    paragraphs: [
      'O Florim adota medidas técnicas e administrativas razoáveis para proteção dos dados pessoais contra acessos não autorizados, destruição, perda, alteração, comunicação ou difusão indevida, considerando a natureza dos dados tratados e os riscos envolvidos.',
      'Ainda assim, nenhum ambiente digital é absolutamente invulnerável. Por isso, o usuário também deve adotar boas práticas de segurança, como uso de senha forte, proteção do dispositivo e sigilo das credenciais.',
    ],
  },
  {
    title: '10. Direitos do titular',
    paragraphs: [
      'Nos termos da LGPD, o titular poderá solicitar, observados os limites legais: confirmação da existência de tratamento; acesso aos dados; correção de dados incompletos, inexatos ou desatualizados; anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade; portabilidade, quando aplicável; informação sobre compartilhamentos; revogação do consentimento, quando essa for a base legal; e oposição ou revisão de decisões automatizadas, quando cabível.',
      'As solicitações deverão ser encaminhadas pelos canais oficiais do Florim, observados os procedimentos de validação de identidade e a possibilidade de retenção legal de determinados registros.',
    ],
  },
  {
    title: '11. Atualizações deste aviso',
    paragraphs: [
      'Este Aviso de Privacidade poderá ser alterado para refletir evoluções do produto, mudanças operacionais, exigências legais ou regulatórias e aprimoramentos das práticas de governança e segurança.',
      'A versão vigente será a publicada nesta página, com indicação de última atualização.',
    ],
  },
]

function SectionCard({
  title,
  paragraphs,
  highlight = false,
}: {
  title: string
  paragraphs: string[]
  highlight?: boolean
}) {
  return (
    <article
      className={`border-t pt-8 first:border-t-0 first:pt-0 ${
        highlight ? 'border-gold/40' : 'border-border/80'
      }`}
    >
      <h2 className="font-serif text-2xl font-medium text-sidebar">{title}</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-8 text-ink/85 sm:text-base">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </article>
  )
}

export default function TermsAndServicesPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <PublicNavbar color="paper" />

      <main className="px-6 pb-16 pt-32 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-4xl">
          <section className="border-b border-border/80 pb-10">
            <h1 className="mt-5 max-w-4xl font-serif text-4xl font-medium leading-tight sm:text-5xl">
              Termos de Uso e Aviso de Privacidade
            </h1>
            <p className="mt-5 max-w-4xl text-base leading-8 text-ink/80 sm:text-lg">
              Documento aplicável ao uso do Florim, com regras gerais da plataforma e
              informações sobre o tratamento de dados pessoais em conformidade com a
              legislação brasileira.
            </p>
            <p className="mt-4 text-sm uppercase tracking-[0.22em] text-gold/90">
              Última atualização: 17/04/2026
            </p>
          </section>

          <section className="py-8">
            <div className="mt-12">
              <section>
                <div className="mb-8">
                  <h2 className="font-serif text-3xl text-sidebar">Termos de Uso</h2>
                  <p className="mt-2 text-sm text-ink/65">
                    Regras gerais para acesso e utilização da plataforma.
                  </p>
                </div>

                <div className="space-y-8">
                {termsSections.map((section) => (
                  <SectionCard
                    key={section.title}
                    title={section.title}
                    paragraphs={section.paragraphs}
                  />
                ))}
                </div>
              </section>

              <section className="mt-16">
                <div className="mb-8">
                  <h2 className="font-serif text-3xl text-sidebar">Aviso de Privacidade</h2>
                  <p className="mt-2 text-sm text-ink/65">
                    Transparência sobre coleta, uso, compartilhamento e direitos do titular.
                  </p>
                </div>

                <div className="space-y-8">
                {privacySections.map((section) => (
                  <SectionCard
                    key={section.title}
                    title={section.title}
                    paragraphs={section.paragraphs}
                    highlight={section.highlight}
                  />
                ))}
                </div>
              </section>
            </div>

            <div className="mt-14 border-t border-border/80 pt-8">
              <p className="max-w-3xl text-sm leading-7 text-ink/75 sm:text-base">
                Para assuntos relacionados a privacidade e proteção de dados, utilize o
                canal financasflorim@gmail.com. Recomenda-se manter este documento
                atualizado sempre que houver mudança relevante nas funcionalidades, no
                tratamento de dados ou na identificação da empresa responsável.
              </p>
              <Link
                href="/signup"
                className="mt-5 inline-flex rounded-full bg-sidebar px-5 py-3 text-sm font-semibold text-paper transition-vintage hover:opacity-90"
              >
                Criar conta
              </Link>
            </div>
          </section>
        </div>
      </main>
      <PublicFooter color="paper" />
    </div>
  )
}
