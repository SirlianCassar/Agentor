// Settings › Tags du dossier.
import { isFieldImported, type CaseContext, type CaseImportKey } from '../../context/caseContext'
import {
  CASE_TAG_KEYS,
  type CaseTagKey,
  caseTagLabels,
  DEFAULT_CASE_TAGS,
  findDuplicateCaseTags,
  normalizeCaseTag,
} from '../../context/caseTags'
import type { AppData, AppSettings } from '../../lib/types'

export interface CaseTagsSettingsProps {
  activeCase: CaseContext | null
  caseAutoFill: boolean
  caseTags: Record<CaseTagKey, string>
  imports: Record<CaseImportKey, boolean>
  data: AppData
  updateSettings: (patch: Partial<AppSettings>) => void
}

export function CaseTagsSettings({
  activeCase,
  caseAutoFill,
  caseTags,
  imports,
  data,
  updateSettings,
}: CaseTagsSettingsProps) {
  // Only the information imported from Cairm+ can fill a tag.
  const shownKeys = CASE_TAG_KEYS.filter((key) => (key === 'lastTask' ? imports.lastTask : isFieldImported(imports, key)))
  return (
    <div className="settings-page settings-page--narrow">
      <section className="list-card list-card--form">
        <div className="list-card__body">
          <div className="settings-block">
            <div className="settings-option">
              <div className="settings-option__info">
                <div className="settings-option__title">Remplissage automatique</div>
                <div className="settings-option__desc">
                  Les tags du mail, de la task et des snippets sont remplis avec le dossier de l’onglet, au chargement et dès que ses informations arrivent. Un tag sans valeur reste visible.
                </div>
              </div>
              <label className="settings-toggle" aria-label="Remplissage automatique">
              <input
                type="checkbox"
                checked={caseAutoFill}
                onChange={(event) => updateSettings({ caseAutoFill: event.target.checked })}
              />
              <span className="settings-toggle__track">
                <span className="settings-toggle__thumb" />
              </span>
            </label>
            </div>
          </div>
        </div>
      </section>
      <section className="list-card list-card--form">
        <div className="list-card__header">
          <div className="list-card__title">Tag de chaque information</div>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => updateSettings({ caseTags: {} })}
          >
            Tags par défaut
          </button>
        </div>
        <div className="list-card__body">
          {findDuplicateCaseTags(caseTags).length ? (
            <div className="case-tags__warning">
              Tag utilisé deux fois : {findDuplicateCaseTags(caseTags).join(', ')}. Seule la première information sera utilisée.
            </div>
          ) : null}
          <table className="case-tags">
            <thead>
              <tr>
                <th>Information</th>
                <th>Tag</th>
                <th>Dossier actif</th>
              </tr>
            </thead>
            <tbody>
              {shownKeys.map((key: CaseTagKey) => {
                const current =
                  key === 'lastTask'
                    ? activeCase?.lastTask?.subject
                    : activeCase?.fields[key]?.value
                return (
                  <tr key={key}>
                    <td>{caseTagLabels[key]}</td>
                    <td>
                      <input
                        key={caseTags[key]}
                        className="input case-tags__input"
                        defaultValue={caseTags[key]}
                        aria-label={`Tag pour ${caseTagLabels[key]}`}
                        placeholder={DEFAULT_CASE_TAGS[key]}
                        onBlur={(event) => {
                          const tag = normalizeCaseTag(event.target.value) ?? DEFAULT_CASE_TAGS[key]
                          event.target.value = tag
                          if (tag === caseTags[key]) return
                          updateSettings({ caseTags: { ...data.settings.caseTags, [key]: tag } })
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') event.currentTarget.blur()
                        }}
                      />
                    </td>
                    <td className={current ? 'case-tags__value' : 'case-tags__value is-empty'}>
                      {current || '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
