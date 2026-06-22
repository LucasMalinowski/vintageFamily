// Source of truth for selectable currencies: ISO 4217 code, a representative
// country (ISO 3166-1 alpha-2, or "EU" for the Euro) used to derive the flag
// emoji, an English country name, and an optional symbol — both used only as
// extra search terms in the currency picker, never displayed.
export interface CurrencyMeta {
  code: string
  country: string
  countryName: string
  symbol?: string
}

export const CURRENCIES = [
  {code: 'BRL', country: 'BR', countryName: 'Brazil', symbol: 'R$'},
  {code: 'USD', country: 'US', countryName: 'United States', symbol: '$'},
  {code: 'EUR', country: 'EU', countryName: 'European Union', symbol: '€'},
  {code: 'GBP', country: 'GB', countryName: 'United Kingdom', symbol: '£'},
  {code: 'JPY', country: 'JP', countryName: 'Japan', symbol: '¥'},
  {code: 'CNY', country: 'CN', countryName: 'China', symbol: '¥'},
  {code: 'AUD', country: 'AU', countryName: 'Australia', symbol: 'A$'},
  {code: 'CAD', country: 'CA', countryName: 'Canada', symbol: 'C$'},
  {code: 'CHF', country: 'CH', countryName: 'Switzerland', symbol: 'Fr.'},
  {code: 'HKD', country: 'HK', countryName: 'Hong Kong', symbol: 'HK$'},
  {code: 'SGD', country: 'SG', countryName: 'Singapore', symbol: 'S$'},
  {code: 'SEK', country: 'SE', countryName: 'Sweden', symbol: 'kr'},
  {code: 'NOK', country: 'NO', countryName: 'Norway', symbol: 'kr'},
  {code: 'DKK', country: 'DK', countryName: 'Denmark', symbol: 'kr'},
  {code: 'NZD', country: 'NZ', countryName: 'New Zealand', symbol: 'NZ$'},
  {code: 'INR', country: 'IN', countryName: 'India', symbol: '₹'},
  {code: 'KRW', country: 'KR', countryName: 'South Korea', symbol: '₩'},
  {code: 'MXN', country: 'MX', countryName: 'Mexico', symbol: '$'},
  {code: 'ZAR', country: 'ZA', countryName: 'South Africa', symbol: 'R'},
  {code: 'RUB', country: 'RU', countryName: 'Russia', symbol: '₽'},
  {code: 'TRY', country: 'TR', countryName: 'Turkey', symbol: '₺'},
  {code: 'AED', country: 'AE', countryName: 'United Arab Emirates', symbol: undefined},
  {code: 'SAR', country: 'SA', countryName: 'Saudi Arabia', symbol: undefined},
  {code: 'PLN', country: 'PL', countryName: 'Poland', symbol: 'zł'},
  {code: 'THB', country: 'TH', countryName: 'Thailand', symbol: '฿'},
  {code: 'IDR', country: 'ID', countryName: 'Indonesia', symbol: 'Rp'},
  {code: 'MYR', country: 'MY', countryName: 'Malaysia', symbol: 'RM'},
  {code: 'PHP', country: 'PH', countryName: 'Philippines', symbol: '₱'},
  {code: 'VND', country: 'VN', countryName: 'Vietnam', symbol: '₫'},
  {code: 'CZK', country: 'CZ', countryName: 'Czech Republic', symbol: 'Kč'},
  {code: 'HUF', country: 'HU', countryName: 'Hungary', symbol: 'Ft'},
  {code: 'ILS', country: 'IL', countryName: 'Israel', symbol: '₪'},
  {code: 'CLP', country: 'CL', countryName: 'Chile', symbol: '$'},
  {code: 'COP', country: 'CO', countryName: 'Colombia', symbol: '$'},
  {code: 'PEN', country: 'PE', countryName: 'Peru', symbol: 'S/'},
  {code: 'ARS', country: 'AR', countryName: 'Argentina', symbol: '$'},
  {code: 'UYU', country: 'UY', countryName: 'Uruguay', symbol: '$'},
  {code: 'PYG', country: 'PY', countryName: 'Paraguay', symbol: '₲'},
  {code: 'BOB', country: 'BO', countryName: 'Bolivia', symbol: 'Bs.'},
  {code: 'CRC', country: 'CR', countryName: 'Costa Rica', symbol: '₡'},
  {code: 'PAB', country: 'PA', countryName: 'Panama', symbol: 'B/.'},
  {code: 'DOP', country: 'DO', countryName: 'Dominican Republic', symbol: 'RD$'},
  {code: 'GTQ', country: 'GT', countryName: 'Guatemala', symbol: 'Q'},
  {code: 'EGP', country: 'EG', countryName: 'Egypt', symbol: '£E'},
  {code: 'NGN', country: 'NG', countryName: 'Nigeria', symbol: '₦'},
  {code: 'KES', country: 'KE', countryName: 'Kenya', symbol: 'KSh'},
  {code: 'GHS', country: 'GH', countryName: 'Ghana', symbol: '₵'},
  {code: 'MAD', country: 'MA', countryName: 'Morocco', symbol: undefined},
  {code: 'PKR', country: 'PK', countryName: 'Pakistan', symbol: '₨'},
  {code: 'BDT', country: 'BD', countryName: 'Bangladesh', symbol: '৳'},
  {code: 'LKR', country: 'LK', countryName: 'Sri Lanka', symbol: '₨'},
  {code: 'UAH', country: 'UA', countryName: 'Ukraine', symbol: '₴'},
  {code: 'RON', country: 'RO', countryName: 'Romania', symbol: 'lei'},
  {code: 'ISK', country: 'IS', countryName: 'Iceland', symbol: 'kr'},
  {code: 'QAR', country: 'QA', countryName: 'Qatar', symbol: undefined},
  {code: 'KWD', country: 'KW', countryName: 'Kuwait', symbol: undefined},
  {code: 'BHD', country: 'BH', countryName: 'Bahrain', symbol: undefined},
  {code: 'OMR', country: 'OM', countryName: 'Oman', symbol: undefined},
  {code: 'JOD', country: 'JO', countryName: 'Jordan', symbol: undefined},
  {code: 'TWD', country: 'TW', countryName: 'Taiwan', symbol: 'NT$'},
] as const satisfies readonly CurrencyMeta[]

export type AppCurrency = typeof CURRENCIES[number]['code']
export const SUPPORTED_CURRENCIES = CURRENCIES.map(c => c.code) as AppCurrency[]
export const DEFAULT_CURRENCY: AppCurrency = 'BRL'

const CURRENCY_BY_CODE = new Map<string, typeof CURRENCIES[number]>(CURRENCIES.map(c => [c.code, c]))

export function getCurrencyMeta(code: string): CurrencyMeta | undefined {
  return CURRENCY_BY_CODE.get(code)
}

// Regional-indicator trick: each A-Z letter maps to U+1F1E6..U+1F1FF by a
// fixed offset, so e.g. "BR" -> 🇧 + 🇷 -> 🇧🇷. Works for any ISO 3166-1
// alpha-2 code, plus the user-assigned "EU" code (-> 🇪🇺).
export function countryCodeToFlag(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt(0)))
}
