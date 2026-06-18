const MAX_IMAGE_BYTES = 5 * 1024 * 1024

const MIME_EXTENSIONS = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp'],
} as const

export type ImageValidationErrorCode = 'too_large' | 'invalid_image' | 'extension_mismatch' | 'mime_mismatch'

export class ImageValidationError extends Error {
  constructor(message: string, public readonly code: ImageValidationErrorCode) {
    super(message)
  }
}

export function detectImageMime(buffer: Buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }

  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png'
  }

  if (buffer.length >= 12 && buffer.subarray(0, 4).toString() === 'RIFF' && buffer.subarray(8, 12).toString() === 'WEBP') {
    return 'image/webp'
  }

  return null
}

/**
 * Validates an uploaded image file. Throws `ImageValidationError` with a stable `code`
 * instead of a localized message — this function is called both from client components
 * (Profile.tsx, settings/profile) and from an API route, neither of which can reliably
 * pass a locale in here, so callers should catch the error and translate based on
 * `error.code` via `useTranslations`/`getTranslations`.
 */
export async function validateImageFile(file: File, maxBytes = MAX_IMAGE_BYTES) {
  if (file.size <= 0 || file.size > maxBytes) {
    throw new ImageValidationError('Imagem excede o tamanho máximo permitido.', 'too_large')
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const detectedMime = detectImageMime(buffer)
  if (!detectedMime) {
    throw new ImageValidationError('Arquivo não é uma imagem válida.', 'invalid_image')
  }

  const extension = file.name.split('.').pop()?.toLowerCase()
  const allowedExtensions = MIME_EXTENSIONS[detectedMime]

  if (!extension || !(allowedExtensions as readonly string[]).includes(extension)) {
    throw new ImageValidationError('Extensão incompatível com o conteúdo real.', 'extension_mismatch')
  }

  if (file.type && file.type !== detectedMime) {
    throw new ImageValidationError('MIME type incompatível com o conteúdo real.', 'mime_mismatch')
  }

  return { mime: detectedMime, extension: extension === 'jpeg' ? 'jpg' : extension, buffer }
}
