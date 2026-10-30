// Settings › Snippet categories.
import type { Dispatch, SetStateAction } from 'react'
import { ButtonIcon, DeleteIcon, MoveIcon } from '../../components/AppIcons'
import { SortableList } from '../../components/SortableList'
import type { SettingsValidationScope } from '../../lib/settingsValidation'
import type { AppData, Category, Snippet } from '../../lib/types'
import { categoryColors } from '../../lib/utils'

export interface SnippetCategoriesSettingsProps {
  categoryDraft: Category
  categoryDraftIssues: string[]
  categoryPreviewSnippets: Snippet[]
  clearSettingsValidationTouched: (scope: SettingsValidationScope) => void
  data: AppData
  deleteCategory: (categoryId: string) => void
  getEmptyCategoryDraft: () => Category
  handleCategorySave: () => void
  isCategorySelectionEmpty: boolean
  renderValidationIssues: (scope: SettingsValidationScope, issues: string[]) => JSX.Element | null
  selectedCategoryId: string | null
  setCategoryDraft: Dispatch<SetStateAction<Category>>
  setData: Dispatch<SetStateAction<AppData>>
  setSelectedCategoryId: Dispatch<SetStateAction<string | null>>
}

export function SnippetCategoriesSettings({
  categoryDraft,
  categoryDraftIssues,
  categoryPreviewSnippets,
  clearSettingsValidationTouched,
  data,
  deleteCategory,
  getEmptyCategoryDraft,
  handleCategorySave,
  isCategorySelectionEmpty,
  renderValidationIssues,
  selectedCategoryId,
  setCategoryDraft,
  setData,
  setSelectedCategoryId,
}: SnippetCategoriesSettingsProps) {
  return (
    <div className="modal__grid">
      <div className="list-card">
        <div className="list-card__header list-card__header--wrap">
          <div className="list-card__title">Liste</div>
        </div>
        <div className="list-card__body">
          <SortableList
            items={data.categories}
            getId={(item) => item.id}
            onReorder={(next) => setData((prev) => ({ ...prev, categories: next }))}
            renderItem={(category, handleProps) => (
                <div
                  className={`list-item list-item--compact${
                    selectedCategoryId === category.id ? ' is-selected' : ''
                  }`}
                  onClick={() => {
                    clearSettingsValidationTouched('category')
                    setCategoryDraft(category)
                    setSelectedCategoryId(category.id)
                  }}
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
                      {data.snippets.filter(
                        (snippet) => snippet.categoryId === category.id,
                      ).length}{' '}
                      snippet(s)
                    </div>
                  </div>
                  <div className="list-item__actions">
                    <button
                      className="icon-btn-sm danger"
                      type="button"
                      title="Supprimer"
                      onClick={(event) => {
                        event.stopPropagation()
                        deleteCategory(category.id)
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
              onClick={() => {
                clearSettingsValidationTouched('category')
                setCategoryDraft(getEmptyCategoryDraft())
                setSelectedCategoryId('new')
              }}
            >
              <ButtonIcon name="add" />
              Nouveau
            </button>
            <button className="btn btn--primary btn--small btn--with-icon" onClick={handleCategorySave}>
              <ButtonIcon name="save" />
              Sauver
            </button>
          </div>
        </div>
        <div className="list-card__body">
          {isCategorySelectionEmpty ? (
            <div className="empty-state">
              Sélectionnez une catégorie ou créez-en une avec Nouveau.
            </div>
          ) : (
            <div className="form">
              {renderValidationIssues('category', categoryDraftIssues)}
              <div className="workflow-step-label">Nom</div>
              <input
                className="input"
                placeholder="Nom de catégorie"
                value={categoryDraft.name}
                onChange={(event) =>
                  setCategoryDraft((prev) => ({ ...prev, name: event.target.value }))
                }
              />
              <div className="workflow-step-label">Couleur</div>
              <div className="color-grid">
                {categoryColors.map((color) => (
                  <button
                    key={color.id}
                    type="button"
                    className={`color-swatch${
                      categoryDraft.color === color.id ? ' active' : ''
                    }`}
                    style={{ background: color.hex }}
                    title={color.label}
                    onClick={() =>
                      setCategoryDraft((prev) => ({ ...prev, color: color.id }))
                    }
                  />
                ))}
              </div>
              <div className="category-snippet-preview">
                <div className="category-snippet-preview__title">
                  Aperçu des snippets
                </div>
                {categoryPreviewSnippets.length ? (
                  <div className="category-snippet-preview__list">
                    {categoryPreviewSnippets.map((snippet) => (
                      <div className="category-snippet-preview__item" key={snippet.id}>
                        <span>{snippet.title}</span>
                        <small>{snippet.content.split('\n')[0]}</small>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="list-item__meta">
                    Aucun snippet dans cette catégorie.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
