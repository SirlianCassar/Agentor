/* Validation of the messages Agentor Bridge sends to Agentor over the local bridge.
   Contract: Shared/integrations/bridge-protocol.md. Anything unexpected is
   rejected rather than repaired. */
import type { CrmTemplateIndexEntry } from '../lib/crmTemplates'
import {
  isContextFieldKey,
  normalizeCaseId,
  normalizeRqtNumber,
  type CaseKey,
  type ContextObservation,
  type ContextSource,
  type ContextTask,
} from './caseContext'

export const BRIDGE_PROTOCOL_VERSION = 1
const MAX_OBSERVATIONS = 50
const MAX_VALUE_LENGTH = 2000
const MAX_TEMPLATE_ENTRIES = 5000
const MAX_TITLE_LENGTH = 300
const SOURCES: ContextSource[] = ['crm', 'portal', 'sharepoint', 'network', 'user']

// The index of the CRM e-mail templates, harvested by the extension. Titles
// only: the bodies stay in the CRM, where they are edited. It travels as the
// result of a `template.harvest` job, not as a message of its own.
export interface TemplateIndex {
  org: string
  fetchedAt: string
  entries: CrmTemplateIndexEntry[]
}

export type BridgeMessage =
  | {
      type: 'case.observed'
      caseKey: CaseKey
      observations: ContextObservation[]
      lastTask?: ContextTask | null
    }
  | { type: 'case.left'; caseKey: CaseKey }

export type BridgeParseResult = { ok: true; message: BridgeMessage } | { ok: false; error: string }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const isIsoDate = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value))

const boundedText = (value: unknown) =>
  typeof value === 'string' && value.length <= MAX_VALUE_LENGTH ? value : null

function parseCaseKey(raw: unknown): CaseKey | null {
  if (!isRecord(raw)) return null
  const id = normalizeCaseId(raw.id)
  if (!id) return null
  const number = normalizeRqtNumber(raw.number)
  return { system: 'dynamics', entity: 'incident', id, ...(number ? { number } : {}) }
}

function parseObservation(raw: unknown): ContextObservation | null {
  if (!isRecord(raw) || !isContextFieldKey(raw.key)) return null
  if (!SOURCES.includes(raw.source as ContextSource) || raw.source === 'user') return null
  if (!isIsoDate(raw.fetchedAt)) return null
  const value = raw.value === null ? null : boundedText(raw.value)
  if (value === null && raw.value !== null) return null
  return { key: raw.key, value, source: raw.source as ContextSource, fetchedAt: raw.fetchedAt }
}

function parseTask(raw: unknown): ContextTask | null | undefined {
  if (raw === undefined) return undefined
  if (raw === null) return null
  if (!isRecord(raw)) return undefined
  const subject = boundedText(raw.subject)
  if (!subject || !isIsoDate(raw.fetchedAt)) return undefined
  const description = boundedText(raw.description)
  const createdOn = typeof raw.createdOn === 'string' ? raw.createdOn.slice(0, 40) : undefined
  return {
    subject,
    ...(description ? { description } : {}),
    ...(createdOn ? { createdOn } : {}),
    source: 'crm',
    fetchedAt: raw.fetchedAt,
  }
}

function parseTemplateEntry(raw: unknown): CrmTemplateIndexEntry | null {
  if (!isRecord(raw)) return null
  const id = typeof raw.id === 'string' ? raw.id.replace(/[{}]/g, '').trim().toLowerCase() : ''
  if (!/^[0-9a-f-]{36}$/.test(id)) return null
  const title = typeof raw.title === 'string' ? raw.title.trim().slice(0, MAX_TITLE_LENGTH) : ''
  if (!title) return null
  const languageCode = Number(raw.languageCode)
  if (!Number.isInteger(languageCode)) return null
  const modifiedOn = isIsoDate(raw.modifiedOn) ? raw.modifiedOn : undefined
  return { id, title, languageCode, ...(modifiedOn ? { modifiedOn } : {}) }
}

export type TemplateIndexParseResult = { ok: true; index: TemplateIndex } | { ok: false; error: string }

/** Reads a harvested index: org, date and titles. Validated like any message. */
export function parseTemplateIndex(raw: unknown): TemplateIndexParseResult {
  if (!isRecord(raw)) return { ok: false, error: 'invalid-body' }
  if (!isIsoDate(raw.fetchedAt)) return { ok: false, error: 'invalid-fetched-at' }
  const org = typeof raw.org === 'string' && raw.org.startsWith('https://') ? raw.org : ''
  if (!org) return { ok: false, error: 'invalid-org' }
  if (!Array.isArray(raw.entries) || raw.entries.length > MAX_TEMPLATE_ENTRIES) {
    return { ok: false, error: 'invalid-entries' }
  }
  const entries: CrmTemplateIndexEntry[] = []
  for (const item of raw.entries) {
    const entry = parseTemplateEntry(item)
    // One unreadable row never costs the whole harvest.
    if (entry) entries.push(entry)
  }
  if (!entries.length) return { ok: false, error: 'invalid-entries' }
  return { ok: true, index: { org, fetchedAt: raw.fetchedAt, entries } }
}

export function parseBridgeMessage(raw: unknown): BridgeParseResult {
  if (!isRecord(raw)) return { ok: false, error: 'invalid-body' }
  if (raw.protocol !== BRIDGE_PROTOCOL_VERSION) return { ok: false, error: 'unsupported-protocol' }
  const caseKey = parseCaseKey(raw.caseKey)
  if (!caseKey) return { ok: false, error: 'invalid-case-key' }

  if (raw.type === 'case.left') return { ok: true, message: { type: 'case.left', caseKey } }
  if (raw.type !== 'case.observed') return { ok: false, error: 'unknown-type' }
  if (!Array.isArray(raw.observations) || raw.observations.length > MAX_OBSERVATIONS) {
    return { ok: false, error: 'invalid-observations' }
  }
  const observations: ContextObservation[] = []
  for (const item of raw.observations) {
    const observation = parseObservation(item)
    if (!observation) return { ok: false, error: 'invalid-observation' }
    if (observation.key === 'caseNumber') {
      const number = normalizeRqtNumber(observation.value)
      if (!number) continue
      observation.value = number
      caseKey.number = caseKey.number ?? number
    }
    if (observation.key === 'caseTitle' && !caseKey.number) caseKey.number = normalizeRqtNumber(observation.value)
    observations.push(observation)
  }
  const lastTask = parseTask(raw.lastTask)
  return {
    ok: true,
    message: {
      type: 'case.observed',
      caseKey,
      observations,
      ...(lastTask !== undefined ? { lastTask } : {}),
    },
  }
}
