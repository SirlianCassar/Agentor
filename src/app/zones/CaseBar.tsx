// Top bar: the main tab (it follows the CRM, with its last cases), the pinned
// tabs, then the active case's key values. A click on a
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
  // The main tab follows the CRM; the others are pinned.
  main: boolean
}

// A case the main tab can go back to. `index` is its place in the history;
// the current case has none.
export interface CaseBarHistoryItem {
  index: number | null
  label: string
  detail: string
  filled: boolean
}

export interface CaseBarProps {
  tabs: CaseBarTab[]
  activeId: string
  canAdd: boolean
  canPin: boolean
  // Main tab's cases, the current one first.
  history: CaseBarHistoryItem[]
  caseContext: CaseContext | null
  boundNumber: string | null
  available: boolean
  bridge: BridgeStatus | null
  tags: Record<CaseTagKey, string>
  imports: Record<CaseImportKey, boolean>
  onSelect: (id: string) => void
  onAdd: () => void
  onPin: () => void
  onUnpin: (id: string) => void
  onRecall: (index: number) => void
  // Resolves to true once the value is in the clipboard.
  onCopy: (value: string) => Promise<boolean>
  onOpenSettings: () => void
  // The gear of the whole application, at the top right of the window.
  settingsLabel: string
  onOpenAppSettings: () => void
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
  if (!available) return 'Agentor Bridge indisponible'
  if (bridge?.state === 'listening') return 'Agentor Bridge connecté'
  if (bridge?.state === 'error') return 'Agentor Bridge en erreur'
  return 'Agentor Bridge désactivé'
}

export function CaseBar({
  tabs,
  activeId,
  canAdd,
  canPin,
  history,
  caseContext,
  boundNumber,
  available,
  bridge,
  tags,
  imports,
  onSelect,
  onAdd,
  onPin,
  onUnpin,
  onRecall,
  onCopy,
  onOpenSettings,
  settingsLabel,
  onOpenAppSettings,
}: CaseBarProps) {
  const shownKeys = chipKeys.filter((key) => isFieldImported(imports, key))
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
  // Menu of the main tab's last cases.
  const [historyOpen, setHistoryOpen] = useState(false)
  const historyRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!historyOpen) return
    const close = (event: Event) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !historyRef.current?.contains(event.target as Node)) {
        setHistoryOpen(false)
      }
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [historyOpen])
  const pastCount = history.filter((item) => item.index !== null).length
  const address = caseContext?.fields.customerFull?.value ?? ''

  return (
    <header className="case-bar">
      <div className="case-bar__tabs" role="tablist" aria-label="Dossiers ouverts">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            ref={tab.main ? historyRef : undefined}
            className={`case-tab${tab.id === activeId ? ' is-active' : ''}${tab.bound ? '' : ' case-tab--draft'}${tab.main ? ' case-tab--main' : ' is-pinned'}`}
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab.id === activeId}
              className="case-tab__main"
              title={tab.main ? `${tab.title}${tab.title ? ' · ' : ''}Onglet principal : suit la requête ouverte dans le CRM` : tab.title}
              onClick={() => onSelect(tab.id)}
            >
              <UiIcon name={tab.main ? (tab.bound ? 'caseFile' : 'edit') : 'pin'} className="case-tab__icon" />
              <span className="case-tab__label">{tab.label}</span>
              {tab.filled ? <span className="case-tab__dot" aria-label="Brouillon en cours" /> : null}
            </button>
            {tab.main && pastCount ? (
              <button
                type="button"
                className={`case-tab__history${historyOpen ? ' is-open' : ''}`}
                title={`Revenir à un des ${history.length} derniers dossiers affichés`}
                aria-label="Derniers dossiers affichés"
                aria-haspopup="menu"
                aria-expanded={historyOpen}
                onClick={() => setHistoryOpen((open) => !open)}
              >
                <UiIcon name="caretDown" />
              </button>
            ) : null}
            {tab.main ? (
              <button
                type="button"
                className="case-tab__pin"
                title={
                  canPin
                    ? 'Épingler : mettre ce dossier de côté dans un nouvel onglet. L’onglet principal reste libre pour la requête suivante.'
                    : tab.bound || tab.filled
                      ? 'Nombre maximal d’onglets atteint : désépingle un dossier terminé'
                      : 'Rien à épingler : aucun dossier ni brouillon'
                }
                aria-label={`Épingler ${tab.label}`}
                disabled={!canPin}
                onClick={onPin}
              >
                <UiIcon name="pin" />
              </button>
            ) : (
              <button
                type="button"
                className="case-tab__unpin"
                title="Désépingler : le dossier et son brouillon retournent dans les derniers dossiers de l’onglet principal"
                aria-label={`Désépingler ${tab.label}`}
                onClick={() => onUnpin(tab.id)}
              >
                <UiIcon name="unpin" />
              </button>
            )}
            {tab.main && historyOpen ? (
              <div className="case-history" role="menu" aria-label="Derniers dossiers affichés">
                {history.map((item) => (
                  <button
                    key={item.index ?? 'current'}
                    type="button"
                    role="menuitem"
                    className={`case-history__item${item.index === null ? ' is-current' : ''}`}
                    onClick={() => {
                      setHistoryOpen(false)
                      if (item.index !== null) onRecall(item.index)
                    }}
                  >
                    <span className="case-history__label">{item.label}</span>
                    {item.filled ? <span className="case-tab__dot" aria-label="Brouillon en cours" /> : null}
                    <span className="case-history__detail">{item.index === null ? 'Affiché' : item.detail}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          className="case-bar__add"
          title={canAdd ? 'Nouvel onglet épinglé, sans dossier' : 'Nombre maximal d’onglets atteint'}
          aria-label="Nouvel onglet"
          disabled={!canAdd}
          onClick={onAdd}
        >
          <UiIcon name="add" />
        </button>
        <button
          type="button"
          className={`case-bar__bridge case-bar__bridge--${available ? bridge?.state ?? 'off' : 'off'}`}
          title={`${bridgeText(available, bridge)}. Réglages dans Paramètres › Connexion Agentor Bridge.`}
          onClick={onOpenSettings}
        >
          <span className="case-bar__bridge-dot" aria-hidden="true" />
          <span>{bridgeText(available, bridge)}</span>
        </button>
        <button
          type="button"
          className="case-bar__settings"
          title={settingsLabel}
          aria-label={settingsLabel}
          onClick={onOpenAppSettings}
        >
          <UiIcon name="settings" />
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
          </>
        ) : (
          <span className="case-bar__empty">
            {boundNumber
              ? `${boundNumber} : les informations du dossier n’ont pas encore été reçues. Rouvre la requête dans le CRM.`
              : 'Onglet sans dossier. La prochaine requête ouverte dans le CRM s’affiche dans l’onglet principal.'}
          </span>
        )}
      </div>
    </header>
  )
}
