import Link from 'next/link'
import type { AppLocale } from '@/lib/i18n/getLocale'
import type { ReactNode } from 'react'

export type PrivacySection = {
  title: string
  content: ReactNode
}

export type PrivacyContent = {
  metaTitle: string
  pageTitle: string
  effectiveDate: string
  sections: PrivacySection[]
}

const linkClass = 'text-coffee underline underline-offset-2 hover:text-coffee/80'

export const PRIVACY_CONTENT: Record<AppLocale, PrivacyContent> = {
  'pt-BR': {
    metaTitle: 'Política de Privacidade - Florim',
    pageTitle: 'Política de Privacidade',
    effectiveDate: 'Vigente a partir de 14 de maio de 2026',
    sections: [
      {
        title: '1. Quem somos',
        content: (
          <p>
            <strong>LUCAS BRAZAU MALINOWSKI DESENVOLVIMENTO DE SOFTWARE LTDA</strong><br />
            CNPJ: 58.804.959/0001-60<br />
            Endereço: Avenida Paulista, 1106, Sala 01, Andar 16, Bela Vista, São Paulo/SP, CEP 01310-914<br />
            E-mail do encarregado: <a href="mailto:privacidade@florim.app" className={linkClass}>privacidade@florim.app</a>
          </p>
        ),
      },
      {
        title: '2. O que é o Florim',
        content: (
          <>
            <p>
              O Florim é uma ferramenta de organização financeira familiar. Os dados financeiros são <strong>inseridos manualmente pelos próprios usuários</strong>.
            </p>
            <p className="bg-white border border-border rounded-lg px-4 py-3 text-sm">
              ⚠️ O Florim <strong>não acessa contas bancárias</strong>, <strong>não realiza transações financeiras</strong> e <strong>não tem acesso a dinheiro real</strong>. Todos os registros são de responsabilidade exclusiva do usuário.
            </p>
          </>
        ),
      },
      {
        title: '3. Dados coletados',
        content: (
          <>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Dados de cadastro:</strong> nome, e-mail e telefone</li>
              <li><strong>Dados financeiros:</strong> despesas, receitas, metas e lembretes inseridos manualmente</li>
              <li><strong>Dados técnicos:</strong> endereço IP, logs de acesso e dados de sessão</li>
              <li><strong>Cookies:</strong> essenciais e analíticos (com consentimento)</li>
            </ul>
            <p>Não coletamos dados sensíveis como CPF, documentos de identidade ou dados bancários.</p>
          </>
        ),
      },
      {
        title: '4. Finalidade e base legal (LGPD, art. 7º)',
        content: (
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Execução de contrato:</strong> prestação do serviço contratado</li>
            <li><strong>Interesse legítimo:</strong> segurança, prevenção de fraudes e melhoria do produto</li>
            <li><strong>Consentimento:</strong> cookies analíticos e comunicações opcionais</li>
          </ul>
        ),
      },
      {
        title: '5. Compartilhamento de dados',
        content: (
          <>
            <p>Seus dados são compartilhados apenas com:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Supabase:</strong> banco de dados e autenticação (servidores nos EUA, cláusulas contratuais padrão aplicadas)</li>
              <li><strong>Resend:</strong> envio de e-mails transacionais</li>
              <li><strong>Stripe:</strong> processamento de pagamentos (não recebe dados financeiros do Florim)</li>
              <li><strong>PostHog, Inc.:</strong> análises de uso e comportamento (servidores nos EUA, cláusulas contratuais padrão aplicadas). Ativados apenas com seu consentimento.</li>
            </ul>
            <p>Não vendemos nem alugamos seus dados a terceiros.</p>
          </>
        ),
      },
      {
        title: '6. Seus direitos (LGPD, art. 18)',
        content: (
          <>
            <p>Você pode, a qualquer momento, exercer os seguintes direitos:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Acesso:</strong> solicitar cópia dos seus dados</li>
              <li><strong>Correção:</strong> atualizar dados incompletos ou desatualizados</li>
              <li><strong>Exclusão:</strong> apagar seus dados pessoais</li>
              <li><strong>Portabilidade:</strong> receber seus dados em formato estruturado</li>
              <li><strong>Revogação do consentimento:</strong> retirar consentimento a qualquer momento</li>
              <li><strong>Informação:</strong> saber com quem seus dados são compartilhados</li>
              <li><strong>Oposição:</strong> opor-se a tratamentos realizados com base em legítimo interesse (LGPD, art. 18, II)</li>
              <li><strong>Reclamação à ANPD:</strong> peticionar à Autoridade Nacional de Proteção de Dados em caso de descumprimento (LGPD, art. 18, VI)</li>
            </ul>
            <p>
              Para exercer seus direitos, entre em contato via{' '}
              <a href="mailto:privacidade@florim.app" className={linkClass}>
                privacidade@florim.app
              </a>. Respondemos em até 15 dias úteis.
            </p>
          </>
        ),
      },
      {
        title: '7. Retenção de dados',
        content: (
          <p>
            Seus dados são mantidos enquanto sua conta estiver ativa ou pelo tempo necessário para cumprimento de obrigações legais. Após a exclusão da conta, os dados pessoais são removidos em até 30 dias corridos, salvo obrigações legais que exijam retenção por prazo maior.
          </p>
        ),
      },
      {
        title: '8. Segurança',
        content: (
          <p>
            Adotamos medidas técnicas e administrativas razoáveis para proteger seus dados contra acessos não autorizados, perda ou destruição, incluindo criptografia em trânsito (HTTPS) e controle de acesso. Nenhum sistema é 100% seguro; agimos com diligência para minimizar riscos. Em caso de incidente de segurança com risco ou dano relevante aos titulares, notificaremos a ANPD e os usuários afetados em prazo razoável, adotando como referência de boa prática o prazo de 72 horas (LGPD, art. 48).
          </p>
        ),
      },
      {
        title: '9. Crianças e adolescentes',
        content: (
          <p>
            O Florim não é destinado a menores de 18 anos. Em conformidade com o art. 14 da LGPD, não coletamos intencionalmente dados pessoais de crianças (menores de 12 anos) sem o consentimento específico e em destaque de pelo menos um dos pais ou responsável legal. Caso identificamos coleta acidental de dados de crianças, os dados serão excluídos imediatamente.
          </p>
        ),
      },
      {
        title: '10. Cookies',
        content: (
          <p>
            Utilizamos cookies essenciais (necessários ao funcionamento) e cookies analíticos (com seu consentimento). Veja nossa{' '}
            <Link href="/cookies" className={linkClass}>
              Política de Cookies
            </Link>{' '}
            para mais detalhes.
          </p>
        ),
      },
      {
        title: '11. Alterações a esta política',
        content: (
          <p>
            Podemos atualizar esta política periodicamente. Em caso de alterações materiais, notificaremos por e-mail ou aviso no aplicativo. O uso continuado do serviço após a notificação constitui aceitação das alterações.
          </p>
        ),
      },
      {
        title: '12. Contato',
        content: (
          <>
            <p>
              <strong>Encarregado de Proteção de Dados (DPO):</strong>{' '}
              <a href="mailto:privacidade@florim.app" className={linkClass}>
                privacidade@florim.app
              </a>
            </p>
            <p>
              <strong>Contato geral:</strong>{' '}
              <a href="mailto:contato@florim.app" className={linkClass}>
                contato@florim.app
              </a>
            </p>
            <p>
              Autoridade Nacional de Proteção de Dados (ANPD):{' '}
              <a
                href="https://www.gov.br/anpd"
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                www.gov.br/anpd
              </a>
            </p>
          </>
        ),
      },
    ],
  },
  en: {
    metaTitle: 'Privacy Policy - Florim',
    pageTitle: 'Privacy Policy',
    effectiveDate: 'Effective as of May 14, 2026',
    sections: [
      {
        title: '1. Who we are',
        content: (
          <p>
            <strong>LUCAS BRAZAU MALINOWSKI DESENVOLVIMENTO DE SOFTWARE LTDA</strong><br />
            CNPJ (Brazilian tax ID): 58.804.959/0001-60<br />
            Address: Avenida Paulista, 1106, Sala 01, Andar 16, Bela Vista, São Paulo/SP, Brazil, CEP 01310-914<br />
            Data protection officer email: <a href="mailto:privacidade@florim.app" className={linkClass}>privacidade@florim.app</a>
          </p>
        ),
      },
      {
        title: '2. What Florim is',
        content: (
          <>
            <p>
              Florim is a family financial organization tool. Financial data is <strong>entered manually by the users themselves</strong>.
            </p>
            <p className="bg-white border border-border rounded-lg px-4 py-3 text-sm">
              ⚠️ Florim <strong>does not access bank accounts</strong>, <strong>does not perform financial transactions</strong>, and <strong>has no access to real money</strong>. All entries are the sole responsibility of the user.
            </p>
          </>
        ),
      },
      {
        title: '3. Data we collect',
        content: (
          <>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Registration data:</strong> name, email, and phone number</li>
              <li><strong>Financial data:</strong> expenses, income, goals, and reminders entered manually</li>
              <li><strong>Technical data:</strong> IP address, access logs, and session data</li>
              <li><strong>Cookies:</strong> essential and analytics cookies (with consent)</li>
            </ul>
            <p>We do not collect sensitive data such as CPF (Brazilian national ID), identity documents, or banking data.</p>
          </>
        ),
      },
      {
        title: '4. Purpose and legal basis (LGPD, art. 7)',
        content: (
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Contract performance:</strong> provision of the contracted service</li>
            <li><strong>Legitimate interest:</strong> security, fraud prevention, and product improvement</li>
            <li><strong>Consent:</strong> analytics cookies and optional communications</li>
          </ul>
        ),
      },
      {
        title: '5. Data sharing',
        content: (
          <>
            <p>Your data is shared only with:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Supabase:</strong> database and authentication (servers in the US, standard contractual clauses applied)</li>
              <li><strong>Resend:</strong> transactional email delivery</li>
              <li><strong>Stripe:</strong> payment processing (does not receive financial data from Florim)</li>
              <li><strong>PostHog, Inc.:</strong> usage and behavior analytics (servers in the US, standard contractual clauses applied). Enabled only with your consent.</li>
            </ul>
            <p>We do not sell or rent your data to third parties.</p>
          </>
        ),
      },
      {
        title: '6. Your rights (LGPD, art. 18)',
        content: (
          <>
            <p>At any time, you may exercise the following rights:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Access:</strong> request a copy of your data</li>
              <li><strong>Correction:</strong> update incomplete or outdated data</li>
              <li><strong>Deletion:</strong> erase your personal data</li>
              <li><strong>Portability:</strong> receive your data in a structured format</li>
              <li><strong>Withdrawal of consent:</strong> withdraw consent at any time</li>
              <li><strong>Information:</strong> know who your data is shared with</li>
              <li><strong>Objection:</strong> object to processing based on legitimate interest (LGPD, art. 18, II)</li>
              <li><strong>Complaint to the ANPD:</strong> file a complaint with Brazil&apos;s National Data Protection Authority in case of non-compliance (LGPD, art. 18, VI)</li>
            </ul>
            <p>
              To exercise your rights, contact us at{' '}
              <a href="mailto:privacidade@florim.app" className={linkClass}>
                privacidade@florim.app
              </a>. We respond within 15 business days.
            </p>
          </>
        ),
      },
      {
        title: '7. Data retention',
        content: (
          <p>
            Your data is kept for as long as your account remains active, or for as long as necessary to comply with legal obligations. After account deletion, personal data is removed within 30 calendar days, unless legal obligations require a longer retention period.
          </p>
        ),
      },
      {
        title: '8. Security',
        content: (
          <p>
            We adopt reasonable technical and administrative measures to protect your data against unauthorized access, loss, or destruction, including encryption in transit (HTTPS) and access controls. No system is 100% secure; we act diligently to minimize risks. In the event of a security incident posing relevant risk or harm to data subjects, we will notify the ANPD and affected users within a reasonable period, using the 72-hour window as a best-practice benchmark (LGPD, art. 48).
          </p>
        ),
      },
      {
        title: '9. Children and teenagers',
        content: (
          <p>
            Florim is not intended for individuals under 18 years of age. In accordance with art. 14 of the LGPD, we do not knowingly collect personal data from children (under 12 years old) without the specific and prominent consent of at least one parent or legal guardian. If we identify accidental collection of children&apos;s data, it will be deleted immediately.
          </p>
        ),
      },
      {
        title: '10. Cookies',
        content: (
          <p>
            We use essential cookies (necessary for the service to function) and analytics cookies (with your consent). See our{' '}
            <Link href="/cookies" className={linkClass}>
              Cookie Policy
            </Link>{' '}
            for more details.
          </p>
        ),
      },
      {
        title: '11. Changes to this policy',
        content: (
          <p>
            We may update this policy periodically. In the event of material changes, we will notify you by email or by a notice within the app. Continued use of the service after such notice constitutes acceptance of the changes.
          </p>
        ),
      },
      {
        title: '12. Contact',
        content: (
          <>
            <p>
              <strong>Data Protection Officer (DPO):</strong>{' '}
              <a href="mailto:privacidade@florim.app" className={linkClass}>
                privacidade@florim.app
              </a>
            </p>
            <p>
              <strong>General contact:</strong>{' '}
              <a href="mailto:contato@florim.app" className={linkClass}>
                contato@florim.app
              </a>
            </p>
            <p>
              Brazil&apos;s National Data Protection Authority (ANPD):{' '}
              <a
                href="https://www.gov.br/anpd"
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                www.gov.br/anpd
              </a>
            </p>
          </>
        ),
      },
    ],
  },
  es: {
    metaTitle: 'Política de Privacidad - Florim',
    pageTitle: 'Política de Privacidad',
    effectiveDate: 'Vigente a partir del 14 de mayo de 2026',
    sections: [
      {
        title: '1. Quiénes somos',
        content: (
          <p>
            <strong>LUCAS BRAZAU MALINOWSKI DESENVOLVIMENTO DE SOFTWARE LTDA</strong><br />
            CNPJ (identificación fiscal brasileña): 58.804.959/0001-60<br />
            Dirección: Avenida Paulista, 1106, Sala 01, Andar 16, Bela Vista, São Paulo/SP, Brasil, CEP 01310-914<br />
            Correo del encargado de datos: <a href="mailto:privacidade@florim.app" className={linkClass}>privacidade@florim.app</a>
          </p>
        ),
      },
      {
        title: '2. Qué es Florim',
        content: (
          <>
            <p>
              Florim es una herramienta de organización financiera familiar. Los datos financieros son <strong>ingresados manualmente por los propios usuarios</strong>.
            </p>
            <p className="bg-white border border-border rounded-lg px-4 py-3 text-sm">
              ⚠️ Florim <strong>no accede a cuentas bancarias</strong>, <strong>no realiza transacciones financieras</strong> y <strong>no tiene acceso a dinero real</strong>. Todos los registros son de responsabilidad exclusiva del usuario.
            </p>
          </>
        ),
      },
      {
        title: '3. Datos recopilados',
        content: (
          <>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Datos de registro:</strong> nombre, correo electrónico y teléfono</li>
              <li><strong>Datos financieros:</strong> gastos, ingresos, metas y recordatorios ingresados manualmente</li>
              <li><strong>Datos técnicos:</strong> dirección IP, registros de acceso y datos de sesión</li>
              <li><strong>Cookies:</strong> esenciales y analíticas (con consentimiento)</li>
            </ul>
            <p>No recopilamos datos sensibles como CPF (identificación nacional brasileña), documentos de identidad o datos bancarios.</p>
          </>
        ),
      },
      {
        title: '4. Finalidad y base legal (LGPD, art. 7)',
        content: (
          <ul className="list-disc list-inside space-y-1">
            <li><strong>Ejecución de contrato:</strong> prestación del servicio contratado</li>
            <li><strong>Interés legítimo:</strong> seguridad, prevención de fraudes y mejora del producto</li>
            <li><strong>Consentimiento:</strong> cookies analíticas y comunicaciones opcionales</li>
          </ul>
        ),
      },
      {
        title: '5. Compartición de datos',
        content: (
          <>
            <p>Tus datos se comparten únicamente con:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Supabase:</strong> base de datos y autenticación (servidores en EE. UU., con cláusulas contractuales estándar aplicadas)</li>
              <li><strong>Resend:</strong> envío de correos transaccionales</li>
              <li><strong>Stripe:</strong> procesamiento de pagos (no recibe datos financieros de Florim)</li>
              <li><strong>PostHog, Inc.:</strong> análisis de uso y comportamiento (servidores en EE. UU., con cláusulas contractuales estándar aplicadas). Activados solo con tu consentimiento.</li>
            </ul>
            <p>No vendemos ni alquilamos tus datos a terceros.</p>
          </>
        ),
      },
      {
        title: '6. Tus derechos (LGPD, art. 18)',
        content: (
          <>
            <p>En cualquier momento, puedes ejercer los siguientes derechos:</p>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>Acceso:</strong> solicitar una copia de tus datos</li>
              <li><strong>Corrección:</strong> actualizar datos incompletos o desactualizados</li>
              <li><strong>Eliminación:</strong> borrar tus datos personales</li>
              <li><strong>Portabilidad:</strong> recibir tus datos en formato estructurado</li>
              <li><strong>Revocación del consentimiento:</strong> retirar el consentimiento en cualquier momento</li>
              <li><strong>Información:</strong> saber con quién se comparten tus datos</li>
              <li><strong>Oposición:</strong> oponerte a tratamientos basados en interés legítimo (LGPD, art. 18, II)</li>
              <li><strong>Reclamación ante la ANPD:</strong> presentar una reclamación ante la Autoridad Nacional de Protección de Datos de Brasil en caso de incumplimiento (LGPD, art. 18, VI)</li>
            </ul>
            <p>
              Para ejercer tus derechos, contáctanos a través de{' '}
              <a href="mailto:privacidade@florim.app" className={linkClass}>
                privacidade@florim.app
              </a>. Respondemos en un plazo de hasta 15 días hábiles.
            </p>
          </>
        ),
      },
      {
        title: '7. Retención de datos',
        content: (
          <p>
            Tus datos se conservan mientras tu cuenta esté activa o durante el tiempo necesario para cumplir obligaciones legales. Tras la eliminación de la cuenta, los datos personales se eliminan en un plazo de hasta 30 días corridos, salvo obligaciones legales que exijan una retención por un plazo mayor.
          </p>
        ),
      },
      {
        title: '8. Seguridad',
        content: (
          <p>
            Adoptamos medidas técnicas y administrativas razonables para proteger tus datos contra accesos no autorizados, pérdida o destrucción, incluyendo cifrado en tránsito (HTTPS) y control de acceso. Ningún sistema es 100% seguro; actuamos con diligencia para minimizar riesgos. En caso de un incidente de seguridad con riesgo o daño relevante para los titulares, notificaremos a la ANPD y a los usuarios afectados en un plazo razonable, adoptando como referencia de buena práctica el plazo de 72 horas (LGPD, art. 48).
          </p>
        ),
      },
      {
        title: '9. Niños y adolescentes',
        content: (
          <p>
            Florim no está destinado a menores de 18 años. De conformidad con el art. 14 de la LGPD, no recopilamos intencionalmente datos personales de niños (menores de 12 años) sin el consentimiento específico y destacado de al menos uno de los padres o tutor legal. Si identificamos una recopilación accidental de datos de niños, dichos datos serán eliminados de inmediato.
          </p>
        ),
      },
      {
        title: '10. Cookies',
        content: (
          <p>
            Utilizamos cookies esenciales (necesarias para el funcionamiento) y cookies analíticas (con tu consentimiento). Consulta nuestra{' '}
            <Link href="/cookies" className={linkClass}>
              Política de Cookies
            </Link>{' '}
            para más detalles.
          </p>
        ),
      },
      {
        title: '11. Cambios a esta política',
        content: (
          <p>
            Podemos actualizar esta política periódicamente. En caso de cambios significativos, te notificaremos por correo electrónico o mediante un aviso en la aplicación. El uso continuado del servicio después de la notificación constituye la aceptación de los cambios.
          </p>
        ),
      },
      {
        title: '12. Contacto',
        content: (
          <>
            <p>
              <strong>Encargado de Protección de Datos (DPO):</strong>{' '}
              <a href="mailto:privacidade@florim.app" className={linkClass}>
                privacidade@florim.app
              </a>
            </p>
            <p>
              <strong>Contacto general:</strong>{' '}
              <a href="mailto:contato@florim.app" className={linkClass}>
                contato@florim.app
              </a>
            </p>
            <p>
              Autoridad Nacional de Protección de Datos de Brasil (ANPD):{' '}
              <a
                href="https://www.gov.br/anpd"
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                www.gov.br/anpd
              </a>
            </p>
          </>
        ),
      },
    ],
  },
}
