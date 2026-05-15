'use client'

interface Props {
  className?: string
}

export default function CookiePreferencesLink({ className }: Props) {
  function handleClick() {
    window.dispatchEvent(new CustomEvent('florim:open-cookie-preferences'))
  }

  return (
    <button onClick={handleClick} className={className}>
      Preferências de cookies
    </button>
  )
}
