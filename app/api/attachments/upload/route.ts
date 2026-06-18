import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getAccessTokenFromAuthHeader, getAccessTokenFromCookieStore, requireUserByAccessToken } from '@/lib/billing/auth'
import { ImageValidationError, validateImageFile } from '@/lib/security/images'
import { getUserLocale } from '@/lib/i18n/getLocale'
import { getTranslations } from 'next-intl/server'

type RecordType = 'expense' | 'income'

const TABLE_BY_RECORD_TYPE = {
  expense: 'expenses',
  income: 'incomes',
} as const

function parseLegacyAttachment(notes: string | null): { cleanNotes: string } {
  if (!notes) return { cleanNotes: '' }

  const prefix = '__attachment__:'
  if (notes.startsWith(prefix)) {
    const raw = notes.slice(prefix.length)
    const pipeIdx = raw.indexOf('|')
    if (pipeIdx === -1) return { cleanNotes: '' }
    return { cleanNotes: raw.slice(pipeIdx + 1).trim() }
  }

  const legacySep = '\n__attachment__:'
  const legacyIdx = notes.indexOf(legacySep)
  if (legacyIdx !== -1) {
    return { cleanNotes: notes.slice(0, legacyIdx) }
  }

  return { cleanNotes: notes }
}

function getAccessToken(request: Request) {
  return getAccessTokenFromAuthHeader(request) ?? getAccessTokenFromCookieStore(cookies())
}

export async function POST(request: Request) {
  const auth = await requireUserByAccessToken(getAccessToken(request))
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const locale = await getUserLocale()
  const t = await getTranslations({ locale, namespace: 'apiErrors' })

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  const recordType = form?.get('recordType')
  const recordId = form?.get('recordId')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: t('attachments.fileRequired') }, { status: 400 })
  }
  if (recordType !== 'expense' && recordType !== 'income') {
    return NextResponse.json({ error: t('attachments.invalidRecordType') }, { status: 400 })
  }
  if (typeof recordId !== 'string' || !recordId) {
    return NextResponse.json({ error: t('attachments.recordRequired') }, { status: 400 })
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id,family_id')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return NextResponse.json({ error: t('account.profileNotFound') }, { status: 400 })
  }

  const table = TABLE_BY_RECORD_TYPE[recordType as RecordType]
  const { data: record, error: recordError } = await supabaseAdmin
    .from(table)
    .select('id,family_id,notes')
    .eq('id', recordId)
    .eq('family_id', profile.family_id)
    .maybeSingle()

  if (recordError || !record) {
    return NextResponse.json({ error: t('attachments.recordNotFound') }, { status: 404 })
  }

  let image
  try {
    image = await validateImageFile(file)
  } catch (error) {
    if (error instanceof ImageValidationError) {
      const messageByCode: Record<typeof error.code, string> = {
        too_large: t('attachments.imageTooLarge'),
        invalid_image: t('attachments.imageInvalid'),
        extension_mismatch: t('attachments.imageExtensionMismatch'),
        mime_mismatch: t('attachments.imageMimeMismatch'),
      }
      return NextResponse.json({ error: messageByCode[error.code] }, { status: 400 })
    }
    return NextResponse.json({ error: t('attachments.invalidFile') }, { status: 400 })
  }

  const filePath = `${profile.family_id}/${recordId}/${crypto.randomUUID()}.${image.extension}`
  const { error: uploadError } = await supabaseAdmin.storage
    .from('attachments')
    .upload(filePath, image.buffer, { contentType: image.mime, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: t('attachments.uploadFailed') }, { status: 500 })
  }

  const { cleanNotes } = parseLegacyAttachment(record.notes)
  const { error: updateError } = await supabaseAdmin
    .from(table)
    .update({
      notes: cleanNotes || null,
      attachment_path: filePath,
      updated_at: new Date().toISOString(),
    })
    .eq('id', recordId)
    .eq('family_id', profile.family_id)

  if (updateError) {
    await supabaseAdmin.storage.from('attachments').remove([filePath])
    return NextResponse.json({ error: t('attachments.linkFailed') }, { status: 500 })
  }

  return NextResponse.json({ ok: true, attachmentPath: filePath })
}
