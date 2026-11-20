/* Protocol 2: the work Agentor hands to Agentor Bridge.

   Protocol 1 goes one way, from the browser to Agentor: the extension pushes
   the open case. Protocol 2 goes the other way, and every need has the same
   shape — Agentor cannot reach the CRM itself (it holds no Dataverse token), so
   it drops a job, the extension runs it in the page it already has open, and
   posts back the result.

   One queue, not one route per need: instantiating a template, harvesting the
   index of the titles and writing a mail in the Dynamics form are three kinds
   of the same job. Anything unexpected in a result is rejected, not repaired. */
import { parseTemplateIndex, type TemplateIndex } from './bridgeMessages'
import type { CaseKey } from './caseContext'

export const BRIDGE_JOB_PROTOCOL_VERSION = 2

export const BRIDGE_JOB_KINDS = ['template.harvest', 'template.instantiate', 'mail.compose'] as const
export type BridgeJobKind = (typeof BRIDGE_JOB_KINDS)[number]

const MAX_SUBJECT_LENGTH = 400
const MAX_BODY_LENGTH = 100_000

/** Asks the CRM to merge a template with the open case. Nothing is saved there. */
export interface TemplateInstantiateJob {
  kind: 'template.instantiate'
  templateId: string
  // Carried back untouched so the answer can be matched to what was asked.
  familyKey?: string
}

/** Asks for the titles of the case templates, when Agentor has none or an old copy. */
export interface TemplateHarvestJob {
  kind: 'template.harvest'
}

/** Writes a subject and a body in the Dynamics mail form. Never sends it. */
export interface MailComposeJob {
  kind: 'mail.compose'
  subject: string
  body: string
}

export type BridgeJobRequest = TemplateInstantiateJob | TemplateHarvestJob | MailComposeJob

export interface BridgeJob {
  id: string
  protocol: typeof BRIDGE_JOB_PROTOCOL_VERSION
  createdAt: string
  // The case the job belongs to, when it has one: the extension refuses to run
  // a job in a page that has moved on to another case.
  caseKey?: CaseKey
  request: BridgeJobRequest
}

export interface InstantiatedTemplate {
  subject: string
  body: string
  familyKey?: string
}

export interface MailComposeOutcome {
  // The fields actually written, by name, so the agent is told what was filled.
  applied: string[]
}

export type BridgeJobOutcome =
  | { kind: 'template.instantiate'; template: InstantiatedTemplate }
  | { kind: 'template.harvest'; index: TemplateIndex }
  | { kind: 'mail.compose'; compose: MailComposeOutcome }

export type BridgeJobResult =
  | { ok: true; outcome: BridgeJobOutcome }
  // A refusal is a normal answer: no CRM tab, case left, field not found. The
  // reason is shown to the agent instead of a silent failure.
  | { ok: false; reason: string }

export type BridgeJobParseResult = { ok: true; result: BridgeJobResult } | { ok: false; error: string }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const text = (value: unknown, limit: number) =>
  typeof value === 'string' && value.length <= limit ? value : null

export const isBridgeJobKind = (value: unknown): value is BridgeJobKind =>
  BRIDGE_JOB_KINDS.includes(value as BridgeJobKind)

/** The short reason a refusal carries; anything unreadable becomes 'unknown'. */
export const normalizeJobReason = (value: unknown) => {
  const raw = typeof value === 'string' ? value.trim().slice(0, 120) : ''
  return raw || 'unknown'
}

/** Reads what the extension posted for a job of this kind. */
export function parseBridgeJobResult(kind: BridgeJobKind, raw: unknown): BridgeJobParseResult {
  if (!isRecord(raw)) return { ok: false, error: 'invalid-body' }
  if (raw.protocol !== BRIDGE_JOB_PROTOCOL_VERSION) return { ok: false, error: 'unsupported-protocol' }
  if (raw.ok === false) return { ok: true, result: { ok: false, reason: normalizeJobReason(raw.reason) } }
  if (raw.ok !== true) return { ok: false, error: 'invalid-ok' }

  if (kind === 'template.instantiate') {
    const data = isRecord(raw.data) ? raw.data : null
    const subject = data ? text(data.subject, MAX_SUBJECT_LENGTH) : null
    const body = data ? text(data.body, MAX_BODY_LENGTH) : null
    // An empty body is a failed merge, not a result: the CRM always returns one.
    if (subject === null || !body || !body.trim()) return { ok: false, error: 'invalid-template' }
    const familyKey = data && typeof data.familyKey === 'string' ? data.familyKey.slice(0, 120) : undefined
    return {
      ok: true,
      result: {
        ok: true,
        outcome: { kind, template: { subject, body, ...(familyKey ? { familyKey } : {}) } },
      },
    }
  }

  if (kind === 'template.harvest') {
    const parsed = parseTemplateIndex(raw.data)
    if (!parsed.ok) return { ok: false, error: parsed.error }
    return { ok: true, result: { ok: true, outcome: { kind, index: parsed.index } } }
  }

  const data = isRecord(raw.data) ? raw.data : null
  const applied = Array.isArray(data?.applied)
    ? data.applied.filter((value): value is string => typeof value === 'string').slice(0, 20)
    : []
  if (!applied.length) return { ok: false, error: 'invalid-compose' }
  return { ok: true, result: { ok: true, outcome: { kind: 'mail.compose', compose: { applied } } } }
}

/** What the extension reads from `GET /v1/jobs`: the job, trimmed to the wire. */
export function serializeBridgeJob(job: BridgeJob) {
  return {
    id: job.id,
    protocol: job.protocol,
    kind: job.request.kind,
    createdAt: job.createdAt,
    ...(job.caseKey ? { caseKey: job.caseKey } : {}),
    payload: payloadOf(job.request),
  }
}

function payloadOf(request: BridgeJobRequest) {
  if (request.kind === 'template.instantiate') {
    return { templateId: request.templateId, ...(request.familyKey ? { familyKey: request.familyKey } : {}) }
  }
  if (request.kind === 'mail.compose') return { subject: request.subject, body: request.body }
  return {}
}

/* Why a job did not happen, in the agent's words. The reasons are few and each
   one tells what to do next, so a refused action never looks like a bug. */
const JOB_REASON_LABELS: Record<string, string> = {
  'bridge-off': 'Le pont est désactivé dans les réglages.',
  'bridge-error': 'Le pont est en erreur : voir Paramètres › Connexions.',
  'no-browser': 'Aucun onglet CRM ouvert pour exécuter la demande.',
  timeout: "Le navigateur n'a pas répondu à temps.",
  'queue-full': 'Trop de demandes en attente.',
  'already-queued': 'La même demande est déjà en cours.',
  'invalid-request': 'Demande incomplète.',
  'no-case': 'Aucun dossier actif : le CRM ne peut pas fusionner le modèle.',
  'empty-template': "Le CRM n'a renvoyé aucun corps pour ce modèle.",
  'empty-index': "Le CRM n'a renvoyé aucun titre de modèle.",
  'nothing-to-write': 'Rien à écrire dans le formulaire.',
  'unknown-kind': "L'extension est plus ancienne qu'Agentor : mettez-la à jour.",
}

export function bridgeJobReasonLabel(reason: string) {
  const known = JOB_REASON_LABELS[reason]
  if (known) return known
  if (reason.startsWith('field-not-found')) {
    const fields = reason.slice('field-not-found:'.length).trim()
    return `Champ introuvable dans le formulaire${fields ? ` : ${fields}` : ''}.`
  }
  return `Échec de la demande (${reason}).`
}
