'use client'

import { useTranslations } from 'next-intl'

interface Props {
  className?: string
}

export default function CookiePreferencesLink({ className }: Props) {
  const t = useTranslations()

  function handleClick() {
    window.dispatchEvent(new CustomEvent('florim:open-cookie-preferences'))
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {t('cookie.preferences')}
    </button>
  )
}
