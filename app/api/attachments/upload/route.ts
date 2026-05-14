import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getAccessTokenFromAuthHeader, getAccessTokenFromCookieStore, requireUserByAccessToken } from '@/lib/billing/auth'
import { validateImageFile } from '@/lib/security/images'

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

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  const recordType = form?.get('recordType')
  const recordId = form?.get('recordId')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Arquivo obrigatório.' }, { status: 400 })
  }
  if (recordType !== 'expense' && recordType !== 'income') {
    return NextResponse.json({ error: 'Tipo de registro inválido.' }, { status: 400 })
  }
  if (typeof recordId !== 'string' || !recordId) {
    return NextResponse.json({ error: 'Registro obrigatório.' }, { status: 400 })
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id,family_id')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 400 })
  }

  const table = TABLE_BY_RECORD_TYPE[recordType as RecordType]
  const { data: record, error: recordError } = await supabaseAdmin
    .from(table)
    .select('id,family_id,notes')
    .eq('id', recordId)
    .eq('family_id', profile.family_id)
    .maybeSingle()

  if (recordError || !record) {
    return NextResponse.json({ error: 'Registro não encontrado.' }, { status: 404 })
  }

  let image
  try {
    image = await validateImageFile(file)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Arquivo inválido.' },
      { status: 400 }
    )
  }

  const filePath = `${profile.family_id}/${recordId}/${crypto.randomUUID()}.${image.extension}`
  const { error: uploadError } = await supabaseAdmin.storage
    .from('attachments')
    .upload(filePath, image.buffer, { contentType: image.mime, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: 'Erro ao enviar arquivo.' }, { status: 500 })
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
    return NextResponse.json({ error: 'Erro ao vincular anexo.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, attachmentPath: filePath })
}
