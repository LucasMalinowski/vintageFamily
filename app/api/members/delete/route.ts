import { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserLocale } from '@/lib/i18n/getLocale'

function getAccessToken(request: Request) {
  const header = request.headers.get('authorization')
  if (!header) return null
  const [, token] = header.split(' ')
  return token || null
}

export async function POST(request: Request) {
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

  const { memberId } = await request.json()
  if (!memberId) {
    return NextResponse.json({ error: t('members.memberRequired') }, { status: 400 })
  }

  if (memberId === authData.user.id) {
    return NextResponse.json({ error: t('members.cannotRemoveSelf') }, { status: 400 })
  }

  const { error: profileDeleteError } = await supabaseAdmin.rpc('remove_family_member_profile', {
    p_actor_id: authData.user.id,
    p_member_id: memberId,
  })

  if (profileDeleteError) {
    if (profileDeleteError.message.includes('not_authorized')) {
      return NextResponse.json({ error: t('members.adminsOnly') }, { status: 403 })
    }
    if (profileDeleteError.message.includes('member_not_found')) {
      return NextResponse.json({ error: t('members.memberNotFound') }, { status: 404 })
    }
    if (profileDeleteError.message.includes('cannot_remove_last_admin')) {
      return NextResponse.json({ error: t('members.cannotRemoveLastAdmin') }, { status: 409 })
    }

    return NextResponse.json({ error: t('members.removeProfileFailed') }, { status: 500 })
  }

  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(memberId)
  if (authDeleteError) {
    return NextResponse.json({ error: t('members.profileRemovedAuthCleanupFailed') }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
