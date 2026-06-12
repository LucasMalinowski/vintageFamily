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

export const buildCategoryTree = (categories: CategoryRecord[]): CategoryNode[] => {
  const main = categories
    .filter((category) => !category.parent_id)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  return main.map((category) => ({
    ...category,
    children: categories
      .filter((child) => child.parent_id === category.id)
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
  }))
}

export const buildCategoryLabelMap = (categories: CategoryRecord[]) => {
  const byId = new Map<string, CategoryRecord>(categories.map((category) => [category.id, category]))
  const labels = new Map<string, string>()

  for (const category of categories) {
    if (!category.parent_id) {
      labels.set(category.id, category.name)
      continue
    }

    const parent = byId.get(category.parent_id)
    labels.set(category.id, parent ? `${parent.name} / ${category.name}` : category.name)
  }

  return labels
}

export const findCategoryIdByStoredName = (
  categories: CategoryRecord[],
  storedName: string | null | undefined
): string | null => {
  const normalized = normalizeCategoryName(storedName || '')
  if (!normalized) return null

  const labels = buildCategoryLabelMap(categories)
  for (const category of categories) {
    const label = labels.get(category.id) || category.name
    if (normalizeCategoryName(label) === normalized || normalizeCategoryName(category.name) === normalized) {
      return category.id
    }
  }

  return null
}

export const buildCategoryOptions = (categories: CategoryRecord[]) => {
  const tree = buildCategoryTree(categories)
  const options: Array<{ value: string; label: string; meta?: { parentLabel?: string; depth?: number; icon?: string | null } }> = []

  for (const main of tree) {
    options.push({ value: main.id, label: main.name, meta: { depth: 0, icon: main.icon } })
    for (const child of main.children) {
      options.push({ value: child.id, label: child.name, meta: { parentLabel: main.name, depth: 1, icon: null } })
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
