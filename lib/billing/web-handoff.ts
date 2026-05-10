type GenerateLinkProperties = {
  hashed_token?: string | null
}

type GenerateLinkResponse = {
  properties?: GenerateLinkProperties | null
}

export function getMagicLinkTokenHash(generateLinkData: unknown): string | null {
  if (!generateLinkData || typeof generateLinkData !== 'object') return null

  const properties = (generateLinkData as GenerateLinkResponse).properties
  const hashedToken = properties?.hashed_token

  return typeof hashedToken === 'string' && hashedToken.length > 0 ? hashedToken : null
}

export function buildAuthHandoffUrl(siteUrl: string, tokenHash: string): string {
  const url = new URL('/auth/handoff', siteUrl)
  url.searchParams.set('token_hash', tokenHash)
  url.searchParams.set('type', 'magiclink')
  return url.toString()
}
