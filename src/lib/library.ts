/* Filtering of the settings libraries (mails, snippets, tasks). Lists can hold
   hundreds of entries, so they are narrowed by category and by a search that
   matches every word, in any order, ignoring case and accents. */

export const LIBRARY_ALL = 'all'
export const LIBRARY_FAVORITES = 'favorites'

export interface LibraryFilter {
  query: string
  category: string
}

export const emptyLibraryFilter: LibraryFilter = { query: '', category: LIBRARY_ALL }

const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('fr')

export function matchesLibraryQuery(text: string, query: string) {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const haystack = fold(text)
  return words.every((word) => haystack.includes(word))
}

export function filterLibraryItems<T>(
  items: T[],
  filter: LibraryFilter,
  read: { text: (item: T) => string; categoryId: (item: T) => string | undefined; favorite?: (item: T) => boolean },
) {
  return items.filter((item) => {
    if (filter.category === LIBRARY_FAVORITES) {
      if (!read.favorite?.(item)) return false
    } else if (filter.category !== LIBRARY_ALL && read.categoryId(item) !== filter.category) {
      return false
    }
    return matchesLibraryQuery(read.text(item), filter.query)
  })
}

export function countByCategory<T>(items: T[], categoryId: (item: T) => string | undefined) {
  const counts = new Map<string, number>()
  for (const item of items) {
    const id = categoryId(item) ?? ''
    counts.set(id, (counts.get(id) ?? 0) + 1)
  }
  return counts
}

// A filtered list was reordered by drag and drop: its items take, in their new
// order, the places they held in the full list. Everything else stays put.
export function mergeSubsetOrder<T extends { id: string }>(all: T[], reorderedSubset: T[]) {
  const ids = new Set(reorderedSubset.map((item) => item.id))
  let index = 0
  return all.map((item) => (ids.has(item.id) ? reorderedSubset[index++] : item))
}
