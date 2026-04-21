import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { FAMILY_CATEGORY_SEEDS } from '@/lib/families/categorySeeds'

type CreateFamilyBody = {
  familyName: string
  name: string
  email: string
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization') || ''
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!accessToken) {
      return NextResponse.json({ error: 'Token de acesso ausente.' }, { status: 401 })
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken)
    if (authError || !authData.user) {
      return NextResponse.json({ error: 'Sessão inválida.' }, { status: 401 })
    }

    const { familyName, name, email } = (await request.json()) as CreateFamilyBody
    if (!familyName || !name || !email) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes.' }, { status: 400 })
    }

    const trialExpiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    const { data: family, error: familyError } = await supabaseAdmin
      .from('families')
      .insert({
        name: familyName,
        trial_expires_at: trialExpiresAt,
        created_by: authData.user.id,
      })
      .select()
      .single()

    if (familyError || !family) {
      return NextResponse.json({ error: familyError?.message || 'Não foi possível criar a família.' }, { status: 500 })
    }

    const { error: userError } = await supabaseAdmin.from('users').insert({
      id: authData.user.id,
      family_id: family.id,
      name,
      email,
      password_hash: 'managed_by_supabase_auth',
      role: 'admin',
    })

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 })
    }

    const parentCategories = FAMILY_CATEGORY_SEEDS.map(({ children, ...category }) => ({
      family_id: family.id,
      ...category,
    }))

    const { data: createdParents, error: categoriesError } = await supabaseAdmin
      .from('categories')
      .insert(parentCategories)
      .select('id,name,kind')

    if (categoriesError) {
      return NextResponse.json({ error: categoriesError.message }, { status: 500 })
    }

    const parentByKey = new Map(
      (createdParents || []).map((category) => [`${category.kind}:${category.name}`, category.id])
    )

    const childCategories = FAMILY_CATEGORY_SEEDS.flatMap((category) => {
      const parentId = parentByKey.get(`${category.kind}:${category.name}`)
      if (!parentId || !category.children?.length) {
        return []
      }

      return category.children.map((child) => ({
        family_id: family.id,
        kind: category.kind,
        name: child.name,
        parent_id: parentId,
        is_system: true,
      }))
    })

    if (childCategories.length > 0) {
      const { error: childCategoriesError } = await supabaseAdmin.from('categories').insert(childCategories)
      if (childCategoriesError) {
        return NextResponse.json({ error: childCategoriesError.message }, { status: 500 })
      }
    }

    const dreams = [
      { family_id: family.id, name: 'Casa', is_system: true },
      { family_id: family.id, name: 'Carro', is_system: true },
      { family_id: family.id, name: 'Viagem', is_system: true },
    ]

    const { error: dreamsError } = await supabaseAdmin.from('dreams').insert(dreams)
    if (dreamsError) {
      return NextResponse.json({ error: dreamsError.message }, { status: 500 })
    }

    return NextResponse.json({ familyId: family.id })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro inesperado.' }, { status: 500 })
  }
}
