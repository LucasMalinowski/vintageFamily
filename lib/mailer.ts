import nodemailer from 'nodemailer'

type InviteEmailPayload = {
  to: string
  inviteLink: string
  familyName: string
}

const smtpHost = process.env.SMTP_HOST
const smtpPort = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587
const smtpUser = process.env.SMTP_USER
const smtpPass = process.env.SMTP_PASS
const smtpFrom = process.env.SMTP_FROM

function assertMailerConfig() {
  if (!smtpHost || !smtpUser || !smtpPass || !smtpFrom) {
    throw new Error('SMTP config missing. Define SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM.')
  }
}

export async function sendInviteEmail({ to, inviteLink, familyName }: InviteEmailPayload) {
  assertMailerConfig()

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  })

  const subject = `Convite para Família ${familyName}`
  const text = `Você recebeu um convite para participar da família ${familyName}. Abra o link para criar sua conta: ${inviteLink}`
  const html = `
    <div style="font-family: Georgia, serif; line-height: 1.5; color: #4B3B2F;">
      <h2>Convite para Família ${familyName}</h2>
      <p>Você recebeu um convite para participar da família ${familyName}.</p>
      <p>
        <a href="${inviteLink}" style="color: #1F6F8B; font-weight: bold;">Aceitar convite</a>
      </p>
      <p>Se preferir, copie e cole este link no navegador:</p>
      <p>${inviteLink}</p>
    </div>
  `

  await transporter.sendMail({
    from: smtpFrom,
    to,
    subject,
    text,
    html,
  })
}
