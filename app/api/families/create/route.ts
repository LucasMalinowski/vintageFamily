import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { FAMILY_CATEGORY_SEEDS } from '@/lib/families/categorySeeds'
import { sendWelcomeEmail } from '@/lib/mailer'

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
    const cleanFamilyName = familyName.trim().slice(0, 120)
    const cleanName = name.trim().slice(0, 120)
    const cleanEmail = email.trim().toLowerCase()
    if (cleanFamilyName.length < 2 || cleanName.length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
    }

    const trialExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: family, error: familyError } = await supabaseAdmin
      .from('families')
      .insert({
        name: cleanFamilyName,
        trial_expires_at: trialExpiresAt,
        created_by: authData.user.id,
      })
      .select()
      .single()

    if (familyError || !family) {
      return NextResponse.json({ error: 'Não foi possível criar a família.' }, { status: 500 })
    }

    const { error: userError } = await supabaseAdmin.from('users').insert({
      id: authData.user.id,
      family_id: family.id,
      name: cleanName,
      email: cleanEmail,
      password_hash: null,
      role: 'admin',
    })

    if (userError) {
      return NextResponse.json({ error: 'Não foi possível criar o perfil do usuário.' }, { status: 500 })
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
      return NextResponse.json({ error: 'Não foi possível criar as categorias padrão.' }, { status: 500 })
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
        return NextResponse.json({ error: 'Não foi possível criar as subcategorias padrão.' }, { status: 500 })
      }
    }

    const defaultSavings = [
      { family_id: family.id, name: 'Casa',   is_system: true, icon: 'House'    },
      { family_id: family.id, name: 'Carro',  is_system: true, icon: 'Car'      },
      { family_id: family.id, name: 'Viagem', is_system: true, icon: 'TreePalm' },
    ]

    const { error: savingsError } = await supabaseAdmin.from('savings').insert(defaultSavings)
    if (savingsError) {
      return NextResponse.json({ error: 'Não foi possível criar os sonhos padrão.' }, { status: 500 })
    }

    void sendWelcomeEmail({ to: cleanEmail, name: cleanName, familyName: cleanFamilyName })
    return NextResponse.json({ familyId: family.id })
  } catch {
    return NextResponse.json({ error: 'Erro inesperado ao criar família.' }, { status: 500 })
  }
}
