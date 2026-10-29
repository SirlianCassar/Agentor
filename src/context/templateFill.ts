/* Fills template tags from the active case context. A tag without a known value
   is left exactly as written so it stays visible and is never invented. */
import type { CaseContext, ContextFieldKey } from './caseContext'

export const contextTagFields: Record<string, ContextFieldKey | 'lastTask'> = {
  DOSSIER: 'caseNumber',
  CLIENT: 'customerName',
  PRODUIT: 'productName',
  TYPE_PRODUIT: 'productType',
  SERIAL: 'serialNumber',
  DATE_ACHAT: 'purchaseDate',
  DATE_PRODUCTION: 'productionDate',
  PAYS: 'country',
  DERNIERE_TACHE: 'lastTask',
}

// Same tolerance as Cairm Task Helper: case-insensitive, optional spaces.
const TAG_PATTERN = /<\s*([A-Za-z_]+)\s*>/g

export interface TemplateFillResult {
  text: string
  filled: string[]
  missing: string[]
}

const readTagValue = (context: CaseContext, target: ContextFieldKey | 'lastTask') => {
  if (target === 'lastTask') return context.lastTask?.subject?.trim() || null
  const field = context.fields[target]
  // A conflicting value is not used until the user picks one.
  if (!field || field.status === 'conflict') return null
  return field.value
}

export function fillTemplateFromContext(text: string, context: CaseContext | null): TemplateFillResult {
  const filled = new Set<string>()
  const missing = new Set<string>()
  const result = text.replace(TAG_PATTERN, (raw, name: string) => {
    const tag = name.toUpperCase()
    const target = contextTagFields[tag]
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
