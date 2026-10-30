/* Portal procedure forward display. */
import type { CustomerPortalCode } from './types'

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

