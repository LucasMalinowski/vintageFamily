'use client'

import { useEffect, useState } from 'react'

const IOS_URL = 'https://apps.apple.com/app/florim/id6739168371'
const ANDROID_EARLY_ACCESS_URL = '/android-early-access'

function detectOS(): 'ios' | 'android' | 'other' {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  return 'other'
}

interface Props {
  className?: string
}

export default function AppStoreBadges({ className }: Props) {
  const [os, setOs] = useState<'ios' | 'android' | 'other'>('other')

  useEffect(() => {
    setOs(detectOS())
  }, [])

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className ?? ''}`}>
      <a
        href={IOS_URL}
        target={os === 'ios' ? '_self' : '_blank'}
        rel="noopener noreferrer"
        aria-label="Baixar na App Store"
        className="transition-vintage hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 rounded-[7px]"
      >
        <AppStoreBadge />
      </a>

      <a
        href={ANDROID_EARLY_ACCESS_URL}
        aria-label="Acesso antecipado para Android"
        className="transition-vintage hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 rounded-[7px]"
      >
        <GooglePlayBadge />
      </a>
    </div>
  )
}

function AppStoreBadge() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40" height="40" aria-hidden className="h-10 w-auto">
      <rect width="120" height="40" rx="6" fill="#000" />
      <rect width="119" height="39" x=".5" y=".5" rx="5.5" fill="none" stroke="#a6a6a6" strokeWidth="1" />
      {/* Apple logo */}
      <path
        d="M22.3 19.8c0-2.5 2-3.7 2.1-3.8-1.2-1.7-3-1.9-3.6-2-1.5-.2-3 .9-3.7.9-.8 0-2-.9-3.2-.8-1.6 0-3.1 1-4 2.5-1.7 3 -.5 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.5 1.2-.1 1.7-.8 3.2-.8s1.9.8 3.2.7c1.3 0 2.1-1.2 2.9-2.4.6-.8 1-1.7 1.4-2.7-2.9-1.1-2.5-4.9 0-5.9z"
        fill="#fff"
      />
      <path
        d="M19.8 12.4c.7-.8 1.1-2 1-3-1 .1-2.1.6-2.8 1.4-.6.7-1.1 1.9-1 3 1.1.1 2.2-.5 2.8-1.4z"
        fill="#fff"
      />
      {/* Text */}
      <text x="35" y="15.5" fill="#fff" fontFamily="system-ui,-apple-system,sans-serif" fontSize="7.5" letterSpacing="0.2">
        Download on the
      </text>
      <text x="35" y="27" fill="#fff" fontFamily="system-ui,-apple-system,sans-serif" fontSize="13.5" fontWeight="600" letterSpacing="-0.3">
        App Store
      </text>
    </svg>
  )
}

function GooglePlayBadge() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 135 40" height="40" aria-hidden className="h-10 w-auto">
      <rect width="135" height="40" rx="6" fill="#000" />
      <rect width="134" height="39" x=".5" y=".5" rx="5.5" fill="none" stroke="#a6a6a6" strokeWidth="1" />
      {/* Play store colorful icon */}
      <path d="M10 11.5l11.3 8.5L10 28.5V11.5z" fill="#4285F4" />
      <path d="M10 11.5l11.3 8.5-3.9 3.8L10 11.5z" fill="#31A855" />
      <path d="M10 28.5l7.4-12.7 3.9 3.8L10 28.5z" fill="#FBBC05" />
      <path d="M21.3 20l5.4-3.2-5.4-3.3v6.5z" fill="#EA4335" />
      {/* Text */}
      <text x="33" y="16" fill="#fff" fontFamily="system-ui,-apple-system,sans-serif" fontSize="7.5" letterSpacing="0.5">
        GET IT ON
      </text>
      <text x="33" y="28" fill="#fff" fontFamily="system-ui,-apple-system,sans-serif" fontSize="13.5" fontWeight="500" letterSpacing="-0.2">
        Google Play
      </text>
    </svg>
  )
}
