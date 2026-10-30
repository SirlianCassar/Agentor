// Settings › Procédures (portal procedures).
import type { Dispatch, SetStateAction } from 'react'
import { ButtonIcon } from '../../components/AppIcons'

export interface ProceduresSettingsProps {
  handleAddPortalProcedure: () => void
  renderPortalCodeEditorSettings: () => JSX.Element
  selectedPortalProcedureId: string | null
  setPortalProcedureEditorOpen: Dispatch<SetStateAction<boolean>>
}

export function ProceduresSettings({
  handleAddPortalProcedure,
  renderPortalCodeEditorSettings,
  selectedPortalProcedureId,
  setPortalProcedureEditorOpen,
}: ProceduresSettingsProps) {
  return (
    <div className="modal__grid modal__grid--single">
      <div className="list-card list-card--form">
        <div className="list-card__header">
          <div className="list-card__title-group">
            <div className="list-card__title">Configuration</div>
          </div>
          <div className="list-card__tools">
            {selectedPortalProcedureId ? (
              <button
                className="btn btn--ghost btn--small btn--with-icon"
                type="button"
                onClick={() => setPortalProcedureEditorOpen(true)}
              >
                <ButtonIcon name="edit" />
                Modifier
              </button>
            ) : null}
            <button
              className="btn btn--ghost btn--small btn--with-icon"
              type="button"
              onClick={handleAddPortalProcedure}
            >
              <ButtonIcon name="add" />
              Nouveau
            </button>
          </div>
        </div>
        <div className="list-card__body list-card__body--portal-editor">
          {renderPortalCodeEditorSettings()}
        </div>
      </div>
    </div>
  )
}
