import type { AppLocale } from '@/lib/i18n/getLocale'

export type CategoryKind = 'income' | 'expense'

const CATEGORY_COLOR_PALETTE = [
  '#6FBF8A', '#2F6F7E', '#C2A45D', '#B05C3A', '#3E5F4B',
  '#3689B5', '#7A66A1', '#4D7AB2', '#5E8E62', '#8A6B8F',
]

export const getCategoryColor = (name: string, index?: number): string => {
  if (index !== undefined) return CATEGORY_COLOR_PALETTE[index % CATEGORY_COLOR_PALETTE.length]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i)
    hash |= 0
  }
  return CATEGORY_COLOR_PALETTE[Math.abs(hash) % CATEGORY_COLOR_PALETTE.length]
}

export const GOAL_COLOR_PALETTE = ['#C2A45D', '#6FBF8A', '#2F6F7E', '#B05C3A', '#3E5F4B']
export const getGoalColor = (index: number): string => GOAL_COLOR_PALETTE[index % GOAL_COLOR_PALETTE.length]

export interface CategoryRecord {
  id: string
  name: string
  name_en?: string | null
  name_es?: string | null
  kind: CategoryKind
  parent_id: string | null
  is_system: boolean
  icon: string | null
  monthly_limit_cents: number | null
}

export interface CategoryNode extends CategoryRecord {
  children: CategoryRecord[]
}

export const CATEGORY_ROOT_VALUE = '__root__'

export const normalizeCategoryName = (value: string) => value.trim().replace(/\s+/g, ' ')

// User-created categories have no name_en/name_es (NULL) and fall back to `name` (pt-BR).
export const resolveCategoryName = (
  category: Pick<CategoryRecord, 'name' | 'name_en' | 'name_es'>,
  locale: AppLocale = 'pt-BR'
): string => {
  if (locale === 'en' && category.name_en) return category.name_en
  if (locale === 'es' && category.name_es) return category.name_es
  return category.name
}

const INTL_COLLATOR_LOCALE: Record<AppLocale, string> = { 'pt-BR': 'pt-BR', en: 'en-US', es: 'es-ES' }

export const buildCategoryTree = (categories: CategoryRecord[], locale: AppLocale = 'pt-BR'): CategoryNode[] => {
  const collatorLocale = INTL_COLLATOR_LOCALE[locale]
  const byName = (a: CategoryRecord, b: CategoryRecord) =>
    resolveCategoryName(a, locale).localeCompare(resolveCategoryName(b, locale), collatorLocale)

  const main = categories
    .filter((category) => !category.parent_id)
    .sort(byName)

  return main.map((category) => ({
    ...category,
    children: categories
      .filter((child) => child.parent_id === category.id)
      .sort(byName),
  }))
}

export const buildCategoryLabelMap = (categories: CategoryRecord[], locale: AppLocale = 'pt-BR') => {
  const byId = new Map<string, CategoryRecord>(categories.map((category) => [category.id, category]))
  const labels = new Map<string, string>()

  for (const category of categories) {
    if (!category.parent_id) {
      labels.set(category.id, resolveCategoryName(category, locale))
      continue
    }

    const parent = byId.get(category.parent_id)
    const childName = resolveCategoryName(category, locale)
    labels.set(category.id, parent ? `${resolveCategoryName(parent, locale)} / ${childName}` : childName)
  }

  return labels
}

export const findCategoryIdByStoredName = (
  categories: CategoryRecord[],
  storedName: string | null | undefined
): string | null => {
  const normalized = normalizeCategoryName(storedName || '')
  if (!normalized) return null

  // storedName is frozen historical text (always written in pt-BR at record-creation time),
  // so match against the canonical pt-BR label/name, not a locale-resolved one.
  const labels = buildCategoryLabelMap(categories, 'pt-BR')
  for (const category of categories) {
    const label = labels.get(category.id) || category.name
    if (normalizeCategoryName(label) === normalized || normalizeCategoryName(category.name) === normalized) {
      return category.id
    }
  }

  return null
}

export const buildCategoryOptions = (categories: CategoryRecord[], locale: AppLocale = 'pt-BR') => {
  const tree = buildCategoryTree(categories, locale)
  const options: Array<{ value: string; label: string; meta?: { parentLabel?: string; depth?: number; icon?: string | null } }> = []

  for (const main of tree) {
    const mainLabel = resolveCategoryName(main, locale)
    options.push({ value: main.id, label: mainLabel, meta: { depth: 0, icon: main.icon } })
    for (const child of main.children) {
      options.push({ value: child.id, label: resolveCategoryName(child, locale), meta: { parentLabel: mainLabel, depth: 1, icon: null } })
    }
  }

  return options
}

export const getCategoryIdsWithDescendants = (categories: CategoryRecord[], categoryId: string): string[] => {
  const ids = [categoryId]
  for (const category of categories) {
    if (category.parent_id === categoryId) {
      ids.push(category.id)
    }
  }
  return ids
}

export const buildCategoryIconMap = (categories: CategoryRecord[]): Map<string, string | null> => {
  const byId = new Map<string, CategoryRecord>(categories.map((c) => [c.id, c]))
  const icons = new Map<string, string | null>()

  for (const category of categories) {
    if (!category.parent_id) {
      icons.set(category.id, category.icon)
    } else {
      const parent = byId.get(category.parent_id)
      icons.set(category.id, parent?.icon ?? null)
    }
  }

  return icons
}
