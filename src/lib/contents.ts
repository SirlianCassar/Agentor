/* Contents screen: the mail templates, snippets, S-Task and F-Task templates in
   one list, the checks that find what needs a look, and the actions applied
   to several items at once. Deleted items go to a trash kept in the data file
   until it is emptied. Pure functions over AppData. */
import type { AppData, MailTemplate, Snippet, TaskTemplate, TaskTemplateKind } from './types'

export type ContentType = 'template' | 'snippet' | 's-task' | 'f-task'

export const contentTypeLabels: Record<ContentType, string> = {
  template: 'Mails',
  snippet: 'Snippets',
  's-task': 'S-Task',
  'f-task': 'F-Task',
}

export interface ContentRow {
  type: ContentType
  id: string
  name: string
  content: string
  categoryId?: string
  favorite?: boolean
  // Main language first, then the translations (mail templates only).
  languages: string[]
}

export interface TrashEntry {
  id: string
  type: ContentType
  item: MailTemplate | Snippet | TaskTemplate
  deletedAt: string
  // Place in its list when it was deleted, to put it back there.
  position: number
}

export const contentKey = (type: ContentType, id: string) => `${type}:${id}`

const taskType = (task: TaskTemplate, kindOf: (task: TaskTemplate) => TaskTemplateKind): ContentType =>
  kindOf(task) === 's-task' ? 's-task' : 'f-task'

export function contentRows(data: AppData, kindOf: (task: TaskTemplate) => TaskTemplateKind): ContentRow[] {
  return [
    ...data.templates.map((item) => ({
      type: 'template' as const,
      id: item.id,
      name: item.name,
      content: item.content,
      categoryId: item.categoryId,
      favorite: item.favorite,
      languages: [item.language, ...(item.translations ?? []).map((translation) => translation.language)],
    })),
    ...data.snippets.map((item) => ({
      type: 'snippet' as const,
      id: item.id,
      name: item.title,
      content: item.content,
      categoryId: item.categoryId,
      languages: [],
    })),
    ...data.taskTemplates.map((item) => ({
      type: taskType(item, kindOf),
      id: item.id,
      name: item.name,
      content: item.content,
      categoryId: item.categoryId,
      favorite: item.favorite,
      languages: [],
    })),
  ]
}

// Tags written as <TAG>, once each, in their order of appearance.
export const extractTags = (text: string) => [...new Set(text.match(/<[^<>\r\n]+>/g) ?? [])]

// A language counts as used when at least `min` mail templates are translated
// into it. Main languages alone do not count: a base of separate FR and EN
// templates without translations would otherwise flag every template.
export function usedLanguages(templates: MailTemplate[], min = 2) {
  const counts = new Map<string, number>()
  templates.forEach((template) => {
    new Set((template.translations ?? []).map((item) => item.language)).forEach((language) =>
      counts.set(language, (counts.get(language) ?? 0) + 1),
    )
  })
  return [...counts.entries()].filter(([, count]) => count >= min).map(([language]) => language).sort()
}

export type ContentIssue =
  | { kind: 'missing-translation'; language: string }
  | { kind: 'unknown-tag'; tag: string }
  | { kind: 'translation-missing-tag'; language: string; tag: string }
  | { kind: 'duplicate-name' }

export const describeIssue = (issue: ContentIssue) => {
  if (issue.kind === 'missing-translation') return `Pas de version ${issue.language.toUpperCase()}`
  if (issue.kind === 'unknown-tag') return `Tag inconnu ${issue.tag}`
  if (issue.kind === 'translation-missing-tag') return `${issue.tag} absent de la version ${issue.language.toUpperCase()}`
  return 'Nom en double'
}

const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('fr').trim()

// What needs a look, by content key: missing translations for a used language,
// tags no one knows, tags of the main version missing from a translation,
// two items of the same type with the same name.
export function contentIssues(
  data: AppData,
  rows: ContentRow[],
  options: { knownTags: string[]; languages: string[] },
): Map<string, ContentIssue[]> {
  const known = new Set(options.knownTags.map((tag) => tag.toUpperCase()))
  const issues = new Map<string, ContentIssue[]>()
  const add = (key: string, issue: ContentIssue) => issues.set(key, [...(issues.get(key) ?? []), issue])
  const templates = new Map(data.templates.map((item) => [item.id, item]))

  const names = new Map<string, string[]>()
  rows.forEach((row) => {
    const key = contentKey(row.type, row.id)
    const nameKey = `${row.type}:${fold(row.name)}`
    if (fold(row.name)) names.set(nameKey, [...(names.get(nameKey) ?? []), key])
    extractTags(row.content)
      .filter((tag) => !known.has(tag.toUpperCase()))
      .forEach((tag) => add(key, { kind: 'unknown-tag', tag }))
    if (row.type !== 'template') return
    const template = templates.get(row.id)
    if (!template) return
    options.languages
      .filter((language) => !row.languages.includes(language))
      .forEach((language) => add(key, { kind: 'missing-translation', language }))
    const mainTags = extractTags(template.content)
    ;(template.translations ?? []).forEach((translation) => {
      const translated = new Set(extractTags(translation.content))
      mainTags
        .filter((tag) => !translated.has(tag))
        .forEach((tag) => add(key, { kind: 'translation-missing-tag', language: translation.language, tag }))
    })
  })
  names.forEach((keys) => {
    if (keys.length > 1) keys.forEach((key) => add(key, { kind: 'duplicate-name' }))
  })
  return issues
}

type ListName = 'templates' | 'snippets' | 'taskTemplates'
const listOf = (type: ContentType): ListName =>
  type === 'template' ? 'templates' : type === 'snippet' ? 'snippets' : 'taskTemplates'

const updateList = (
  data: AppData,
  type: ContentType,
  ids: string[],
  change: (item: MailTemplate & Snippet & TaskTemplate) => object,
): AppData => {
  const selected = new Set(ids)
  const list = listOf(type)
  return {
    ...data,
    [list]: (data[list] as Array<{ id: string }>).map((item) =>
      selected.has(item.id) ? { ...item, ...change(item as MailTemplate & Snippet & TaskTemplate) } : item,
    ),
  }
}

export const moveToCategory = (data: AppData, type: ContentType, ids: string[], categoryId: string) =>
  updateList(data, type, ids, () => ({ categoryId }))

// Snippets have no favorites.
export const setFavorite = (data: AppData, type: ContentType, ids: string[], favorite: boolean) =>
  type === 'snippet' ? data : updateList(data, type, ids, () => ({ favorite }))

// Each copy goes right after its original, named « (copie) ».
export function duplicateItems(data: AppData, type: ContentType, ids: string[], makeId: () => string): AppData {
  const selected = new Set(ids)
  const list = listOf(type)
  const next: Array<{ id: string }> = []
  ;(data[list] as Array<{ id: string }>).forEach((item) => {
    next.push(item)
    if (!selected.has(item.id)) return
    const copy = { ...item, id: makeId() } as Record<string, unknown>
    if (type === 'snippet') copy.title = `${String(copy.title)} (copie)`
    else copy.name = `${String(copy.name)} (copie)`
    copy.favorite = undefined
    next.push(copy as { id: string })
  })
  return { ...data, [list]: next }
}

export function moveToTrash(data: AppData, type: ContentType, ids: string[], now = new Date().toISOString()): AppData {
  const selected = new Set(ids)
  const list = listOf(type)
  const items = data[list] as Array<MailTemplate | Snippet | TaskTemplate>
  const trashed: TrashEntry[] = []
  items.forEach((item, position) => {
    if (selected.has(item.id)) trashed.push({ id: `${type}:${item.id}:${now}`, type, item, deletedAt: now, position })
  })
  if (!trashed.length) return data
  return {
    ...data,
    [list]: items.filter((item) => !selected.has(item.id)),
    trash: [...trashed, ...(data.trash ?? [])],
  }
}

// Puts items back where they were. An item whose id is in use again stays in the trash.
export function restoreFromTrash(data: AppData, trashIds: string[]): AppData {
  const selected = new Set(trashIds)
  let next: AppData = data
  const kept: TrashEntry[] = []
  const entries = (data.trash ?? []).filter((entry) => selected.has(entry.id)).sort((a, b) => a.position - b.position)
  entries.forEach((entry) => {
    const list = listOf(entry.type)
    const items = [...(next[list] as Array<{ id: string }>)]
    if (items.some((item) => item.id === entry.item.id)) {
      kept.push(entry)
      return
    }
    items.splice(Math.min(entry.position, items.length), 0, entry.item)
    next = { ...next, [list]: items }
  })
  const restored = new Set(entries.filter((entry) => !kept.includes(entry)).map((entry) => entry.id))
  return { ...next, trash: (data.trash ?? []).filter((entry) => !restored.has(entry.id)) }
}

export const emptyTrash = (data: AppData): AppData => ({ ...data, trash: [] })

// Where an item shows up, to see before renaming or deleting it.
export function contentUsage(
  data: AppData,
  row: ContentRow,
  categoryName: (type: ContentType, categoryId?: string) => string | null,
): string[] {
  const usage: string[] = []
  const category = categoryName(row.type, row.categoryId)
  usage.push(category ? `Catégorie « ${category} »` : 'Sans catégorie')
  if (row.type === 's-task' || row.type === 'f-task') {
    data.templates
      .filter((template) => template.taskTemplateId === row.id)
      .forEach((template) => usage.push(`Tâche liée au mail « ${template.name} »`))
  }
  if (row.type === 'template') {
    const template = data.templates.find((item) => item.id === row.id)
    const task = template?.taskTemplateId ? data.taskTemplates.find((item) => item.id === template.taskTemplateId) : undefined
    if (task) usage.push(`Importe la tâche « ${task.name} »`)
  }
  return usage
}

// Name and text of one item, as the quick editor saves them.
export const saveContentText = (data: AppData, type: ContentType, id: string, name: string, content: string) =>
  updateList(data, type, [id], () => (type === 'snippet' ? { title: name, content } : { name, content }))

// Translated versions of a mail template; empty ones are dropped.
export const saveTranslations = (data: AppData, id: string, translations: Array<{ language: string; content: string }>) =>
  updateList(data, 'template', [id], () => ({
    translations: translations.filter((item) => item.content.trim()),
  }))
