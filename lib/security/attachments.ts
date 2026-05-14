import { supabase } from '@/lib/supabase'

const ATTACHMENT_PREFIX = '__attachment__:'

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

export async function getAttachmentViewUrl(attachmentPath: string | null, legacyUrl: string | null) {
  if (attachmentPath) {
    const { data, error } = await supabase.storage.from('attachments').createSignedUrl(attachmentPath, 5 * 60)
    if (error || !data?.signedUrl) throw error ?? new Error('Não foi possível abrir o anexo.')
    return data.signedUrl
  }

  if (legacyUrl && isTrustedAttachmentUrl(legacyUrl)) return legacyUrl
  throw new Error('Anexo inválido.')
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
