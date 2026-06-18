import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { supabaseService } from '@/lib/billing/supabase-service'
import { stripe } from '@/lib/billing/stripe'
import { sendAccountDeletionEmail } from '@/lib/mailer'
import { getAccessTokenFromAuthHeader, requireUserByAccessToken } from '@/lib/billing/auth'
import { getUserLocale } from '@/lib/i18n/getLocale'
import { getTranslations } from 'next-intl/server'

async function cancelFamilyStripeSubscription(familyId: string) {
  try {
    const { data: customerRow } = await supabaseService
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('family_id', familyId)
      .maybeSingle()

    if (!customerRow?.stripe_customer_id) return

    const subscriptions = await stripe.subscriptions.list({
      customer: customerRow.stripe_customer_id,
      status: 'all',
      limit: 10,
    })

	    const cancelRequests = []
	    for (const sub of subscriptions.data) {
	      if (sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due') {
	        cancelRequests.push(stripe.subscriptions.cancel(sub.id))
	      }
	    }
	    await Promise.all(cancelRequests)
  } catch (err) {
    console.error('[account-delete] stripe subscription cancel failed', err)
  }
}

export async function POST(request: Request) {
  const accessToken = getAccessTokenFromAuthHeader(request)
  const auth = await requireUserByAccessToken(accessToken)
  if (!auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const locale = await getUserLocale()
  const t = await getTranslations({ locale, namespace: 'apiErrors' })

	  const userId = auth.user.id
	  const [body, profileResult] = await Promise.all([
	    request.json().catch(() => ({})),
	    supabaseAdmin
	      .from('users')
	      .select('id,family_id,role,name,email')
	      .eq('id', userId)
	      .maybeSingle(),
	  ])
	  const { newAdminId } = body as { newAdminId?: unknown }
	  const { data: profile, error: profileError } = profileResult

  if (profileError || !profile) {
    return NextResponse.json({ error: t('account.profileNotFound') }, { status: 400 })
  }

  const { data: deletionRows, error: deletionError } = await supabaseAdmin.rpc(
    'delete_user_profile_for_account_deletion',
    {
      p_user_id: userId,
      p_new_admin_id: typeof newAdminId === 'string' ? newAdminId : undefined,
    }
  )

  if (deletionError) {
    if (deletionError.message.includes('new_admin_required')) {
      return NextResponse.json({ error: t('account.noAdminChosen') }, { status: 400 })
    }
    if (deletionError.message.includes('invalid_new_admin')) {
      return NextResponse.json({ error: t('account.invalidNewAdmin') }, { status: 400 })
    }
    if (deletionError.message.includes('profile_not_found')) {
      return NextResponse.json({ error: t('account.profileNotFound') }, { status: 400 })
    }

    return NextResponse.json({ error: t('account.deletionPrepFailed') }, { status: 500 })
  }

  const deletionResult = deletionRows?.[0]
  if (deletionResult?.deleted_family) {
    await cancelFamilyStripeSubscription(deletionResult.family_id)
  }

  if (profile.email) {
    void sendAccountDeletionEmail({ to: profile.email, name: profile.name ?? '', locale })
  }

  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (authDeleteError) {
    return NextResponse.json({ error: t('account.deletionFailed') }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
