// Settings › Troubleshotgun products and their mail templates.
import type { Dispatch, SetStateAction } from 'react'
import { AddIcon, ButtonIcon, DeleteIcon } from '../../components/AppIcons'
import { normalizeTaskTemplateKind } from '../../lib/taskDraft'
import type { AppData, AppSettings, Language, MailTemplate, TroubleshootgunFolder } from '../../lib/types'
import { createId } from '../../lib/utils'

export interface TroubleshootgunSettingsProps {
  data: AppData
  selectedTroubleshootgunFolderId: string | null
  selectedTroubleshootgunTemplateId: string | null
  setSelectedTroubleshootgunFolderId: Dispatch<SetStateAction<string | null>>
  setSelectedTroubleshootgunTemplateId: Dispatch<SetStateAction<string | null>>
  setTroubleshootgunFolderNameDraft: Dispatch<SetStateAction<string>>
  troubleshootgunFolderNameDraft: string
  troubleshootgunFolders: TroubleshootgunFolder[]
  updateSettings: (patch: Partial<AppSettings>) => void
}

export function TroubleshootgunSettings({
  data,
  selectedTroubleshootgunFolderId,
  selectedTroubleshootgunTemplateId,
  setSelectedTroubleshootgunFolderId,
  setSelectedTroubleshootgunTemplateId,
  setTroubleshootgunFolderNameDraft,
  troubleshootgunFolderNameDraft,
  troubleshootgunFolders,
  updateSettings,
}: TroubleshootgunSettingsProps) {
  const folder =
    troubleshootgunFolders.find(
      (item) => item.id === selectedTroubleshootgunFolderId,
    ) ?? troubleshootgunFolders[0]
  const template =
    folder?.templates.find(
      (item) => item.id === selectedTroubleshootgunTemplateId,
    ) ?? folder?.templates[0]
  const patchFolder = (patch: Partial<TroubleshootgunFolder>) => {
    if (!folder) return
    updateSettings({
      troubleshootgunFolders: troubleshootgunFolders.map((item) =>
        item.id === folder.id ? { ...item, ...patch } : item,
      ),
    })
  }
  const patchTemplate = (patch: Partial<MailTemplate>) => {
    if (!folder || !template) return
    patchFolder({
      templates: folder.templates.map((item) =>
        item.id === template.id ? { ...item, ...patch } : item,
      ),
    })
  }
  const createTemplate = () => {
    if (!folder) return
    const nextTemplate: MailTemplate = {
      id: createId('troubleshootgun-template'),
      name: 'Nouveau template',
      description: '',
      content: '',
      language: 'fr',
      taskImportMode: 'none',
    }
    patchFolder({ templates: [...folder.templates, nextTemplate] })
    setSelectedTroubleshootgunTemplateId(nextTemplate.id)
  }

  return (
    <div className="modal__grid troubleshootgun-settings">
      <div className="list-card troubleshootgun-settings__products">
        <div className="list-card__header">
          <div className="list-card__title">Produits</div>
        </div>
        <div className="list-card__body">
          <div className="troubleshootgun-settings__create-product">
            <input
              className="input"
              value={troubleshootgunFolderNameDraft}
              onChange={(event) => setTroubleshootgunFolderNameDraft(event.target.value)}
              placeholder="Nom du produit"
            />
            <button
              className="btn btn--primary btn--small"
              type="button"
              onClick={() => {
                const name = troubleshootgunFolderNameDraft.trim()
                if (!name) return
                const nextFolder: TroubleshootgunFolder = {
                  id: createId('troubleshootgun-folder'),
                  name,
                  templates: [],
                }
                updateSettings({
                  troubleshootgunFolders: [...troubleshootgunFolders, nextFolder],
                })
                setSelectedTroubleshootgunFolderId(nextFolder.id)
                setSelectedTroubleshootgunTemplateId(null)
                setTroubleshootgunFolderNameDraft('')
              }}
            >
              <AddIcon /> Ajouter
            </button>
          </div>
          <div className="troubleshootgun-settings__list">
            {troubleshootgunFolders.length ? (
              troubleshootgunFolders.map((item) => (
                <div
                  className={`list-item list-item--compact${
                    folder?.id === item.id ? ' is-selected' : ''
                  }`}
                  key={item.id}
                  onClick={() => {
                    setSelectedTroubleshootgunFolderId(item.id)
                    setSelectedTroubleshootgunTemplateId(item.templates[0]?.id ?? null)
                  }}
                >
                  <div className="list-item__content">
                    <div className="list-item__title">{item.name}</div>
                    <div className="list-item__meta">
                      {item.templates.length} template{item.templates.length > 1 ? 's' : ''}
                    </div>
                  </div>
                  <button
                    className="icon-btn-sm danger"
                    type="button"
                    title="Supprimer le produit"
                    onClick={(event) => {
                      event.stopPropagation()
                      const nextFolders = troubleshootgunFolders.filter(
                        (entry) => entry.id !== item.id,
                      )
                      updateSettings({ troubleshootgunFolders: nextFolders })
                      if (folder?.id === item.id) {
                        setSelectedTroubleshootgunFolderId(nextFolders[0]?.id ?? null)
                        setSelectedTroubleshootgunTemplateId(
                          nextFolders[0]?.templates[0]?.id ?? null,
                        )
                      }
                    }}
                  >
                    <DeleteIcon />
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-state">Créez un premier produit.</div>
            )}
          </div>
        </div>
      </div>

      <div className="list-card troubleshootgun-settings__templates">
        <div className="list-card__header">
          <div className="list-card__title">Templates</div>
          <div className="list-card__tools">
            <button
              className="btn btn--ghost btn--small btn--with-icon"
              type="button"
              onClick={createTemplate}
              disabled={!folder}
            >
              <ButtonIcon name="add" /> Nouveau
            </button>
          </div>
        </div>
        <div className="list-card__body">
          <div className="troubleshootgun-settings__list">
            {folder?.templates.length ? (
              folder.templates.map((item) => (
                <button
                  className={`troubleshootgun-settings__template${
                    template?.id === item.id ? ' is-selected' : ''
                  }`}
                  type="button"
                  key={item.id}
                  onClick={() => setSelectedTroubleshootgunTemplateId(item.id)}
                >
                  <strong>{item.name}</strong>
                  <span>
                    {item.description?.trim() ||
                      item.content
                        .split(/\r?\n/)
                        .find((line) => line.trim())
                        ?.trim() ||
                      'Aucune description renseignée.'}
                  </span>
                </button>
              ))
            ) : (
              <div className="empty-state">
                {folder ? 'Créez le premier template de ce produit.' : 'Sélectionnez un produit.'}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="list-card list-card--form troubleshootgun-settings__editor">
        <div className="list-card__header">
          <div className="list-card__title">Détails du template</div>
          {template ? (
            <button
              className="btn btn--danger btn--small btn--with-icon"
              type="button"
              onClick={() => {
                if (!folder) return
                const nextTemplates = folder.templates.filter(
                  (item) => item.id !== template.id,
                )
                patchFolder({ templates: nextTemplates })
                setSelectedTroubleshootgunTemplateId(nextTemplates[0]?.id ?? null)
              }}
            >
              <ButtonIcon name="delete" /> Supprimer
            </button>
          ) : null}
        </div>
        <div className="list-card__body">
          {folder && template ? (
            <div className="form troubleshootgun-settings__form">
              <label className="workflow-step-label" htmlFor="troubleshootgun-product-name">
                Produit
              </label>
              <input
                id="troubleshootgun-product-name"
                className="input"
                value={folder.name}
                onChange={(event) => patchFolder({ name: event.target.value })}
                placeholder="Nom du produit"
              />
              <div className="form__row two">
                <label>
                  <span className="workflow-step-label">Titre</span>
                  <input
                    className="input"
                    value={template.name}
                    onChange={(event) => patchTemplate({ name: event.target.value })}
                    placeholder="Nom du template"
                  />
                </label>
                <label>
                  <span className="workflow-step-label">Langue</span>
                  <select
                    className="select"
                    value={template.language}
                    onChange={(event) =>
                      patchTemplate({ language: event.target.value as Language })
                    }
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                  </select>
                </label>
              </div>
              <label>
                <span className="workflow-step-label">Description</span>
                <input
                  className="input"
                  value={template.description ?? ''}
                  onChange={(event) => patchTemplate({ description: event.target.value })}
                  placeholder="Résumé affiché dans la liste des templates"
                />
              </label>
              <label>
                <span className="workflow-step-label">Contenu du mail</span>
                <textarea
                  className="textarea textarea--tall"
                  value={template.content}
                  onChange={(event) => patchTemplate({ content: event.target.value })}
                  placeholder="Contenu complet du mail"
                />
              </label>
              <label>
                <span className="workflow-step-label">Task associée</span>
                <select
                  className="select"
                  value={template.taskTemplateId ?? ''}
                  onChange={(event) =>
                    patchTemplate({
                      taskTemplateId: event.target.value,
                      taskCustom: false,
                      taskImportMode: event.target.value ? 'template' : 'none',
                    })
                  }
                >
                  <option value="">Aucune task liée</option>
                  {data.taskTemplates.map((task) => (
                    <option key={task.id} value={task.id}>
                      [{normalizeTaskTemplateKind(task) === 's-task' ? 'S-Task' : 'F-Task'}]{' '}
                      {task.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <div className="empty-state">
              Sélectionnez un produit puis créez ou choisissez un template.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
