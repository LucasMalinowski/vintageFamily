import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY, type AppCurrency } from '@/lib/i18n/currencies'

// Server-only lookup for the currency a family's financial data is tracked
// in — used to format amounts in AI insights, WhatsApp replies, and emails
// consistently with what the family sees in the app. Kept out of
// currencies.ts (which client components import) so this server-only
// dependency never ends up in a client bundle.
export async function getFamilyCurrency(familyId: string): Promise<AppCurrency> {
  const { data } = await supabaseAdmin
    .from('families')
    .select('currency')
    .eq('id', familyId)
    .maybeSingle()
  const value = (data as { currency?: string | null } | null)?.currency
  return value && (SUPPORTED_CURRENCIES as readonly string[]).includes(value) ? (value as AppCurrency) : DEFAULT_CURRENCY
}
