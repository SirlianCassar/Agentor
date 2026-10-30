// Top bar: one tab per case, then the active case's key values. A click on a
// value copies it and says so; the case window keeps the full detail.
import { useEffect, useRef, useState } from 'react'
import { UiIcon } from '../../components/UiIcon'
import {
  contextFieldLabels,
  isFieldImported,
  type CaseContext,
  type CaseImportKey,
  type ContextFieldKey,
} from '../../context/caseContext'
import type { CaseTagKey } from '../../context/caseTags'
import type { BridgeStatus } from '../../hooks/useCaseContext'

export interface CaseBarTab {
  id: string
  label: string
  title: string
  filled: boolean
  bound: boolean
  locked: boolean
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
  imports: Record<CaseImportKey, boolean>
  onSelect: (id: string) => void
  onAdd: () => void
  onClose: (id: string) => void
  onToggleLock: (id: string) => void
  // Resolves to true once the value is in the clipboard.
  onCopy: (value: string) => Promise<boolean>
  onOpenCase: () => void
  onOpenSettings: () => void
}

// The values kept in the bar, in this order. The client copies its name and
// address the way Cairm copies the customer details.
const chipKeys: ContextFieldKey[] = ['productName', 'serialNumber', 'purchaseDate', 'customerName']
const chipLabels: Partial<Record<ContextFieldKey, string>> = {
  productName: 'Produit',
  serialNumber: 'SN',
  purchaseDate: 'DOP',
  customerName: 'Client',
}
const COPIED_MS = 1400

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
  imports,
  onSelect,
  onAdd,
  onClose,
  onToggleLock,
  onCopy,
  onOpenCase,
  onOpenSettings,
}: CaseBarProps) {
  const shownKeys = chipKeys.filter((key) => isFieldImported(imports, key))
  const conflicts = caseContext
    ? shownKeys.filter((key) => caseContext.fields[key]?.status === 'conflict').length
    : 0
  // The value just copied shows « Copié » for a moment.
  const [copied, setCopied] = useState<string | null>(null)
  const copiedTimer = useRef<number | null>(null)
  useEffect(() => () => {
    if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current)
  }, [])
  const copy = async (id: string, value: string) => {
    if (!value || !(await onCopy(value))) return
    setCopied(id)
    if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current)
    copiedTimer.current = window.setTimeout(() => setCopied(null), COPIED_MS)
  }
  const address = caseContext?.fields.customerFull?.value ?? ''

  return (
    <header className="case-bar">
      <div className="case-bar__tabs" role="tablist" aria-label="Dossiers ouverts">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`case-tab${tab.id === activeId ? ' is-active' : ''}${tab.bound ? '' : ' case-tab--draft'}${tab.locked ? ' is-locked' : ''}`}
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
              className={`case-tab__lock${tab.locked ? ' is-on' : ''}`}
              title={
                tab.locked
                  ? 'Onglet verrouillé : il reste ouvert, même après la fermeture d’Agentor. Cliquer pour déverrouiller.'
                  : 'Verrouiller : garder cet onglet et son dossier, même après la fermeture d’Agentor'
              }
              aria-label={tab.locked ? `Déverrouiller ${tab.label}` : `Verrouiller ${tab.label}`}
              aria-pressed={tab.locked}
              onClick={() => onToggleLock(tab.id)}
            >
              <UiIcon name={tab.locked ? 'lock' : 'unlock'} />
            </button>
            {tab.locked ? null : (
              <button
                type="button"
                className={`case-tab__close${closeArmedId === tab.id ? ' is-armed' : ''}`}
                title={closeArmedId === tab.id ? 'Confirmer la fermeture' : 'Fermer cet onglet'}
                aria-label={`Fermer ${tab.label}`}
                onClick={() => onClose(tab.id)}
              >
                <UiIcon name="close" />
              </button>
            )}
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
              className={`case-bar__number${copied === 'number' ? ' is-copied' : ''}`}
              title="Copier le numéro RQT"
              onClick={() => void copy('number', caseContext.caseKey.number ?? '')}
            >
              {copied === 'number' ? <UiIcon name="check" /> : null}
              {copied === 'number' ? 'Copié' : caseContext.caseKey.number || 'RQT sans numéro'}
            </button>
            {isFieldImported(imports, 'caseTitle') ? (
              <button
                type="button"
                className={`case-bar__title${copied === 'caseTitle' ? ' is-copied' : ''}`}
                title={`${caseContext.fields.caseTitle?.value ?? ''} · Cliquer pour copier`}
                disabled={!caseContext.fields.caseTitle?.value}
                onClick={() => void copy('caseTitle', caseContext.fields.caseTitle?.value ?? '')}
              >
                {copied === 'caseTitle' ? 'Copié' : caseContext.fields.caseTitle?.value || 'Sans titre'}
              </button>
            ) : null}
            <div className="case-bar__chips">
              {shownKeys.map((key) => {
                const field = caseContext.fields[key]
                const value = field?.value ?? ''
                const state = !value ? 'missing' : field?.status ?? 'auto'
                // The client copies the name and address block made by Cairm when there is one.
                const copyValue = key === 'customerName' && address ? address : value
                const isCopied = copied === key
                const hint =
                  key === 'customerName' && address
                    ? ' · Cliquer pour copier le nom et l’adresse (format Cairm)'
                    : value
                      ? ' · Cliquer pour copier'
                      : ''
                return (
                  <button
                    key={key}
                    type="button"
                    className={`case-chip case-chip--${state}${isCopied ? ' is-copied' : ''}`}
                    disabled={!copyValue}
                    title={`${contextFieldLabels[key]} · ${tags[key]}${field?.aliasOf ? ` · Nom CRM : ${field.aliasOf}` : ''}${hint}`}
                    onClick={() => void copy(key, copyValue)}
                  >
                    <span className="case-chip__label">{chipLabels[key]}</span>
                    <span className="case-chip__value">
                      {isCopied ? (
                        <>
                          <UiIcon name="check" /> Copié
                        </>
                      ) : (
                        value || '—'
                      )}
                    </span>
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
              <button type="button" className="ghost case-bar__details" onClick={onOpenCase} title="Tout le dossier et ses corrections">
                Détails
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
