import { useState } from 'react'
import { UiIcon } from './UiIcon'
import {
  CONTEXT_FIELD_KEYS,
  contextFieldLabels,
  type CaseContext,
  type ContextField,
  type ContextFieldKey,
  type ContextSource,
} from '../context/caseContext'
import type { BridgeStatus } from '../hooks/useCaseContext'

const sourceLabels: Record<ContextSource, string> = {
  crm: 'CRM',
  portal: 'Portal',
  sharepoint: 'SharePoint',
  network: 'Disque réseau',
  user: 'Saisie',
}

const formatTime = (iso: string) => {
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function statusOf(field: ContextField | undefined) {
  if (!field || field.value === null) return { id: 'missing', label: 'Manquant' }
  if (field.status === 'conflict') return { id: 'conflict', label: 'À vérifier' }
  if (field.status === 'confirmed') return { id: 'confirmed', label: 'Confirmé' }
  if (field.status === 'manual') return { id: 'manual', label: 'Modifié' }
  return { id: 'auto', label: sourceLabels[field.source] }
}

interface CaseContextPanelProps {
  available: boolean
  context: CaseContext | null
  bridge: BridgeStatus | null
  onSetManual: (key: ContextFieldKey, value: string) => void
  onConfirm: (key: ContextFieldKey) => void
  onClear: () => void
  onCopy: (text: string) => void
  onFill: () => void
  onSetBridgeEnabled: (enabled: boolean) => void
  onCopyToken: () => void
}

export function CaseContextPanel({
  available,
  context,
  bridge,
  onSetManual,
  onConfirm,
  onClear,
  onCopy,
  onFill,
  onSetBridgeEnabled,
  onCopyToken,
}: CaseContextPanelProps) {
  const [editing, setEditing] = useState<{ key: ContextFieldKey; value: string } | null>(null)

  const saveEdit = () => {
    if (!editing) return
    onSetManual(editing.key, editing.value)
    setEditing(null)
  }

  return (
    <div className="case-panel">
      {context ? (
        <>
          <div className="case-panel__head">
            <div className="case-panel__number">{context.caseKey.number || 'Dossier sans numéro'}</div>
            <div className="case-panel__meta">Mis à jour à {formatTime(context.updatedAt)}</div>
            <button type="button" className="case-panel__icon-btn" title="Oublier ce dossier" aria-label="Oublier ce dossier" onClick={onClear}>
              <UiIcon name="delete" />
            </button>
          </div>
          <dl className="case-panel__fields">
            {CONTEXT_FIELD_KEYS.map((key) => {
              const field = context.fields[key]
              const status = statusOf(field)
              const isEditing = editing?.key === key
              return (
                <div className={`case-field case-field--${status.id}`} key={key}>
                  <dt className="case-field__label">{contextFieldLabels[key]}</dt>
                  <dd className="case-field__value">
                    {isEditing ? (
                      <input
                        autoFocus
                        className="case-field__input"
                        aria-label={contextFieldLabels[key]}
                        value={editing.value}
                        onChange={(event) => setEditing({ key, value: event.target.value })}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') saveEdit()
                          if (event.key === 'Escape') setEditing(null)
                        }}
                        onBlur={saveEdit}
                      />
                    ) : (
                      <span className="case-field__text">{field?.value ?? '—'}</span>
                    )}
                    {field?.status === 'conflict' && field.candidates?.length ? (
                      <span className="case-field__candidates">
                        {field.candidates.map((candidate) => (
                          <button
                            key={`${candidate.source}-${candidate.value}`}
                            type="button"
                            className="case-field__candidate"
                            title={`Garder la valeur de ${sourceLabels[candidate.source]}`}
                            onClick={() => onSetManual(key, candidate.value)}
                          >
                            {candidate.value} · {sourceLabels[candidate.source]}
                          </button>
                        ))}
                      </span>
                    ) : null}
                  </dd>
                  <span
                    className={`case-field__status case-field__status--${status.id}`}
                    title={field ? `${status.label} · ${sourceLabels[field.source]} · ${formatTime(field.updatedAt)}` : status.label}
                  >
                    {status.label}
                  </span>
                  <span className="case-field__actions">
                    {field?.value ? (
                      <button type="button" className="case-panel__icon-btn" title="Copier" aria-label={`Copier ${contextFieldLabels[key]}`} onClick={() => onCopy(field.value ?? '')}>
                        <UiIcon name="copy" />
                      </button>
                    ) : null}
                    {field?.value && field.status === 'auto' ? (
                      <button type="button" className="case-panel__icon-btn" title="Confirmer" aria-label={`Confirmer ${contextFieldLabels[key]}`} onClick={() => onConfirm(key)}>
                        <UiIcon name="check" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="case-panel__icon-btn"
                      title="Corriger"
                      aria-label={`Corriger ${contextFieldLabels[key]}`}
                      onClick={() => setEditing({ key, value: field?.value ?? '' })}
                    >
                      <UiIcon name="edit" />
                    </button>
                  </span>
                </div>
              )
            })}
          </dl>
          {context.lastTask ? (
            <div className="case-panel__task">
              <div className="case-panel__task-label">Dernière tâche</div>
              <div className="case-panel__task-subject">{context.lastTask.subject}</div>
              {context.lastTask.description ? (
                <div className="case-panel__task-text">{context.lastTask.description}</div>
              ) : null}
            </div>
          ) : null}
          <button type="button" className="primary case-panel__fill" onClick={onFill}>
            <UiIcon name="fill" />
            <span>Remplir le mail et la tâche</span>
          </button>
        </>
      ) : (
        <p className="case-panel__empty">
          {available
            ? 'Aucun dossier actif. Ouvre une requête dans le CRM avec Cairm+ connecté.'
            : 'Le contexte du dossier n’est disponible que dans l’application installée.'}
        </p>
      )}

      {available ? (
        <div className="case-panel__bridge">
          <span className={`case-panel__dot case-panel__dot--${bridge?.state ?? 'off'}`} aria-hidden="true" />
          <span className="case-panel__bridge-text">
            {bridge?.state === 'listening'
              ? `Cairm+ peut se connecter (port ${bridge.port})`
              : bridge?.state === 'error'
                ? `Connexion impossible : ${bridge.error ?? 'erreur inconnue'}`
                : 'Connexion Cairm+ désactivée'}
          </span>
          {bridge?.state === 'listening' ? (
            <button type="button" className="case-panel__icon-btn" title="Copier le jeton d’appairage" aria-label="Copier le jeton d’appairage" onClick={onCopyToken}>
              <UiIcon name="plug" />
            </button>
          ) : null}
          <label className="case-panel__switch" title={bridge?.enabled ? 'Désactiver' : 'Activer'}>
            <input
              type="checkbox"
              checked={Boolean(bridge?.enabled)}
              onChange={(event) => onSetBridgeEnabled(event.target.checked)}
              aria-label="Connexion Cairm+"
            />
            <span />
          </label>
        </div>
      ) : null}
    </div>
  )
}
