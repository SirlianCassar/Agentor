// Top bar of the new interface: one tab per case, then the active case's key
// values. A click on a value copies it; the case window keeps the full detail.
import { UiIcon } from '../../components/UiIcon'
import { contextFieldLabels, type CaseContext, type ContextFieldKey } from '../../context/caseContext'
import type { CaseTagKey } from '../../context/caseTags'
import type { BridgeStatus } from '../../hooks/useCaseContext'

export interface CaseBarTab {
  id: string
  label: string
  title: string
  filled: boolean
  bound: boolean
}

export interface CaseBarProps {
  tabs: CaseBarTab[]
  activeId: string
  closeArmedId: string | null
  canAdd: boolean
  caseContext: CaseContext | null
  boundNumber: string | null
  available: boolean
  bridge: BridgeStatus | null
  tags: Record<CaseTagKey, string>
  onSelect: (id: string) => void
  onAdd: () => void
  onClose: (id: string) => void
  onCopy: (value: string) => void
  onFill: () => void
  onOpenCase: () => void
  onOpenSettings: () => void
}

const chipKeys: ContextFieldKey[] = ['productName', 'productType', 'serialNumber', 'customerName', 'country', 'purchaseDate']

const bridgeText = (available: boolean, bridge: BridgeStatus | null) => {
  if (!available) return 'Cairm+ indisponible'
  if (bridge?.state === 'listening') return 'Cairm+ connecté'
  if (bridge?.state === 'error') return 'Cairm+ en erreur'
  return 'Cairm+ désactivé'
}

export function CaseBar({
  tabs,
  activeId,
  closeArmedId,
  canAdd,
  caseContext,
  boundNumber,
  available,
  bridge,
  tags,
  onSelect,
  onAdd,
  onClose,
  onCopy,
  onFill,
  onOpenCase,
  onOpenSettings,
}: CaseBarProps) {
  const conflicts = caseContext
    ? chipKeys.filter((key) => caseContext.fields[key]?.status === 'conflict').length
    : 0

  return (
    <header className="case-bar">
      <div className="case-bar__tabs" role="tablist" aria-label="Dossiers ouverts">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`case-tab${tab.id === activeId ? ' is-active' : ''}${tab.bound ? '' : ' case-tab--draft'}`}
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab.id === activeId}
              className="case-tab__main"
              title={tab.title}
              onClick={() => onSelect(tab.id)}
            >
              <UiIcon name={tab.bound ? 'caseFile' : 'edit'} className="case-tab__icon" />
              <span className="case-tab__label">{tab.label}</span>
              {tab.filled ? <span className="case-tab__dot" aria-label="Brouillon en cours" /> : null}
            </button>
            <button
              type="button"
              className={`case-tab__close${closeArmedId === tab.id ? ' is-armed' : ''}`}
              title={closeArmedId === tab.id ? 'Confirmer la fermeture' : 'Fermer cet onglet'}
              aria-label={`Fermer ${tab.label}`}
              onClick={() => onClose(tab.id)}
            >
              <UiIcon name="close" />
            </button>
          </div>
        ))}
        <button
          type="button"
          className="case-bar__add"
          title={canAdd ? 'Nouvel onglet sans dossier' : 'Nombre maximal d’onglets atteint'}
          aria-label="Nouvel onglet"
          disabled={!canAdd}
          onClick={onAdd}
        >
          <UiIcon name="add" />
        </button>
        <button
          type="button"
          className={`case-bar__bridge case-bar__bridge--${available ? bridge?.state ?? 'off' : 'off'}`}
          title={`${bridgeText(available, bridge)}. Réglages dans Paramètres › Connexion Cairm+.`}
          onClick={onOpenSettings}
        >
          <span className="case-bar__bridge-dot" aria-hidden="true" />
          <span>{bridgeText(available, bridge)}</span>
        </button>
      </div>

      <div className="case-bar__case">
        {caseContext ? (
          <>
            <button
              type="button"
              className="case-bar__number"
              title="Copier le numéro"
              onClick={() => onCopy(caseContext.caseKey.number ?? '')}
            >
              {caseContext.caseKey.number || 'Sans numéro'}
            </button>
            <span className="case-bar__title" title={caseContext.fields.caseTitle?.value ?? ''}>
              {caseContext.fields.caseTitle?.value || 'Sans titre'}
            </span>
            <div className="case-bar__chips">
              {chipKeys.map((key) => {
                const field = caseContext.fields[key]
                const value = field?.value ?? ''
                const state = !value ? 'missing' : field?.status ?? 'auto'
                return (
                  <button
                    key={key}
                    type="button"
                    className={`case-chip case-chip--${state}`}
                    disabled={!value}
                    title={`${contextFieldLabels[key]} · ${tags[key]}${field?.aliasOf ? ` · Nom CRM : ${field.aliasOf}` : ''}${value ? ' · Cliquer pour copier' : ''}`}
                    onClick={() => onCopy(value)}
                  >
                    <span className="case-chip__label">{contextFieldLabels[key]}</span>
                    <span className="case-chip__value">{value || '—'}</span>
                  </button>
                )
              })}
            </div>
            <div className="case-bar__actions">
              {conflicts ? (
                <button type="button" className="case-bar__warning" onClick={onOpenCase}>
                  <UiIcon name="warning" />
                  <span>{conflicts} à vérifier</span>
                </button>
              ) : null}
              <button type="button" className="ghost case-bar__details" onClick={onOpenCase} title="Tout le dossier, corrections et dernière tâche">
                Détails
              </button>
              <button type="button" className="primary case-bar__fill" onClick={onFill} title="Remplir les tags du mail et de la tâche">
                <UiIcon name="fill" />
                <span>Remplir</span>
              </button>
            </div>
          </>
        ) : (
          <span className="case-bar__empty">
            {boundNumber
              ? `${boundNumber} : les informations du dossier n’ont pas encore été reçues. Rouvre la requête dans le CRM.`
              : 'Onglet sans dossier. Une requête ouverte dans le CRM arrive dans son propre onglet.'}
          </span>
        )}
      </div>
    </header>
  )
}
