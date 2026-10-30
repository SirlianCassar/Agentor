// Settings › Mail template categories.
import type { Dispatch, SetStateAction } from 'react'
import { ButtonIcon, DeleteIcon, MoveIcon } from '../../components/AppIcons'
import { SortableList } from '../../components/SortableList'
import type { AppData, AppSettings, MailTemplateCategory } from '../../lib/types'

export interface TemplateCategoriesSettingsProps {
  data: AppData
  deleteTemplateCategory: (categoryId: string) => void
  mailTemplateCategories: MailTemplateCategory[]
  saveTemplateCategory: () => void
  setTemplateCategoryDraft: Dispatch<SetStateAction<MailTemplateCategory>>
  templateCategoryDraft: MailTemplateCategory
  updateSettings: (patch: Partial<AppSettings>) => void
}

export function TemplateCategoriesSettings({
  data,
  deleteTemplateCategory,
  mailTemplateCategories,
  saveTemplateCategory,
  setTemplateCategoryDraft,
  templateCategoryDraft,
  updateSettings,
}: TemplateCategoriesSettingsProps) {
  return (
    <div className="modal__grid">
      <div className="list-card">
        <div className="list-card__header list-card__header--wrap">
          <div className="list-card__title">Liste</div>
        </div>
        <div className="list-card__body">
          <SortableList
            items={mailTemplateCategories}
            getId={(item) => item.id}
            onReorder={(next) => updateSettings({ mailTemplateCategories: next })}
            renderItem={(category, handleProps) => (
              <div
                className={`list-item list-item--compact${
                  templateCategoryDraft.id === category.id ? ' is-selected' : ''
                }`}
                onClick={() => setTemplateCategoryDraft(category)}
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
                    {data.templates.filter(
                      (template) => template.categoryId === category.id,
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
                      deleteTemplateCategory(category.id)
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
              onClick={() => setTemplateCategoryDraft({ id: '', name: '' })}
            >
              <ButtonIcon name="add" />
              Nouveau
            </button>
            <button
              className="btn btn--primary btn--small btn--with-icon"
              type="button"
              onClick={saveTemplateCategory}
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
              value={templateCategoryDraft.name}
              placeholder="Nom de catégorie"
              onChange={(event) =>
                setTemplateCategoryDraft((prev) => ({
                  ...prev,
                  name: event.target.value,
                }))
              }
            />
            {templateCategoryDraft.id ? (
              <div className="category-snippet-preview">
                <div className="category-snippet-preview__title">Aperçu des templates</div>
                {data.templates.filter(
                  (template) => template.categoryId === templateCategoryDraft.id,
                ).length ? (
                  <div className="category-snippet-preview__list">
                    {data.templates
                      .filter((template) => template.categoryId === templateCategoryDraft.id)
                      .map((template) => (
                        <div className="category-snippet-preview__item" key={template.id}>
                          <span>{template.name}</span>
                          <small>{template.content.split('\n')[0] || 'Contenu vide'}</small>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="list-item__meta">Aucun template dans cette catégorie.</div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
