import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { supabaseService } from '@/lib/billing/supabase-service'
import { stripe } from '@/lib/billing/stripe'
import { sendAccountDeletionEmail } from '@/lib/mailer'
import { getAccessTokenFromAuthHeader, requireUserByAccessToken } from '@/lib/billing/auth'

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

    await Promise.all(
      subscriptions.data
        .filter((sub) => sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due')
        .map((sub) => stripe.subscriptions.cancel(sub.id))
    )
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

  const userId = auth.user.id
  const { newAdminId } = await request.json().catch(() => ({}))

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('users')
    .select('id,family_id,role,name,email')
    .eq('id', userId)
    .maybeSingle()

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 400 })
  }

  const { data: deletionRows, error: deletionError } = await supabaseAdmin.rpc(
    'delete_user_profile_for_account_deletion',
    {
      p_user_id: userId,
      p_new_admin_id: typeof newAdminId === 'string' ? newAdminId : null,
    }
  )

  if (deletionError) {
    if (deletionError.message.includes('new_admin_required')) {
      return NextResponse.json({ error: 'Escolha quem assumirá a administração.' }, { status: 400 })
    }
    if (deletionError.message.includes('invalid_new_admin')) {
      return NextResponse.json({ error: 'Novo administrador inválido.' }, { status: 400 })
    }
    if (deletionError.message.includes('profile_not_found')) {
      return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 400 })
    }

    return NextResponse.json({ error: 'Erro ao preparar exclusão da conta.' }, { status: 500 })
  }

  const deletionResult = deletionRows?.[0]
  if (deletionResult?.deleted_family) {
    await cancelFamilyStripeSubscription(deletionResult.family_id)
  }

  if (profile.email) {
    void sendAccountDeletionEmail({ to: profile.email, name: profile.name ?? '' })
  }

  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (authDeleteError) {
    return NextResponse.json({ error: 'Erro ao excluir conta.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
