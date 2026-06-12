const normalizeForSearch = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

export const matchesSearch = (search: string, ...fields: string[]) => {
  const term = normalizeForSearch(search.trim())
  if (!term) return true
  const haystack = normalizeForSearch(fields.join(' '))

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
