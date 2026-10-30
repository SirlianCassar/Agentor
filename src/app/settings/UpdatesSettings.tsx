// Settings › Mise à jour.
import { formatUpdateCheckedAt } from '../../lib/formatting'
import type { UpdateStatus } from '../../lib/storage'
import { getUpdatePhaseTitle, getUpdatePhaseTone } from '../../lib/updateStatusView'
import { APP_VERSION_LABEL } from '../appShared'

export interface UpdatesSettingsProps {
  availableUpdateVersionLabel: string
  checkingUpdateManually: boolean
  handleCheckUpdatesNow: () => Promise<void>
  handleInstallDownloadedUpdate: (skipConfirmation?: boolean) => Promise<void>
  installingDownloadedUpdate: boolean
  isUpdateCheckRunning: boolean
  isUpdateReadyToInstall: boolean
  showUpdateProgress: boolean
  updateDownloadProgress: number | null
  updateSettingsLabel: string
  updateStatus: UpdateStatus | null
}

export function UpdatesSettings({
  availableUpdateVersionLabel,
  checkingUpdateManually,
  handleCheckUpdatesNow,
  handleInstallDownloadedUpdate,
  installingDownloadedUpdate,
  isUpdateCheckRunning,
  isUpdateReadyToInstall,
  showUpdateProgress,
  updateDownloadProgress,
  updateSettingsLabel,
  updateStatus,
}: UpdatesSettingsProps) {
  return (
    <div className="modal__grid modal__grid--single">
      <div className="list-card list-card--form">
        <div className="list-card__header">
          <div className="list-card__title-group">
            <div className="list-card__title">Mise à jour</div>
          </div>
        </div>
        <div className="list-card__body">
          <div className="settings-update">
            <section className="settings-update__hero">
              <div
                className={`settings-update__badge is-${getUpdatePhaseTone(updateStatus)}`}
              >
                {getUpdatePhaseTitle(updateStatus)}
              </div>
              <div className="settings-update__hero-title">Agentor {APP_VERSION_LABEL}</div>
              <div className="settings-update__hero-text">
                {updateSettingsLabel}
                <br />
                Disponible : {availableUpdateVersionLabel} · Dernière vérification :{' '}
                {formatUpdateCheckedAt(updateStatus?.checkedAt)}
              </div>
            </section>

            {showUpdateProgress ? (
              <div className="settings-update__progress">
                <div className="settings-update__progress-head">
                  <span>
                    {updateStatus?.phase === 'downloaded'
                      ? 'Téléchargement terminé'
                      : updateStatus?.phase === 'downloading'
                        ? 'Téléchargement en cours'
                        : 'Préparation du téléchargement'}
                  </span>
                  <strong>
                    {typeof updateDownloadProgress === 'number'
                      ? `${updateDownloadProgress}%`
                      : 'En attente'}
                  </strong>
                </div>
                <div
                  className={`settings-update__progress-bar${
                    typeof updateDownloadProgress === 'number'
                      ? ''
                      : ' is-indeterminate'
                  }`}
                >
                  <span
                    style={{
                      width: `${
                        typeof updateDownloadProgress === 'number'
                          ? updateDownloadProgress
                          : 100
                      }%`,
                    }}
                  />
                </div>
                <div className="settings-update__progress-meta">
                  {updateStatus?.phase === 'downloaded'
                    ? 'Le téléchargement est terminé. Tu peux lancer l’installation.'
                    : updateStatus?.phase === 'downloading'
                      ? 'La barre se met à jour en direct pendant le téléchargement.'
                      : 'La mise à jour a été trouvée, le téléchargement se prépare.'}
                </div>
              </div>
            ) : null}

            <div className="settings-update__actions">
              <button
                type="button"
                className="btn btn--ghost btn--small"
                onClick={handleCheckUpdatesNow}
                disabled={checkingUpdateManually || isUpdateCheckRunning}
              >
                {checkingUpdateManually || isUpdateCheckRunning
                  ? 'Recherche en cours...'
                  : 'Rechercher une mise à jour'}
              </button>
              {isUpdateReadyToInstall ? (
                <button
                  type="button"
                  className="btn btn--small"
                  onClick={() => void handleInstallDownloadedUpdate()}
                  disabled={installingDownloadedUpdate}
                >
                  {installingDownloadedUpdate
                    ? 'Installation...'
                    : 'Appliquer la mise à jour'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
