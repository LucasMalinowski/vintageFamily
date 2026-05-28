import { NextResponse } from 'next/server'
import { getAccessTokenFromAuthHeader, getProfileByUserId, requireUserByAccessToken } from '@/lib/billing/auth'
import { supabaseService } from '@/lib/billing/supabase-service'

async function requireSuperAdmin(request: Request) {
  const accessToken = getAccessTokenFromAuthHeader(request)
  const auth = await requireUserByAccessToken(accessToken)

  if (!auth.user) {
    return { ok: false as const, response: NextResponse.json({ error: auth.error }, { status: auth.status }) }
  }

  const profile = await getProfileByUserId(auth.user.id)
  if (!profile?.super_admin) {
    return { ok: false as const, response: NextResponse.json({ error: 'Acesso negado.' }, { status: 403 }) }
  }

  return { ok: true as const, profile }
}

async function cancelFamilyStripeSubscriptions(familyId: string) {
  try {
    const { data: customerRow } = await supabaseService
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('family_id', familyId)
      .maybeSingle()

    if (!customerRow?.stripe_customer_id) return

    const { stripe } = await import('@/lib/billing/stripe')
    const subscriptions = await stripe.subscriptions.list({
      customer: customerRow.stripe_customer_id,
      status: 'all',
      limit: 10,
    })

    await Promise.all(
      subscriptions.data
        .filter((sub) => ['active', 'trialing', 'past_due'].includes(sub.status))
        .map((sub) => stripe.subscriptions.cancel(sub.id))
    )
  } catch (err) {
    console.error('[admin-family-delete] stripe subscription cancel failed', err)
  }
}

async function deleteFamilyAttachments(familyId: string, userIds: string[]) {
  const [{ data: expenses }, { data: incomes }] = await Promise.all([
    supabaseService.from('expenses').select('attachment_path').eq('family_id', familyId),
    supabaseService.from('incomes').select('attachment_path').eq('family_id', familyId),
  ])

  const attachmentPaths = [...(expenses ?? []), ...(incomes ?? [])]
    .map((row) => row.attachment_path)
    .filter((path): path is string => Boolean(path))

  if (attachmentPaths.length > 0) {
    const { error } = await supabaseService.storage.from('attachments').remove(attachmentPaths)
    if (error) console.error('[admin-family-delete] attachment cleanup failed', error)
  }

  const avatarPaths = (
    await Promise.all(
      userIds.map(async (userId) => {
        const { data, error } = await supabaseService.storage.from('avatars').list(userId, { limit: 1000 })
        if (error || !data?.length) return []
        return data.map((file) => `${userId}/${file.name}`)
      })
    )
  ).flat()

  if (avatarPaths.length > 0) {
    const { error } = await supabaseService.storage.from('avatars').remove(avatarPaths)
    if (error) console.error('[admin-family-delete] avatar cleanup failed', error)
  }
}

async function deleteByFamilyId(table: string, familyId: string) {
  const { error } = await supabaseService.from(table).delete().eq('family_id', familyId)
  if (error) throw new Error(`${table}: ${error.message}`)
}

async function deleteByUserIds(table: string, userIds: string[]) {
  if (userIds.length === 0) return
  const { error } = await supabaseService.from(table).delete().in('user_id', userIds)
  if (error) throw new Error(`${table}: ${error.message}`)
}

export async function GET(request: Request) {
  const admin = await requireSuperAdmin(request)
  if (!admin.ok) return admin.response

  const [{ data: families, error: familiesError }, { data: users, error: usersError }, { data: subs, error: subsError }] = await Promise.all([
    supabaseService
      .from('families')
      .select('id,name,trial_expires_at,lifetime_access,founders_enabled')
      .order('created_at', { ascending: true }),
    supabaseService
      .from('users')
      .select('id,family_id,name,email')
      .order('created_at', { ascending: true }),
    supabaseService
      .from('subscriptions')
      .select('family_id,status')
      .order('updated_at', { ascending: false }),
  ])

  if (familiesError || usersError || subsError) {
    return NextResponse.json({ error: familiesError?.message || usersError?.message || subsError?.message || 'Não foi possível carregar as famílias.' }, { status: 500 })
  }

  // Take most-recent subscription per family (already ordered by updated_at desc)
  const subsByFamily = new Map<string, string | null>()
  for (const sub of subs ?? []) {
    if (!subsByFamily.has(sub.family_id)) subsByFamily.set(sub.family_id, sub.status)
  }

  const rows = (families ?? []).map((family) => {
    const familyUsers = (users ?? []).filter((user) => user.family_id === family.id)

    return {
      ...family,
      subscription_status: subsByFamily.get(family.id) ?? null,
      members: familyUsers.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
      })),
    }
  })

  return NextResponse.json({ families: rows })
}

export async function PATCH(request: Request) {
  const admin = await requireSuperAdmin(request)
  if (!admin.ok) return admin.response

  const body = (await request.json().catch(() => null)) as {
    family_id?: string
    lifetime_access?: boolean
    founders_enabled?: boolean
    trial_expires_at?: string | null
  } | null

  if (!body?.family_id) {
    return NextResponse.json({ error: 'Família inválida.' }, { status: 400 })
  }

  const hasLifetimeChange = typeof body.lifetime_access === 'boolean'
  const hasFoundersChange = typeof body.founders_enabled === 'boolean'
  const hasTrialChange = body !== null && 'trial_expires_at' in body

  if (!hasLifetimeChange && !hasFoundersChange && !hasTrialChange) {
    return NextResponse.json({ error: 'Nenhuma alteração foi informada.' }, { status: 400 })
  }

  if (hasTrialChange && body.trial_expires_at !== null && isNaN(Date.parse(body.trial_expires_at as string))) {
    return NextResponse.json({ error: 'Data inválida.' }, { status: 400 })
  }

  const { data: familyUsers, error: usersError } = await supabaseService
    .from('users')
    .select('id,name,email')
    .eq('family_id', body.family_id)

  if (usersError) {
    return NextResponse.json({ error: usersError.message }, { status: 500 })
  }

  const updatePayload: {
    lifetime_access?: boolean
    founders_enabled?: boolean
    trial_expires_at?: string | null
  } = {}

  if (hasLifetimeChange) updatePayload.lifetime_access = body.lifetime_access
  if (hasFoundersChange) updatePayload.founders_enabled = body.founders_enabled
  if (hasTrialChange) updatePayload.trial_expires_at = body.trial_expires_at as string | null

  const { error: updateError } = await supabaseService
    .from('families')
    .update(updatePayload)
    .eq('id', body.family_id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  const { data: family, error: familyError } = await supabaseService
    .from('families')
    .select('id,name,trial_expires_at,lifetime_access,founders_enabled')
    .eq('id', body.family_id)
    .maybeSingle()

  if (familyError || !family) {
    return NextResponse.json({ error: familyError?.message || 'Não foi possível recarregar o acesso da família.' }, { status: 500 })
  }

  return NextResponse.json({
    family: {
      ...family,
      members: (familyUsers ?? []).map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
      })),
    },
  })
}

export async function DELETE(request: Request) {
  const admin = await requireSuperAdmin(request)
  if (!admin.ok) return admin.response

  const body = (await request.json().catch(() => null)) as { family_id?: string } | null

  if (!body?.family_id) {
    return NextResponse.json({ error: 'Família inválida.' }, { status: 400 })
  }

  if (admin.profile.family_id === body.family_id) {
    return NextResponse.json({ error: 'Não é possível excluir a própria família por este painel.' }, { status: 400 })
  }

  const [{ data: family, error: familyError }, { data: familyUsers, error: usersError }] = await Promise.all([
    supabaseService
      .from('families')
      .select('id')
      .eq('id', body.family_id)
      .maybeSingle(),
    supabaseService
      .from('users')
      .select('id')
      .eq('family_id', body.family_id),
  ])

  if (familyError || usersError) {
    return NextResponse.json({ error: familyError?.message || usersError?.message || 'Não foi possível carregar a família.' }, { status: 500 })
  }

  if (!family) {
    return NextResponse.json({ error: 'Família não encontrada.' }, { status: 404 })
  }

  const userIds = (familyUsers ?? []).map((user) => user.id)

  await cancelFamilyStripeSubscriptions(body.family_id)
  await deleteFamilyAttachments(body.family_id, userIds)

  try {
    await Promise.all([
      deleteByFamilyId('pending_whatsapp_actions', body.family_id),
      deleteByFamilyId('whatsapp_context', body.family_id),
      deleteByFamilyId('feedback', body.family_id),
      deleteByFamilyId('insights', body.family_id),
      deleteByFamilyId('recurring_patterns', body.family_id),
      deleteByFamilyId('family_job_locks', body.family_id),
      deleteByFamilyId('usage_counters', body.family_id),
      deleteByFamilyId('bank_statement_import_batches', body.family_id),
      deleteByFamilyId('subscriptions', body.family_id),
      deleteByFamilyId('stripe_customers', body.family_id),
      deleteByUserIds('web_handoff_tokens', userIds),
      deleteByUserIds('push_tokens', userIds),
      deleteByUserIds('rate_limit_counters', userIds),
    ])

    await Promise.all([
      deleteByFamilyId('expenses', body.family_id),
      deleteByFamilyId('incomes', body.family_id),
      deleteByFamilyId('reminders', body.family_id),
      deleteByFamilyId('invites', body.family_id),
      deleteByFamilyId('whatsapp_message_log', body.family_id),
    ])

    const { error: savingsContributionsError } = await supabaseService
      .from('savings_contributions')
      .delete()
      .eq('family_id', body.family_id)
    if (savingsContributionsError) throw new Error(`savings_contributions: ${savingsContributionsError.message}`)

    const { error: childSavingsError } = await supabaseService
      .from('savings')
      .delete()
      .eq('family_id', body.family_id)
      .not('parent_id', 'is', null)
    if (childSavingsError) throw new Error(`savings: ${childSavingsError.message}`)

    const { error: parentSavingsError } = await supabaseService
      .from('savings')
      .delete()
      .eq('family_id', body.family_id)
    if (parentSavingsError) throw new Error(`savings: ${parentSavingsError.message}`)

    const { error: childCategoriesError } = await supabaseService
      .from('categories')
      .delete()
      .eq('family_id', body.family_id)
      .not('parent_id', 'is', null)
    if (childCategoriesError) throw new Error(`categories: ${childCategoriesError.message}`)

    const { error: parentCategoriesError } = await supabaseService
      .from('categories')
      .delete()
      .eq('family_id', body.family_id)
    if (parentCategoriesError) throw new Error(`categories: ${parentCategoriesError.message}`)

    const { error: usersDeleteError } = await supabaseService
      .from('users')
      .delete()
      .eq('family_id', body.family_id)
    if (usersDeleteError) throw new Error(`users: ${usersDeleteError.message}`)

    const { error: familyDeleteError } = await supabaseService
      .from('families')
      .delete()
      .eq('id', body.family_id)
    if (familyDeleteError) throw new Error(`families: ${familyDeleteError.message}`)
  } catch (error) {
    console.error('[admin-family-delete] database cleanup failed', error)
    return NextResponse.json({ error: 'Erro ao excluir os dados da família.' }, { status: 500 })
  }

  const authDeleteErrors = (
    await Promise.all(
      userIds.map(async (userId) => {
        const { error } = await supabaseService.auth.admin.deleteUser(userId)
        return error
      })
    )
  ).filter(Boolean)

  if (authDeleteErrors.length > 0) {
    console.error('[admin-family-delete] auth cleanup failed', authDeleteErrors)
    return NextResponse.json({ error: 'Família removida, mas houve erro ao remover alguns usuários de autenticação.' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
