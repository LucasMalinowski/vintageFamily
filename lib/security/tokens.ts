import crypto from 'crypto'

export function generateUrlToken() {
  return crypto.randomBytes(32).toString('base64url')
}

export function sha256Hex(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex')
}
