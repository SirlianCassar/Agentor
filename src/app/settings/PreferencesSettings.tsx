// Settings › Affichage: visual options and general settings.
import { ButtonIcon } from '../../components/AppIcons'
import type { AppSettings } from '../../lib/types'
import { EXPORT_FONT_SIZE_MAX, EXPORT_FONT_SIZE_MIN, exportFontOptions } from '../appShared'

export interface PreferencesSettingsProps {
  clearAllArmed: boolean
  editorLineHeight: number
  exportFont: string
  exportFontSize: number
  handleClearData: () => void
  referencesInPanel: boolean
  writingTabs: boolean
  compactDensity: boolean
  renderSettingsSlider: (label: string, valueLabel: string, minLabel: string, maxLabel: string, value: number, min: number, max: number, step: number | string, onChange: (next: number) => void, options?: { description?: string; disabled?: boolean; }) => JSX.Element
  textScale: number
  updateSettings: (patch: Partial<AppSettings>) => void
  zoomValue: number
}

export function PreferencesSettings({
  clearAllArmed,
  editorLineHeight,
  exportFont,
  exportFontSize,
  handleClearData,
  referencesInPanel,
  writingTabs,
  compactDensity,
  renderSettingsSlider,
  textScale,
  updateSettings,
  zoomValue,
}: PreferencesSettingsProps) {
  return (
    <div className="modal__grid modal__grid--single">
      <div className="list-card list-card--form">
        <div className="list-card__body">
          <div className="settings-stack">
            <section className="settings-group">
              <div className="settings-group__title">Affichage</div>
              <div className="settings-block">
                <div className="settings-option">
                  <div className="settings-option__info">
                    <div className="settings-option__title">Références dans le panneau</div>
                    <div className="settings-option__desc">
                      Les boutons du lanceur (rappels, calculateur, procédures…) s’ouvrent à côté du mail. Désactivé : en
                      fenêtre flottante.
                    </div>
                  </div>
                  <label className="settings-toggle" aria-label="Références dans le panneau">
                    <input
                      type="checkbox"
                      checked={referencesInPanel}
                      onChange={(event) => updateSettings({ referencesInPanel: event.target.checked })}
                    />
                    <span className="settings-toggle__track">
                      <span className="settings-toggle__thumb" />
                    </span>
                  </label>
                </div>
                <div className="settings-option">
                  <div className="settings-option__info">
                    <div className="settings-option__title">Rédaction en onglets</div>
                    <div className="settings-option__desc">
                      Mail, Tâche et Notes l’un après l’autre, pour les petits écrans. Désactivé : mail et tâche côte à
                      côte.
                    </div>
                  </div>
                  <label className="settings-toggle" aria-label="Rédaction en onglets">
                    <input
                      type="checkbox"
                      checked={writingTabs}
                      onChange={(event) => updateSettings({ writingTabs: event.target.checked })}
                    />
                    <span className="settings-toggle__track">
                      <span className="settings-toggle__thumb" />
                    </span>
                  </label>
                </div>
                <div className="settings-option">
                  <div className="settings-option__info">
                    <div className="settings-option__title">Affichage compact</div>
                    <div className="settings-option__desc">
                      Resserre les espacements du bandeau, de la bibliothèque, du panneau et de l’écran Contenus.
                      Désactivé : affichage confortable.
                    </div>
                  </div>
                  <label className="settings-toggle" aria-label="Affichage compact">
                    <input
                      type="checkbox"
                      checked={compactDensity}
                      onChange={(event) => updateSettings({ compactDensity: event.target.checked })}
                    />
                    <span className="settings-toggle__track">
                      <span className="settings-toggle__thumb" />
                    </span>
                  </label>
                </div>
                {renderSettingsSlider(
                  'Taille du texte',
                  `${Math.round(textScale * 100)}%`,
                  '85%',
                  '140%',
                  textScale,
                  0.85,
                  1.4,
                  0.05,
                  (nextScale) => {
                    const nextTextScale = Math.min(1.4, Math.max(0.85, nextScale))
                    updateSettings({ textScale: nextTextScale })
                  },
                  {
                    description:
                      'Ajuste la densité globale de lecture dans toute l’application.',
                  },
                )}
                {renderSettingsSlider(
                  'Zoom',
                  `${Math.round(zoomValue * 100)}%`,
                  '80%',
                  '130%',
                  zoomValue,
                  0.8,
                  1.3,
                  0.05,
                  (nextZoom) => {
                    const zoom = Math.min(1.3, Math.max(0.8, nextZoom))
                    updateSettings({ zoom })
                  },
                  {
                    description: 'Modifie l’échelle générale des panneaux et des cartes.',
                  },
                )}
                {renderSettingsSlider(
                  'Interligne éditeur',
                  `${editorLineHeight.toFixed(2)}x`,
                  '1.30x',
                  '2.00x',
                  editorLineHeight,
                  1.3,
                  2,
                  0.05,
                  (nextHeight) => {
                    const nextEditorLineHeight = Math.min(2, Math.max(1.3, nextHeight))
                    updateSettings({ editorLineHeight: nextEditorLineHeight })
                  },
                  {
                    description: 'Laisse plus ou moins d’air entre les lignes de l’éditeur.',
                  },
                )}
              </div>
            </section>

            <section className="settings-group">
              <div className="settings-group__title">Général</div>
              <div className="settings-block">
                <div className="settings-option settings-option--danger">
                  <div className="settings-option__info">
                    <div className="settings-option__title">Suppression des données</div>
                    <div className="settings-option__desc">
                      Efface l'ensemble du contenu et restaure les réglages par défaut.
                    </div>
                  </div>
                  <button
                    className={`btn btn--small btn--danger btn--with-icon${
                      clearAllArmed ? ' is-armed' : ''
                    }`}
                    type="button"
                    onClick={handleClearData}
                    title={
                      clearAllArmed ? 'Confirmer suppression des données' : 'Delete all data'
                    }
                    aria-label="Delete all data"
                  >
                    <ButtonIcon name="delete" />
                    {clearAllArmed ? 'Confirmer suppression' : 'Delete all data'}
                  </button>
                </div>
              </div>
            </section>

            <section className="settings-group">
              <div className="settings-group__title">Texte exporté</div>
              <div className="settings-block">
                <div>
                  <div className="settings-row">
                    <div className="settings-label">Police</div>
                  </div>
                  <select
                    className="select select--roomy"
                    value={exportFont}
                    onChange={(event) =>
                      updateSettings({ exportFont: event.target.value })
                    }
                  >
                    {exportFontOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                      ))}
                  </select>
                </div>
                {renderSettingsSlider(
                  'Taille',
                  `${exportFontSize}px`,
                  `${EXPORT_FONT_SIZE_MIN}px`,
                  `${EXPORT_FONT_SIZE_MAX}px`,
                  exportFontSize,
                  EXPORT_FONT_SIZE_MIN,
                  EXPORT_FONT_SIZE_MAX,
                  1,
                  (nextSize) => {
                    const nextExportFontSize = Math.min(
                      EXPORT_FONT_SIZE_MAX,
                      Math.max(EXPORT_FONT_SIZE_MIN, nextSize),
                    )
                    updateSettings({ exportFontSize: nextExportFontSize })
                  },
                  {
                    description: 'Définit la taille du texte lors de la copie/export.',
                  },
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
