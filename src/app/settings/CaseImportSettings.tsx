// Settings › Données importées: what Agentor keeps from the case Cairm+ sends.
import {
  CASE_IMPORT_KEYS,
  DEFAULT_CASE_IMPORT_OFF,
  type CaseContext,
  type CaseImportKey,
} from '../../context/caseContext'
import { caseTagLabels, type CaseTagKey } from '../../context/caseTags'
import type { AppSettings } from '../../lib/types'

export interface CaseImportSettingsProps {
  // The case as received, before the choices below are applied.
  receivedCase: CaseContext | null
  imports: Record<CaseImportKey, boolean>
  caseTags: Record<CaseTagKey, string>
  updateSettings: (patch: Partial<AppSettings>) => void
}

const hints: Partial<Record<CaseImportKey, string>> = {
  caseTitle: 'Affiché à côté du numéro RQT.',
  purchaseDate: 'DOP dans la barre du dossier.',
  customerName: 'Nom et prénom du client.',
  customerFull: 'Nom, adresse, téléphone et email, mis en forme comme le bouton de copie client de Cairm. Copiés par la case Client.',
  productFull: 'SN et DoP, mis en forme comme le bouton de copie produit de Cairm.',
  lastTask: 'Sujet et texte de la dernière tâche du dossier.',
}

export function CaseImportSettings({ receivedCase, imports, caseTags, updateSettings }: CaseImportSettingsProps) {
  const set = (key: CaseImportKey, value: boolean) =>
    updateSettings({ caseImport: { ...imports, [key]: value } })
  const received = (key: CaseImportKey) =>
    key === 'lastTask' ? receivedCase?.lastTask?.subject : receivedCase?.fields[key]?.value

  return (
    <div className="settings-page settings-page--narrow">
      <section className="list-card list-card--form">
        <div className="list-card__header">
          <div className="list-card__title">Ce qu’Agentor garde du dossier envoyé par Cairm+</div>
          <button
            type="button"
            className="btn btn--ghost btn--small"
            onClick={() => updateSettings({ caseImport: {} })}
          >
            Choix par défaut
          </button>
        </div>
        <div className="list-card__body">
          <p className="settings-option__desc case-import__intro">
            Une information décochée n’est ni enregistrée, ni affichée, ni utilisée pour remplir les tags. Ce qui
            était déjà reçu est oublié dès qu’on la décoche. Le numéro RQT identifie le dossier : il est toujours gardé.
          </p>
          <ul className="case-import">
            <li className="case-import__row is-locked">
              <label className="case-import__check">
                <input type="checkbox" checked disabled aria-label="Numéro RQT" />
                <span className="case-import__label">Numéro RQT</span>
              </label>
              <code className="case-import__tag">{caseTags.caseNumber}</code>
              <span className="case-import__value">{receivedCase?.caseKey.number ?? '—'}</span>
            </li>
            {CASE_IMPORT_KEYS.map((key) => {
              const value = received(key)
              return (
                <li key={key} className={`case-import__row${imports[key] ? '' : ' is-off'}`}>
                  <label className="case-import__check">
                    <input
                      type="checkbox"
                      checked={imports[key]}
                      aria-label={caseTagLabels[key]}
                      onChange={(event) => set(key, event.target.checked)}
                    />
                    <span className="case-import__label">
                      {caseTagLabels[key]}
                      {DEFAULT_CASE_IMPORT_OFF.includes(key) ? <small> · non importé par défaut</small> : null}
                    </span>
                  </label>
                  <code className="case-import__tag">{caseTags[key]}</code>
                  <span className="case-import__value" title={value ?? ''}>
                    {imports[key] ? value || '—' : 'Non importé'}
                  </span>
                  {hints[key] ? <span className="case-import__hint">{hints[key]}</span> : null}
                </li>
              )
            })}
          </ul>
        </div>
      </section>
    </div>
  )
}
