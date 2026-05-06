import { Resend } from 'resend'

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

function emailShell(title: string, body: string, quote: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
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
                    Florim Finanças
                  </span>
                  <span style="display:block;color:rgba(245,241,235,0.65);
                               font-family:Arial,sans-serif;font-size:12px;
                               letter-spacing:0.08em;text-transform:uppercase;
                               margin-top:2px;">
                    Finanças em família
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
              Florim Finanças &middot; florim.app
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

export async function sendInviteEmail({
  to,
  inviteLink,
  familyName,
}: {
  to: string
  inviteLink: string
  familyName: string
}) {
  const safeFamilyName = escapeHtml(familyName)
  const safeLink = encodeURI(inviteLink)
  const body = `
    <p style="margin:0 0 12px;">Você recebeu um convite para participar da família <strong>${safeFamilyName}</strong> no Florim.</p>
    <p style="margin:0 0 12px;">Clique abaixo para criar sua conta e começar a organizar as finanças da família.</p>
    ${ctaButton(safeLink, 'Aceitar convite')}
    <p style="margin:20px 0 0;font-size:13px;color:#8C7B6B;">Ou copie e cole este link no navegador:<br><span style="color:#3E5F4B;">${safeLink}</span></p>
    <p style="margin:8px 0 0;font-size:13px;color:#8C7B6B;">Este convite expira em 7 dias.</p>
  `
  await resend.emails.send({
    from,
    to,
    subject: `Convite para a família ${safeFamilyName} — Florim`,
    html: emailShell(
      `Você foi convidado para a família ${safeFamilyName}`,
      body,
      'O primeiro passo de algo bonito começa com um convite.'
    ),
  })
}

export async function sendWelcomeEmail({
  to,
  name,
  familyName,
}: {
  to: string
  name: string
  familyName: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://florim.app'
  const safeName = escapeHtml(name)
  const safeFamilyName = escapeHtml(familyName)
  const body = `
    <p style="margin:0 0 12px;">Olá, <strong>${safeName}</strong>!</p>
    <p style="margin:0 0 12px;">Sua conta foi criada. Você agora faz parte da família <strong>${safeFamilyName}</strong> no Florim.</p>
    <p style="margin:0 0 12px;">Comece registrando receitas, despesas, metas e lembretes para manter tudo organizado.</p>
    ${ctaButton(appUrl, 'Acessar o Florim')}
  `
  await resend.emails.send({
    from,
    to,
    subject: 'Bem-vindo ao Florim',
    html: emailShell(
      `Bem-vindo, ${safeName}!`,
      body,
      'Um lar tranquilo nasce de pequenas escolhas repetidas.'
    ),
  })
}

export async function sendInsightsEmail({
  to,
  name,
  insights,
  period,
}: {
  to: string
  name: string
  insights: string[]
  period: string
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://florim.app'
  const safeName = escapeHtml(name || 'você')
  const safePeriod = escapeHtml(period)

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
    <p style="margin:0 0 20px;">Olá, <strong>${safeName}</strong>! Aqui estão seus insights financeiros de <strong>${safePeriod}</strong>.</p>
    ${insightBlocks}
    ${ctaButton(`${appUrl}/insights`, 'Ver todos os insights')}
    <p style="margin:20px 0 0;font-size:13px;color:#8C7B6B;">Você pode desativar esses emails nas <a href="${appUrl}/settings/profile" style="color:#3E5F4B;">configurações do perfil</a>.</p>
  `

  await resend.emails.send({
    from,
    to,
    subject: `Seus insights financeiros — ${safePeriod} — Florim`,
    html: emailShell(
      `Insights de ${safePeriod}`,
      body,
      'Conhecimento sobre o dinheiro é o primeiro passo para a liberdade financeira.'
    ),
  })
}

export async function sendAccountDeletionEmail({
  to,
  name,
}: {
  to: string
  name: string
}) {
  const safeName = escapeHtml(name)
  const body = `
    <p style="margin:0 0 12px;">Olá, <strong>${safeName}</strong>.</p>
    <p style="margin:0 0 12px;">Sua conta no Florim foi excluída conforme solicitado. Todos os seus dados pessoais foram removidos da plataforma.</p>
    <p style="margin:0;font-size:13px;color:#8C7B6B;">Se você não solicitou esta exclusão, entre em contato: <a href="mailto:privacidade@florim.app" style="color:#3E5F4B;">privacidade@florim.app</a></p>
  `
  await resend.emails.send({
    from,
    to,
    subject: 'Sua conta foi excluída — Florim',
    html: emailShell(
      'Conta excluída',
      body,
      'Obrigado por ter caminhado com a gente por um tempo.'
    ),
  })
}
