/* Active CRM case context: pure model shared by the main process (single
   source of truth) and the renderer. Mirrors Shared/schemas/case-context.schema.json. */

export const CASE_CONTEXT_SCHEMA = 'agentor.case-context/1'

export type ContextSource = 'crm' | 'portal' | 'sharepoint' | 'network' | 'user'
export type ContextFieldStatus = 'auto' | 'confirmed' | 'manual' | 'conflict'

export const CONTEXT_FIELD_KEYS = [
  'caseNumber',
  'caseTitle',
  'caseCreatedOn',
  'productName',
  'productType',
  'serialNumber',
  'purchaseDate',
  'productionDate',
  'customerName',
  'country',
] as const
export type ContextFieldKey = (typeof CONTEXT_FIELD_KEYS)[number]

export const contextFieldLabels: Record<ContextFieldKey, string> = {
  caseNumber: 'Dossier',
  caseTitle: 'Titre',
  caseCreatedOn: 'Créé le',
  productName: 'Produit',
  productType: 'Type de produit',
  serialNumber: 'Numéro de série',
  purchaseDate: "Date d'achat",
  productionDate: 'Date de production',
  customerName: 'Client',
  country: 'Pays',
}

export interface CaseKey {
  system: 'dynamics'
  entity: 'incident'
  id: string
  number?: string
}

export interface ContextCandidate {
  value: string
  source: ContextSource
  fetchedAt: string
}

export interface ContextField {
  value: string | null
  status: ContextFieldStatus
  source: ContextSource
  updatedAt: string
  candidates?: ContextCandidate[]
}

export interface ContextTask {
  subject: string
  description?: string
  createdOn?: string
  source: ContextSource
  fetchedAt: string
}

export interface CaseContext {
  schema: typeof CASE_CONTEXT_SCHEMA
  caseKey: CaseKey
  openedAt: string
  updatedAt: string
  fields: Partial<Record<ContextFieldKey, ContextField>>
  lastTask?: ContextTask | null
}

export interface ContextObservation {
  key: ContextFieldKey
  value: string | null
  source: ContextSource
  fetchedAt: string
}

const GUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export function normalizeCaseId(id: unknown) {
  const value = String(id ?? '').replace(/[{}]/g, '').trim().toLowerCase()
  return GUID_PATTERN.test(value) ? value : null
}

export function isContextFieldKey(key: unknown): key is ContextFieldKey {
  return CONTEXT_FIELD_KEYS.includes(key as ContextFieldKey)
}

export function sameCase(a: CaseKey | null | undefined, b: CaseKey | null | undefined) {
  return Boolean(a && b && a.system === b.system && a.entity === b.entity && a.id === b.id)
}

export function createCaseContext(caseKey: CaseKey, now: string): CaseContext {
  return { schema: CASE_CONTEXT_SCHEMA, caseKey, openedAt: now, updatedAt: now, fields: {}, lastTask: null }
}

// Starts a fresh context whenever the incoming case differs: values from the
// previous case are never carried over.
export function resolveContextForCase(
  current: CaseContext | null,
  caseKey: CaseKey,
  now: string,
): CaseContext {
  if (current && sameCase(current.caseKey, caseKey)) {
    return caseKey.number && caseKey.number !== current.caseKey.number
      ? { ...current, caseKey: { ...current.caseKey, number: caseKey.number } }
      : current
  }
  return createCaseContext(caseKey, now)
}

const cleanValue = (value: string | null) => {
  if (value === null) return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

// Automatic observations never overwrite what the user typed or confirmed. A
// different value from another observation is kept as a conflict instead of
// silently replacing the first one.
export function applyObservation(context: CaseContext, observation: ContextObservation): CaseContext {
  const value = cleanValue(observation.value)
  const existing = context.fields[observation.key]
  const at = observation.fetchedAt
  let next: ContextField

  if (!existing || (existing.status === 'auto' && existing.value === null)) {
    next = { value, status: 'auto', source: observation.source, updatedAt: at }
  } else if (value === null || value === existing.value) {
    if (existing.status !== 'auto' || value === null) return context
    next = { ...existing, source: observation.source, updatedAt: at }
  } else if (existing.status === 'auto' && existing.source === observation.source) {
    // The same source changed its value (the record was edited): follow it.
    next = { value, status: 'auto', source: observation.source, updatedAt: at }
  } else {
    const candidates = [...(existing.candidates ?? [])].filter(
      (candidate) => candidate.source !== observation.source,
    )
    candidates.push({ value, source: observation.source, fetchedAt: at })
    next = {
      ...existing,
      status: existing.status === 'auto' ? 'conflict' : existing.status,
      candidates,
    }
  }
  return {
    ...context,
    updatedAt: at > context.updatedAt ? at : context.updatedAt,
    fields: { ...context.fields, [observation.key]: next },
  }
}

export function applyObservations(context: CaseContext, observations: ContextObservation[]) {
  return observations.reduce(applyObservation, context)
}

export function setFieldManually(
  context: CaseContext,
  key: ContextFieldKey,
  value: string,
  now: string,
): CaseContext {
  return {
    ...context,
    updatedAt: now,
    fields: {
      ...context.fields,
      [key]: { value: cleanValue(value), status: 'manual', source: 'user', updatedAt: now },
    },
  }
}

export function confirmField(context: CaseContext, key: ContextFieldKey, now: string): CaseContext {
  const field = context.fields[key]
  if (!field || field.value === null || field.status === 'conflict') return context
  return {
    ...context,
    updatedAt: now,
    fields: { ...context.fields, [key]: { ...field, status: 'confirmed', updatedAt: now } },
  }
}

// Fields that must be checked by the user before a sensitive action (sending,
// writing to another application): missing, conflicting or only automatic.
export function getUnconfirmedFields(context: CaseContext, keys: ContextFieldKey[]) {
  return keys.filter((key) => {
    const field = context.fields[key]
    return !field || field.value === null || field.status === 'auto' || field.status === 'conflict'
  })
}

export const CASE_CONTEXT_TTL_MS = 12 * 60 * 60 * 1000

export function isContextExpired(context: CaseContext, now: string, ttlMs = CASE_CONTEXT_TTL_MS) {
  return Date.parse(now) - Date.parse(context.updatedAt) > ttlMs
}
