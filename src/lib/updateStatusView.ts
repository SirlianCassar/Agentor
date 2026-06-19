/* Presentation helpers that turn an UpdateStatus into user-facing labels. */
import type { UpdateStatus } from './storage'
import { formatVersionLabel } from './formatting'

export function getUpdateSettingsLabel(status: UpdateStatus | null) {
  if (!status) return 'Statut inconnu.'
  if (status.phase === 'disabled') return 'Mises à jour auto disponibles sur l’application installée.'
  return status.message
}

export function getUpdateAvailableVersionLabel(status: UpdateStatus | null, currentVersion: string) {
  const remoteVersion = formatVersionLabel(status?.version)
  if (remoteVersion) return remoteVersion
  switch (status?.phase) {
    case 'not-available':
      return currentVersion
    case 'checking':
      return 'Recherche...'
    case 'error':
      return 'Indisponible'
    default:
      return 'En attente'
  }
}

export function getUpdatePhaseTitle(status: UpdateStatus | null) {
  switch (status?.phase) {
    case 'checking':
      return 'Recherche en cours'
    case 'available':
      return 'Mise à jour trouvée'
    case 'downloading':
      return 'Téléchargement en cours'
    case 'downloaded':
      return 'Prête à installer'
    case 'not-available':
      return 'Application à jour'
    case 'error':
      return 'Vérification impossible'
    case 'disabled':
      return 'Mises à jour désactivées'
    default:
      return 'Statut inconnu'
  }
}

export function getUpdatePhaseTone(status: UpdateStatus | null) {
  switch (status?.phase) {
    case 'checking':
    case 'available':
    case 'downloading':
      return 'active'
    case 'downloaded':
      return 'ready'
    case 'not-available':
      return 'success'
    case 'error':
      return 'error'
    default:
      return 'idle'
  }
}
