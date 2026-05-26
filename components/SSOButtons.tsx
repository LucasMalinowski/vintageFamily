'use client'

/**
 * SSOButtons — Google + Apple sign-in buttons for web auth screens.
 *
 * Usage:
 *   <SSODivider />
 *   <SSOButtons onPress={handler} loading={loading} />
 */

interface SSOButtonsProps {
  onPress: (provider: 'google' | 'apple') => void
  loading?: boolean
  disabled?: boolean
}

export function SSODivider() {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-border"/>
      <span className="text-[13px] text-ink/40 font-body shrink-0">ou continue com</span>
      <div className="flex-1 h-px bg-border"/>
    </div>
  )
}

export function SSOButtons({ onPress, loading = false, disabled = false }: SSOButtonsProps) {
  const isDisabled = loading || disabled

  return (
    <div className="flex flex-col gap-3">
      {/* Google */}
      <button
        type="button"
        onClick={() => onPress('google')}
        disabled={isDisabled}
        className="flex items-center justify-center gap-2.5 w-full py-3.5 px-4 bg-offWhite border border-border rounded-full text-[15px] font-body font-medium text-ink hover:bg-border/40 transition-vintage disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            <GoogleIcon />
            Continuar com Google
          </>
        )}
      </button>

      {/* Apple */}
      <button
        type="button"
        onClick={() => onPress('apple')}
        disabled={isDisabled}
        className="flex items-center justify-center gap-2.5 w-full py-3.5 px-4 bg-black text-white rounded-full text-[15px] font-body font-medium hover:opacity-90 transition-vintage disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <AppleIcon />
        Continuar com Apple
      </button>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17.64 9.2045C17.64 8.5663 17.5827 7.9527 17.4764 7.3636H9V10.845H13.8436C13.635 11.97 13.0009 12.9231 12.0477 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.2045Z"
        fill="#4285F4"
      />
      <path
        d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5613C11.2418 14.1013 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48182 18 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.96409 10.71C3.78409 10.17 3.68182 9.5931 3.68182 9C3.68182 8.4068 3.78409 7.8299 3.96409 7.2899V4.9581H0.957275C0.347727 6.1731 0 7.5477 0 9C0 10.4522 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.5795C10.3214 3.5795 11.5077 4.0336 12.4405 4.9254L15.0218 2.344C13.4632 0.8918 11.4259 0 9 0C5.48182 0 2.43818 2.0168 0.957275 4.9581L3.96409 7.2899C4.67182 5.1627 6.65591 3.5795 9 3.5795Z"
        fill="#EA4335"
      />
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M13.173 10.5985C13.1565 8.4585 14.9065 7.4185 14.9865 7.3685C13.9865 5.8985 12.4365 5.6985 11.8965 5.6785C10.5765 5.5385 9.30647 6.4585 8.63647 6.4585C7.95647 6.4585 6.91647 5.6985 5.79647 5.7185C4.35647 5.7385 3.01647 6.5585 2.27647 7.8585C0.736469 10.5185 1.89647 14.4785 3.37647 16.6585C4.11647 17.7385 4.97647 18.9585 6.11647 18.9185C7.21647 18.8785 7.63647 18.2185 8.97647 18.2185C10.3065 18.2185 10.6965 18.9185 11.8565 18.8985C13.0465 18.8785 13.7965 17.7785 14.5165 16.6885C15.3765 15.4285 15.7165 14.1985 15.7365 14.1385C15.7065 14.1285 13.1965 13.1185 13.173 10.5985Z"
        fill="white"
      />
      <path
        d="M10.9965 4.1785C11.5965 3.4185 12.0165 2.3785 11.8965 1.3185C10.9965 1.3585 9.87647 1.9385 9.25647 2.6785C8.69647 3.3385 8.19647 4.4185 8.33647 5.4385C9.35647 5.5185 10.3965 4.9385 10.9965 4.1785Z"
        fill="white"
      />
    </svg>
  )
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
