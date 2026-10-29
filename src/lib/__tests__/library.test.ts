import { describe, expect, it } from 'vitest'
import {
  countByCategory,
  filterLibraryItems,
  LIBRARY_FAVORITES,
  matchesLibraryQuery,
  mergeSubsetOrder,
} from '../library'

const items = [
  { id: 'a', name: 'Firmware T598', categoryId: 'diag', favorite: true },
  { id: 'b', name: 'Retour SAV T248', categoryId: 'rma' },
  { id: 'c', name: 'Pièce manquante T598', categoryId: 'rma' },
  { id: 'd', name: 'Calibration', categoryId: 'diag' },
]
const read = { text: (item: (typeof items)[number]) => item.name, categoryId: (item: (typeof items)[number]) => item.categoryId, favorite: (item: (typeof items)[number]) => Boolean(item.favorite) }

describe('settings library', () => {
  it('matches every word in any order, without accents', () => {
    expect(matchesLibraryQuery('Pièce manquante T598', 't598 piece')).toBe(true)
    expect(matchesLibraryQuery('Pièce manquante T598', 't248 piece')).toBe(false)
    expect(matchesLibraryQuery('anything', '   ')).toBe(true)
  })

  it('filters by category, favorites and text', () => {
    expect(filterLibraryItems(items, { query: 't598', category: 'rma' }, read).map((item) => item.id)).toEqual(['c'])
    expect(filterLibraryItems(items, { query: '', category: LIBRARY_FAVORITES }, read).map((item) => item.id)).toEqual(['a'])
    expect(filterLibraryItems(items, { query: '', category: 'all' }, read)).toHaveLength(4)
  })

  it('counts entries per category', () => {
    expect(Object.fromEntries(countByCategory(items, (item) => item.categoryId))).toEqual({ diag: 2, rma: 2 })
  })

  it('reorders a filtered list without moving the hidden entries', () => {
    const subset = [items[2], items[1]]
    expect(mergeSubsetOrder(items, subset).map((item) => item.id)).toEqual(['a', 'c', 'b', 'd'])
  })
})
