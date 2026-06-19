/* Procedure step parsing, draft sanitization, and portal-forward display. */
import { normalizeTaskSectionId } from './taskDraft'
import type { CustomerPortalCode, Procedure } from './types'

export const PROCEDURE_CHECK_MARKER = '[ ]'
export type ProcedureStepItem = {
  id: string
  text: string
  isCheckable: boolean
}

export function parseProcedureStepItems(steps: string): ProcedureStepItem[] {
  return steps
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== '')
    .map((line, index) => {
      const trimmed = line.trimStart()
      const isCheckable = trimmed.startsWith(PROCEDURE_CHECK_MARKER)
      const text = isCheckable
        ? trimmed.slice(PROCEDURE_CHECK_MARKER.length).trimStart()
        : trimmed
      return { id: `${index}-${text}`, text, isCheckable }
    })
}

export const sanitizeProcedureDraft = (procedure: Procedure & { categoryId?: string }) => {
  const { categoryId, ...rest } = procedure
  void categoryId
  return {
    ...rest,
    productName: rest.productName ?? '',
    optionalNotes: rest.optionalNotes ?? '',
    taskSectionId: normalizeTaskSectionId(rest.taskSectionId),
  }
}

export const formatPortalForwardLabel = (
  procedure: CustomerPortalCode,
  inactiveLabel = 'Forward',
) => {
  if (!procedure.showForward) return inactiveLabel
  const target = procedure.forwardTarget?.trim()
  return target ? `Forward vers ${target}` : 'Forward vers cible non renseignée'
}

export const shouldShowPortalForwardIndicator = (procedure: CustomerPortalCode) => {
  if (!procedure.showForward) return false
  const target = procedure.forwardTarget?.trim()
  if (!target) return false
  const normalized = target
    .toLowerCase()
    .replace(/[àâä]/g, 'a')
    .replace(/\s+/g, ' ')
    .trim()
  if (!normalized) return false
  return !['personne', 'a personne', 'vers personne', 'fwrd a personne', 'fwd a personne'].includes(
    normalized,
  )
}

