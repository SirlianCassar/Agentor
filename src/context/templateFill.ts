/* Fills template tags from the active case context. A tag without a known value
   is left exactly as written so it stays visible and is never invented. */
import type { CaseContext } from './caseContext'
import { CASE_TAG_KEYS, DEFAULT_CASE_TAGS, type CaseTagKey } from './caseTags'

// Same tolerance as Cairm Task Helper: case-insensitive, optional spaces.
const TAG_PATTERN = /<\s*([A-Za-z0-9_]+)\s*>/g

export interface TemplateFillResult {
  text: string
  filled: string[]
  missing: string[]
}

const readTagValue = (context: CaseContext, target: CaseTagKey) => {
  if (target === 'lastTask') return context.lastTask?.subject?.trim() || null
  const field = context.fields[target]
  // A conflicting value is not used until the user picks one.
  if (!field || field.status === 'conflict') return null
  return field.value
}

export function fillTemplateFromContext(
  text: string,
  context: CaseContext | null,
  tags: Record<CaseTagKey, string> = DEFAULT_CASE_TAGS,
): TemplateFillResult {
  const byName = new Map<string, CaseTagKey>()
  for (const key of CASE_TAG_KEYS) {
    const name = tags[key].replace(/^<|>$/g, '').toUpperCase()
    if (!byName.has(name)) byName.set(name, key)
  }
  const filled = new Set<string>()
  const missing = new Set<string>()
  const result = text.replace(TAG_PATTERN, (raw, name: string) => {
    const tag = name.toUpperCase()
    const target = byName.get(tag)
    if (!target) return raw
    const value = context ? readTagValue(context, target) : null
    if (!value) {
      missing.add(`<${tag}>`)
      return raw
    }
    filled.add(`<${tag}>`)
    return value
  })
  return { text: result, filled: [...filled], missing: [...missing] }
}
