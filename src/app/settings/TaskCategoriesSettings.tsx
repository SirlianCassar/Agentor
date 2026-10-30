// Settings › S-Task and F-Task categories.
import type { Dispatch, SetStateAction } from 'react'
import { ButtonIcon, DeleteIcon, MoveIcon } from '../../components/AppIcons'
import { SortableList } from '../../components/SortableList'
import { getTaskTemplatePreviewText } from '../../lib/taskDraft'
import type { AppData, AppSettings, TaskTemplateCategory, TaskTemplateKind } from '../../lib/types'

export interface TaskCategoriesSettingsProps {
  data: AppData
  deleteTaskTemplateCategory: (categoryId: string) => void
  saveTaskTemplateCategory: () => void
  setTaskTemplateCategoryDraft: Dispatch<SetStateAction<TaskTemplateCategory>>
  settingsTaskTemplateCategories: TaskTemplateCategory[]
  settingsTaskTemplateKind: TaskTemplateKind
  taskTemplateCategories: TaskTemplateCategory[]
  taskTemplateCategoryDraft: TaskTemplateCategory
  updateSettings: (patch: Partial<AppSettings>) => void
}

export function TaskCategoriesSettings({
  data,
  deleteTaskTemplateCategory,
  saveTaskTemplateCategory,
  setTaskTemplateCategoryDraft,
  settingsTaskTemplateCategories,
  settingsTaskTemplateKind,
  taskTemplateCategories,
  taskTemplateCategoryDraft,
  updateSettings,
}: TaskCategoriesSettingsProps) {
  return (
    <div className="modal__grid">
      <div className="list-card">
        <div className="list-card__header list-card__header--wrap">
          <div className="list-card__title">Liste</div>
        </div>
        <div className="list-card__body">
          <SortableList
            items={settingsTaskTemplateCategories}
            getId={(item) => item.id}
            onReorder={(next) => {
              let index = 0
              updateSettings({
                taskTemplateCategories: taskTemplateCategories.map((category) =>
                  category.kind === settingsTaskTemplateKind
                    ? next[index++]
                    : category,
                ),
              })
            }}
            renderItem={(category, handleProps) => (
              <div
                className={`list-item list-item--compact${
                  taskTemplateCategoryDraft.id === category.id ? ' is-selected' : ''
                }`}
                onClick={() => setTaskTemplateCategoryDraft(category)}
              >
                <button title="Déplacer"
                  className="drag-handle"
                  type="button"
                  {...handleProps.attributes}
                  {...handleProps.listeners}
                  onClick={(event) => event.stopPropagation()}
                >
                  <MoveIcon />
                </button>
                <div className="list-item__content">
                  <div className="list-item__title">{category.name}</div>
                  <div className="list-item__meta">
                    {data.taskTemplates.filter(
                      (task) => task.categoryId === category.id,
                    ).length}{' '}
                    template(s)
                  </div>
                </div>
                <div className="list-item__actions">
                  <button
                    className="icon-btn-sm danger"
                    type="button"
                    title="Supprimer"
                    onClick={(event) => {
                      event.stopPropagation()
                      deleteTaskTemplateCategory(category.id)
                    }}
                  >
                    <DeleteIcon />
                  </button>
                </div>
              </div>
            )}
          />
        </div>
      </div>
      <div className="list-card list-card--form">
        <div className="list-card__header">
          <div className="list-card__title">Détails</div>
          <div className="list-card__tools">
            <button
              className="btn btn--ghost btn--small btn--with-icon"
              type="button"
              onClick={() =>
                setTaskTemplateCategoryDraft({
                  id: '',
                  name: '',
                  kind: settingsTaskTemplateKind,
                })
              }
            >
              <ButtonIcon name="add" />
              Nouveau
            </button>
            <button
              className="btn btn--primary btn--small btn--with-icon"
              type="button"
              onClick={saveTaskTemplateCategory}
            >
              <ButtonIcon name="save" />
              Sauver
            </button>
          </div>
        </div>
        <div className="list-card__body">
          <div className="form">
            <div className="workflow-step-label">Nom</div>
            <input
              className="input"
              value={taskTemplateCategoryDraft.name}
              placeholder="Nom de catégorie"
              onChange={(event) =>
                setTaskTemplateCategoryDraft((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
            />
            {taskTemplateCategoryDraft.id ? (
              <div className="category-snippet-preview">
                <div className="category-snippet-preview__title">
                  Aperçu des templates{' '}
                  {settingsTaskTemplateKind === 's-task' ? 'S-Task' : 'F-Task'}
                </div>
                {data.taskTemplates.filter(
                  (task) => task.categoryId === taskTemplateCategoryDraft.id,
                ).length ? (
                  <div className="category-snippet-preview__list">
                    {data.taskTemplates
                      .filter((task) => task.categoryId === taskTemplateCategoryDraft.id)
                      .map((task) => (
                        <div className="category-snippet-preview__item" key={task.id}>
                          <span>{task.name}</span>
                          <small>{getTaskTemplatePreviewText(task)}</small>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="list-item__meta">Aucune task dans cette catégorie.</div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
