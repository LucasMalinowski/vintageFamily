import { Resend } from 'resend'
import type { AppLocale } from '@/lib/i18n/getLocale'

const resend = new Resend(process.env.RESEND_API_KEY)

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
const from = process.env.RESEND_FROM ?? 'Florim Finanças <noreply@florim.app>'
const LOGO_URL = 'https://florim.app/logo.png'

const HTML_LANG: Record<AppLocale, string> = {
  'pt-BR': 'pt-BR',
  en: 'en',
  es: 'es',
}

const SHELL_CHROME: Record<AppLocale, { brandName: string; tagline: string; footer: string }> = {
  'pt-BR': {
    brandName: 'Florim Finanças',
    tagline: 'Finanças em família',
    footer: 'Florim Finanças · florim.app',
  },
  en: {
    brandName: 'Florim Finanças',
    tagline: 'Family finances',
    footer: 'Florim Finanças · florim.app',
  },
  es: {
    brandName: 'Florim Finanças',
    tagline: 'Finanzas familiares',
    footer: 'Florim Finanças · florim.app',
  },
}

function emailShell(title: string, body: string, quote: string, locale: AppLocale) {
  const chrome = SHELL_CHROME[locale]
  return `<!DOCTYPE html>
<html lang="${HTML_LANG[locale]}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#F5F1EB;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F5F1EB;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0"
        style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;
               border:1px solid #E4D7C2;overflow:hidden;
               box-shadow:0 8px 24px rgba(47,59,51,0.10);">

        <tr>
          <td style="background-color:#3E5F4B;padding:24px 36px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td>
                  <img src="${LOGO_URL}"
                    alt="Florim Finanças"
                    width="48" height="48"
                    style="display:block;width:48px;height:48px;object-fit:contain;">
                </td>
                <td style="padding-left:14px;vertical-align:middle;">
                  <span style="display:block;color:#F5F1EB;font-family:Georgia,serif;
                               font-size:22px;font-weight:normal;letter-spacing:0.04em;">
                    ${chrome.brandName}
                  </span>
                  <span style="display:block;color:rgba(245,241,235,0.65);
                               font-family:Arial,sans-serif;font-size:12px;
                               letter-spacing:0.08em;text-transform:uppercase;
                               margin-top:2px;">
                    ${chrome.tagline}
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:36px 36px 0;">
            <h1 style="margin:0;font-family:Georgia,serif;font-size:22px;
                       font-weight:normal;color:#3E5F4B;line-height:1.3;">
              ${title}
            </h1>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 36px 36px;color:#2F3B33;font-size:15px;
                     line-height:1.7;font-family:Arial,sans-serif;">
            ${body}
          </td>
        </tr>

        <tr>
          <td style="padding:0 36px;">
            <div style="height:1px;background:#E4D7C2;"></div>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 36px 24px;text-align:center;">
            <em style="font-family:Georgia,serif;font-size:14px;
                       color:#C2A45D;font-style:italic;line-height:1.5;">
              "${quote}"
            </em>
          </td>
        </tr>

        <tr>
          <td style="background-color:#F5F1EB;padding:14px 36px;
                     border-top:1px solid #E4D7C2;text-align:center;">
            <span style="color:rgba(47,59,51,0.50);font-size:12px;
                         font-family:Arial,sans-serif;">
              ${chrome.footer}
            </span>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function ctaButton(href: string, label: string) {
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 8px;">
    <tr>
      <td style="border-radius:9999px;background-color:#3E5F4B;">
        <a href="${href}"
          style="display:inline-block;padding:13px 32px;border-radius:9999px;
                 background-color:#3E5F4B;color:#F5F1EB;text-decoration:none;
                 font-size:15px;font-family:Arial,sans-serif;font-weight:600;
                 letter-spacing:0.01em;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`
}

const INVITE_COPY: Record<AppLocale, {
  subject: (familyName: string) => string
  title: (familyName: string) => string
  body: (familyName: string, safeLink: string) => string
  ctaLabel: string
  quote: string
}> = {
  'pt-BR': {
    subject: (familyName) => `Convite para a família ${familyName} - Florim`,
    title: (familyName) => `Você foi convidado para a família ${familyName}`,
    body: (familyName, safeLink) => `
      <p style="margin:0 0 12px;">Você recebeu um convite para participar da família <strong>${familyName}</strong> no Florim.</p>
      <p style="margin:0 0 12px;">Clique abaixo para criar sua conta e começar a organizar as finanças da família.</p>
      ${ctaButton(safeLink, 'Aceitar convite')}
      <p style="margin:20px 0 0;font-size:13px;color:#8C7B6B;">Ou copie e cole este link no navegador:<br><span style="color:#3E5F4B;">${safeLink}</span></p>
      <p style="margin:8px 0 0;font-size:13px;color:#8C7B6B;">Este convite expira em 7 dias.</p>
    `,
    ctaLabel: 'Aceitar convite',
    quote: 'O primeiro passo de algo bonito começa com um convite.',
  },
  en: {
    subject: (familyName) => `Invitation to the ${familyName} family - Florim`,
    title: (familyName) => `You've been invited to the ${familyName} family`,
    body: (familyName, safeLink) => `
      <p style="margin:0 0 12px;">You've received an invitation to join the <strong>${familyName}</strong> family on Florim.</p>
      <p style="margin:0 0 12px;">Click below to create your account and start organizing the family's finances.</p>
      ${ctaButton(safeLink, 'Accept invitation')}
      <p style="margin:20px 0 0;font-size:13px;color:#8C7B6B;">Or copy and paste this link into your browser:<br><span style="color:#3E5F4B;">${safeLink}</span></p>
      <p style="margin:8px 0 0;font-size:13px;color:#8C7B6B;">This invitation expires in 7 days.</p>
    `,
    ctaLabel: 'Accept invitation',
    quote: 'The first step toward something beautiful starts with an invitation.',
  },
  es: {
    subject: (familyName) => `Invitación para la familia ${familyName} - Florim`,
    title: (familyName) => `Has sido invitado a la familia ${familyName}`,
    body: (familyName, safeLink) => `
      <p style="margin:0 0 12px;">Recibiste una invitación para unirte a la familia <strong>${familyName}</strong> en Florim.</p>
      <p style="margin:0 0 12px;">Haz clic abajo para crear tu cuenta y empezar a organizar las finanzas de la familia.</p>
      ${ctaButton(safeLink, 'Aceptar invitación')}
      <p style="margin:20px 0 0;font-size:13px;color:#8C7B6B;">O copia y pega este enlace en tu navegador:<br><span style="color:#3E5F4B;">${safeLink}</span></p>
      <p style="margin:8px 0 0;font-size:13px;color:#8C7B6B;">Esta invitación caduca en 7 días.</p>
    `,
    ctaLabel: 'Aceptar invitación',
    quote: 'El primer paso hacia algo hermoso comienza con una invitación.',
  },
}

export async function sendInviteEmail({
  to,
  inviteLink,
  familyName,
  locale = 'pt-BR',
}: {
  to: string
  inviteLink: string
  familyName: string
  locale?: AppLocale
}) {
  const safeFamilyName = escapeHtml(familyName)
  const safeLink = encodeURI(inviteLink)
  const copy = INVITE_COPY[locale]

  await resend.emails.send({
    from,
    to,
    subject: copy.subject(safeFamilyName),
    html: emailShell(
      copy.title(safeFamilyName),
      copy.body(safeFamilyName, safeLink),
      copy.quote,
      locale
    ),
  })
}

const WELCOME_COPY: Record<AppLocale, {
  subject: string
  title: (safeName: string) => string
  body: (safeName: string, safeFamilyName: string, appUrl: string) => string
  ctaLabel: string
  quote: string
}> = {
  'pt-BR': {
    subject: 'Bem-vindo ao Florim',
    title: (safeName) => `Bem-vindo, ${safeName}!`,
    body: (safeName, safeFamilyName, appUrl) => `
      <p style="margin:0 0 12px;">Olá, <strong>${safeName}</strong>!</p>
      <p style="margin:0 0 12px;">Sua conta foi criada. Você agora faz parte da família <strong>${safeFamilyName}</strong> no Florim.</p>
      <p style="margin:0 0 12px;">Comece registrando receitas, despesas, metas e lembretes para manter tudo organizado.</p>
      ${ctaButton(appUrl, 'Acessar o Florim')}
    `,
    ctaLabel: 'Acessar o Florim',
    quote: 'Um lar tranquilo nasce de pequenas escolhas repetidas.',
  },
  en: {
    subject: 'Welcome to Florim',
    title: (safeName) => `Welcome, ${safeName}!`,
    body: (safeName, safeFamilyName, appUrl) => `
      <p style="margin:0 0 12px;">Hi, <strong>${safeName}</strong>!</p>
      <p style="margin:0 0 12px;">Your account has been created. You're now part of the <strong>${safeFamilyName}</strong> family on Florim.</p>
      <p style="margin:0 0 12px;">Start logging income, expenses, goals and reminders to keep everything organized.</p>
      ${ctaButton(appUrl, 'Open Florim')}
    `,
    ctaLabel: 'Open Florim',
    quote: 'A peaceful home is built from small choices, repeated.',
  },
  es: {
    subject: 'Bienvenido a Florim',
    title: (safeName) => `¡Bienvenido, ${safeName}!`,
    body: (safeName, safeFamilyName, appUrl) => `
      <p style="margin:0 0 12px;">¡Hola, <strong>${safeName}</strong>!</p>
      <p style="margin:0 0 12px;">Tu cuenta ha sido creada. Ahora formas parte de la familia <strong>${safeFamilyName}</strong> en Florim.</p>
      <p style="margin:0 0 12px;">Empieza a registrar ingresos, gastos, metas y recordatorios para mantener todo organizado.</p>
      ${ctaButton(appUrl, 'Ir a Florim')}
    `,
    ctaLabel: 'Ir a Florim',
    quote: 'Un hogar tranquilo nace de pequeñas decisiones repetidas.',
  },
}

export async function sendWelcomeEmail({
  to,
  name,
  familyName,
  locale = 'pt-BR',
}: {
  to: string
  name: string
  familyName: string
  locale?: AppLocale
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://florim.app'
  const safeName = escapeHtml(name)
  const safeFamilyName = escapeHtml(familyName)
  const copy = WELCOME_COPY[locale]

  await resend.emails.send({
    from,
    to,
    subject: copy.subject,
    html: emailShell(
      copy.title(safeName),
      copy.body(safeName, safeFamilyName, appUrl),
      copy.quote,
      locale
    ),
  })
}

const INSIGHTS_EMAIL_COPY: Record<AppLocale, {
  subject: (safePeriod: string) => string
  title: (safePeriod: string) => string
  intro: (safeName: string, safePeriod: string) => string
  ctaLabel: string
  footer: (appUrl: string) => string
  unsubscribeLabel: string
  quote: string
}> = {
  'pt-BR': {
    subject: (safePeriod) => `Seus insights financeiros - ${safePeriod} - Florim`,
    title: (safePeriod) => `Insights de ${safePeriod}`,
    intro: (safeName, safePeriod) => `Olá, <strong>${safeName}</strong>! Aqui estão seus insights financeiros de <strong>${safePeriod}</strong>.`,
    ctaLabel: 'Ver todos os insights',
    footer: (appUrl) => `Recebeu este email porque você tem insights ativados no Florim. <a href="${appUrl}/settings/insights" style="color:#3E5F4B;text-decoration:underline;">Desativar insights por email</a>.`,
    unsubscribeLabel: 'Desativar insights por email',
    quote: 'Conhecimento sobre o dinheiro é o primeiro passo para a liberdade financeira.',
  },
  en: {
    subject: (safePeriod) => `Your financial insights - ${safePeriod} - Florim`,
    title: (safePeriod) => `Insights for ${safePeriod}`,
    intro: (safeName, safePeriod) => `Hi, <strong>${safeName}</strong>! Here are your financial insights for <strong>${safePeriod}</strong>.`,
    ctaLabel: 'View all insights',
    footer: (appUrl) => `You received this email because you have insights enabled on Florim. <a href="${appUrl}/settings/insights" style="color:#3E5F4B;text-decoration:underline;">Turn off email insights</a>.`,
    unsubscribeLabel: 'Turn off email insights',
    quote: 'Knowledge about money is the first step toward financial freedom.',
  },
  es: {
    subject: (safePeriod) => `Tus insights financieros - ${safePeriod} - Florim`,
    title: (safePeriod) => `Insights de ${safePeriod}`,
    intro: (safeName, safePeriod) => `¡Hola, <strong>${safeName}</strong>! Aquí están tus insights financieros de <strong>${safePeriod}</strong>.`,
    ctaLabel: 'Ver todos los insights',
    footer: (appUrl) => `Recibiste este correo porque tienes los insights activados en Florim. <a href="${appUrl}/settings/insights" style="color:#3E5F4B;text-decoration:underline;">Desactivar insights por correo</a>.`,
    unsubscribeLabel: 'Desactivar insights por correo',
    quote: 'El conocimiento sobre el dinero es el primer paso hacia la libertad financiera.',
  },
}

export async function sendInsightsEmail({
  to,
  name,
  insights,
  period,
  locale = 'pt-BR',
}: {
  to: string
  name: string
  insights: string[]
  period: string
  locale?: AppLocale
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://florim.app'
  const defaultName = locale === 'en' ? 'you' : locale === 'es' ? 'ti' : 'você'
  const safeName = escapeHtml(name || defaultName)
  const safePeriod = escapeHtml(period)
  const copy = INSIGHTS_EMAIL_COPY[locale]

  const insightBlocks = insights
    .map(
      (insight, i) => `
        <div style="background:#F5F1EB;border-radius:8px;padding:16px 20px;margin-bottom:12px;">
          <p style="margin:0;color:#2F3B33;font-size:15px;line-height:1.6;font-family:Arial,sans-serif;">
            ${escapeHtml(insight)}
          </p>
        </div>`
    )
    .join('')

  const body = `
    <p style="margin:0 0 20px;">${copy.intro(safeName, safePeriod)}</p>
    ${insightBlocks}
    ${ctaButton(`${appUrl}/insights`, copy.ctaLabel)}
    <p style="margin:20px 0 0;font-size:13px;color:#8C7B6B;border-top:1px solid #e8e2d9;padding-top:16px;">
      ${copy.footer(appUrl)}
    </p>
  `

  await resend.emails.send({
    from,
    to,
    subject: copy.subject(safePeriod),
    html: emailShell(
      copy.title(safePeriod),
      body,
      copy.quote,
      locale
    ),
  })
}

const ACCOUNT_DELETION_COPY: Record<AppLocale, {
  subject: string
  title: string
  body: (safeName: string) => string
  quote: string
}> = {
  'pt-BR': {
    subject: 'Sua conta foi excluída - Florim',
    title: 'Conta excluída',
    body: (safeName) => `
      <p style="margin:0 0 12px;">Olá, <strong>${safeName}</strong>.</p>
      <p style="margin:0 0 12px;">Sua conta no Florim foi excluída conforme solicitado. Todos os seus dados pessoais foram removidos da plataforma.</p>
      <p style="margin:0;font-size:13px;color:#8C7B6B;">Se você não solicitou esta exclusão, entre em contato: <a href="mailto:privacidade@florim.app" style="color:#3E5F4B;">privacidade@florim.app</a></p>
    `,
    quote: 'Obrigado por ter caminhado com a gente por um tempo.',
  },
  en: {
    subject: 'Your account has been deleted - Florim',
    title: 'Account deleted',
    body: (safeName) => `
      <p style="margin:0 0 12px;">Hi, <strong>${safeName}</strong>.</p>
      <p style="margin:0 0 12px;">Your Florim account has been deleted as requested. All of your personal data has been removed from the platform.</p>
      <p style="margin:0;font-size:13px;color:#8C7B6B;">If you didn't request this deletion, please contact us: <a href="mailto:privacidade@florim.app" style="color:#3E5F4B;">privacidade@florim.app</a></p>
    `,
    quote: 'Thank you for walking with us for a while.',
  },
  es: {
    subject: 'Tu cuenta ha sido eliminada - Florim',
    title: 'Cuenta eliminada',
    body: (safeName) => `
      <p style="margin:0 0 12px;">Hola, <strong>${safeName}</strong>.</p>
      <p style="margin:0 0 12px;">Tu cuenta en Florim ha sido eliminada según lo solicitado. Todos tus datos personales han sido eliminados de la plataforma.</p>
      <p style="margin:0;font-size:13px;color:#8C7B6B;">Si no solicitaste esta eliminación, contáctanos: <a href="mailto:privacidade@florim.app" style="color:#3E5F4B;">privacidade@florim.app</a></p>
    `,
    quote: 'Gracias por caminar con nosotros durante este tiempo.',
  },
}

export async function sendAccountDeletionEmail({
  to,
  name,
  locale = 'pt-BR',
}: {
  to: string
  name: string
  locale?: AppLocale
}) {
  const safeName = escapeHtml(name)
  const copy = ACCOUNT_DELETION_COPY[locale]

  await resend.emails.send({
    from,
    to,
    subject: copy.subject,
    html: emailShell(
      copy.title,
      copy.body(safeName),
      copy.quote,
      locale
    ),
  })
}
