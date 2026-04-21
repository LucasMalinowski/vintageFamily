export type CategoryKind = 'income' | 'expense'

export interface CategoryRecord {
  id: string
  name: string
  kind: CategoryKind
  parent_id: string | null
  is_system: boolean
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
  const options: Array<{ value: string; label: string; meta?: { parentLabel?: string; depth?: number } }> = []

  for (const main of tree) {
    options.push({ value: main.id, label: main.name, meta: { depth: 0 } })
    for (const child of main.children) {
      options.push({ value: child.id, label: child.name, meta: { parentLabel: main.name, depth: 1 } })
    }
  }

  return options
}
