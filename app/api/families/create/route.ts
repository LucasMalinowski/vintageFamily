import { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { FAMILY_CATEGORY_SEEDS } from '@/lib/families/categorySeeds'
import { sendWelcomeEmail } from '@/lib/mailer'
import { checkRateLimit } from '@/lib/billing/rate-limit'
import { getUserLocale, SUPPORTED_LOCALES, DEFAULT_LOCALE, type AppLocale } from '@/lib/i18n/getLocale'

type CreateFamilyBody = {
  familyName: string
  name: string
  email: string
  locale?: string
}

function isAppLocale(value: string | undefined | null): value is AppLocale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value)
}

/** Best-effort match of the Accept-Language header to one of our supported locales. */
function localeFromAcceptLanguage(header: string | null): AppLocale {
  if (!header) return DEFAULT_LOCALE
  for (const entry of header.split(',')) {
    const tag = entry.split(';')[0].trim().toLowerCase()
    const primary = tag.split('-')[0]
    if (primary === 'pt') return 'pt-BR'
    if (primary === 'es') return 'es'
    if (primary === 'en') return 'en'
  }
  return DEFAULT_LOCALE
}

export async function POST(request: Request) {
  const locale = await getUserLocale()
  const t = await getTranslations({ locale, namespace: 'apiErrors' })

  try {
    const authHeader = request.headers.get('Authorization') || ''
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!accessToken) {
      return NextResponse.json({ error: t('families.accessTokenMissing') }, { status: 401 })
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken)
    if (authError || !authData.user) {
      return NextResponse.json({ error: t('families.invalidSession') }, { status: 401 })
    }

    // Rate limit: max 3 family creation attempts per user per hour
    const allowed = await checkRateLimit(authData.user.id, 'families-create', 3, 3600)
    if (!allowed) {
      return NextResponse.json({ error: t('families.tooManyAttempts') }, { status: 429 })
    }

    const { familyName, name, email, locale: bodyLocale } = (await request.json()) as CreateFamilyBody
    if (!familyName || !name || !email) {
      return NextResponse.json({ error: t('families.missingRequiredFields') }, { status: 400 })
    }
    const cleanFamilyName = familyName.trim().slice(0, 120)
    const cleanName = name.trim().slice(0, 120)
    const cleanEmail = email.trim().toLowerCase()
    if (cleanFamilyName.length < 2 || cleanName.length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: t('families.invalidPayload') }, { status: 400 })
    }
    // The user row doesn't exist yet, so `getUserLocale()` above can't read a DB
    // preference — prefer the client-resolved locale (mobile sends the device
    // locale explicitly), falling back to Accept-Language for web signups.
    const signupLocale: AppLocale = isAppLocale(bodyLocale)
      ? bodyLocale
      : localeFromAcceptLanguage(request.headers.get('accept-language'))

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
      return NextResponse.json({ error: t('families.createFamilyFailed') }, { status: 500 })
    }

    const { error: userError } = await supabaseAdmin.from('users').insert({
      id: authData.user.id,
      family_id: family.id,
      name: cleanName,
      email: cleanEmail,
      password_hash: null,
      role: 'admin',
      locale: signupLocale,
    })

    if (userError) {
      return NextResponse.json({ error: t('families.createUserProfileFailed') }, { status: 500 })
    }

    const parentCategories = FAMILY_CATEGORY_SEEDS.map(({ children, ...category }) => ({
      family_id: family.id,
      ...category,
    }))

    const { data: createdParents, error: categoriesError } = await (supabaseAdmin
      .from('categories') as any)
      .insert(parentCategories)
      .select('id,name,kind')

    if (categoriesError) {
      return NextResponse.json({ error: t('families.createCategoriesFailed') }, { status: 500 })
    }

    const parentByKey = new Map(
      (createdParents || []).map((category: { kind: string; name: string; id: string }) => [`${category.kind}:${category.name}`, category.id])
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
        name_en: child.name_en,
        name_es: child.name_es,
        parent_id: parentId,
        is_system: true,
      }))
    })

    if (childCategories.length > 0) {
      const { error: childCategoriesError } = await (supabaseAdmin.from('categories') as any).insert(childCategories)
      if (childCategoriesError) {
        return NextResponse.json({ error: t('families.createSubcategoriesFailed') }, { status: 500 })
      }
    }

    const defaultSavings = [
      { family_id: family.id, name: 'Casa',   is_system: true, icon: 'House'    },
      { family_id: family.id, name: 'Carro',  is_system: true, icon: 'Car'      },
      { family_id: family.id, name: 'Viagem', is_system: true, icon: 'TreePalm' },
    ]

    const { error: savingsError } = await supabaseAdmin.from('savings').insert(defaultSavings)
    if (savingsError) {
      return NextResponse.json({ error: t('families.createSavingsFailed') }, { status: 500 })
    }

    void sendWelcomeEmail({ to: cleanEmail, name: cleanName, familyName: cleanFamilyName, locale: signupLocale })
    return NextResponse.json({ familyId: family.id })
  } catch {
    return NextResponse.json({ error: t('families.unexpectedCreateError') }, { status: 500 })
  }
}
