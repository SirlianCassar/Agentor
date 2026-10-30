// Settings › Snippets.
import type { Dispatch, RefObject, SetStateAction } from 'react'
import { ButtonIcon, DeleteIcon, MoveIcon } from '../../components/AppIcons'
import { LibraryCategoryRail, LibrarySearch } from '../../components/SettingsLibrary'
import { SortableList } from '../../components/SortableList'
import { countByCategory, type LibraryFilter } from '../../lib/library'
import type { SettingsTab } from '../../lib/settingsNavigation'
import { getSnippetIssues, type SettingsValidationScope } from '../../lib/settingsValidation'
import type { TagSuggestionFieldId } from '../../lib/tags'
import { getTaskSectionLabel, normalizeTaskSectionId, TASK_SECTION_IDS } from '../../lib/taskDraft'
import type { AppData, Snippet, TaskSectionId } from '../../lib/types'
import { ADDITION_TOKEN, categoryColorMap, SELECTOR_TOKEN, TAG_TOKEN } from '../appShared'

export interface SnippetsSettingsProps {
  applySuggestedTag: (fieldId: TagSuggestionFieldId, ref: RefObject<HTMLInputElement | HTMLTextAreaElement>, value: string, setValue: (next: string) => void, tag: string) => void
  beginNewSnippetDraft: (focusField?: boolean) => void
  categoryIdSet: Set<string>
  clearSettingsValidationTouched: (scope: SettingsValidationScope) => void
  data: AppData
  deleteSnippet: (snippet: Snippet) => boolean
  editSnippetCategoryId: string
  editSnippets: Snippet[]
  handleSnippetReorder: (next: Snippet[]) => void
  handleSnippetSave: () => void
  insertSnippetToken: (token: string) => void
  isSnippetSelectionEmpty: boolean
  openSettingsTab: (tab: SettingsTab) => void
  renderIssueBadge: (issues: string[]) => JSX.Element | null
  renderTagSuggestions: (fieldId: TagSuggestionFieldId, onSelect: (tag: string) => void) => JSX.Element | null
  renderValidationIssues: (scope: SettingsValidationScope, issues: string[]) => JSX.Element | null
  selectedSnippetId: string | null
  setEditSnippetCategoryId: Dispatch<SetStateAction<string>>
  setLibraryFilter: (tab: string, patch: Partial<LibraryFilter>) => void
  setSelectedSnippetId: Dispatch<SetStateAction<string | null>>
  setSnippetActiveField: Dispatch<SetStateAction<'task' | 'title' | 'content'>>
  setSnippetDraft: Dispatch<SetStateAction<Snippet>>
  snippetContentRef: RefObject<HTMLTextAreaElement>
  snippetDraft: Snippet
  snippetDraftIssues: string[]
  snippetQuery: string
  snippetTaskRef: RefObject<HTMLTextAreaElement>
  snippetTitleRef: RefObject<HTMLInputElement>
  taskSectionNames: string[]
  updateTagSuggestionFromTarget: (fieldId: TagSuggestionFieldId, target: HTMLInputElement | HTMLTextAreaElement | null, value: string) => void
}

export function SnippetsSettings({
  applySuggestedTag,
  beginNewSnippetDraft,
  categoryIdSet,
  clearSettingsValidationTouched,
  data,
  deleteSnippet,
  editSnippetCategoryId,
  editSnippets,
  handleSnippetReorder,
  handleSnippetSave,
  insertSnippetToken,
  isSnippetSelectionEmpty,
  openSettingsTab,
  renderIssueBadge,
  renderTagSuggestions,
  renderValidationIssues,
  selectedSnippetId,
  setEditSnippetCategoryId,
  setLibraryFilter,
  setSelectedSnippetId,
  setSnippetActiveField,
  setSnippetDraft,
  snippetContentRef,
  snippetDraft,
  snippetDraftIssues,
  snippetQuery,
  snippetTaskRef,
  snippetTitleRef,
  taskSectionNames,
  updateTagSuggestionFromTarget,
}: SnippetsSettingsProps) {
  return (
    <div className="modal__grid modal__grid--library">
      {(() => {
        const counts = countByCategory(data.snippets, (snippet) => snippet.categoryId)
        return (
          <LibraryCategoryRail
            title="Catégories"
            total={data.snippets.length}
            entries={data.categories.map((category) => ({
              id: category.id,
              label: category.name,
              count: counts.get(category.id) ?? 0,
              color: categoryColorMap.get(category.color),
            }))}
            active={editSnippetCategoryId}
            onSelect={setEditSnippetCategoryId}
            onManage={() => openSettingsTab('categories')}
          />
        )
      })()}
      <div className="list-card library-list">
        <LibrarySearch
          value={snippetQuery}
          onChange={(query) => setLibraryFilter('snippets', { query })}
          shown={editSnippets.length}
          total={data.snippets.length}
          placeholder="Chercher un snippet"
        />
        <div className="list-card__body">
          <SortableList
            items={editSnippets}
            getId={(item) => item.id}
            onReorder={handleSnippetReorder}
            renderItem={(snippet, handleProps) => {
              const issues = getSnippetIssues(snippet, categoryIdSet)
              return (
                <div
                  className={`list-item list-item--compact${
                    selectedSnippetId === snippet.id ? ' is-selected' : ''
                  }${issues.length ? ' is-incomplete' : ''}`}
                  onClick={() => {
                    clearSettingsValidationTouched('snippet')
                    setSnippetDraft(snippet)
                    setSelectedSnippetId(snippet.id)
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
                    <div className="list-item__title">
                      {snippet.title || 'Snippet sans titre'}
                    </div>
                    <div className="list-item__meta">
                      {snippet.content.split('\n')[0] || 'Contenu manquant'}
                    </div>
                    {renderIssueBadge(issues)}
                  </div>
                  <div className="list-item__actions">
                    <button
                      className="icon-btn-sm danger"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        const deleted = deleteSnippet(snippet)
                        if (!deleted) return
                        if (selectedSnippetId === snippet.id) {
                          beginNewSnippetDraft()
                        }
                      }}
                      title="Supprimer"
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                </div>
              )
            }}
          />
        </div>
      </div>
      <div className="list-card list-card--form">
        <div className="list-card__header">
          <div className="list-card__title">Détails</div>
          <div className="list-card__tools">
            <div className="token-buttons">
              <button
                type="button"
                className="token-btn token-btn--tag"
                title="Insérer un tag"
                onClick={() => insertSnippetToken(TAG_TOKEN)}
              >
                T
              </button>
              <button
                type="button"
                className="token-btn token-btn--selector"
                title="Insérer un sélecteur"
                onClick={() => insertSnippetToken(SELECTOR_TOKEN)}
              >
                S
              </button>
              <button
                type="button"
                className="token-btn token-btn--addition"
                title="Insérer un ajout"
                onClick={() => insertSnippetToken(ADDITION_TOKEN)}
              >
                A
              </button>
            </div>
            <button
              type="button"
              className="btn btn--ghost btn--small btn--with-icon"
              onClick={() => beginNewSnippetDraft()}
            >
              <ButtonIcon name="add" />
              Nouveau
            </button>
            <button
              type="button"
              className="btn btn--primary btn--small btn--with-icon"
              onClick={handleSnippetSave}
            >
              <ButtonIcon name="save" />
              Sauver
            </button>
          </div>
        </div>
        <div className="list-card__body">
          {isSnippetSelectionEmpty ? (
            <div className="empty-state">
              Sélectionnez un snippet ou créez-en un avec Nouveau.
            </div>
          ) : (
            <div className="form">
              {renderValidationIssues('snippet', snippetDraftIssues)}
              <div className="workflow-step-label">Nom</div>
              <input
                className="input"
                placeholder="Nom du snippet"
                value={snippetDraft.title}
                ref={snippetTitleRef}
                data-tag-autocomplete-field="true"
                onFocus={(event) => {
                  setSnippetActiveField('title')
                  updateTagSuggestionFromTarget(
                    'snippet-title',
                    event.currentTarget,
                    event.currentTarget.value,
                  )
                }}
                onClick={(event) =>
                  updateTagSuggestionFromTarget(
                    'snippet-title',
                    event.currentTarget,
                    event.currentTarget.value,
                  )
                }
                onKeyUp={(event) =>
                  updateTagSuggestionFromTarget(
                    'snippet-title',
                    event.currentTarget,
                    event.currentTarget.value,
                  )
                }
                onChange={(event) => {
                  const nextValue = event.target.value
                  setSnippetDraft((prev) => ({ ...prev, title: nextValue }))
                  updateTagSuggestionFromTarget(
                    'snippet-title',
                    event.currentTarget,
                    nextValue,
                  )
                }}
              />
              {renderTagSuggestions('snippet-title', (tag) =>
                applySuggestedTag(
                  'snippet-title',
                  snippetTitleRef,
                  snippetDraft.title,
                  (next) => setSnippetDraft((prev) => ({ ...prev, title: next })),
                  tag,
                ),
              )}
              <div className="workflow-step-label">Contenu</div>
              <textarea
                className="textarea textarea--tall"
                placeholder="Contenu"
                value={snippetDraft.content}
                ref={snippetContentRef}
                data-tag-autocomplete-field="true"
                onFocus={(event) => {
                  setSnippetActiveField('content')
                  updateTagSuggestionFromTarget(
                    'snippet-content',
                    event.currentTarget,
                    event.currentTarget.value,
                  )
                }}
                onClick={(event) =>
                  updateTagSuggestionFromTarget(
                    'snippet-content',
                    event.currentTarget,
                    event.currentTarget.value,
                  )
                }
                onKeyUp={(event) =>
                  updateTagSuggestionFromTarget(
                    'snippet-content',
                    event.currentTarget,
                    event.currentTarget.value,
                  )
                }
                onChange={(event) => {
                  const nextValue = event.target.value
                  setSnippetDraft((prev) => ({ ...prev, content: nextValue }))
                  updateTagSuggestionFromTarget(
                    'snippet-content',
                    event.currentTarget,
                    nextValue,
                  )
                }}
              />
              {renderTagSuggestions('snippet-content', (tag) =>
                applySuggestedTag(
                  'snippet-content',
                  snippetContentRef,
                  snippetDraft.content,
                  (next) => setSnippetDraft((prev) => ({ ...prev, content: next })),
                  tag,
                ),
              )}
              <div className="workflow-step-label">Catégorie</div>
              <div className="form__row">
                <select
                  className="select select--roomy"
                  value={snippetDraft.categoryId}
                  onChange={(event) =>
                    setSnippetDraft((prev) => ({
                      ...prev,
                      categoryId: event.target.value,
                    }))
                  }
                >
                  {!data.categories.length ? <option value="">Aucune catégorie</option> : null}
                  {data.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="workflow-step-label">Texte ajouté à la task squelette</div>
              <div className="form__row">
                <select
                  className="select select--roomy"
                  value={normalizeTaskSectionId(snippetDraft.taskSectionId)}
                  onChange={(event) =>
                    setSnippetDraft((prev) => ({
                      ...prev,
                      taskSectionId: event.target.value as TaskSectionId,
                    }))
                  }
                >
                  {TASK_SECTION_IDS.map((sectionId) => (
                    <option key={sectionId} value={sectionId}>
                      {getTaskSectionLabel(sectionId, taskSectionNames)}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                className="textarea"
                placeholder="Texte ajouté à la section choisie du squelette (optionnel)"
                value={snippetDraft.taskText ?? ''}
                ref={snippetTaskRef}
                data-tag-autocomplete-field="true"
                onFocus={(event) => {
                  setSnippetActiveField('task')
                  updateTagSuggestionFromTarget(
                    'snippet-task',
                    event.currentTarget,
                    event.currentTarget.value,
                  )
                }}
                onClick={(event) =>
                  updateTagSuggestionFromTarget(
                    'snippet-task',
                    event.currentTarget,
                    event.currentTarget.value,
                  )
                }
                onKeyUp={(event) =>
                  updateTagSuggestionFromTarget(
                    'snippet-task',
                    event.currentTarget,
                    event.currentTarget.value,
                  )
                }
                onChange={(event) => {
                  const nextValue = event.target.value
                  setSnippetDraft((prev) => ({ ...prev, taskText: nextValue }))
                  updateTagSuggestionFromTarget(
                    'snippet-task',
                    event.currentTarget,
                    nextValue,
                  )
                }}
              />
              {renderTagSuggestions('snippet-task', (tag) =>
                applySuggestedTag(
                  'snippet-task',
                  snippetTaskRef,
                  snippetDraft.taskText ?? '',
                  (next) => setSnippetDraft((prev) => ({ ...prev, taskText: next })),
                  tag,
                ),
              )}
              <div className="list-item__meta">
                Si ce champ reste vide, le snippet ne modifie pas la task.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
