import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

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

    const categories = [
      // Expenses
      { family_id: family.id, kind: 'expense', name: 'Aluguel', is_system: true },
      { family_id: family.id, kind: 'expense', name: 'Energia', is_system: true },
      { family_id: family.id, kind: 'expense', name: 'Água', is_system: true },
      { family_id: family.id, kind: 'expense', name: 'Mercado', is_system: true },
      { family_id: family.id, kind: 'expense', name: 'Lazer', is_system: true },
      { family_id: family.id, kind: 'expense', name: 'Investimentos para casa', is_system: true },
      { family_id: family.id, kind: 'expense', name: 'Saúde', is_system: true },
      { family_id: family.id, kind: 'expense', name: 'Educação', is_system: true },
      { family_id: family.id, kind: 'expense', name: 'Hobbie', is_system: true },
      { family_id: family.id, kind: 'expense', name: 'Outros', is_system: true },
      // Incomes
      { family_id: family.id, kind: 'income', name: 'Renda Familiar', is_system: true },
      { family_id: family.id, kind: 'income', name: 'Outras Receitas', is_system: true },
    ]

    const { error: categoriesError } = await supabaseAdmin.from('categories').insert(categories)
    if (categoriesError) {
      return NextResponse.json({ error: categoriesError.message }, { status: 500 })
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
