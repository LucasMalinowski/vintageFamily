export function parseAuthHandoffLocation(search: string, hash: string) {
  const searchParams = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)

  return {
    tokenHash: searchParams.get('token_hash'),
    accessToken: hashParams.get('access_token'),
    refreshToken: hashParams.get('refresh_token'),
  }
}
