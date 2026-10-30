import { describe, expect, it } from 'vitest'
import type { MailTemplate, TaskTemplate } from '../types'
import {
  buildSearchEntries,
  matchesProduct,
  productSearchTerms,
  searchLibrary,
  type SearchSources,
} from '../unifiedSearch'

const mail = (id: string, name: string, content = 'Bonjour <CLIENT>,'): MailTemplate => ({
  id,
  name,
  content,
  language: 'fr',
})
const task = (id: string, name: string, kind: 's-task' | 'f-task', extra: Partial<TaskTemplate> = {}): TaskTemplate => ({
  id,
  name,
  content: 'Contenu',
  kind,
  ...extra,
})

const sources = (overrides: Partial<SearchSources> = {}): SearchSources => ({
  snippets: [
    { id: 'sn-1', title: 'Redémarrage', content: 'Redémarrez le volant.', insertMode: 'line', categoryId: 'c1' },
    { id: 'sn-2', title: 'Câble', content: 'Changez le câble USB du T598.', insertMode: 'line', categoryId: 'c1' },
  ],
  templates: [
    mail('m-1', 'Firmware · T248'),
    mail('m-2', 'Firmware · T598'),
    mail('m-3', 'Garantie', 'Votre garantie couvre le firmware.'),
  ],
  troubleshootgunFolders: [
    { id: 'f-1', name: 'T598', templates: [mail('tg-1', 'Pas de retour de force')] },
    { id: 'f-2', name: 'Hotas 4', templates: [mail('tg-2', 'Firmware bloqué')] },
  ],
  taskTemplates: [
    task('t-1', 'Firmware T598', 's-task'),
    task('t-2', 'Firmware libre', 'f-task'),
    task('t-3', 'Firmware caché', 's-task', { hiddenFromLists: true }),
  ],
  procedures: [
    { id: 'p-1', procedureName: 'Retour firmware', codes: [{ id: 'l1', title: 'Étape 1', code: 'ABC' }] },
  ],
  taskKind: (item) => item.kind ?? 's-task',
  ...overrides,
})

describe('unified search', () => {
  const entries = buildSearchEntries(sources())

  it('returns nothing for an empty query without product', () => {
    expect(searchLibrary(entries, '   ')).toEqual([])
  })

  it('groups results by type in a fixed order and skips hidden tasks', () => {
    const groups = searchLibrary(entries, 'firmware')
    expect(groups.map((group) => group.kind)).toEqual(['template', 'troubleshootgun', 's-task', 'f-task', 'procedure'])
    expect(groups.find((group) => group.kind === 's-task')?.items.map((item) => item.id)).toEqual(['t-1'])
  })

  it('matches every word in any order, ignoring case and accents', () => {
    const groups = searchLibrary(entries, 'VOLANT redemarrez')
    expect(groups).toHaveLength(1)
    expect(groups[0].items[0].id).toBe('sn-1')
  })

  it('searches the content, the folder name and the procedure steps', () => {
    expect(searchLibrary(entries, 'couvre')[0].items[0].id).toBe('m-3')
    expect(searchLibrary(entries, 'hotas')[0].items[0].id).toBe('tg-2')
    expect(searchLibrary(entries, 'abc')[0].items[0].id).toBe('p-1')
  })

  it('keeps regular mail results ordered by name relevance without product suggestions', () => {
    const groups = searchLibrary(entries, 'firmware', { productTerms: productSearchTerms(['T598']) })
    const mails = groups.find((group) => group.kind === 'template')!
    expect(mails.items.map((item) => item.id)).toEqual(['m-1', 'm-2', 'm-3'])
    expect(mails.items.every((item) => !item.productMatch)).toBe(true)
    expect(mails.items[2].productMatch).toBe(false)
  })

  it('suggests only Troubleshotgun templates for the case product', () => {
    const groups = searchLibrary(entries, '', { productTerms: productSearchTerms(['T598']), productOnlyWhenEmpty: true })
    expect(groups.flatMap((group) => group.items.map((item) => item.id))).toEqual(['tg-1'])
  })

  it('does not boost snippets for the case product', () => {
    const results = searchLibrary(entries, 'volant', { productTerms: productSearchTerms(['volant']) })
    const snippets = results.find((group) => group.kind === 'snippet')!
    expect(snippets.items.length).toBeGreaterThan(0)
    expect(snippets.items.every((item) => !item.productMatch)).toBe(true)
  })

  it('keeps a limited number of items per group but counts them all', () => {
    const many = buildSearchEntries(
      sources({ templates: Array.from({ length: 12 }, (_, index) => mail(`m-${index}`, `Firmware ${index}`)) }),
    )
    const group = searchLibrary(many, 'firmware', { limit: 5 }).find((item) => item.kind === 'template')!
    expect(group.items).toHaveLength(5)
    expect(group.total).toBe(12)
  })
})

describe('product terms', () => {
  it('keeps the whole name and the model codes', () => {
    expect(productSearchTerms(['Thrustmaster T.16000M FCS', null])).toEqual(['thrustmaster t.16000m fcs', 't.16000m'])
    expect(productSearchTerms(['Hotas 4'])).toEqual(['hotas 4'])
  })

  it('matches whole words only', () => {
    const [entry] = buildSearchEntries(sources({ templates: [mail('m', 'Firmware T5980')], snippets: [], troubleshootgunFolders: [], taskTemplates: [], procedures: [] }))
    expect(matchesProduct(entry, productSearchTerms(['T598']))).toBe(false)
    expect(matchesProduct({ ...entry, title: 'Firmware (T598)' }, productSearchTerms(['T598']))).toBe(true)
  })
})
