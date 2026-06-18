import Link from 'next/link'
import type { AppLocale } from '@/lib/i18n/getLocale'
import type { ReactNode } from 'react'

export type TermsSection = {
  title: string
  content: ReactNode
}

export type TermsContent = {
  metaTitle: string
  pageTitle: string
  effectiveDate: string
  sections: TermsSection[]
}

const linkClass = 'text-coffee underline underline-offset-2 hover:text-coffee/80'

export const TERMS_CONTENT: Record<AppLocale, TermsContent> = {
  'pt-BR': {
    metaTitle: 'Termos de Uso - Florim',
    pageTitle: 'Termos de Uso',
    effectiveDate: 'Vigente a partir de 14 de maio de 2026',
    sections: [
      {
        title: '1. Partes',
        content: (
          <p>
            Este contrato é celebrado entre <strong>LUCAS BRAZAU MALINOWSKI DESENVOLVIMENTO DE SOFTWARE LTDA</strong> (CNPJ 58.804.959/0001-60), doravante <strong>&quot;Florim&quot;</strong>, e o usuário que aceita estes termos ao criar uma conta, doravante <strong>&quot;Usuário&quot;</strong>.
          </p>
        ),
      },
      {
        title: '2. Descrição do serviço',
        content: (
          <>
            <p>
              O Florim é um aplicativo de organização financeira familiar que permite aos usuários registrar manualmente receitas, despesas, metas de economia e lembretes.
            </p>
            <p className="bg-white border border-border rounded-lg px-4 py-3 text-sm">
              ⚠️ O Florim <strong>não acessa contas bancárias</strong>, <strong>não realiza transações financeiras</strong> e <strong>não tem acesso a dinheiro real</strong>. Trata-se exclusivamente de uma ferramenta de organização e registro manual.
            </p>
          </>
        ),
      },
      {
        title: '3. Cadastro e conta',
        content: (
          <>
            <p>
              Para usar o Florim, o Usuário deve criar uma conta com informações verdadeiras e manter seus dados atualizados. O Usuário é responsável pela confidencialidade de sua senha. Cada conta é pessoal e intransferível.
            </p>
            <p>
              O cadastro pode ser feito pelo criador da família (que assume o papel de administrador) ou por convite do administrador. Ao aceitar um convite, o Usuário concorda automaticamente com estes Termos.
            </p>
          </>
        ),
      },
      {
        title: '4. Planos e pagamento',
        content: (
          <>
            <p>
              O Florim oferece um período de teste gratuito de 30 dias com recursos do plano Pro. Após o término do trial, a conta continua no plano gratuito com limites mensais, salvo contratação de um plano pago. Os valores e condições dos planos estão disponíveis em{' '}
              <Link href="/plans" className={linkClass}>florim.app/plans</Link>.
            </p>
            <p>
              Os pagamentos são processados pela Stripe, Inc. As assinaturas são renovadas automaticamente ao final de cada período. O cancelamento pode ser feito a qualquer momento pelo painel do aplicativo, com efeito ao final do período vigente.
            </p>
          </>
        ),
      },
      {
        title: '5. Política de reembolso',
        content: (
          <>
            <p>
              O Florim aceita pedidos de reembolso nas seguintes condições:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Solicitação realizada em até <strong>7 (sete) dias corridos</strong> após a data da cobrança;</li>
              <li>O pedido deve ser enviado para <a href="mailto:contato@florim.app" className={linkClass}>contato@florim.app</a> com o assunto &quot;Reembolso&quot;, informando o e-mail da conta e o motivo;</li>
              <li>Reembolsos são processados pelo mesmo método de pagamento original em até 10 dias úteis, conforme as políticas da Stripe, Inc.</li>
            </ul>
            <p>
              Após o prazo de 7 dias, não são concedidos reembolsos proporcionais por período não utilizado. O cancelamento da assinatura interrompe futuras cobranças e o acesso ao plano Pro é mantido até o fim do período vigente.
            </p>
            <p>
              Compras realizadas via App Store (Apple) ou Google Play estão sujeitas às políticas de reembolso da respectiva loja, que se sobrepõem a esta política para compras realizadas nesses canais.
            </p>
          </>
        ),
      },
      {
        title: '6. Responsabilidades do usuário',
        content: (
          <>
            <p>O Usuário concorda em:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Inserir apenas informações verídicas</li>
              <li>Não utilizar o serviço para fins ilícitos</li>
              <li>Não tentar acessar dados de outras famílias</li>
              <li>Não realizar engenharia reversa, descompilar ou redistribuir o serviço</li>
              <li>Manter sua senha segura e notificar o Florim sobre uso não autorizado</li>
            </ul>
          </>
        ),
      },
      {
        title: '7. Propriedade intelectual',
        content: (
          <p>
            Todo o conteúdo do Florim (marca, design, código, textos) é propriedade da LUCAS BRAZAU MALINOWSKI DESENVOLVIMENTO DE SOFTWARE LTDA, protegido pela legislação brasileira de propriedade intelectual. O Usuário recebe uma licença limitada, não exclusiva e intransferível para uso pessoal do serviço.
          </p>
        ),
      },
      {
        title: '8. Dados do usuário',
        content: (
          <p>
            O Usuário é titular dos dados financeiros que insere no Florim. O Florim trata esses dados exclusivamente para prestação do serviço, conforme a{' '}
            <Link href="/privacy" className={linkClass}>
              Política de Privacidade
            </Link>.
          </p>
        ),
      },
      {
        title: '9. Disponibilidade e manutenção',
        content: (
          <p>
            O Florim emprega esforços razoáveis para manter o serviço disponível 24/7, mas não garante disponibilidade ininterrupta. Podemos realizar manutenções programadas com aviso prévio e responder a incidentes imprevistos sem prévia notificação.
          </p>
        ),
      },
      {
        title: '10. Limitação de responsabilidade',
        content: (
          <>
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
          </>
        ),
      },
      {
        title: '11. Rescisão',
        content: (
          <p>
            O Usuário pode encerrar sua conta a qualquer momento pelo aplicativo. O Florim pode suspender ou encerrar contas que violem estes Termos, com ou sem aviso prévio dependendo da gravidade da violação.
          </p>
        ),
      },
      {
        title: '12. Alterações nos termos',
        content: (
          <p>
            Podemos modificar estes Termos periodicamente. Em caso de alterações materiais, notificaremos por e-mail com antecedência mínima de 15 dias. O uso continuado do serviço após a data de vigência constitui aceitação dos novos termos.
          </p>
        ),
      },
      {
        title: '13. Lei aplicável e foro',
        content: (
          <p>
            Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da Comarca de São Paulo/SP para dirimir quaisquer controvérsias, ressalvado ao consumidor o direito de optar pelo foro de seu domicílio, nos termos do art. 101, I, do Código de Defesa do Consumidor.
          </p>
        ),
      },
      {
        title: '14. Contato',
        content: (
          <p>
            <a href="mailto:contato@florim.app" className={linkClass}>
              contato@florim.app
            </a>
          </p>
        ),
      },
    ],
  },
  en: {
    metaTitle: 'Terms of Use - Florim',
    pageTitle: 'Terms of Use',
    effectiveDate: 'Effective as of May 14, 2026',
    sections: [
      {
        title: '1. Parties',
        content: (
          <p>
            This agreement is entered into between <strong>LUCAS BRAZAU MALINOWSKI DESENVOLVIMENTO DE SOFTWARE LTDA</strong> (CNPJ, Brazilian tax ID, 58.804.959/0001-60), hereinafter <strong>&quot;Florim&quot;</strong>, and the user who accepts these terms by creating an account, hereinafter the <strong>&quot;User&quot;</strong>.
          </p>
        ),
      },
      {
        title: '2. Description of the service',
        content: (
          <>
            <p>
              Florim is a family financial organization app that lets users manually record income, expenses, savings goals, and reminders.
            </p>
            <p className="bg-white border border-border rounded-lg px-4 py-3 text-sm">
              ⚠️ Florim <strong>does not access bank accounts</strong>, <strong>does not carry out financial transactions</strong>, and <strong>has no access to real money</strong>. It is exclusively a manual organization and record-keeping tool.
            </p>
          </>
        ),
      },
      {
        title: '3. Registration and account',
        content: (
          <>
            <p>
              To use Florim, the User must create an account with truthful information and keep their data up to date. The User is responsible for keeping their password confidential. Each account is personal and non-transferable.
            </p>
            <p>
              Registration can be completed by the family creator (who takes on the administrator role) or by invitation from the administrator. By accepting an invitation, the User automatically agrees to these Terms.
            </p>
          </>
        ),
      },
      {
        title: '4. Plans and payment',
        content: (
          <>
            <p>
              Florim offers a 30-day free trial with Pro plan features. After the trial ends, the account continues on the free plan with monthly limits, unless a paid plan is purchased. Plan pricing and conditions are available at{' '}
              <Link href="/plans" className={linkClass}>florim.app/plans</Link>.
            </p>
            <p>
              Payments are processed by Stripe, Inc. Subscriptions renew automatically at the end of each period. Cancellation can be done at any time from the app dashboard, taking effect at the end of the current billing period.
            </p>
          </>
        ),
      },
      {
        title: '5. Refund policy',
        content: (
          <>
            <p>
              Florim accepts refund requests under the following conditions:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>The request is made within <strong>7 (seven) calendar days</strong> of the charge date;</li>
              <li>The request must be sent to <a href="mailto:contato@florim.app" className={linkClass}>contato@florim.app</a> with the subject line &quot;Refund,&quot; stating the account email and the reason for the request;</li>
              <li>Refunds are processed back to the original payment method within up to 10 business days, in accordance with Stripe, Inc.&apos;s policies.</li>
            </ul>
            <p>
              After the 7-day window, no prorated refunds are granted for unused periods. Cancelling the subscription stops future charges, and access to the Pro plan is maintained until the end of the current billing period.
            </p>
            <p>
              Purchases made through the App Store (Apple) or Google Play are subject to the respective store&apos;s refund policies, which take precedence over this policy for purchases made through those channels.
            </p>
          </>
        ),
      },
      {
        title: '6. User responsibilities',
        content: (
          <>
            <p>The User agrees to:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Enter only truthful information</li>
              <li>Not use the service for unlawful purposes</li>
              <li>Not attempt to access other families&apos; data</li>
              <li>Not reverse-engineer, decompile, or redistribute the service</li>
              <li>Keep their password secure and notify Florim of any unauthorized use</li>
            </ul>
          </>
        ),
      },
      {
        title: '7. Intellectual property',
        content: (
          <p>
            All Florim content (brand, design, code, text) is owned by LUCAS BRAZAU MALINOWSKI DESENVOLVIMENTO DE SOFTWARE LTDA, protected under Brazilian intellectual property law. The User receives a limited, non-exclusive, non-transferable license for personal use of the service.
          </p>
        ),
      },
      {
        title: '8. User data',
        content: (
          <p>
            The User is the owner of the financial data they enter into Florim. Florim processes that data exclusively to provide the service, in accordance with the{' '}
            <Link href="/privacy" className={linkClass}>
              Privacy Policy
            </Link>.
          </p>
        ),
      },
      {
        title: '9. Availability and maintenance',
        content: (
          <p>
            Florim makes reasonable efforts to keep the service available 24/7, but does not guarantee uninterrupted availability. We may perform scheduled maintenance with advance notice and respond to unforeseen incidents without prior notice.
          </p>
        ),
      },
      {
        title: '10. Limitation of liability',
        content: (
          <>
            <p>
              Florim is not liable for:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Financial decisions made based on the data recorded</li>
              <li>Data loss due to device or user failure</li>
              <li>Indirect damages, lost profits, or consequential damages</li>
            </ul>
            <p>
              Florim&apos;s total liability to the User is limited to the amount paid for the service in the last 3 months.
            </p>
          </>
        ),
      },
      {
        title: '11. Termination',
        content: (
          <p>
            The User may close their account at any time through the app. Florim may suspend or close accounts that violate these Terms, with or without prior notice depending on the severity of the violation.
          </p>
        ),
      },
      {
        title: '12. Changes to the terms',
        content: (
          <p>
            We may modify these Terms periodically. In case of material changes, we will notify you by email at least 15 days in advance. Continued use of the service after the effective date constitutes acceptance of the new terms.
          </p>
        ),
      },
      {
        title: '13. Governing law and jurisdiction',
        content: (
          <p>
            These Terms are governed by the laws of the Federative Republic of Brazil. The courts of the Comarca de São Paulo/SP, Brazil are elected to settle any disputes, without prejudice to the consumer&apos;s right to choose the courts of their domicile, under art. 101, I, of Brazil&apos;s Consumer Defense Code.
          </p>
        ),
      },
      {
        title: '14. Contact',
        content: (
          <p>
            <a href="mailto:contato@florim.app" className={linkClass}>
              contato@florim.app
            </a>
          </p>
        ),
      },
    ],
  },
  es: {
    metaTitle: 'Términos de Uso - Florim',
    pageTitle: 'Términos de Uso',
    effectiveDate: 'Vigente a partir del 14 de mayo de 2026',
    sections: [
      {
        title: '1. Partes',
        content: (
          <p>
            Este contrato se celebra entre <strong>LUCAS BRAZAU MALINOWSKI DESENVOLVIMENTO DE SOFTWARE LTDA</strong> (CNPJ, identificación fiscal brasileña, 58.804.959/0001-60), en adelante <strong>&quot;Florim&quot;</strong>, y el usuario que acepta estos términos al crear una cuenta, en adelante el <strong>&quot;Usuario&quot;</strong>.
          </p>
        ),
      },
      {
        title: '2. Descripción del servicio',
        content: (
          <>
            <p>
              Florim es una aplicación de organización financiera familiar que permite a los usuarios registrar manualmente ingresos, gastos, metas de ahorro y recordatorios.
            </p>
            <p className="bg-white border border-border rounded-lg px-4 py-3 text-sm">
              ⚠️ Florim <strong>no accede a cuentas bancarias</strong>, <strong>no realiza transacciones financieras</strong> y <strong>no tiene acceso a dinero real</strong>. Se trata exclusivamente de una herramienta de organización y registro manual.
            </p>
          </>
        ),
      },
      {
        title: '3. Registro y cuenta',
        content: (
          <>
            <p>
              Para usar Florim, el Usuario debe crear una cuenta con información verdadera y mantener sus datos actualizados. El Usuario es responsable de la confidencialidad de su contraseña. Cada cuenta es personal e intransferible.
            </p>
            <p>
              El registro puede realizarlo el creador de la familia (que asume el rol de administrador) o por invitación del administrador. Al aceptar una invitación, el Usuario acepta automáticamente estos Términos.
            </p>
          </>
        ),
      },
      {
        title: '4. Planes y pago',
        content: (
          <>
            <p>
              Florim ofrece un período de prueba gratuito de 30 días con las funciones del plan Pro. Una vez finalizado el período de prueba, la cuenta continúa en el plan gratuito con límites mensuales, salvo que se contrate un plan de pago. Los valores y condiciones de los planes están disponibles en{' '}
              <Link href="/plans" className={linkClass}>florim.app/plans</Link>.
            </p>
            <p>
              Los pagos son procesados por Stripe, Inc. Las suscripciones se renuevan automáticamente al final de cada período. La cancelación puede realizarse en cualquier momento desde el panel de la aplicación, con efecto al final del período vigente.
            </p>
          </>
        ),
      },
      {
        title: '5. Política de reembolso',
        content: (
          <>
            <p>
              Florim acepta solicitudes de reembolso bajo las siguientes condiciones:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>La solicitud se realiza dentro de los <strong>7 (siete) días corridos</strong> posteriores a la fecha del cobro;</li>
              <li>La solicitud debe enviarse a <a href="mailto:contato@florim.app" className={linkClass}>contato@florim.app</a> con el asunto &quot;Reembolso&quot;, indicando el correo electrónico de la cuenta y el motivo;</li>
              <li>Los reembolsos se procesan mediante el mismo método de pago original en un plazo de hasta 10 días hábiles, conforme a las políticas de Stripe, Inc.</li>
            </ul>
            <p>
              Transcurrido el plazo de 7 días, no se conceden reembolsos proporcionales por el período no utilizado. La cancelación de la suscripción interrumpe los cobros futuros y el acceso al plan Pro se mantiene hasta el final del período vigente.
            </p>
            <p>
              Las compras realizadas a través de la App Store (Apple) o Google Play están sujetas a las políticas de reembolso de la tienda correspondiente, que prevalecen sobre esta política para las compras realizadas a través de esos canales.
            </p>
          </>
        ),
      },
      {
        title: '6. Responsabilidades del usuario',
        content: (
          <>
            <p>El Usuario se compromete a:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Ingresar únicamente información veraz</li>
              <li>No utilizar el servicio para fines ilícitos</li>
              <li>No intentar acceder a datos de otras familias</li>
              <li>No realizar ingeniería inversa, descompilar ni redistribuir el servicio</li>
              <li>Mantener su contraseña segura y notificar a Florim sobre cualquier uso no autorizado</li>
            </ul>
          </>
        ),
      },
      {
        title: '7. Propiedad intelectual',
        content: (
          <p>
            Todo el contenido de Florim (marca, diseño, código, textos) es propiedad de LUCAS BRAZAU MALINOWSKI DESENVOLVIMENTO DE SOFTWARE LTDA, protegido por la legislación brasileña de propiedad intelectual. El Usuario recibe una licencia limitada, no exclusiva e intransferible para el uso personal del servicio.
          </p>
        ),
      },
      {
        title: '8. Datos del usuario',
        content: (
          <p>
            El Usuario es titular de los datos financieros que ingresa en Florim. Florim trata esos datos exclusivamente para la prestación del servicio, conforme a la{' '}
            <Link href="/privacy" className={linkClass}>
              Política de Privacidad
            </Link>.
          </p>
        ),
      },
      {
        title: '9. Disponibilidad y mantenimiento',
        content: (
          <p>
            Florim emplea esfuerzos razonables para mantener el servicio disponible 24/7, pero no garantiza una disponibilidad ininterrumpida. Podemos realizar mantenimientos programados con aviso previo y responder a incidentes imprevistos sin notificación previa.
          </p>
        ),
      },
      {
        title: '10. Limitación de responsabilidad',
        content: (
          <>
            <p>
              Florim no se responsabiliza por:
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>Decisiones financieras tomadas con base en los datos registrados</li>
              <li>Pérdida de datos por fallas del dispositivo o del usuario</li>
              <li>Daños indirectos, lucro cesante o daños consecuentes</li>
            </ul>
            <p>
              La responsabilidad total de Florim frente al Usuario se limita al monto pagado por el servicio en los últimos 3 meses.
            </p>
          </>
        ),
      },
      {
        title: '11. Rescisión',
        content: (
          <p>
            El Usuario puede cerrar su cuenta en cualquier momento a través de la aplicación. Florim puede suspender o cerrar cuentas que infrinjan estos Términos, con o sin aviso previo según la gravedad de la infracción.
          </p>
        ),
      },
      {
        title: '12. Cambios en los términos',
        content: (
          <p>
            Podemos modificar estos Términos periódicamente. En caso de cambios significativos, notificaremos por correo electrónico con al menos 15 días de anticipación. El uso continuado del servicio después de la fecha de vigencia constituye la aceptación de los nuevos términos.
          </p>
        ),
      },
      {
        title: '13. Ley aplicable y jurisdicción',
        content: (
          <p>
            Estos Términos se rigen por las leyes de la República Federativa de Brasil. Se elige el foro de la Comarca de São Paulo/SP, Brasil, para resolver cualquier controversia, sin perjuicio del derecho del consumidor a optar por el foro de su domicilio, conforme al art. 101, I, del Código de Defensa del Consumidor de Brasil.
          </p>
        ),
      },
      {
        title: '14. Contacto',
        content: (
          <p>
            <a href="mailto:contato@florim.app" className={linkClass}>
              contato@florim.app
            </a>
          </p>
        ),
      },
    ],
  },
}
