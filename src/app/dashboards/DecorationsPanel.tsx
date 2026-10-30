// Ascii Wall: decorations to copy.
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import { ButtonIcon, DeleteIcon } from '../../components/AppIcons'
import type { DashboardDecorationItem } from '../../lib/types'

export interface DecorationsPanelProps {
  addDashboardDecoration: () => void
  closeDashboardDecorationComposer: () => void
  dashboardDecorationComposerOpen: boolean
  dashboardDecorationCopiedId: string | null
  dashboardDecorationDraft: string
  dashboardDecorationDraftRef: MutableRefObject<HTMLTextAreaElement | null>
  dashboardDecorations: DashboardDecorationItem[]
  deleteDashboardDecoration: (decorationId: string) => void
  handleCopyDashboardDecoration: (item: DashboardDecorationItem) => Promise<void>
  openDashboardDecorationComposer: () => void
  setDashboardDecorationDraft: Dispatch<SetStateAction<string>>
  title: string
}

export function DecorationsPanel({
  addDashboardDecoration,
  closeDashboardDecorationComposer,
  dashboardDecorationComposerOpen,
  dashboardDecorationCopiedId,
  dashboardDecorationDraft,
  dashboardDecorationDraftRef,
  dashboardDecorations,
  deleteDashboardDecoration,
  handleCopyDashboardDecoration,
  openDashboardDecorationComposer,
  setDashboardDecorationDraft,
  title,
}: DecorationsPanelProps) {
  return (
    <article className="workspace-dashboard__panel workspace-dashboard__panel--decorations">
      <div className="workspace-dashboard__panel-title">
        <span>{title}</span>
        <button
          type="button"
          className="btn btn--ghost btn--small btn--with-icon"
          onClick={openDashboardDecorationComposer}
        >
          <ButtonIcon name="add" />
          Ajouter
        </button>
      </div>
      {dashboardDecorationComposerOpen ? (
        <div className="dashboard-decoration-composer">
          <textarea
            ref={dashboardDecorationDraftRef}
            className="textarea dashboard-decoration-composer__input"
            value={dashboardDecorationDraft}
            onChange={(event) => setDashboardDecorationDraft(event.target.value)}
            placeholder="ASCII à copier rapidement"
            rows={2}
          />
          <div className="dashboard-decoration-composer__actions">
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={closeDashboardDecorationComposer}
            >
              Annuler
            </button>
            <button type="button" className="btn btn--small" onClick={addDashboardDecoration}>
              Ajouter
            </button>
          </div>
        </div>
      ) : null}
      <div className="dashboard-decorations">
        {dashboardDecorations.length ? (
          dashboardDecorations.map((item) => (
            <div className="dashboard-decoration-item" key={item.id}>
              <button
                type="button"
                className="icon-btn-sm danger dashboard-decoration-item__delete"
                title="Supprimer"
                onClick={() => deleteDashboardDecoration(item.id)}
              >
                <DeleteIcon />
              </button>
              <pre className="dashboard-decoration-item__preview">
                {item.content.trimEnd() || ' '}
              </pre>
              <button
                type="button"
                className={`btn btn--small dashboard-decoration-item__copy${
                  dashboardDecorationCopiedId === item.id ? ' is-success' : ''
                }`}
                onClick={() => void handleCopyDashboardDecoration(item)}
              >
                {dashboardDecorationCopiedId === item.id ? 'Copié' : 'Copier'}
              </button>
            </div>
          ))
        ) : (
          <div className="dashboard-empty">Aucun décor configuré.</div>
        )}
      </div>
    </article>
  )
}
