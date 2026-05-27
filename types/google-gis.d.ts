// Minimal type declarations for the Google Identity Services (GIS) library
// loaded via <Script src="https://accounts.google.com/gsi/client" />

interface GoogleCodeClientConfig {
  client_id: string
  scope: string
  ux_mode?: 'popup' | 'redirect'
  redirect_uri?: string
  callback: (response: { code?: string; error?: string }) => void
}

interface GoogleCodeClient {
  requestCode(): void
}

interface GoogleOAuth2 {
  initCodeClient(config: GoogleCodeClientConfig): GoogleCodeClient
}

interface GoogleAccounts {
  oauth2: GoogleOAuth2
}

interface Google {
  accounts: GoogleAccounts
}

declare global {
  interface Window {
    google?: Google
  }
}

export {}
