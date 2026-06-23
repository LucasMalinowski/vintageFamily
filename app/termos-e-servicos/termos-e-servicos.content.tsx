import type { AppLocale } from '@/lib/i18n/getLocale'

export type LegalSection = {
  title: string
  paragraphs: string[]
  highlight?: boolean
}

export type TermosEServicosContent = {
  metaTitle: string
  metaDescription: string
  pageTitle: string
  pageIntro: string
  lastUpdatedLabel: string
  relatedDocsIntro: string
  privacyLinkLabel: string
  termsLinkLabel: string
  cookiesLinkLabel: string
  termsHeading: string
  termsSubheading: string
  privacyHeading: string
  privacySubheading: string
  closingParagraph: string
  ctaLabel: string
  termsSections: LegalSection[]
  privacySections: LegalSection[]
}

export const TERMOS_E_SERVICOS_CONTENT: Record<AppLocale, TermosEServicosContent> = {
  'pt-BR': {
    metaTitle: 'Termos de Uso e Aviso de Privacidade | Florim',
    metaDescription:
      'Documento público com os termos de uso do Florim e o aviso de privacidade aplicável ao tratamento de dados pessoais na plataforma.',
    pageTitle: 'Termos de Uso e Aviso de Privacidade',
    pageIntro:
      'Documento aplicável ao uso do Florim, com regras gerais da plataforma e informações sobre o tratamento de dados pessoais em conformidade com a legislação brasileira.',
    lastUpdatedLabel: 'Última atualização: 14/05/2026',
    relatedDocsIntro: 'Os documentos individuais também estão disponíveis em:',
    privacyLinkLabel: 'Política de Privacidade',
    termsLinkLabel: 'Termos de Uso',
    cookiesLinkLabel: 'Política de Cookies',
    termsHeading: 'Termos de Uso',
    termsSubheading: 'Regras gerais para acesso e utilização da plataforma.',
    privacyHeading: 'Aviso de Privacidade',
    privacySubheading: 'Transparência sobre coleta, uso, compartilhamento e direitos do titular.',
    closingParagraph:
      'Para assuntos relacionados a privacidade e proteção de dados, utilize o canal privacidade@florim.app. Recomenda-se manter este documento atualizado sempre que houver mudança relevante nas funcionalidades, no tratamento de dados ou na identificação da empresa responsável.',
    ctaLabel: 'Criar conta',
    termsSections: [
      {
        title: '1. Apresentação do serviço',
        paragraphs: [
          'O Florim é uma plataforma digital de organização financeira familiar. Por meio do aplicativo, o usuário pode criar e gerenciar sua família digital, registrar receitas e despesas, organizar categorias, acompanhar sonhos e metas, manter lembretes, convidar integrantes e, quando disponível, contratar plano pago e importar extratos bancários.',
          'O registro de receitas e despesas também pode ser feito por mensagens de texto ou áudio enviadas por aplicativo de mensageria instantânea, processadas por inteligência artificial para extrair os lançamentos e responder consultas. O Florim também utiliza inteligência artificial para gerar insights e previsões financeiras com base nos dados registrados — esse conteúdo é gerado automaticamente, pode conter imprecisões e não substitui aconselhamento profissional.',
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
          'O Florim não se responsabiliza por danos decorrentes de informações incorretas, desatualizadas ou incompletas fornecidas pelo usuário, por imprecisões em lançamentos, respostas ou insights gerados por inteligência artificial, por falhas em dispositivos, redes, conexão à internet, sistemas de terceiros, eventos de força maior ou por uso inadequado da conta e compartilhamento indevido de credenciais.',
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
          'Este documento será regido pelas leis da República Federativa do Brasil, especialmente pelo Código Civil, pelo Marco Civil da Internet, pelo Código de Defesa do Consumidor, quando aplicável, e pela Lei Geral de Proteção de Dados Pessoais. Fica eleito o foro da Comarca de São Paulo/SP para dirimir quaisquer controvérsias, ressalvado ao consumidor o direito de optar pelo foro de seu domicílio, nos termos do art. 101, I, do Código de Defesa do Consumidor.',
        ],
      },
    ],
    privacySections: [
      {
        title: '1. Identificação do tratamento',
        paragraphs: [
          'Este Aviso de Privacidade informa, de forma objetiva e transparente, como os dados pessoais tratados no contexto do Florim são coletados, utilizados, armazenados, compartilhados e protegidos.',
          'Controlador dos dados: LUCAS BRAZAU MALINOWSKI DESENVOLVIMENTO DE SOFTWARE LTDA, inscrita no CNPJ sob o nº 58.804.959/0001-60, sediada na Avenida Paulista, 1106, Sala 01, Andar 16, Bela Vista, São Paulo/SP, CEP 01310-914.',
          'Para solicitações relacionadas à privacidade, proteção de dados, exercício de direitos do titular ou dúvidas sobre este aviso, o canal de atendimento disponibilizado é privacidade@florim.app.',
        ],
        highlight: true,
      },
      {
        title: '2. Quais dados podem ser tratados',
        paragraphs: [
          'De acordo com as funcionalidades atualmente implementadas no produto e com os campos previstos para evolução do cadastro, o Florim pode tratar dados cadastrais e de conta, como nome, e-mail e telefone; dados de vínculo familiar, como identificação da família, papel do usuário na família e dados necessários ao envio e aceite de convites; dados de autenticação e sessão; dados de uso estritamente técnicos; e dados inseridos pelo próprio usuário para organização financeira.',
          'Também podem ser tratados dados financeiros e organizacionais inseridos ou importados pelo usuário, como receitas, despesas, descrições, categorias, metas, lembretes, anexos e dados contidos em arquivos de importação de extrato bancário.',
          'Quando o usuário utiliza o canal de mensageria instantânea (WhatsApp) disponibilizado pelo Florim, também são tratados o número de telefone verificado e o conteúdo das mensagens de texto e áudio enviadas ao assistente, utilizados para registrar lançamentos e responder consultas.',
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
          'Quando o usuário utiliza o canal de mensageria instantânea (WhatsApp), as mensagens trocadas são compartilhadas com o provedor da plataforma de mensageria (Meta Platforms, Inc.) e processadas por provedor de inteligência artificial (Groq Inc.) para gerar lançamentos automáticos, respostas e insights financeiros.',
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
    ],
  },
  en: {
    metaTitle: 'Terms of Use and Privacy Notice | Florim',
    metaDescription:
      'Public document with Florim’s terms of use and the privacy notice applicable to the processing of personal data on the platform.',
    pageTitle: 'Terms of Use and Privacy Notice',
    pageIntro:
      'Document applicable to the use of Florim, with general platform rules and information about the processing of personal data in accordance with Brazilian law.',
    lastUpdatedLabel: 'Last updated: 05/14/2026',
    relatedDocsIntro: 'The individual documents are also available at:',
    privacyLinkLabel: 'Privacy Policy',
    termsLinkLabel: 'Terms of Use',
    cookiesLinkLabel: 'Cookie Policy',
    termsHeading: 'Terms of Use',
    termsSubheading: 'General rules for accessing and using the platform.',
    privacyHeading: 'Privacy Notice',
    privacySubheading: 'Transparency about collection, use, sharing, and data subject rights.',
    closingParagraph:
      'For matters related to privacy and data protection, use the channel privacidade@florim.app. We recommend keeping this document up to date whenever there is a relevant change to the features, the processing of data, or the identification of the responsible company.',
    ctaLabel: 'Create account',
    termsSections: [
      {
        title: '1. Overview of the service',
        paragraphs: [
          'Florim is a digital platform for family financial organization. Through the app, the user can create and manage their digital family, record income and expenses, organize categories, track dreams and goals, keep reminders, invite members, and, when available, subscribe to a paid plan and import bank statements.',
          'Income and expenses can also be recorded through text or audio messages sent over an instant messaging app, processed using artificial intelligence to extract entries and answer questions. Florim also uses artificial intelligence to generate insights and financial forecasts based on the recorded data — this content is generated automatically, may contain inaccuracies, and does not replace professional advice.',
          'This document governs the use of the website, the app, and the features made available by Florim. By accessing or using the platform, the user declares that they have read, understood, and agree to these Terms of Use and to the Privacy Notice below.',
        ],
      },
      {
        title: '2. Registration, access, and eligibility',
        paragraphs: [
          'To use Florim’s authenticated areas, the user must create an account with truthful, complete, and up-to-date information, especially name and email, and must set personal, non-transferable access credentials.',
          'As the registration and relationship flows evolve, the platform may also request a phone number for identification, contact, account security, and service-related communications.',
          'The user is responsible for keeping their password confidential and for all activity carried out through their account. Whenever the user identifies misuse, unauthorized access, or a suspected account compromise, they must take appropriate measures to protect their access and notify the service’s support through the official channels available.',
          'When inviting third parties to the digital family, the user declares that they are entitled to share the invitee’s email for that specific purpose.',
        ],
      },
      {
        title: '3. Platform usage rules',
        paragraphs: [
          'The user agrees to use Florim lawfully, ethically, and in a manner compatible with the platform’s purpose, refraining from acts that violate applicable law, third-party rights, intellectual property rules, information security, or the technical integrity of the service.',
          'It is prohibited to use Florim to attempt unauthorized access, reverse engineering, unauthorized automated data extraction, fraud, sending malicious content, improper sharing of credentials, or any conduct that may compromise the availability, confidentiality, or security of the platform and of other users.',
        ],
      },
      {
        title: '4. Content, financial records, and uploaded files',
        paragraphs: [
          'Data, entries, descriptions, notes, attachments, and files uploaded or entered by the user remain the user’s responsibility. The user must ensure that they are entitled to enter such content and that it does not violate third-party rights.',
          'In the statement import features, the user acknowledges that they may upload financial files, such as CSV and OFX, which are processed for reading, preview, categorization, and recording of transactions compatible with the service.',
        ],
      },
      {
        title: '5. Paid plans and third-party services',
        paragraphs: [
          'Some of Florim’s features may depend on subscribing to a paid plan. When applicable, billing, payment method management, invoicing, and related operations may involve specialized providers, including payment processors.',
          'When using features integrated with third parties, the user may also be subject to those providers’ terms and policies, to the extent applicable to the feature used.',
        ],
      },
      {
        title: '6. Availability, changes, and suspension',
        paragraphs: [
          'Florim may, at any time, update, change, suspend, or discontinue features, layouts, flows, plans, integrations, and technical characteristics of the platform, temporarily or permanently, for operational, business, security, regulatory, or legal reasons.',
          'Although reasonable efforts are made to keep the service available, failures, slowness, unavailability, maintenance interruptions, or limitations caused by internal factors or by third-party services may occur.',
        ],
      },
      {
        title: '7. Limitation of liability',
        paragraphs: [
          'Florim is a tool to support financial organization and does not constitute legal, accounting, tax, banking, or investment advice. The information presented on the platform depends on the data entered or uploaded by the user and does not replace independent verification when necessary.',
          'Florim is not liable for damages arising from incorrect, outdated, or incomplete information provided by the user, from inaccuracies in entries, replies, or insights generated by artificial intelligence, from failures in devices, networks, internet connections, third-party systems, force majeure events, or from improper use of the account and improper sharing of credentials.',
        ],
      },
      {
        title: '8. Intellectual property',
        paragraphs: [
          'The app’s structure, visual identity, brand, software, organized databases, text, interfaces, and other protectable elements linked to Florim belong to their respective owners or licensors, in accordance with applicable law.',
          'These Terms do not grant the user any intellectual property rights, except for a limited, non-exclusive, revocable, and non-transferable license for regular use of the platform according to its purpose.',
        ],
      },
      {
        title: '9. Termination of access',
        paragraphs: [
          'The user’s access may be suspended, restricted, or terminated in the event of a violation of these Terms, fraudulent use, an attempted security breach, legal non-compliance, an order from a competent authority, or conduct that creates risk to the platform, other users, or third parties.',
          'Even after the account is closed, certain data may be retained for as long as necessary to comply with legal, regulatory, and contractual obligations and for the regular exercise of rights.',
        ],
      },
      {
        title: '10. Updates and applicable law',
        paragraphs: [
          'These Terms may be amended periodically. The version in force will be the one made available at this route, indicating the date of the last update.',
          'This document is governed by the laws of the Federative Republic of Brazil, in particular the Civil Code, the Brazilian Internet Civil Rights Framework (Marco Civil da Internet), Brazil’s Consumer Defense Code, when applicable, and Brazil’s LGPD (General Data Protection Law). The courts of the Comarca de São Paulo/SP, Brazil are elected to settle any disputes, without prejudice to the consumer’s right to choose the courts of their domicile, under art. 101, I, of Brazil’s Consumer Defense Code.',
        ],
      },
    ],
    privacySections: [
      {
        title: '1. Identification of the controller',
        paragraphs: [
          'This Privacy Notice informs, in an objective and transparent manner, how personal data processed in connection with Florim is collected, used, stored, shared, and protected.',
          'Data controller: LUCAS BRAZAU MALINOWSKI DESENVOLVIMENTO DE SOFTWARE LTDA, registered under CNPJ (Brazilian tax ID) No. 58.804.959/0001-60, headquartered at Avenida Paulista, 1106, Sala 01, Andar 16, Bela Vista, São Paulo/SP, Brazil, CEP 01310-914.',
          'For requests related to privacy, data protection, the exercise of data subject rights, or questions about this notice, the available contact channel is privacidade@florim.app.',
        ],
        highlight: true,
      },
      {
        title: '2. What data may be processed',
        paragraphs: [
          'In line with the features currently implemented in the product and with the fields planned for the evolution of registration, Florim may process registration and account data, such as name, email, and phone number; family-relationship data, such as family identification, the user’s role within the family, and data required to send and accept invitations; authentication and session data; strictly technical usage data; and data entered by the user for financial organization.',
          'Florim may also process financial and organizational data entered or imported by the user, such as income, expenses, descriptions, categories, goals, reminders, attachments, and data contained in bank statement import files.',
          'When the user uses the instant messaging channel (WhatsApp) made available by Florim, the verified phone number and the content of the text and audio messages sent to the assistant are also processed, used to record entries and answer questions.',
          'When a paid plan is purchased, Florim may process subscription data, customer and subscription identifiers held by the payment processor, billing status, invoices, and transaction metadata. Full card data tends to be processed directly by the payment provider, and not stored directly by Florim, in line with the technical flow currently integrated.',
        ],
      },
      {
        title: '3. Purposes of processing',
        paragraphs: [
          'Data may be processed to create and maintain the user’s account; authenticate access; enable use of the platform; create the digital family; manage permissions and invitations; store and display financial entries and reports; import and process statement files; maintain browsing preferences; prevent fraud and abuse; respond to support requests; comply with legal and regulatory obligations; and exercise rights in administrative, arbitration, or judicial proceedings.',
          'Data may also be used for operational communications related to the functioning of the service, such as sending invitations by email, confirmations necessary for using the account, and subscription-related notifications.',
        ],
      },
      {
        title: '4. Applicable legal bases',
        paragraphs: [
          'The processing of personal data on Florim may rely, depending on the context, on the legal bases set out in Brazil’s LGPD (General Data Protection Law), in particular: performance of a contract or of preliminary procedures related to the contract; compliance with a legal or regulatory obligation; the regular exercise of rights; legitimate interest, when applicable and subject to the balancing test required by law; and consent, when it is actually necessary for a given operation.',
          'Whenever processing depends on consent, the data subject may withdraw it within the applicable legal and operational limits, without prejudice to processing already carried out under a previously valid basis.',
        ],
      },
      {
        title: '5. Data sharing',
        paragraphs: [
          'Personal data may be shared, when necessary, with infrastructure, authentication, hosting, database, email delivery, storage, technical support, and payment processing providers, as well as with public and judicial authorities, when there is a legal or regulatory obligation or a valid order.',
          'In the product’s current context, the use of authentication and database services by specialized providers, as well as a payment provider for subscriptions, is part of the provision of the service and may require operational sharing of data strictly necessary to carry out those activities.',
          'When the user uses the instant messaging channel (WhatsApp), the messages exchanged are shared with the messaging platform provider (Meta Platforms, Inc.) and processed by an artificial intelligence provider (Groq Inc.) to generate automatic entries, replies, and financial insights.',
        ],
      },
      {
        title: '6. International data transfer',
        paragraphs: [
          'Depending on the technology infrastructure and the providers engaged for authentication, hosting, storage, communication, and payment, an international transfer of personal data or remote access to data stored outside Brazil may occur.',
          'In such cases, Florim must observe the legal requirements applicable to international data transfers, including by adopting contractual and operational safeguards compatible with the LGPD.',
        ],
      },
      {
        title: '7. Retention and deletion',
        paragraphs: [
          'Personal data will be kept for as long as necessary to fulfill the purposes stated, to preserve records related to the provision of the service, to comply with legal or regulatory obligations, and for the regular exercise of rights.',
          'When applicable and possible, data will be deleted, anonymized, or blocked after processing ends, except in the legal retention scenarios provided for under the law.',
        ],
      },
      {
        title: '8. Cookies, sessions, and local storage',
        paragraphs: [
          'Florim uses technical session, authentication, and browser local storage resources to keep the account working, record interface preferences, and enable the application experience. These mechanisms may include technical cookies, session identifiers, local storage, and equivalent technologies.',
          'Based on the current reading of the source code, these resources are mainly linked to authentication, session persistence, and browsing preferences, and not to advertising profiles.',
        ],
      },
      {
        title: '9. Information security',
        paragraphs: [
          'Florim adopts reasonable technical and administrative measures to protect personal data against unauthorized access, destruction, loss, alteration, or improper communication or disclosure, taking into account the nature of the data processed and the risks involved.',
          'Even so, no digital environment is absolutely invulnerable. For this reason, the user should also adopt good security practices, such as using a strong password, protecting their device, and keeping their credentials confidential.',
        ],
      },
      {
        title: '10. Data subject rights',
        paragraphs: [
          'Under the LGPD, the data subject may request, subject to legal limits: confirmation of the existence of processing; access to the data; correction of incomplete, inaccurate, or outdated data; anonymization, blocking, or deletion of unnecessary or excessive data, or data processed in non-compliance with the law; data portability, when applicable; information about sharing; withdrawal of consent, when that is the legal basis; and review of automated decisions, when applicable.',
          'Requests must be submitted through Florim’s official channels, subject to identity-verification procedures and the possibility of legally retaining certain records.',
        ],
      },
      {
        title: '11. Updates to this notice',
        paragraphs: [
          'This Privacy Notice may be amended to reflect product developments, operational changes, legal or regulatory requirements, and improvements to governance and security practices.',
          'The version in force will be the one published on this page, indicating the date of the last update.',
        ],
      },
    ],
  },
  es: {
    metaTitle: 'Términos de Uso y Aviso de Privacidad | Florim',
    metaDescription:
      'Documento público con los términos de uso de Florim y el aviso de privacidad aplicable al tratamiento de datos personales en la plataforma.',
    pageTitle: 'Términos de Uso y Aviso de Privacidad',
    pageIntro:
      'Documento aplicable al uso de Florim, con reglas generales de la plataforma e información sobre el tratamiento de datos personales conforme a la legislación brasileña.',
    lastUpdatedLabel: 'Última actualización: 14/05/2026',
    relatedDocsIntro: 'Los documentos individuales también están disponibles en:',
    privacyLinkLabel: 'Política de Privacidad',
    termsLinkLabel: 'Términos de Uso',
    cookiesLinkLabel: 'Política de Cookies',
    termsHeading: 'Términos de Uso',
    termsSubheading: 'Reglas generales para el acceso y el uso de la plataforma.',
    privacyHeading: 'Aviso de Privacidad',
    privacySubheading: 'Transparencia sobre la recopilación, el uso, la compartición y los derechos del titular.',
    closingParagraph:
      'Para asuntos relacionados con la privacidad y la protección de datos, utiliza el canal privacidade@florim.app. Se recomienda mantener este documento actualizado cada vez que ocurra un cambio relevante en las funcionalidades, en el tratamiento de datos o en la identificación de la empresa responsable.',
    ctaLabel: 'Crear cuenta',
    termsSections: [
      {
        title: '1. Presentación del servicio',
        paragraphs: [
          'Florim es una plataforma digital de organización financiera familiar. A través de la aplicación, el usuario puede crear y gestionar su familia digital, registrar ingresos y gastos, organizar categorías, dar seguimiento a sueños y metas, mantener recordatorios, invitar integrantes y, cuando esté disponible, contratar un plan de pago e importar extractos bancarios.',
          'El registro de ingresos y gastos también puede realizarse mediante mensajes de texto o audio enviados por una aplicación de mensajería instantánea, procesados mediante inteligencia artificial para extraer los registros y responder consultas. Florim también utiliza inteligencia artificial para generar perspectivas y previsiones financieras basadas en los datos registrados — este contenido se genera automáticamente, puede contener imprecisiones y no sustituye el asesoramiento profesional.',
          'Este documento regula el uso del sitio web, de la aplicación y de las funcionalidades puestas a disposición por Florim. Al acceder o utilizar la plataforma, el usuario declara que ha leído, comprendido y aceptado estos Términos de Uso y el Aviso de Privacidad que figura a continuación.',
        ],
      },
      {
        title: '2. Registro, acceso y elegibilidad',
        paragraphs: [
          'Para utilizar las áreas autenticadas de Florim, el usuario deberá crear una cuenta con información verdadera, completa y actualizada, en especial nombre y correo electrónico, además de definir credenciales de acceso personales e intransferibles.',
          'A medida que evolucionen los flujos de registro y relación, la plataforma también podrá solicitar el número de teléfono para identificación, contacto, seguridad de la cuenta y comunicaciones relacionadas con el servicio.',
          'El usuario es responsable de mantener la confidencialidad de su contraseña y de toda actividad realizada desde su cuenta. Siempre que detecte un uso indebido, un acceso no autorizado o una sospecha de vulneración de la cuenta, deberá adoptar las medidas pertinentes para proteger su acceso y comunicarse con el soporte del servicio a través de los canales oficiales disponibles.',
          'Al invitar a terceros a la familia digital, el usuario declara que tiene legitimidad para compartir el correo electrónico de la persona invitada para esa finalidad específica.',
        ],
      },
      {
        title: '3. Reglas de uso de la plataforma',
        paragraphs: [
          'El usuario se compromete a utilizar Florim de manera lícita, ética y compatible con la finalidad de la plataforma, absteniéndose de realizar actos que infrinjan la legislación aplicable, los derechos de terceros, las normas de propiedad intelectual, la seguridad de la información o la integridad técnica del servicio.',
          'Está prohibido utilizar Florim para intentar accesos indebidos, realizar ingeniería inversa, extraer datos de forma automatizada sin autorización, cometer fraude, enviar contenido malicioso, compartir credenciales de forma indebida o realizar cualquier conducta que pueda comprometer la disponibilidad, la confidencialidad o la seguridad de la plataforma y de otros usuarios.',
        ],
      },
      {
        title: '4. Contenido, registros financieros y archivos enviados',
        paragraphs: [
          'Los datos, movimientos, descripciones, observaciones, adjuntos y archivos enviados o registrados por el usuario permanecen bajo su responsabilidad. El usuario debe garantizar que tiene legitimidad para incluir dichos contenidos y que estos no infringen derechos de terceros.',
          'En las funcionalidades de importación de extractos, el usuario reconoce que podrá enviar archivos financieros, como CSV y OFX, cuyo tratamiento se realiza para la lectura, la vista previa, la categorización y el registro de los movimientos compatibles con el servicio.',
        ],
      },
      {
        title: '5. Planes de pago y servicios de terceros',
        paragraphs: [
          'Parte de las funcionalidades de Florim puede depender de la contratación de un plan de pago. Cuando corresponda, la facturación, la gestión de medios de pago, la emisión de comprobantes y las operaciones relacionadas podrán involucrar proveedores especializados, incluidos procesadores de pago.',
          'Al utilizar funciones integradas con terceros, el usuario también podrá quedar sujeto a los términos y políticas de esos proveedores, en lo que resulte aplicable a la funcionalidad utilizada.',
        ],
      },
      {
        title: '6. Disponibilidad, modificaciones y suspensión',
        paragraphs: [
          'Florim podrá, en cualquier momento, actualizar, modificar, suspender o discontinuar funcionalidades, diseños, flujos, planes, integraciones y características técnicas de la plataforma, de forma temporal o definitiva, por razones operativas, comerciales, de seguridad, regulatorias o legales.',
          'Aunque se adoptan esfuerzos razonables para mantener la disponibilidad del servicio, podrán producirse fallas, lentitud, indisponibilidades, interrupciones por mantenimiento o limitaciones causadas por factores internos o por servicios de terceros.',
        ],
      },
      {
        title: '7. Limitación de responsabilidad',
        paragraphs: [
          'Florim es una herramienta de apoyo a la organización financiera y no constituye asesoría jurídica, contable, tributaria, bancaria ni de inversiones. La información presentada en la plataforma depende de los datos ingresados o enviados por el propio usuario y no sustituye las validaciones independientes cuando sean necesarias.',
          'Florim no se responsabiliza por daños derivados de información incorrecta, desactualizada o incompleta proporcionada por el usuario, por imprecisiones en registros, respuestas o perspectivas generadas por inteligencia artificial, por fallas en dispositivos, redes, conexión a internet, sistemas de terceros, eventos de fuerza mayor o por el uso inadecuado de la cuenta y la compartición indebida de credenciales.',
        ],
      },
      {
        title: '8. Propiedad intelectual',
        paragraphs: [
          'La estructura de la aplicación, su identidad visual, marca, software, bases organizadas, textos, interfaces y demás elementos protegibles vinculados a Florim son propiedad de sus responsables o de sus licenciantes, conforme a la legislación aplicable.',
          'Estos Términos no otorgan al usuario ningún derecho de propiedad intelectual, salvo la licencia limitada, no exclusiva, revocable e intransferible para el uso habitual de la plataforma conforme a su finalidad.',
        ],
      },
      {
        title: '9. Finalización del acceso',
        paragraphs: [
          'El acceso del usuario podrá ser suspendido, restringido o finalizado en caso de infracción de estos Términos, uso fraudulento, intento de violación de seguridad, incumplimiento legal, orden de autoridad competente o conducta que genere riesgo para la plataforma, para otros usuarios o para terceros.',
          'Incluso después del cierre de la cuenta, determinados datos podrán conservarse durante el plazo necesario para cumplir obligaciones legales, regulatorias y contractuales, y para el ejercicio regular de derechos.',
        ],
      },
      {
        title: '10. Actualizaciones y legislación aplicable',
        paragraphs: [
          'Estos Términos podrán modificarse periódicamente. La versión vigente será la que esté disponible en esta ruta, con indicación de la última actualización.',
          'Este documento se rige por las leyes de la República Federativa de Brasil, en especial por el Código Civil, por el Marco Civil de Internet, por el Código de Defensa del Consumidor, cuando corresponda, y por la LGPD (Ley General de Protección de Datos) de Brasil. Se elige el foro de la Comarca de São Paulo/SP, Brasil, para resolver cualquier controversia, sin perjuicio del derecho del consumidor a optar por el foro de su domicilio, conforme al art. 101, I, del Código de Defensa del Consumidor de Brasil.',
        ],
      },
    ],
    privacySections: [
      {
        title: '1. Identificación del responsable del tratamiento',
        paragraphs: [
          'Este Aviso de Privacidad informa, de manera objetiva y transparente, cómo se recopilan, utilizan, almacenan, comparten y protegen los datos personales tratados en el contexto de Florim.',
          'Responsable del tratamiento: LUCAS BRAZAU MALINOWSKI DESENVOLVIMENTO DE SOFTWARE LTDA, inscrita en el CNPJ (identificación fiscal brasileña) bajo el n.º 58.804.959/0001-60, con domicilio en Avenida Paulista, 1106, Sala 01, Andar 16, Bela Vista, São Paulo/SP, Brasil, CEP 01310-914.',
          'Para solicitudes relacionadas con la privacidad, la protección de datos, el ejercicio de los derechos del titular o dudas sobre este aviso, el canal de atención disponible es privacidade@florim.app.',
        ],
        highlight: true,
      },
      {
        title: '2. Qué datos pueden ser tratados',
        paragraphs: [
          'De acuerdo con las funcionalidades actualmente implementadas en el producto y con los campos previstos para la evolución del registro, Florim puede tratar datos de registro y de cuenta, como nombre, correo electrónico y teléfono; datos de vínculo familiar, como la identificación de la familia, el rol del usuario dentro de la familia y los datos necesarios para el envío y la aceptación de invitaciones; datos de autenticación y de sesión; datos de uso estrictamente técnicos; y datos ingresados por el propio usuario para la organización financiera.',
          'También pueden tratarse datos financieros y organizativos ingresados o importados por el usuario, como ingresos, gastos, descripciones, categorías, metas, recordatorios, adjuntos y datos contenidos en archivos de importación de extractos bancarios.',
          'Cuando el usuario utiliza el canal de mensajería instantánea (WhatsApp) puesto a disposición por Florim, también se tratan el número de teléfono verificado y el contenido de los mensajes de texto y audio enviados al asistente, utilizados para registrar movimientos y responder consultas.',
          'Cuando se contrate un plan de pago, Florim podrá tratar datos de suscripción, identificadores de cliente y de suscripción en el procesador de pagos, estado de facturación, comprobantes y metadatos de transacción. Los datos completos de la tarjeta tienden a ser procesados directamente por el proveedor de pagos, y no almacenados directamente por Florim, conforme al flujo técnico actualmente integrado.',
        ],
      },
      {
        title: '3. Para qué finalidades se tratan los datos',
        paragraphs: [
          'Los datos pueden tratarse para crear y mantener la cuenta del usuario; autenticar el acceso; permitir el uso de la plataforma; crear la familia digital; gestionar permisos e invitaciones; almacenar y mostrar movimientos e informes financieros; importar y procesar archivos de extracto; mantener preferencias de navegación; prevenir fraudes y abusos; atender solicitudes de soporte; cumplir obligaciones legales y regulatorias; y ejercer derechos en procesos administrativos, arbitrales o judiciales.',
          'Los datos también pueden utilizarse para comunicaciones operativas relacionadas con el funcionamiento del servicio, como el envío de invitaciones por correo electrónico, confirmaciones necesarias para el uso de la cuenta y notificaciones relacionadas con la suscripción.',
        ],
      },
      {
        title: '4. Bases legales aplicables',
        paragraphs: [
          'El tratamiento de datos personales en Florim podrá apoyarse, según el contexto, en las bases legales previstas en la LGPD (Ley General de Protección de Datos) de Brasil, en especial: la ejecución de un contrato o de procedimientos preliminares relacionados con el contrato; el cumplimiento de una obligación legal o regulatoria; el ejercicio regular de derechos; el interés legítimo, cuando corresponda y observando el balance exigido por la ley; y el consentimiento, cuando este sea efectivamente necesario para una operación determinada.',
          'Siempre que el tratamiento dependa del consentimiento, el titular podrá revocarlo dentro de los límites legales y operativos aplicables, sin perjuicio de los tratamientos ya realizados con base en un fundamento válido anterior.',
        ],
      },
      {
        title: '5. Compartición de datos',
        paragraphs: [
          'Los datos personales podrán compartirse, cuando sea necesario, con proveedores de infraestructura, autenticación, hospedaje, base de datos, envío de correos electrónicos, almacenamiento, soporte técnico y procesamiento de pagos, además de autoridades públicas y judiciales, cuando exista una obligación legal, regulatoria u orden válida.',
          'En el contexto actual del producto, el uso de servicios especializados de autenticación y base de datos, así como de un proveedor de pagos para la suscripción, forma parte de la prestación del servicio y puede requerir la compartición operativa de datos estrictamente necesarios para la ejecución de esas actividades.',
          'Cuando el usuario utiliza el canal de mensajería instantánea (WhatsApp), los mensajes intercambiados se comparten con el proveedor de la plataforma de mensajería (Meta Platforms, Inc.) y se procesan mediante un proveedor de inteligencia artificial (Groq Inc.) para generar registros automáticos, respuestas y perspectivas financieras.',
        ],
      },
      {
        title: '6. Transferencia internacional',
        paragraphs: [
          'Dependiendo de la infraestructura tecnológica y de los proveedores contratados para autenticación, hospedaje, almacenamiento, comunicación y pago, podrá producirse una transferencia internacional de datos personales o un acceso remoto a datos almacenados fuera de Brasil.',
          'En esos casos, Florim deberá observar los requisitos legales aplicables a la transferencia internacional de datos, incluyendo la adopción de salvaguardas contractuales y operativas compatibles con la LGPD.',
        ],
      },
      {
        title: '7. Retención y eliminación',
        paragraphs: [
          'Los datos personales se conservarán durante el tiempo necesario para cumplir las finalidades informadas, para preservar los registros relacionados con la prestación del servicio, para cumplir obligaciones legales o regulatorias y para el ejercicio regular de derechos.',
          'Cuando corresponda y sea posible, los datos serán eliminados, anonimizados o bloqueados tras la finalización del tratamiento, salvo en los supuestos legales de conservación previstos en la legislación.',
        ],
      },
      {
        title: '8. Cookies, sesión y almacenamiento local',
        paragraphs: [
          'Florim utiliza recursos técnicos de sesión, autenticación y almacenamiento local del navegador para mantener el funcionamiento de la cuenta, registrar preferencias de interfaz y permitir la experiencia de la aplicación. Estos mecanismos pueden incluir cookies técnicas, identificadores de sesión, almacenamiento local y tecnologías equivalentes.',
          'Según la lectura actual del código fuente, estos recursos están vinculados principalmente a la autenticación, la persistencia de sesión y las preferencias de navegación, y no a perfiles publicitarios.',
        ],
      },
      {
        title: '9. Seguridad de la información',
        paragraphs: [
          'Florim adopta medidas técnicas y administrativas razonables para proteger los datos personales frente a accesos no autorizados, destrucción, pérdida, alteración, comunicación o divulgación indebida, considerando la naturaleza de los datos tratados y los riesgos involucrados.',
          'Aun así, ningún entorno digital es absolutamente invulnerable. Por ello, el usuario también debe adoptar buenas prácticas de seguridad, como el uso de una contraseña segura, la protección del dispositivo y la confidencialidad de las credenciales.',
        ],
      },
      {
        title: '10. Derechos del titular',
        paragraphs: [
          'Conforme a la LGPD, el titular podrá solicitar, dentro de los límites legales: la confirmación de la existencia de tratamiento; el acceso a los datos; la corrección de datos incompletos, inexactos o desactualizados; la anonimización, el bloqueo o la eliminación de datos innecesarios, excesivos o tratados en incumplimiento de la ley; la portabilidad, cuando corresponda; información sobre las comparticiones realizadas; la revocación del consentimiento, cuando esta sea la base legal; y la oposición o revisión de decisiones automatizadas, cuando corresponda.',
          'Las solicitudes deberán enviarse a través de los canales oficiales de Florim, observando los procedimientos de validación de identidad y la posibilidad de retención legal de determinados registros.',
        ],
      },
      {
        title: '11. Actualizaciones de este aviso',
        paragraphs: [
          'Este Aviso de Privacidad podrá modificarse para reflejar la evolución del producto, cambios operativos, exigencias legales o regulatorias y mejoras en las prácticas de gobernanza y seguridad.',
          'La versión vigente será la publicada en esta página, con indicación de la última actualización.',
        ],
      },
    ],
  },
}
