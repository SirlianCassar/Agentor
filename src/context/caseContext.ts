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
  'productFull',
  'productType',
  'serialNumber',
  'purchaseDate',
  'productionDate',
  'customerName',
  'customerFull',
  'country',
] as const
export type ContextFieldKey = (typeof CONTEXT_FIELD_KEYS)[number]

export const contextFieldLabels: Record<ContextFieldKey, string> = {
  caseNumber: 'RQT',
  caseTitle: 'Titre',
  caseCreatedOn: 'Créé le',
  productName: 'Produit',
  productFull: 'Produit complet (copie Cairm)',
  productType: 'Type de produit',
  serialNumber: 'Numéro de série',
  purchaseDate: "Date d'achat",
  productionDate: 'Date de production',
  customerName: 'Client',
  customerFull: 'Client complet (copie Cairm)',
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
  // Name received from the CRM when a product alias replaced it (display only).
  aliasOf?: string
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

// CAS references are internal CRM identifiers, never the RQT shown or copied.
export function normalizeRqtNumber(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined
  const match = raw.match(/\bRQT\s*-\s*[A-Z0-9]+(?:\s*-\s*[A-Z0-9]+)*/i)
  return match?.[0].replace(/\s*-\s*/g, '-').toUpperCase()
}

export function onlyRqtContext(context: CaseContext): CaseContext {
  const number = normalizeRqtNumber(context.caseKey.number) ?? normalizeRqtNumber(context.fields.caseNumber?.value) ?? normalizeRqtNumber(context.fields.caseTitle?.value)
  const field = context.fields.caseNumber
  const value = normalizeRqtNumber(field?.value)
  if (context.caseKey.number === number && (!field || (field.value === value && !field.candidates?.some((candidate) => normalizeRqtNumber(candidate.value) !== candidate.value)))) return context
  const fields = { ...context.fields }
  if (field && value) fields.caseNumber = { ...field, value, candidates: field.candidates?.filter((candidate) => normalizeRqtNumber(candidate.value)).map((candidate) => ({ ...candidate, value: normalizeRqtNumber(candidate.value)! })) }
  else delete fields.caseNumber
  const { number: _old, ...key } = context.caseKey
  return { ...context, caseKey: { ...key, ...(number ? { number } : {}) }, fields }
}

export function isContextFieldKey(key: unknown): key is ContextFieldKey {
  return CONTEXT_FIELD_KEYS.includes(key as ContextFieldKey)
}

export function sameCase(a: CaseKey | null | undefined, b: CaseKey | null | undefined) {
  return Boolean(a && b && a.system === b.system && a.entity === b.entity && a.id === b.id)
}

export function createCaseContext(caseKey: CaseKey, now: string): CaseContext {
  return onlyRqtContext({ schema: CASE_CONTEXT_SCHEMA, caseKey, openedAt: now, updatedAt: now, fields: {}, lastTask: null })
}

// Starts a fresh context whenever the incoming case differs: values from the
// previous case are never carried over.
export function resolveContextForCase(
  current: CaseContext | null,
  caseKey: CaseKey,
  now: string,
): CaseContext {
  caseKey = { ...caseKey, number: normalizeRqtNumber(caseKey.number) }
  if (current) current = onlyRqtContext(current)
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
  const value = observation.key === 'caseNumber' ? normalizeRqtNumber(observation.value) ?? null : cleanValue(observation.value)
  if (observation.key === 'caseNumber' && !value) return onlyRqtContext(context)
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

// What Agentor keeps from what Cairm+ sends (Paramètres › Données importées).
// The RQT number identifies the case and is always kept. Off by default: the
// values Sirlian asked to leave out of the case bar and the case window.
export type CaseImportKey = Exclude<ContextFieldKey, 'caseNumber'> | 'lastTask'
export const CASE_IMPORT_KEYS: CaseImportKey[] = [
  'caseTitle',
  'productName',
  'serialNumber',
  'purchaseDate',
  'productFull',
  'customerName',
  'customerFull',
  'country',
  'caseCreatedOn',
  'productType',
  'productionDate',
  'lastTask',
]
export const DEFAULT_CASE_IMPORT_OFF: CaseImportKey[] = ['caseCreatedOn', 'productType', 'productionDate', 'lastTask']

export function resolveCaseImport(raw: unknown): Record<CaseImportKey, boolean> {
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  return Object.fromEntries(
    CASE_IMPORT_KEYS.map((key) => [
      key,
      typeof source[key] === 'boolean' ? source[key] : !DEFAULT_CASE_IMPORT_OFF.includes(key),
    ]),
  ) as Record<CaseImportKey, boolean>
}

export const isFieldImported = (imports: Record<CaseImportKey, boolean>, key: ContextFieldKey) =>
  key === 'caseNumber' || imports[key] !== false

// Drops what the user chose not to import, before anything is stored.
export function filterImported<T extends { key: ContextFieldKey }>(
  observations: T[],
  imports: Record<CaseImportKey, boolean>,
) {
  return observations.filter((observation) => isFieldImported(imports, observation.key))
}

// Removes values kept from before the user turned their import off.
export function withoutUnimported(context: CaseContext, imports: Record<CaseImportKey, boolean>): CaseContext {
  const keys = Object.keys(context.fields) as ContextFieldKey[]
  const dropped = keys.filter((key) => !isFieldImported(imports, key))
  const dropTask = !imports.lastTask && context.lastTask
  if (!dropped.length && !dropTask) return context
  const fields = { ...context.fields }
  dropped.forEach((key) => delete fields[key])
  return { ...context, fields, ...(dropTask ? { lastTask: null } : {}) }
}

export const CASE_CONTEXT_TTL_MS = 12 * 60 * 60 * 1000

export function isContextExpired(context: CaseContext, now: string, ttlMs = CASE_CONTEXT_TTL_MS) {
  return Date.parse(now) - Date.parse(context.updatedAt) > ttlMs
}
