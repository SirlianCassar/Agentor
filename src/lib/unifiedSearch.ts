/* One search over everything the left library holds: snippets, mail templates,
   Troubleshotgun templates, S-Task and F-Task templates, portal procedures.
   Every word must appear, in any order, ignoring case and accents. Results
   stay grouped by type; inside a group, items that name the case's product
   come first, then items whose name matches, then the others. */
import type {
  CustomerPortalCode,
  MailTemplate,
  Snippet,
  TaskTemplate,
  TaskTemplateKind,
  TroubleshootgunFolder,
} from './types'

export type SearchKind = 'template' | 'troubleshootgun' | 'snippet' | 's-task' | 'f-task' | 'procedure'

export const searchKindOrder: SearchKind[] = ['template', 'troubleshootgun', 'snippet', 's-task', 'f-task', 'procedure']

export const searchKindLabels: Record<SearchKind, string> = {
  template: 'Mails',
  troubleshootgun: 'Troubleshotgun',
  snippet: 'Snippets',
  's-task': 'S-Task',
  'f-task': 'F-Task',
  procedure: 'Procédures',
}

export interface SearchEntry {
  kind: SearchKind
  id: string
  title: string
  // Text searched besides the title (content, folder name, steps).
  body: string
  // First line shown under the title.
  preview: string
  categoryId?: string
  folderId?: string
  folderName?: string
  language?: string
  favorite?: boolean
}

export interface SearchResult extends SearchEntry {
  productMatch: boolean
}

export interface SearchGroup {
  kind: SearchKind
  label: string
  items: SearchResult[]
  total: number
}

export interface SearchSources {
  snippets: Snippet[]
  templates: MailTemplate[]
  troubleshootgunFolders: TroubleshootgunFolder[]
  taskTemplates: TaskTemplate[]
  procedures: CustomerPortalCode[]
  taskKind: (task: TaskTemplate) => TaskTemplateKind
}

export const foldText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('fr')

const firstLine = (value: string) => value.split(/\r?\n/).find((line) => line.trim())?.trim() ?? ''

export function buildSearchEntries(sources: SearchSources): SearchEntry[] {
  const entries: SearchEntry[] = []
  sources.templates.forEach((template) =>
    entries.push({
      kind: 'template',
      id: template.id,
      title: template.name,
      body: [template.description ?? '', template.content, ...(template.translations ?? []).map((item) => item.content)].join('\n'),
      preview: firstLine(template.content),
      categoryId: template.categoryId,
      language: template.language,
      favorite: template.favorite,
    }),
  )
  sources.troubleshootgunFolders.forEach((folder) =>
    folder.templates.forEach((template) =>
      entries.push({
        kind: 'troubleshootgun',
        id: template.id,
        title: template.name,
        body: `${folder.name}\n${template.content}`,
        preview: firstLine(template.content),
        folderId: folder.id,
        folderName: folder.name,
        language: template.language,
      }),
    ),
  )
  sources.snippets.forEach((snippet) =>
    entries.push({
      kind: 'snippet',
      id: snippet.id,
      title: snippet.title,
      body: `${snippet.content}\n${snippet.taskText ?? ''}`,
      preview: firstLine(snippet.content),
      categoryId: snippet.categoryId,
    }),
  )
  sources.taskTemplates
    .filter((task) => !task.hiddenFromLists)
    .forEach((task) =>
      entries.push({
        kind: sources.taskKind(task) === 's-task' ? 's-task' : 'f-task',
        id: task.id,
        title: task.name,
        body: `${task.taskTitle ?? ''}\n${task.content}`,
        preview: firstLine(task.taskTitle || task.content),
        categoryId: task.categoryId,
        favorite: task.favorite,
      }),
    )
  sources.procedures.forEach((procedure) =>
    entries.push({
      kind: 'procedure',
      id: procedure.id,
      title: procedure.procedureName.trim() || 'Procédure sans nom',
      body: procedure.codes.map((line) => `${line.title ?? ''} ${line.code}`).join('\n'),
      preview: firstLine(procedure.codes[0]?.title || procedure.codes[0]?.code || ''),
    }),
  )
  return entries
}

// Words that name a product: its whole name, plus its model codes (words with
// a digit, at least three characters, such as "t598" or "t.16000m").
export function productSearchTerms(names: Array<string | null | undefined>): string[] {
  const terms = new Set<string>()
  names.forEach((name) => {
    const folded = foldText(name ?? '').trim()
    if (folded.length < 2) return
    terms.add(folded)
    folded
      .split(/[^a-z0-9.]+/)
      .filter((word) => word.length >= 3 && /\d/.test(word))
      .forEach((word) => terms.add(word))
  })
  return [...terms]
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const containsWord = (haystack: string, term: string) =>
  new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}($|[^a-z0-9])`).test(haystack)

export const matchesProduct = (entry: SearchEntry, terms: string[]) => {
  if (!terms.length) return false
  const haystack = foldText(`${entry.title} ${entry.folderName ?? ''}`)
  return terms.some((term) => containsWord(haystack, term))
}

export interface SearchOptions {
  productTerms?: string[]
  // Items kept per group; the group still says how many matched.
  limit?: number
  // With an empty query: list only the items of the case's product.
  productOnlyWhenEmpty?: boolean
}

export function searchLibrary(entries: SearchEntry[], query: string, options: SearchOptions = {}): SearchGroup[] {
  const terms = options.productTerms ?? []
  const words = foldText(query).split(/\s+/).filter(Boolean)
  if (!words.length && !(options.productOnlyWhenEmpty && terms.length)) return []
  const limit = options.limit ?? 8

  const scored: Array<{ item: SearchResult; score: number; order: number }> = []
  entries.forEach((entry, order) => {
    const title = foldText(entry.title)
    const all = `${title}\n${foldText(`${entry.folderName ?? ''}\n${entry.body}`)}`
    if (!words.every((word) => all.includes(word))) return
    const productMatch = matchesProduct(entry, terms)
    if (!words.length && !productMatch) return
    let score = productMatch ? 100 : 0
    if (words.length && words.every((word) => title.includes(word))) score += 10
    if (words.length && title.startsWith(words[0])) score += 5
    scored.push({ item: { ...entry, productMatch }, score, order })
  })

  return searchKindOrder
    .map((kind) => {
      const matches = scored
        .filter((entry) => entry.item.kind === kind)
        .sort((a, b) => b.score - a.score || a.order - b.order)
      return {
        kind,
        label: searchKindLabels[kind],
        items: matches.slice(0, limit).map((entry) => entry.item),
        total: matches.length,
      }
    })
    .filter((group) => group.total > 0)
}
