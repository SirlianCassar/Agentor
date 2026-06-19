import { useCallback, useEffect, useRef, useState } from 'react'
import {
  checkForUpdatesNow,
  getUpdateStatus,
  installDownloadedUpdate,
  onUpdateStatus,
  type UpdateStatus,
} from '../lib/storage'

/* Owns auto-update state and the electron-updater bridge wiring. `onToast`
   surfaces user-facing messages (manual check progress, install results). */
export function useAppUpdates(onToast: (message: string) => void) {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null)
  const [checkingUpdateManually, setCheckingUpdateManually] = useState(false)
  const [installingDownloadedUpdate, setInstallingDownloadedUpdate] = useState(false)
  const manualUpdateCheckRequestedRef = useRef(false)

  useEffect(() => {
    let active = true

    getUpdateStatus()
      .then((status) => {
        if (!active) return
        setUpdateStatus(status)
      })
      .catch(() => {
        if (!active) return
        setUpdateStatus({
          phase: 'error',
          message: 'Impossible de récupérer le statut de mise à jour.',
        })
      })

    const unsubscribe = onUpdateStatus((status) => {
      if (!active) return
      setUpdateStatus(status)

      if (!manualUpdateCheckRequestedRef.current) return

      if (status.phase === 'not-available') {
        onToast('Aucune mise à jour disponible.')
        manualUpdateCheckRequestedRef.current = false
        setCheckingUpdateManually(false)
      } else if (status.phase === 'available' || status.phase === 'downloading') {
        onToast('Mise à jour trouvée. Téléchargement en cours…')
        manualUpdateCheckRequestedRef.current = false
        setCheckingUpdateManually(false)
      } else if (status.phase === 'downloaded') {
        onToast('Mise à jour prête. Ouvre Paramètres > Mise à jour pour l’installer.')
        manualUpdateCheckRequestedRef.current = false
        setCheckingUpdateManually(false)
      } else if (status.phase === 'error') {
        onToast(status.message)
        manualUpdateCheckRequestedRef.current = false
        setCheckingUpdateManually(false)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [onToast])

  const handleCheckUpdatesNow = useCallback(async () => {
    manualUpdateCheckRequestedRef.current = true
    setCheckingUpdateManually(true)
    try {
      const result = await checkForUpdatesNow()
      if (!result.ok) {
        if (result.reason === 'disabled') {
          onToast('Recherche de MAJ disponible uniquement sur l’application installée.')
        } else if (result.reason === 'missing-token') {
          onToast('GH_TOKEN/GITHUB_TOKEN manquant pour accéder au repo privé.')
        } else if (result.reason === 'already-checking') {
          onToast('Une recherche de MAJ est déjà en cours.')
        } else if (result.reason === 'restart-pending') {
          onToast('Redémarrage déjà en cours pour installer la MAJ.')
        } else {
          onToast('Recherche de MAJ impossible.')
        }
        manualUpdateCheckRequestedRef.current = false
        setCheckingUpdateManually(false)
      }
    } catch {
      onToast('Recherche de MAJ impossible.')
      manualUpdateCheckRequestedRef.current = false
      setCheckingUpdateManually(false)
    }
  }, [onToast])

  const handleInstallDownloadedUpdate = useCallback(
    async (skipConfirmation = false) => {
      if (updateStatus?.phase !== 'downloaded') return
      if (!skipConfirmation) {
        const confirmed = window.confirm(
          'Une mise à jour est prête. Voulez-vous redémarrer maintenant pour l’installer ?',
        )
        if (!confirmed) return
      }

      setInstallingDownloadedUpdate(true)
      try {
        const result = await installDownloadedUpdate()
        if (!result.ok) {
          if (result.reason === 'not-downloaded') {
            onToast('La mise à jour n’est pas encore prête.')
          } else if (result.reason === 'disabled') {
            onToast('Installation MAJ disponible uniquement sur l’application installée.')
          } else if (result.reason === 'missing-token') {
            onToast('GH_TOKEN/GITHUB_TOKEN manquant pour installer la MAJ.')
          } else if (result.reason === 'restart-pending') {
            onToast('Redémarrage déjà en cours pour installer la MAJ.')
          } else {
            onToast('Installation de la MAJ impossible.')
          }
          setInstallingDownloadedUpdate(false)
          return
        }
        onToast('Redémarrage pour installer la mise à jour…')
        window.setTimeout(() => setInstallingDownloadedUpdate(false), 5000)
      } catch {
        onToast('Installation de la MAJ impossible.')
        setInstallingDownloadedUpdate(false)
      }
    },
    [onToast, updateStatus],
  )

  return {
    updateStatus,
    checkingUpdateManually,
    installingDownloadedUpdate,
    handleCheckUpdatesNow,
    handleInstallDownloadedUpdate,
  }
}
