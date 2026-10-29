/* Validation of the messages Cairm+ sends to Agentor 9000 over the local bridge.
   Contract: Shared/integrations/bridge-protocol.md. Anything unexpected is
   rejected rather than repaired. */
import {
  isContextFieldKey,
  normalizeCaseId,
  type CaseKey,
  type ContextObservation,
  type ContextSource,
  type ContextTask,
} from './caseContext'

export const BRIDGE_PROTOCOL_VERSION = 1
const MAX_OBSERVATIONS = 50
const MAX_VALUE_LENGTH = 2000
const SOURCES: ContextSource[] = ['crm', 'portal', 'sharepoint', 'network', 'user']

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
  const number = typeof raw.number === 'string' ? raw.number.trim().slice(0, 64) : undefined
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
