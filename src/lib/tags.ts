/* Predefined <TAG> normalization and the in-editor tag autocomplete context. */
import { stripTokenSpacing } from './utils'

export type TagSuggestionFieldId =
  | 'snippet-title'
  | 'snippet-content'
  | 'snippet-task'
  | 'template-name'
  | 'template-content'
  | 'template-task'
  | 'task-name'
  | 'task-title'
  | 'task-content'
  | 'call-template'
  | 'procedure-name'
  | 'procedure-product'
  | 'procedure-info'
  | 'procedure-notes'
  | 'procedure-steps'
  | 'procedure-task'

export type TagSuggestionState = {
  fieldId: TagSuggestionFieldId
  start: number
  end: number
  query: string
}

export function normalizePredefinedTag(value: string) {
  const inner = value.trim().replace(/^<+|>+$/g, '').replace(/\s+/g, ' ').trim()
  if (!inner) return null
  return `<${inner.toUpperCase()}>`
}

export function normalizePredefinedTags(values: string[]) {
  const seen = new Set<string>()
  const normalized: string[] = []
  values.forEach((value) => {
    const tag = normalizePredefinedTag(value)
    if (!tag || seen.has(tag)) return
    seen.add(tag)
    normalized.push(tag)
  })
  return normalized
}

export function getTagAutocompleteContext(value: string, cursor: number | null | undefined) {
  if (cursor === null || cursor === undefined) return null

  const beforeCursor = value.slice(0, cursor)
  const start = beforeCursor.lastIndexOf('<')
  if (start === -1) return null

  const rawPrefix = beforeCursor.slice(start)
  if (rawPrefix.includes('>') || /[\r\n]/.test(rawPrefix)) return null

  const afterCursor = value.slice(cursor)
  const closingOffset = afterCursor.indexOf('>')
  const lineBreakOffset = afterCursor.search(/[\r\n]/)
  const hasClosingTag = closingOffset !== -1 && (lineBreakOffset === -1 || closingOffset < lineBreakOffset)
  const end = hasClosingTag ? cursor + closingOffset + 1 : cursor
  const query = stripTokenSpacing(value.slice(start + 1, cursor)).trim().toUpperCase()

  return { start, end, query }
}
