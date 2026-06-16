import type { AppLocale } from '@/lib/i18n/getLocale'

/**
 * Meta Business Manager language codes for WhatsApp template messages.
 * All template variants (pt_BR, en_US, es_ES) are approved — locale is now
 * wired into every sendTemplateMessage call via this map.
 */
export const META_TEMPLATE_LANGUAGE: Record<AppLocale, string> = {
  'pt-BR': 'pt_BR',
  en: 'en_US',
  es: 'es_ES',
}
