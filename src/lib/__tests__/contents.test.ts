import { describe, expect, it } from 'vitest'
import { defaultData } from '../defaults'
import {
  contentIssues,
  contentKey,
  contentRows,
  contentUsage,
  duplicateItems,
  emptyTrash,
  extractTags,
  moveToCategory,
  moveToTrash,
  restoreFromTrash,
  setFavorite,
  usedLanguages,
} from '../contents'
import type { AppData, MailTemplate } from '../types'

const mail = (id: string, name: string, content: string, extra: Partial<MailTemplate> = {}): MailTemplate => ({
  id,
  name,
  content,
  language: 'fr',
  ...extra,
})

const data = (): AppData => ({
  ...defaultData,
  categories: [{ id: 'c1', name: 'Accueil', color: 'bleu' } as AppData['categories'][number]],
  snippets: [
    { id: 's1', title: 'Merci', content: 'Merci <CLIENT>', insertMode: 'line', categoryId: 'c1' },
    { id: 's2', title: 'Au revoir', content: 'Bonne journée', insertMode: 'line', categoryId: 'c1' },
  ],
  templates: [
    mail('m1', 'Facture', 'Bonjour <CLIENT>, votre <PRODUIT>', {
      translations: [{ language: 'en', content: 'Hello <CLIENT>' }],
      taskTemplateId: 't1',
    }),
    mail('m2', 'facture', 'Bonjour <INCONNU>', { translations: [{ language: 'en', content: 'Hello' }] }),
    mail('m3', 'Retour', 'Bonjour'),
  ],
  taskTemplates: [
    { id: 't1', name: 'Retour SAV', content: 'x', kind: 's-task' },
    { id: 't2', name: 'Libre', content: 'y', kind: 'f-task' },
  ],
  trash: [],
})

const kindOf = (task: { kind?: string }) => (task.kind === 's-task' ? 's-task' : 'f-task') as 's-task' | 'f-task'

describe('contents rows and checks', () => {
  it('lists every type with its languages', () => {
    const rows = contentRows(data(), kindOf)
    expect(rows.map((row) => contentKey(row.type, row.id))).toEqual([
      'template:m1', 'template:m2', 'template:m3', 'snippet:s1', 'snippet:s2', 's-task:t1', 'f-task:t2',
    ])
    expect(rows[0].languages).toEqual(['fr', 'en'])
  })

  it('reads tags once each', () => {
    expect(extractTags('<A> et <B> puis <A>')).toEqual(['<A>', '<B>'])
  })

  it('counts a language as used from two translated templates on', () => {
    expect(usedLanguages(data().templates)).toEqual(['en'])
    expect(usedLanguages(data().templates, 4)).toEqual([])
  })

  it('finds missing translations, unknown tags, tags lost in a translation and duplicate names', () => {
    const d = data()
    const issues = contentIssues(d, contentRows(d, kindOf), { knownTags: ['<CLIENT>', '<PRODUIT>'], languages: ['en', 'fr'] })
    expect(issues.get('template:m1')).toEqual([
      { kind: 'translation-missing-tag', language: 'en', tag: '<PRODUIT>' },
      { kind: 'duplicate-name' },
    ])
    expect(issues.get('template:m2')).toEqual([
      { kind: 'unknown-tag', tag: '<INCONNU>' },
      { kind: 'translation-missing-tag', language: 'en', tag: '<INCONNU>' },
      { kind: 'duplicate-name' },
    ])
    expect(issues.get('template:m3')).toEqual([{ kind: 'missing-translation', language: 'en' }])
    expect(issues.has('snippet:s1')).toBe(false)
  })
})

describe('actions on several items', () => {
  it('moves to a category and sets favorites, never on snippets', () => {
    let d = moveToCategory(data(), 'template', ['m1', 'm3'], 'cat-x')
    expect(d.templates.map((item) => item.categoryId)).toEqual(['cat-x', undefined, 'cat-x'])
    d = setFavorite(d, 'template', ['m2'], true)
    expect(d.templates[1].favorite).toBe(true)
    expect(setFavorite(d, 'snippet', ['s1'], true)).toBe(d)
  })

  it('duplicates right after the original with a new id and no favorite', () => {
    let n = 0
    const d = duplicateItems(setFavorite(data(), 'template', ['m1'], true), 'template', ['m1'], () => `new-${(n += 1)}`)
    expect(d.templates.map((item) => [item.id, item.name, item.favorite])).toEqual([
      ['m1', 'Facture', true], ['new-1', 'Facture (copie)', undefined], ['m2', 'facture', undefined], ['m3', 'Retour', undefined],
    ])
    expect(duplicateItems(data(), 'snippet', ['s2'], () => 'c')).toMatchObject({ snippets: [{ id: 's1' }, { id: 's2' }, { id: 'c', title: 'Au revoir (copie)' }] })
  })

  it('moves to the trash and puts back at the same place', () => {
    const trashed = moveToTrash(data(), 'template', ['m1', 'm3'], '2026-10-30T08:00:00.000Z')
    expect(trashed.templates.map((item) => item.id)).toEqual(['m2'])
    expect(trashed.trash?.map((entry) => [entry.type, entry.item.id, entry.position])).toEqual([['template', 'm1', 0], ['template', 'm3', 2]])
    const restored = restoreFromTrash(trashed, (trashed.trash ?? []).map((entry) => entry.id))
    expect(restored.templates.map((item) => item.id)).toEqual(['m1', 'm2', 'm3'])
    expect(restored.trash).toEqual([])
  })

  it('keeps in the trash an item whose id is used again', () => {
    const trashed = moveToTrash(data(), 'snippet', ['s1'])
    const reused = { ...trashed, snippets: [...trashed.snippets, { ...data().snippets[0] }] }
    const result = restoreFromTrash(reused, [trashed.trash![0].id])
    expect(result.trash).toHaveLength(1)
    expect(result.snippets.filter((item) => item.id === 's1')).toHaveLength(1)
  })

  it('empties the trash', () => {
    expect(emptyTrash(moveToTrash(data(), 'snippet', ['s1'])).trash).toEqual([])
  })

  it('says where an item is used', () => {
    const d = data()
    const rows = contentRows(d, kindOf)
    const name = (_type: string, id?: string) => (id === 'c1' ? 'Accueil' : null)
    expect(contentUsage(d, rows.find((row) => row.id === 't1')!, name)).toEqual(['Sans catégorie', 'Tâche liée au mail « Facture »'])
    expect(contentUsage(d, rows.find((row) => row.id === 'm1')!, name)).toEqual(['Sans catégorie', 'Importe la tâche « Retour SAV »'])
    expect(contentUsage(d, rows.find((row) => row.id === 's1')!, name)).toEqual(['Catégorie « Accueil »'])
  })
})

describe('editing from the Contents screen', () => {
  it('saves the name and text of any type', async () => {
    const { saveContentText, saveTranslations } = await import('../contents')
    const d = saveContentText(saveContentText(data(), 'snippet', 's1', 'Merci beaucoup', 'Merci !'), 's-task', 't1', 'SAV', 'z')
    expect(d.snippets[0]).toMatchObject({ title: 'Merci beaucoup', content: 'Merci !' })
    expect(d.taskTemplates[0]).toMatchObject({ name: 'SAV', content: 'z' })
    const t = saveTranslations(d, 'm1', [{ language: 'en', content: 'Hi <CLIENT>' }, { language: 'es', content: '  ' }])
    expect(t.templates[0].translations).toEqual([{ language: 'en', content: 'Hi <CLIENT>' }])
  })
})
