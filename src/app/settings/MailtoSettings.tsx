// Settings › Mailto buttons of the procedures.
import { ButtonIcon } from '../../components/AppIcons'
import type { ProcedureMailtoLink } from '../../lib/types'

export interface MailtoSettingsProps {
  addProcedureMailtoLink: () => void
  normalizedProcedureMailtos: Required<ProcedureMailtoLink>[]
  removeProcedureMailtoLink: (id: string) => void
  updateProcedureMailtoLink: (id: string, patch: Partial<ProcedureMailtoLink>) => void
}

export function MailtoSettings({
  addProcedureMailtoLink,
  normalizedProcedureMailtos,
  removeProcedureMailtoLink,
  updateProcedureMailtoLink,
}: MailtoSettingsProps) {
  return (
    <div className="modal__grid modal__grid--single">
      <div className="list-card list-card--form">
        <div className="list-card__header">
          <div className="list-card__title-group">
            <div className="list-card__title">Configuration</div>
          </div>
          <div className="list-card__tools">
            <button
              className="btn btn--ghost btn--small btn--with-icon"
              type="button"
              onClick={addProcedureMailtoLink}
            >
              <ButtonIcon name="add" />
              Ajouter
            </button>
          </div>
        </div>
        <div className="list-card__body">
          <div className="settings-stack settings-stack--tight">
            {normalizedProcedureMailtos.length ? (
              normalizedProcedureMailtos.map((link, linkIndex) => (
                <section className="quick-link-editor mailto-sequence-card" key={link.id}>
                  <div className="quick-link-editor__head">
                    <div className="quick-link-editor__identity">
                      <div className="quick-link-editor__badge">{linkIndex + 1}</div>
                      <div>
                        <div className="quick-link-editor__title">{link.label}</div>
                        <div className="quick-link-editor__meta">Séquence mailto</div>
                      </div>
                    </div>
                    <button
                      className="btn btn--ghost btn--small btn--with-icon"
                      type="button"
                      onClick={() => removeProcedureMailtoLink(link.id)}
                    >
                      <ButtonIcon name="delete" />
                      Supprimer
                    </button>
                  </div>
                  <div className="settings-grid settings-grid--mailto">
                    <input
                      className="input"
                      value={link.label}
                      placeholder="Nom du template"
                      onChange={(event) =>
                        updateProcedureMailtoLink(link.id, {
                          label: event.target.value,
                        })
                      }
                    />
                    <input
                      className="input"
                      value={link.to}
                      placeholder="destinataire@exemple.com, autre@exemple.com"
                      onChange={(event) =>
                        updateProcedureMailtoLink(link.id, {
                          to: event.target.value,
                        })
                      }
                    />
                    <input
                      className="input"
                      value={link.cc ?? ''}
                      placeholder="CC : copie@exemple.com"
                      onChange={(event) =>
                        updateProcedureMailtoLink(link.id, {
                          cc: event.target.value,
                        })
                      }
                    />
                    <input
                      className="input"
                      value={link.subject ?? ''}
                      placeholder="Titre du mail"
                      onChange={(event) =>
                        updateProcedureMailtoLink(link.id, {
                          subject: event.target.value,
                        })
                      }
                    />
                    <textarea
                      className="textarea textarea--tall"
                      value={link.body ?? ''}
                      placeholder="Corps du mail"
                      onChange={(event) =>
                        updateProcedureMailtoLink(link.id, {
                          body: event.target.value,
                        })
                      }
                    />
                  </div>
                </section>
              ))
            ) : (
              <div className="empty-state">Aucun mailto configuré.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
