import { describe, expect, it } from 'vitest'
import { parseAuthHandoffLocation } from '@/lib/billing/auth-handoff'
import { buildAuthHandoffUrl, getMagicLinkTokenHash } from '@/lib/billing/web-handoff'

describe('web billing handoff helpers', () => {
  it('builds the web callback URL for a generated magic link token hash', () => {
    expect(buildAuthHandoffUrl('https://florim.app', 'hashed-token-123')).toBe(
      'https://florim.app/auth/handoff?token_hash=hashed-token-123&type=magiclink'
    )
  })

  it('extracts the Supabase hashed token from generateLink responses', () => {
    expect(
      getMagicLinkTokenHash({
        properties: {
          hashed_token: 'hashed-token-123',
        },
      })
    ).toBe('hashed-token-123')
  })

  it('returns null when generateLink responses do not contain a hashed token', () => {
    expect(getMagicLinkTokenHash({ properties: {} })).toBeNull()
    expect(getMagicLinkTokenHash(null)).toBeNull()
  })

  it('parses the new query-based handoff and the legacy hash-based callback', () => {
    expect(
      parseAuthHandoffLocation('?token_hash=hashed-token-123&type=magiclink', '#')
    ).toMatchObject({
      tokenHash: 'hashed-token-123',
      accessToken: null,
      refreshToken: null,
    })

    expect(
      parseAuthHandoffLocation('', '#access_token=access-123&refresh_token=refresh-456')
    ).toMatchObject({
      tokenHash: null,
      accessToken: 'access-123',
      refreshToken: 'refresh-456',
    })
  })
})
