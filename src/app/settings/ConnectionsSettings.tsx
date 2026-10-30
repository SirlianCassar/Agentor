// Settings › Connexion Cairm+.
import type { Dispatch, SetStateAction } from 'react'
import { ButtonIcon } from '../../components/AppIcons'
import type { CaseContextState } from '../../hooks/useCaseContext'

export interface ConnectionsSettingsProps {
  caseContextState: CaseContextState
  handleCopyBridgeToken: () => Promise<void>
  setToast: Dispatch<SetStateAction<string | null>>
}

export function ConnectionsSettings({
  caseContextState,
  handleCopyBridgeToken,
  setToast,
}: ConnectionsSettingsProps) {
  return (
    <div className="settings-page settings-page--narrow">
      <section className="list-card list-card--form">
        <div className="list-card__header">
          <div className="list-card__title">Connexion Cairm+</div>
          <span className={`connection-state connection-state--${caseContextState.bridge?.state ?? 'off'}`}>
            {caseContextState.bridge?.state === 'listening'
              ? `Active sur le port ${caseContextState.bridge.port}`
              : caseContextState.bridge?.state === 'error'
                ? `Erreur : ${caseContextState.bridge.error ?? 'inconnue'}`
                : 'Désactivée'}
          </span>
        </div>
        <div className="list-card__body">
          {caseContextState.available ? (
            <div className="settings-block">
              <div className="settings-option">
                <div className="settings-option__info">
                  <div className="settings-option__title">Recevoir le dossier ouvert dans le CRM</div>
                  <div className="settings-option__desc">
                    Agentor écoute uniquement sur cet ordinateur (127.0.0.1). Rien n’est écrit dans le CRM.
                  </div>
                </div>
                <label className="settings-toggle" aria-label="Connexion Cairm+">
              <input
                type="checkbox"
                checked={Boolean(caseContextState.bridge?.enabled)}
                onChange={(event) => void caseContextState.setBridgeEnabled(event.target.checked)}
              />
              <span className="settings-toggle__track">
                <span className="settings-toggle__thumb" />
              </span>
            </label>
              </div>
              <div className="settings-option">
                <div className="settings-option__info">
                  <div className="settings-option__title">Jeton d’appairage</div>
                  <div className="settings-option__desc">
                    À coller dans Cairm+ › Paramètres › Mode développeur (DEVMODE) › Connexion à Agentor 9000. Il n’est jamais affiché ni enregistré en clair.
                  </div>
                </div>
                <div className="settings-option__actions">
                  <button
                    type="button"
                    className="btn btn--small btn--with-icon"
                    disabled={caseContextState.bridge?.state !== 'listening'}
                    onClick={() => void handleCopyBridgeToken()}
                  >
                    <ButtonIcon name="copy" />
                    Copier
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    title="L’ancien jeton ne fonctionnera plus : il faudra le recoller dans Cairm+."
                    onClick={() => {
                      void caseContextState.regenerateToken().then((token) =>
                        setToast(token ? 'Nouveau jeton créé. Recolle-le dans Cairm+.' : 'Impossible de créer un jeton.'),
                      )
                    }}
                  >
                    Régénérer
                  </button>
                </div>
              </div>
              <ol className="connection-steps">
                <li>Active la connexion ci-dessus.</li>
                <li>Copie le jeton.</li>
                <li>Dans Edge, ouvre Cairm+ › Paramètres › Mode développeur (DEVMODE) › Connexion à Agentor 9000, colle le jeton, active l’envoi, clique sur « Enregistrer », puis sur « Tester la connexion ». Recharge ensuite la page du dossier CRM.</li>
              </ol>
            </div>
          ) : (
            <div className="empty-state">La connexion n’est disponible que dans l’application installée.</div>
          )}
        </div>
      </section>
    </div>
  )
}
