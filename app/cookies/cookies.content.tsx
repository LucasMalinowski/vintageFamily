import type { AppLocale } from '@/lib/i18n/getLocale'
import type { ReactNode } from 'react'

export type CookieRow = {
  type: string
  name: string
  provider: string
  purpose: string
  retention: string
  consent: string
}

export type CookiesSection = {
  title: string
  content: ReactNode
}

export type CookiesContent = {
  metaTitle: string
  pageTitle: string
  effectiveDate: string
  tableHeaders: { type: string; name: string; provider: string; purpose: string; retention: string; consent: string }
  tableRows: CookieRow[]
}

const linkClass = 'text-coffee underline underline-offset-2 hover:text-coffee/80'

function CookieTable({ content }: { content: CookiesContent }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-coffee text-paper">
            <th className="text-left px-4 py-3 font-semibold">{content.tableHeaders.type}</th>
            <th className="text-left px-4 py-3 font-semibold">{content.tableHeaders.name}</th>
            <th className="text-left px-4 py-3 font-semibold">{content.tableHeaders.provider}</th>
            <th className="text-left px-4 py-3 font-semibold">{content.tableHeaders.purpose}</th>
            <th className="text-left px-4 py-3 font-semibold">{content.tableHeaders.retention}</th>
            <th className="text-left px-4 py-3 font-semibold">{content.tableHeaders.consent}</th>
          </tr>
        </thead>
        <tbody>
          {content.tableRows.map((row) => (
            <tr key={row.name} className="border-t border-border bg-white">
              <td className="px-4 py-3 font-medium">{row.type}</td>
              <td className="px-4 py-3 font-mono text-xs">{row.name}</td>
              <td className="px-4 py-3">{row.provider}</td>
              <td className="px-4 py-3">{row.purpose}</td>
              <td className="px-4 py-3">{row.retention}</td>
              <td className="px-4 py-3">{row.consent}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export const COOKIES_CONTENT: Record<AppLocale, CookiesContent> = {
  'pt-BR': {
    metaTitle: 'Política de Cookies Florim',
    pageTitle: 'Política de Cookies',
    effectiveDate: 'Vigente a partir de 14 de maio de 2026',
    tableHeaders: {
      type: 'Tipo',
      name: 'Nome / Identificador',
      provider: 'Provedor',
      purpose: 'Finalidade',
      retention: 'Retenção',
      consent: 'Consentimento',
    },
    tableRows: [
      {
        type: 'Essencial',
        name: 'sb-*-auth-token',
        provider: 'Supabase',
        purpose: 'Sessão de login e autenticação',
        retention: 'Sessão',
        consent: 'Não necessário',
      },
      {
        type: 'Essencial',
        name: 'florim_cookie_consent',
        provider: 'Florim',
        purpose: 'Armazena sua escolha de consentimento',
        retention: '1 ano',
        consent: 'Não necessário',
      },
      {
        type: 'Analítico',
        name: 'ph_*_posthog',
        provider: 'PostHog, Inc. (EUA)',
        purpose: 'Identificação de sessão analítica e comportamento de uso',
        retention: '1 ano',
        consent: 'Necessário',
      },
      {
        type: 'Analítico',
        name: 'ph_*_window_id',
        provider: 'PostHog, Inc. (EUA)',
        purpose: 'Identificação de janela para análise de fluxo',
        retention: 'Sessão',
        consent: 'Necessário',
      },
    ],
  },
  en: {
    metaTitle: 'Florim Cookie Policy',
    pageTitle: 'Cookie Policy',
    effectiveDate: 'Effective as of May 14, 2026',
    tableHeaders: {
      type: 'Type',
      name: 'Name / Identifier',
      provider: 'Provider',
      purpose: 'Purpose',
      retention: 'Retention',
      consent: 'Consent',
    },
    tableRows: [
      {
        type: 'Essential',
        name: 'sb-*-auth-token',
        provider: 'Supabase',
        purpose: 'Login session and authentication',
        retention: 'Session',
        consent: 'Not required',
      },
      {
        type: 'Essential',
        name: 'florim_cookie_consent',
        provider: 'Florim',
        purpose: 'Stores your consent choice',
        retention: '1 year',
        consent: 'Not required',
      },
      {
        type: 'Analytics',
        name: 'ph_*_posthog',
        provider: 'PostHog, Inc. (USA)',
        purpose: 'Analytics session identification and usage behavior',
        retention: '1 year',
        consent: 'Required',
      },
      {
        type: 'Analytics',
        name: 'ph_*_window_id',
        provider: 'PostHog, Inc. (USA)',
        purpose: 'Window identification for flow analysis',
        retention: 'Session',
        consent: 'Required',
      },
    ],
  },
  es: {
    metaTitle: 'Política de Cookies de Florim',
    pageTitle: 'Política de Cookies',
    effectiveDate: 'Vigente a partir del 14 de mayo de 2026',
    tableHeaders: {
      type: 'Tipo',
      name: 'Nombre / Identificador',
      provider: 'Proveedor',
      purpose: 'Finalidad',
      retention: 'Retención',
      consent: 'Consentimiento',
    },
    tableRows: [
      {
        type: 'Esencial',
        name: 'sb-*-auth-token',
        provider: 'Supabase',
        purpose: 'Sesión de inicio de sesión y autenticación',
        retention: 'Sesión',
        consent: 'No necesario',
      },
      {
        type: 'Esencial',
        name: 'florim_cookie_consent',
        provider: 'Florim',
        purpose: 'Almacena tu elección de consentimiento',
        retention: '1 año',
        consent: 'No necesario',
      },
      {
        type: 'Analítica',
        name: 'ph_*_posthog',
        provider: 'PostHog, Inc. (EE. UU.)',
        purpose: 'Identificación de sesión analítica y comportamiento de uso',
        retention: '1 año',
        consent: 'Necesario',
      },
      {
        type: 'Analítica',
        name: 'ph_*_window_id',
        provider: 'PostHog, Inc. (EE. UU.)',
        purpose: 'Identificación de ventana para análisis de flujo',
        retention: 'Sesión',
        consent: 'Necesario',
      },
    ],
  },
}

export function buildCookiesSections(locale: AppLocale, content: CookiesContent): CookiesSection[] {
  if (locale === 'pt-BR') {
    return [
      {
        title: '1. O que são cookies',
        content: (
          <p>
            Cookies são pequenos arquivos de texto armazenados no seu dispositivo quando você visita um site. Eles permitem que o serviço reconheça seu navegador e lembre preferências entre visitas.
          </p>
        ),
      },
      {
        title: '2. Cookies que utilizamos',
        content: <CookieTable content={content} />,
      },
      {
        title: '3. Como gerenciar cookies',
        content: (
          <>
            <p>
              Na primeira visita ao Florim, exibimos um aviso de cookies onde você pode aceitar, rejeitar ou gerenciar individualmente os cookies não essenciais. Sua escolha é salva localmente. Você pode alterar suas preferências a qualquer momento clicando em <strong>Preferências de cookies</strong> no rodapé do site.
            </p>
            <p>
              Você também pode configurar seu navegador para bloquear ou alertar sobre cookies. Note que desativar cookies essenciais pode impedir o funcionamento correto do aplicativo.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>Chrome:</strong> Configurações → Privacidade e segurança → Cookies</li>
              <li><strong>Firefox:</strong> Preferências → Privacidade e segurança</li>
              <li><strong>Safari:</strong> Preferências → Privacidade</li>
            </ul>
          </>
        ),
      },
      {
        title: '4. Cookies de terceiros',
        content: (
          <p>
            O Florim utiliza os seguintes serviços de terceiros que podem definir seus próprios cookies: <strong>Supabase</strong> (autenticação e banco de dados), <strong>Stripe</strong> (processamento de pagamentos) e <strong>PostHog, Inc.</strong> (análises de uso apenas com consentimento). Esses cookies são regidos pelas políticas de privacidade dos respectivos serviços.
          </p>
        ),
      },
      {
        title: '5. Alterações a esta política',
        content: (
          <p>
            Podemos atualizar esta política periodicamente. Alterações significativas serão comunicadas por aviso no aplicativo.
          </p>
        ),
      },
      {
        title: '6. Contato',
        content: (
          <p>
            Dúvidas sobre nossa política de cookies:{' '}
            <a href="mailto:contato@florim.app" className={linkClass}>
              contato@florim.app
            </a>
          </p>
        ),
      },
    ]
  }

  if (locale === 'es') {
    return [
      {
        title: '1. Qué son las cookies',
        content: (
          <p>
            Las cookies son pequeños archivos de texto almacenados en tu dispositivo cuando visitas un sitio web. Permiten que el servicio reconozca tu navegador y recuerde tus preferencias entre visitas.
          </p>
        ),
      },
      {
        title: '2. Cookies que utilizamos',
        content: <CookieTable content={content} />,
      },
      {
        title: '3. Cómo gestionar las cookies',
        content: (
          <>
            <p>
              En tu primera visita a Florim, mostramos un aviso de cookies donde puedes aceptar, rechazar o gestionar individualmente las cookies no esenciales. Tu elección se guarda localmente. Puedes cambiar tus preferencias en cualquier momento haciendo clic en <strong>Preferencias de cookies</strong> en el pie de página del sitio.
            </p>
            <p>
              También puedes configurar tu navegador para bloquear o alertar sobre cookies. Ten en cuenta que desactivar las cookies esenciales puede impedir el correcto funcionamiento de la aplicación.
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li><strong>Chrome:</strong> Configuración → Privacidad y seguridad → Cookies</li>
              <li><strong>Firefox:</strong> Preferencias → Privacidad y seguridad</li>
              <li><strong>Safari:</strong> Preferencias → Privacidad</li>
            </ul>
          </>
        ),
      },
      {
        title: '4. Cookies de terceros',
        content: (
          <p>
            Florim utiliza los siguientes servicios de terceros que pueden establecer sus propias cookies: <strong>Supabase</strong> (autenticación y base de datos), <strong>Stripe</strong> (procesamiento de pagos) y <strong>PostHog, Inc.</strong> (análisis de uso solo con consentimiento). Estas cookies se rigen por las políticas de privacidad de los respectivos servicios.
          </p>
        ),
      },
      {
        title: '5. Cambios a esta política',
        content: (
          <p>
            Podemos actualizar esta política periódicamente. Los cambios significativos se comunicarán mediante un aviso en la aplicación.
          </p>
        ),
      },
      {
        title: '6. Contacto',
        content: (
          <p>
            Preguntas sobre nuestra política de cookies:{' '}
            <a href="mailto:contato@florim.app" className={linkClass}>
              contato@florim.app
            </a>
          </p>
        ),
      },
    ]
  }

  // English (default)
  return [
    {
      title: '1. What cookies are',
      content: (
        <p>
          Cookies are small text files stored on your device when you visit a website. They allow the service to recognize your browser and remember preferences between visits.
        </p>
      ),
    },
    {
      title: '2. Cookies we use',
      content: <CookieTable content={content} />,
    },
    {
      title: '3. How to manage cookies',
      content: (
        <>
          <p>
            On your first visit to Florim, we display a cookie notice where you can accept, reject, or individually manage non-essential cookies. Your choice is saved locally. You can change your preferences at any time by clicking <strong>Cookie preferences</strong> in the site footer.
          </p>
          <p>
            You can also configure your browser to block or alert you about cookies. Note that disabling essential cookies may prevent the app from working correctly.
          </p>
          <ul className="list-disc list-inside space-y-1 text-sm">
            <li><strong>Chrome:</strong> Settings → Privacy and security → Cookies</li>
            <li><strong>Firefox:</strong> Preferences → Privacy & Security</li>
            <li><strong>Safari:</strong> Preferences → Privacy</li>
          </ul>
        </>
      ),
    },
    {
      title: '4. Third-party cookies',
      content: (
        <p>
          Florim uses the following third-party services, which may set their own cookies: <strong>Supabase</strong> (authentication and database), <strong>Stripe</strong> (payment processing), and <strong>PostHog, Inc.</strong> (usage analytics, only with consent). These cookies are governed by the respective services&apos; privacy policies.
        </p>
      ),
    },
    {
      title: '5. Changes to this policy',
      content: (
        <p>
          We may update this policy periodically. Significant changes will be communicated via a notice within the app.
        </p>
      ),
    },
    {
      title: '6. Contact',
      content: (
        <p>
          Questions about our cookie policy:{' '}
          <a href="mailto:contato@florim.app" className={linkClass}>
            contato@florim.app
          </a>
        </p>
      ),
    },
  ]
}
