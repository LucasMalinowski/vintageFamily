const ATTACHMENT_PREFIX = '__attachment__:'

export function parseAttachment(notes: string | null) {
  if (!notes) return { attachmentUrl: null, cleanNotes: '' }
  if (!notes.startsWith(ATTACHMENT_PREFIX)) return { attachmentUrl: null, cleanNotes: notes }

  const raw = notes.slice(ATTACHMENT_PREFIX.length)
  const [url, ...rest] = raw.split('|')
  return {
    attachmentUrl: url || null,
    cleanNotes: rest.join('|').trim(),
  }
}

export function mergeAttachment(notes: string | null, attachmentUrl: string | null) {
  const cleanNotes = notes?.trim() ?? ''
  if (!attachmentUrl) return cleanNotes || null
  return `${ATTACHMENT_PREFIX}${attachmentUrl}${cleanNotes ? `|${cleanNotes}` : ''}`
}
