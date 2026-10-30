// Settings › Vue d’ensemble: saved content, export, import, mail memory.
import type { MouseEvent } from 'react'
import { ExportDataIcon, ExportEmailsIcon, ImportDataIcon } from '../../components/AppIcons'
import type { SettingsCountKey, SettingsTab } from '../../lib/settingsNavigation'
import type { AppData, AppSettings } from '../../lib/types'

export interface OverviewSettingsProps {
  data: AppData
  handleExportHistory: () => Promise<void>
  handleExportJson: () => Promise<void>
  handleImportClick: (event: MouseEvent<HTMLButtonElement>) => Promise<void>
  historyLimit: number
  historyOnCopy: boolean
  openSettingsTab: (tab: SettingsTab) => void
  renderSettingsSlider: (label: string, valueLabel: string, minLabel: string, maxLabel: string, value: number, min: number, max: number, step: number | string, onChange: (next: number) => void, options?: { description?: string; disabled?: boolean; }) => JSX.Element
  settingsCounts: Record<SettingsCountKey, number>
  updateSettings: (patch: Partial<AppSettings>) => void
}

export function OverviewSettings({
  data,
  handleExportHistory,
  handleExportJson,
  handleImportClick,
  historyLimit,
  historyOnCopy,
  openSettingsTab,
  renderSettingsSlider,
  settingsCounts,
  updateSettings,
}: OverviewSettingsProps) {
  return (
    <div className="modal__grid modal__grid--single settings-home">

      <div className="settings-home__grid">
        <section className="list-card list-card--form">
          <div className="list-card__header">
            <div className="list-card__title-group">
              <div className="list-card__title">Contenu enregistré</div>
              <div className="list-card__subtitle">
                Clique sur un chiffre pour ouvrir la page correspondante.
              </div>
            </div>
          </div>
          <div className="list-card__body">
            <div className="settings-home__metrics">
              {(
                [
                  ['Mails', settingsCounts.templates, 'templates'],
                  ['Snippets', settingsCounts.snippets, 'snippets'],
                  ['S-Task', settingsCounts.sTasks, 'sTasks'],
                  ['F-Task', settingsCounts.fTasks, 'fTasks'],
                  ['Troubleshotgun', settingsCounts.troubleshootgun, 'troubleshootgun'],
                  ['Procédures', settingsCounts.procedures, 'dashboardPortal'],
                  ['Produits et SKU', settingsCounts.products, 'dashboardSpareParts'],
                  ['News', settingsCounts.news, 'dashboardNews'],
                  ['Appels', data.callHistory.length, 'callHistory'],
                ] as Array<[string, number, SettingsTab]>
              ).map(([label, value, tab]) => (
                <button
                  type="button"
                  className="settings-home__metric"
                  key={label}
                  onClick={() => openSettingsTab(tab)}
                >
                  <span>{label}</span>
                  <strong>{value}</strong>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="list-card list-card--form">
          <div className="list-card__header">
            <div className="list-card__title-group">
              <div className="list-card__title">Export / Import</div>
              <div className="list-card__subtitle">
                Sauvegarde complète de l’application et restauration manuelle.
              </div>
            </div>
          </div>
          <div className="list-card__body">
            <div className="settings-stack settings-stack--tight">
              <button
                className="btn btn--primary btn--small btn--with-icon settings-home__export-btn"
                type="button"
                onClick={handleExportJson}
              >
                <ExportDataIcon />
                Exporter contenu + paramètres
              </button>
              <button
                className="btn btn--ghost btn--small btn--with-icon settings-home__export-btn"
                type="button"
                onClick={handleImportClick}
                title="Importer les données (Shift = remplacer)"
              >
                <ImportDataIcon />
                Importer contenu + paramètres
              </button>
            </div>
          </div>
        </section>

        <section className="list-card list-card--form">
          <div className="list-card__header">
            <div className="list-card__title-group">
              <div className="list-card__title">Mémoire des emails</div>
              <div className="list-card__subtitle">
                Active ou désactive la mise en mémoire des mails copiés.
              </div>
            </div>
          </div>
          <div className="list-card__body">
            <div className="settings-block">
              <div className="settings-option">
                <div className="settings-option__info">
                  <div className="settings-option__title">
                    Sauvegarder les copies email
                  </div>
                  <div className="settings-option__desc">
                    Ajoute l’email copié dans l’historique.
                  </div>
                </div>
                <label className="settings-toggle">
                  <input
                    type="checkbox"
                    checked={historyOnCopy}
                    onChange={(event) =>
                      updateSettings({ historyOnCopy: event.target.checked })
                    }
                  />
                  <span className="settings-toggle__track">
                    <span className="settings-toggle__thumb" />
                  </span>
                </label>
              </div>
              {renderSettingsSlider(
                'Taille max',
                `${historyLimit} entrées`,
                '50',
                '400',
                historyLimit,
                50,
                400,
                10,
                (nextLimit) => {
                  const nextHistoryLimit = Math.min(400, Math.max(50, nextLimit))
                  updateSettings({ historyLimit: nextHistoryLimit })
                },
                {
                  description: 'Détermine combien de copies email sont conservées.',
                  disabled: !historyOnCopy,
                },
              )}
              <button
                className="btn btn--ghost btn--small btn--with-icon settings-home__download-btn"
                type="button"
                onClick={handleExportHistory}
                title="Exporter l’historique (.txt)"
                disabled={!data.history.length}
              >
                <ExportEmailsIcon />
                Télécharger les emails
                {data.history.length ? ` (${data.history.length})` : ''}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
