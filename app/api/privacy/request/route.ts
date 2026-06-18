import { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendAccountDeletionEmail } from '@/lib/mailer'
import { getUserLocale } from '@/lib/i18n/getLocale'

function getAccessToken(request: Request) {
  const header = request.headers.get('authorization')
  if (!header) return null
  const [, token] = header.split(' ')
  return token || null
}

export async function GET(request: Request) {
  const locale = await getUserLocale()
  const t = await getTranslations({ locale, namespace: 'apiErrors' })

  const accessToken = getAccessToken(request)
  if (!accessToken) {
    return NextResponse.json({ error: t('common.unauthorized') }, { status: 401 })
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken)
  if (authError || !authData.user) {
    return NextResponse.json({ error: t('common.unauthorized') }, { status: 401 })
  }

  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('id,family_id,name,email,role,created_at')
    .eq('id', authData.user.id)
    .maybeSingle()

  return NextResponse.json({
    account: {
      id: authData.user.id,
      email: authData.user.email,
      createdAt: authData.user.created_at,
    },
    profile,
    note: t('privacy.dataExportNote'),
  })
}

export async function DELETE(request: Request) {
  const locale = await getUserLocale()
  const t = await getTranslations({ locale, namespace: 'apiErrors' })

  const accessToken = getAccessToken(request)
  if (!accessToken) {
    return NextResponse.json({ error: t('common.unauthorized') }, { status: 401 })
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken)
  if (authError || !authData.user) {
    return NextResponse.json({ error: t('common.unauthorized') }, { status: 401 })
  }

  const userId = authData.user.id

	  const { data: profile } = await supabaseAdmin
	    .from('users')
	    .select('id,family_id,role,name,email')
	    .eq('id', userId)
	    .maybeSingle()
	  const userEmail = authData.user.email ?? profile?.email
	  const userName = profile?.name ?? ''

	  const { error: deletionError } = await supabaseAdmin.rpc('delete_user_profile_for_account_deletion', {
    p_user_id: userId,
    p_new_admin_id: undefined,
  })

  if (deletionError) {
    if (deletionError.message.includes('new_admin_required')) {
      return NextResponse.json(
        { error: t('privacy.adminMustTransferBeforeDeletion') },
        { status: 409 }
      )
    }

    return NextResponse.json({ error: t('privacy.deletionPrepFailed') }, { status: 500 })
  }

	  if (userEmail) {
	    void sendAccountDeletionEmail({ to: userEmail, name: userName, locale })
	  }

  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (authDeleteError) {
    return NextResponse.json({ error: t('privacy.profileRemovedAuthCleanupFailed') }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: t('privacy.allDataDeleted') })
}
