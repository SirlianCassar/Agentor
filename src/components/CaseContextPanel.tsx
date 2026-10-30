import { useState } from 'react'
import { UiIcon } from './UiIcon'
import {
  contextFieldLabels,
  type CaseContext,
  type ContextField,
  type ContextFieldKey,
  type ContextSource,
} from '../context/caseContext'
import type { CaseTagKey } from '../context/caseTags'
import type { BridgeStatus } from '../hooks/useCaseContext'

const sourceLabels: Record<ContextSource, string> = {
  crm: 'CRM',
  portal: 'Portal',
  sharepoint: 'SharePoint',
  network: 'Disque réseau',
  user: 'Saisie',
}

// Fields shown as tiles, in reading order. The case number and title are the header.
const tileKeys: ContextFieldKey[] = [
  'productName',
  'serialNumber',
  'productType',
  'customerName',
  'country',
  'purchaseDate',
  'productionDate',
  'caseCreatedOn',
]

const formatTime = (iso: string) => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function stateOf(field: ContextField | undefined) {
  if (!field || field.value === null) return { id: 'missing', label: 'Manquant' }
  if (field.status === 'conflict') return { id: 'conflict', label: 'À vérifier' }
  if (field.status === 'confirmed') return { id: 'confirmed', label: 'Confirmé' }
  if (field.status === 'manual') return { id: 'manual', label: 'Modifié' }
  return { id: 'auto', label: `Lu dans ${sourceLabels[field.source]}` }
}

const bridgeLabel = (bridge: BridgeStatus | null) => {
  if (bridge?.state === 'listening') return 'Cairm+ connecté'
  if (bridge?.state === 'error') return `Connexion Cairm+ impossible : ${bridge.error ?? 'erreur inconnue'}`
  return 'Connexion Cairm+ désactivée'
}

interface CaseContextPanelProps {
  available: boolean
  context: CaseContext | null
  bridge: BridgeStatus | null
  tags: Record<CaseTagKey, string>
  autoFill: boolean
  onSetManual: (key: ContextFieldKey, value: string) => void
  onConfirm: (key: ContextFieldKey) => void
  onClear: () => void
  onCopy: (text: string) => void
  onFill: () => void
  onOpenSettings: () => void
}

export function CaseContextPanel({
  available,
  context,
  bridge,
  tags,
  autoFill,
  onSetManual,
  onConfirm,
  onClear,
  onCopy,
  onFill,
  onOpenSettings,
}: CaseContextPanelProps) {
  const [editing, setEditing] = useState<{ key: ContextFieldKey; value: string } | null>(null)

  const saveEdit = () => {
    if (!editing) return
    onSetManual(editing.key, editing.value)
    setEditing(null)
  }

  if (!context) {
    return (
      <div className="case-panel case-panel--empty">
        <UiIcon name="caseFile" className="case-panel__empty-icon" />
        <p className="case-panel__empty-text">
          {!available
            ? 'Le dossier actif n’est disponible que dans l’application installée.'
            : bridge?.state === 'listening'
              ? 'Aucun dossier pour l’instant. Ouvre une requête dans le CRM.'
              : 'Active la connexion Cairm+ pour recevoir le dossier ouvert dans le CRM.'}
        </p>
        {available && bridge?.state !== 'listening' ? (
          <button type="button" className="btn btn--small" onClick={onOpenSettings}>
            Ouvrir Paramètres › Connexions
          </button>
        ) : null}
      </div>
    )
  }

  const titleField = context.fields.caseTitle
  const conflicts = tileKeys.filter((key) => context.fields[key]?.status === 'conflict')

  const renderTile = (key: ContextFieldKey) => {
    const field = context.fields[key]
    const state = stateOf(field)
    const isEditing = editing?.key === key
    const value = field?.value ?? ''
    return (
      <div className={`case-tile case-tile--${state.id}`} key={key} data-field={key}>
        <div className="case-tile__head">
          <span className="case-tile__label">{contextFieldLabels[key]}</span>
          <code className="case-tile__tag" title="Tag rempli avec cette valeur">
            {tags[key]}
          </code>
        </div>
        {isEditing ? (
          <input
            autoFocus
            className="case-tile__input"
            aria-label={contextFieldLabels[key]}
            value={editing.value}
            onChange={(event) => setEditing({ key, value: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') saveEdit()
              if (event.key === 'Escape') setEditing(null)
            }}
            onBlur={saveEdit}
          />
        ) : value ? (
          <button
            type="button"
            className="case-tile__value"
            title={`Copier · ${state.label}${field ? ` · ${formatTime(field.updatedAt)}` : ''}${
              field?.aliasOf ? ` · Nom CRM : ${field.aliasOf}` : ''
            }`}
            onClick={() => onCopy(value)}
          >
            {value}
          </button>
        ) : (
          <span className="case-tile__value case-tile__value--empty">Non renseigné</span>
        )}
        <div className="case-tile__foot">
          <span className="case-tile__state">
            {field?.aliasOf ? 'Nom raccourci' : state.label}
          </span>
          <span className="case-tile__actions">
            {value && field?.status === 'auto' ? (
              <button
                type="button"
                title="Confirmer"
                aria-label={`Confirmer ${contextFieldLabels[key]}`}
                onClick={() => onConfirm(key)}
              >
                <UiIcon name="check" />
              </button>
            ) : null}
            <button
              type="button"
              title={value ? 'Corriger' : 'Saisir'}
              aria-label={`Corriger ${contextFieldLabels[key]}`}
              onClick={() => setEditing({ key, value })}
            >
              <UiIcon name="edit" />
            </button>
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="case-panel">
      <header className="case-panel__head">
        <div className="case-panel__identity">
          <button
            type="button"
            className="case-panel__number"
            title="Copier le numéro"
            onClick={() => onCopy(context.caseKey.number ?? '')}
          >
            {context.caseKey.number || 'Dossier sans numéro'}
          </button>
          <div className="case-panel__title">{titleField?.value || 'Sans titre'}</div>
        </div>
        <div className="case-panel__head-side">
          <button
            type="button"
            className={`case-panel__link case-panel__link--${bridge?.state ?? 'off'}`}
            title={`${bridgeLabel(bridge)}. Réglages dans Paramètres › Connexions.`}
            onClick={onOpenSettings}
          >
            <span className="case-panel__dot" aria-hidden="true" />
            <span>Cairm+</span>
          </button>
          <span className="case-panel__meta" title="Dernière mise à jour">
            {formatTime(context.updatedAt)}
          </span>
          <button
            type="button"
            className="case-panel__icon-btn"
            title="Oublier ce dossier"
            aria-label="Oublier ce dossier"
            onClick={onClear}
          >
            <UiIcon name="delete" />
          </button>
        </div>
      </header>

      {conflicts.length ? (
        <div className="case-panel__conflicts">
          <UiIcon name="warning" className="case-panel__conflicts-icon" />
          <div className="case-panel__conflicts-body">
            {conflicts.map((key) => (
              <div className="case-panel__conflict" key={key}>
                <span>{contextFieldLabels[key]} :</span>
                {(context.fields[key]?.candidates ?? []).map((candidate) => (
                  <button
                    key={`${candidate.source}-${candidate.value}`}
                    type="button"
                    className="case-panel__candidate"
                    title={`Garder la valeur de ${sourceLabels[candidate.source]}`}
                    onClick={() => onSetManual(key, candidate.value)}
                  >
                    {candidate.value} <small>{sourceLabels[candidate.source]}</small>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="case-panel__tiles">{tileKeys.map(renderTile)}</div>

      {context.lastTask ? (
        <section className="case-panel__task">
          <div className="case-tile__head">
            <span className="case-tile__label">Dernière tâche</span>
            <code className="case-tile__tag">{tags.lastTask}</code>
          </div>
          <div className="case-panel__task-subject">{context.lastTask.subject}</div>
          {context.lastTask.description ? (
            <div className="case-panel__task-text">{context.lastTask.description}</div>
          ) : null}
        </section>
      ) : null}

      <footer className="case-panel__foot">
        <button type="button" className="primary case-panel__fill" onClick={onFill}>
          <UiIcon name="fill" />
          <span>Remplir le mail et la tâche</span>
        </button>
        <button
          type="button"
          className="case-panel__hint"
          onClick={onOpenSettings}
          title="Changer dans Paramètres › Connexions"
        >
          Remplissage au chargement : {autoFill ? 'actif' : 'désactivé'}
        </button>
      </footer>
    </div>
  )
}
