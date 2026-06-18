import { supabase } from '@/lib/supabase'

const ATTACHMENT_PREFIX = '__attachment__:'

export class AttachmentAccessError extends Error {
  constructor(message: string, public readonly code: 'open_failed' | 'invalid_attachment') {
    super(message)
  }
}

export function parseLegacyAttachment(notes: string | null) {
  if (!notes) return { attachmentUrl: null, cleanNotes: '' }
  if (!notes.startsWith(ATTACHMENT_PREFIX)) return { attachmentUrl: null, cleanNotes: notes }

  const raw = notes.slice(ATTACHMENT_PREFIX.length)
  const [url, ...rest] = raw.split('|')
  return {
    attachmentUrl: url || null,
    cleanNotes: rest.join('|').trim(),
  }
}

/**
 * Resolves a viewable URL for an attachment. Throws `AttachmentAccessError` with a stable
 * `code` instead of a localized message — this function has no access to the caller's
 * locale (it's called directly from client components), so callers should catch the error
 * and translate based on `error.code` via `useTranslations`/`getTranslations`.
 */
export async function getAttachmentViewUrl(attachmentPath: string | null, legacyUrl: string | null) {
  if (attachmentPath) {
    const { data, error } = await supabase.storage.from('attachments').createSignedUrl(attachmentPath, 5 * 60)
    if (error || !data?.signedUrl) throw new AttachmentAccessError('Não foi possível abrir o anexo.', 'open_failed')
    return data.signedUrl
  }

  if (legacyUrl && isTrustedAttachmentUrl(legacyUrl)) return legacyUrl
  throw new AttachmentAccessError('Anexo inválido.', 'invalid_attachment')
}

function isTrustedAttachmentUrl(value: string) {
  try {
    const url = new URL(value)
    const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!)
    return url.protocol === 'https:' &&
      url.hostname === supabaseUrl.hostname &&
      url.pathname.includes('/storage/v1/object/')
  } catch {
    return false
  }
}
