import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const from = process.env.RESEND_FROM ?? 'Florim <noreply@florim.app>'

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
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:8px;border:1px solid #E4D7C2;">
          <!-- Header -->
          <tr>
            <td style="background-color:#3E5F4B;padding:22px 32px;border-radius:8px 8px 0 0;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right:12px;vertical-align:middle;">
                    <img src="https://florim.app/logo.png" alt="Florim" width="36" height="36" style="display:block;border-radius:6px;">
                  </td>
                  <td style="vertical-align:middle;">
                    <span style="color:#F5F1EB;font-size:20px;font-family:Georgia,serif;font-weight:bold;letter-spacing:2px;">FLORIM</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Title -->
          <tr>
            <td style="padding:32px 32px 0;">
              <h2 style="margin:0 0 16px;font-size:22px;font-family:Georgia,serif;color:#2F3B33;font-weight:normal;">${title}</h2>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:0 32px 28px;font-size:15px;font-family:Arial,sans-serif;color:#2F3B33;line-height:1.7;">
              ${body}
            </td>
          </tr>
          <!-- Quote -->
          <tr>
            <td style="padding:0 32px 28px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="border-top:1px solid #E4D7C2;padding-top:18px;">
                    <p style="margin:0;font-size:13px;font-family:Georgia,serif;color:#C2A45D;font-style:italic;">&ldquo;${quote}&rdquo;</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#F5F1EB;padding:14px 32px;border-top:1px solid #E4D7C2;border-radius:0 0 8px 8px;text-align:center;">
              <p style="margin:0;font-size:12px;font-family:Arial,sans-serif;color:#8C7B6B;">Florim Finanças &middot; <a href="https://florim.app" style="color:#8C7B6B;text-decoration:none;">florim.app</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function ctaButton(href: string, label: string) {
  return `
    <table cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
      <tr>
        <td style="background-color:#3E5F4B;border-radius:9999px;padding:13px 32px;">
          <a href="${href}" style="color:#F5F1EB;font-family:Arial,sans-serif;font-size:15px;text-decoration:none;display:inline-block;white-space:nowrap;">${label}</a>
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
  const body = `
    <p style="margin:0 0 12px;">Você recebeu um convite para participar da família <strong>${familyName}</strong> no Florim.</p>
    <p style="margin:0 0 12px;">Clique abaixo para criar sua conta e começar a organizar as finanças da família.</p>
    ${ctaButton(inviteLink, 'Aceitar convite')}
    <p style="margin:20px 0 0;font-size:13px;color:#8C7B6B;">Ou copie e cole este link no navegador:<br><span style="color:#3E5F4B;">${inviteLink}</span></p>
    <p style="margin:8px 0 0;font-size:13px;color:#8C7B6B;">Este convite expira em 7 dias.</p>
  `
  await resend.emails.send({
    from,
    to,
    subject: `Convite para a família ${familyName} — Florim`,
    html: emailShell(
      `Você foi convidado para a família ${familyName}`,
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
  const body = `
    <p style="margin:0 0 12px;">Olá, <strong>${name}</strong>!</p>
    <p style="margin:0 0 12px;">Sua conta foi criada. Você agora faz parte da família <strong>${familyName}</strong> no Florim.</p>
    <p style="margin:0 0 12px;">Comece registrando receitas, despesas, metas e lembretes para manter tudo organizado.</p>
    ${ctaButton(appUrl, 'Acessar o Florim')}
  `
  await resend.emails.send({
    from,
    to,
    subject: 'Bem-vindo ao Florim',
    html: emailShell(
      `Bem-vindo, ${name}!`,
      body,
      'Um lar tranquilo nasce de pequenas escolhas repetidas.'
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
  const body = `
    <p style="margin:0 0 12px;">Olá, <strong>${name}</strong>.</p>
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
