/* Tag attached to each piece of information of the active case. The defaults
   follow the tags already used in Agentor (<CLIENT>, <PRODUIT>, <SERIAL>,
   <DOSSIER>); each one can be renamed in the settings. */
import { CONTEXT_FIELD_KEYS, contextFieldLabels, type ContextFieldKey } from './caseContext'

export type CaseTagKey = ContextFieldKey | 'lastTask'

export const CASE_TAG_KEYS: CaseTagKey[] = [...CONTEXT_FIELD_KEYS, 'lastTask']

export const caseTagLabels: Record<CaseTagKey, string> = {
  ...contextFieldLabels,
  lastTask: 'Dernière tâche',
}

export const DEFAULT_CASE_TAGS: Record<CaseTagKey, string> = {
  caseNumber: '<DOSSIER>',
  caseTitle: '<TITRE>',
  caseCreatedOn: '<DATE_DOSSIER>',
  productName: '<PRODUIT>',
  productFull: '<PRODUCTFULL>',
  productType: '<TYPE_PRODUIT>',
  serialNumber: '<SERIAL>',
  purchaseDate: '<DATE_ACHAT>',
  productionDate: '<DATE_PRODUCTION>',
  customerName: '<CLIENT>',
  customerFull: '<CUSTOMERFULL>',
  country: '<PAYS>',
  lastTask: '<DERNIERE_TACHE>',
}

// "serial number" or "<Serial>" become "<SERIAL_NUMBER>" / "<SERIAL>".
// Returns null when nothing usable is left.
export function normalizeCaseTag(raw: string): string | null {
  const name = raw
    .trim()
    .replace(/^<|>$/g, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return name ? `<${name}>` : null
}

export function resolveCaseTags(custom: Partial<Record<string, unknown>> | undefined): Record<CaseTagKey, string> {
  const result = { ...DEFAULT_CASE_TAGS }
  if (!custom || typeof custom !== 'object') return result
  for (const key of CASE_TAG_KEYS) {
    const value = custom[key]
    if (typeof value !== 'string') continue
    const tag = normalizeCaseTag(value)
    if (tag) result[key] = tag
  }
  return result
}

// Tags used by more than one field, which would make filling ambiguous.
export function findDuplicateCaseTags(tags: Record<CaseTagKey, string>) {
  const seen = new Map<string, CaseTagKey>()
  const duplicates = new Set<string>()
  for (const key of CASE_TAG_KEYS) {
    const tag = tags[key]
    if (seen.has(tag)) duplicates.add(tag)
    seen.set(tag, key)
  }
  return [...duplicates]
}
