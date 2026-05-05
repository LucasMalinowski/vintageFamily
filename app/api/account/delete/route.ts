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

  if (profile.role === 'admin') {
    const { data: otherMembers, error: membersError } = await supabaseAdmin
      .from('users')
      .select('id,family_id')
      .eq('family_id', profile.family_id)
      .neq('id', userId)

    if (membersError) {
      return NextResponse.json({ error: 'Erro ao verificar membros.' }, { status: 500 })
    }

    if (otherMembers && otherMembers.length > 0) {
      if (!newAdminId) {
        return NextResponse.json({ error: 'Escolha quem assumirá a administração.' }, { status: 400 })
      }

      const newAdmin = otherMembers.find((m) => m.id === newAdminId)
      if (!newAdmin) {
        return NextResponse.json({ error: 'Novo administrador inválido.' }, { status: 400 })
      }

      const { error: promoteError } = await supabaseAdmin
        .from('users')
        .update({ role: 'admin' })
        .eq('id', newAdminId)

      if (promoteError) {
        return NextResponse.json({ error: 'Erro ao promover novo administrador.' }, { status: 500 })
      }
    } else {
      // Last member — cancel Stripe subscription before soft-deleting family
      await cancelFamilyStripeSubscription(profile.family_id)

      const { error: softDeleteError } = await supabaseAdmin
        .from('families')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', profile.family_id)

      if (softDeleteError) {
        return NextResponse.json({ error: 'Erro ao desativar família.' }, { status: 500 })
      }
    }
  }

  if (profile.email) {
    void sendAccountDeletionEmail({ to: profile.email, name: profile.name ?? '' })
  }

  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (authDeleteError) {
    return NextResponse.json({ error: 'Erro ao excluir conta.' }, { status: 500 })
  }

  await supabaseAdmin.from('users').delete().eq('id', userId)

  return NextResponse.json({ ok: true })
}
