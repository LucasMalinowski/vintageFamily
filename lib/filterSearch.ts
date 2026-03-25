export const matchesSearch = (search: string, name: string, category: string) => {
  const term = search.trim().toLowerCase()
  if (!term) return true
  const haystack = `${name} ${category}`.toLowerCase()

  if (term.includes('&&')) {
    return term
      .split('&&')
      .map((part) => part.trim())
      .every((part) => part && haystack.includes(part))
  }

  if (term.includes('||')) {
    return term
      .split('||')
      .map((part) => part.trim())
      .some((part) => part && haystack.includes(part))
  }

  return haystack.includes(term)
}
