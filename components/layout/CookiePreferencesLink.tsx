'use client'

interface Props {
  className?: string
}

export default function CookiePreferencesLink({ className }: Props) {
  function handleClick() {
    window.dispatchEvent(new CustomEvent('florim:open-cookie-preferences'))
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      Preferências de cookies
    </button>
  )
}
