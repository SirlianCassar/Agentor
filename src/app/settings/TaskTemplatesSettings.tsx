// Settings › S-Task and F-Task templates.
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react'
import { ButtonIcon, DeleteIcon, MoveIcon } from '../../components/AppIcons'
import { LibraryCategoryRail, LibrarySearch } from '../../components/SettingsLibrary'
import { SortableList } from '../../components/SortableList'
import { countByCategory, type LibraryFilter, mergeSubsetOrder } from '../../lib/library'
import type { SettingsTab } from '../../lib/settingsNavigation'
import { getTaskTemplateIssues, type SettingsValidationScope } from '../../lib/settingsValidation'
import type { TagSuggestionFieldId } from '../../lib/tags'
import {
  buildStructuredTaskDraftWithTitle,
  buildTaskTemplateContent,
  getTaskTemplatePreviewText,
  normalizeTaskTemplateKind,
  normalizeTaskTemplateSections,
  TASK_SECTION_IDS,
} from '../../lib/taskDraft'
import type { AppData, TaskSectionId, TaskTemplate, TaskTemplateCategory, TaskTemplateKind } from '../../lib/types'
import { highlightText } from '../../lib/utils'
import { ADDITION_TOKEN, SELECTOR_TOKEN, TAG_TOKEN } from '../appShared'

export interface TaskTemplatesSettingsProps {
  applySuggestedTag: (fieldId: TagSuggestionFieldId, ref: RefObject<HTMLInputElement | HTMLTextAreaElement>, value: string, setValue: (next: string) => void, tag: string) => void
  beginNewTaskDraft: (focusField?: boolean, kind?: TaskTemplateKind) => void
  clearSettingsValidationTouched: (scope: SettingsValidationScope) => void
  deleteTaskTemplate: (task: TaskTemplate) => boolean
  handleTaskTemplateSave: () => void
  insertTaskTemplateToken: (token: string) => void
  isTaskSelectionEmpty: boolean
  libraryTaskTemplates: TaskTemplate[]
  openSettingsTab: (tab: SettingsTab) => void
  renderIssueBadge: (issues: string[]) => JSX.Element | null
  renderTagSuggestions: (fieldId: TagSuggestionFieldId, onSelect: (tag: string) => void) => JSX.Element | null
  renderValidationIssues: (scope: SettingsValidationScope, issues: string[]) => JSX.Element | null
  selectedTaskId: string | null
  setData: Dispatch<SetStateAction<AppData>>
  setLibraryFilter: (tab: string, patch: Partial<LibraryFilter>) => void
  setSelectedTaskId: Dispatch<SetStateAction<string | null>>
  setTaskDraft: Dispatch<SetStateAction<TaskTemplate>>
  setTaskTemplateActiveField: Dispatch<SetStateAction<'name' | 'content' | TaskSectionId | 'title'>>
  settingsTaskTemplateCategories: TaskTemplateCategory[]
  settingsTaskTemplateKind: TaskTemplateKind
  settingsTaskTemplates: TaskTemplate[]
  taskDraft: TaskTemplate
  taskDraftIssues: string[]
  taskFilter: LibraryFilter
  taskSectionNames: string[]
  taskTemplateContentRef: RefObject<HTMLTextAreaElement>
  taskTemplateKind: TaskTemplateKind
  taskTemplateNameRef: RefObject<HTMLInputElement>
  taskTemplateSectionRefs: MutableRefObject<(HTMLTextAreaElement | null)[]>
  taskTemplateSections: string[]
  taskTemplateTitleRef: RefObject<HTMLInputElement>
  toggleTaskTemplateFavorite: (taskId: string) => void
  updateTagSuggestionFromTarget: (fieldId: TagSuggestionFieldId, target: HTMLInputElement | HTMLTextAreaElement | null, value: string) => void
}

export function TaskTemplatesSettings({
  applySuggestedTag,
  beginNewTaskDraft,
  clearSettingsValidationTouched,
  deleteTaskTemplate,
  handleTaskTemplateSave,
  insertTaskTemplateToken,
  isTaskSelectionEmpty,
  libraryTaskTemplates,
  openSettingsTab,
  renderIssueBadge,
  renderTagSuggestions,
  renderValidationIssues,
  selectedTaskId,
  setData,
  setLibraryFilter,
  setSelectedTaskId,
  setTaskDraft,
  setTaskTemplateActiveField,
  settingsTaskTemplateCategories,
  settingsTaskTemplateKind,
  settingsTaskTemplates,
  taskDraft,
  taskDraftIssues,
  taskFilter,
  taskSectionNames,
  taskTemplateContentRef,
  taskTemplateKind,
  taskTemplateNameRef,
  taskTemplateSectionRefs,
  taskTemplateSections,
  taskTemplateTitleRef,
  toggleTaskTemplateFavorite,
  updateTagSuggestionFromTarget,
}: TaskTemplatesSettingsProps) {
  return (
    <div className="modal__grid modal__grid--library">
      {(() => {
        const counts = countByCategory(settingsTaskTemplates, (task) => task.categoryId)
        return (
          <LibraryCategoryRail
            title="Catégories"
            total={settingsTaskTemplates.length}
            favorites={settingsTaskTemplates.filter((task) => task.favorite).length}
            entries={settingsTaskTemplateCategories.map((category) => ({
              id: category.id,
              label: category.name,
              count: counts.get(category.id) ?? 0,
            }))}
            active={taskFilter.category}
            onSelect={(category) => setLibraryFilter(settingsTaskTemplateKind, { category })}
            onManage={() =>
              openSettingsTab(settingsTaskTemplateKind === 's-task' ? 'sTaskCategories' : 'fTaskCategories')
            }
          />
        )
      })()}
      <div className="list-card library-list">
        <LibrarySearch
          value={taskFilter.query}
          onChange={(query) => setLibraryFilter(settingsTaskTemplateKind, { query })}
          shown={libraryTaskTemplates.length}
          total={settingsTaskTemplates.length}
          placeholder={`Chercher une ${settingsTaskTemplateKind === 's-task' ? 'S-Task' : 'F-Task'}`}
        />
        <div className="list-card__body">
          <SortableList
            items={libraryTaskTemplates}
            getId={(item) => item.id}
            onReorder={(next) =>
              setData((prev) => ({ ...prev, taskTemplates: mergeSubsetOrder(prev.taskTemplates, next) }))
            }
            renderItem={(task, handleProps) => {
              const issues = getTaskTemplateIssues(task)
              return (
                <div
                  className={`list-item list-item--compact${
                    selectedTaskId === task.id ? ' is-selected' : ''
                  }${issues.length ? ' is-incomplete' : ''}`}
                  onClick={() => {
                    clearSettingsValidationTouched('task')
                    setTaskDraft({
                      ...task,
                      kind: normalizeTaskTemplateKind(task),
                      content: buildTaskTemplateContent(task),
                      taskSections: normalizeTaskTemplateSections(task),
                      categoryId:
                        task.categoryId ??
                        settingsTaskTemplateCategories[0]?.id ??
                        '',
                    })
                    setSelectedTaskId(task.id)
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
                      {task.name || 'Template sans titre'}
                      {normalizeTaskTemplateKind(task) === 's-task' ? (
                        <span className="task-kind-badge">S-Task</span>
                      ) : null}
                    </div>
                    <div className="list-item__meta">
                      {getTaskTemplatePreviewText(task)}
                    </div>
                    {task.hiddenFromLists ? (
                      <div className="list-item__meta">Masqué des listes</div>
                    ) : null}
                    {renderIssueBadge(issues)}
                  </div>
                  <div className="list-item__actions">
                    <button
                      className={`template-favorite-btn${
                        task.favorite ? ' is-active' : ''
                      }`}
                      type="button"
                      title={
                        task.favorite
                          ? 'Retirer des favoris'
                          : 'Ajouter aux favoris'
                      }
                      aria-label={
                        task.favorite
                          ? 'Retirer des favoris'
                          : 'Ajouter aux favoris'
                      }
                      onClick={(event) => {
                        event.stopPropagation()
                        toggleTaskTemplateFavorite(task.id)
                      }}
                    >
                      ★
                    </button>
                    <button
                      className="icon-btn-sm danger"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        const deleted = deleteTaskTemplate(task)
                        if (!deleted) return
                        if (selectedTaskId === task.id) {
                          beginNewTaskDraft()
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
                onClick={() => insertTaskTemplateToken(TAG_TOKEN)}
              >
                T
              </button>
              <button
                type="button"
                className="token-btn token-btn--selector"
                title="Insérer un sélecteur"
                onClick={() => insertTaskTemplateToken(SELECTOR_TOKEN)}
              >
                S
              </button>
              <button
                type="button"
                className="token-btn token-btn--addition"
                title="Insérer un ajout"
                onClick={() => insertTaskTemplateToken(ADDITION_TOKEN)}
              >
                A
              </button>
            </div>
            <button
              type="button"
              className="btn btn--ghost btn--small btn--with-icon"
              onClick={() => beginNewTaskDraft()}
            >
              <ButtonIcon name="add" />
              Nouveau
            </button>
            <button
              type="button"
              className="btn btn--primary btn--small btn--with-icon"
              onClick={handleTaskTemplateSave}
            >
              <ButtonIcon name="save" />
              Sauver
            </button>
          </div>
        </div>
        <div className="list-card__body">
          {isTaskSelectionEmpty ? (
            <div className="empty-state">
              Sélectionnez un template S-Task / F-Task ou créez-en un avec Nouveau.
            </div>
          ) : (
            <div className="form">
              {renderValidationIssues('task', taskDraftIssues)}
              <div className="workflow-step-label">Nom</div>
              <input
                className="input"
                placeholder={`Nom du template ${taskTemplateKind === 's-task' ? 'S-Task' : 'F-Task'}`}
                value={taskDraft.name}
                ref={taskTemplateNameRef}
                data-tag-autocomplete-field="true"
                onFocus={(event) => {
                  setTaskTemplateActiveField('name')
                  updateTagSuggestionFromTarget(
                    'task-name',
                    event.currentTarget,
                    event.currentTarget.value,
                  )
                }}
                onClick={(event) =>
                  updateTagSuggestionFromTarget(
                    'task-name',
                    event.currentTarget,
                    event.currentTarget.value,
                  )
                }
                onKeyUp={(event) =>
                  updateTagSuggestionFromTarget(
                    'task-name',
                    event.currentTarget,
                    event.currentTarget.value,
                  )
                }
                onChange={(event) => {
                  const nextValue = event.target.value
                  setTaskDraft((prev) => ({ ...prev, name: nextValue }))
                  updateTagSuggestionFromTarget(
                    'task-name',
                    event.currentTarget,
                    nextValue,
                  )
                }}
              />
              {renderTagSuggestions('task-name', (tag) =>
                applySuggestedTag(
                  'task-name',
                  taskTemplateNameRef,
                  taskDraft.name,
                  (next) => setTaskDraft((prev) => ({ ...prev, name: next })),
                  tag,
                ),
              )}
              <div className="workflow-step-label">Type de template</div>
              <div className="settings-note">
                {taskTemplateKind === 's-task'
                  ? 'S-Task — squelette en 4 sections'
                  : 'F-Task — contenu libre'}
              </div>
              <div className="workflow-step-label">Catégorie</div>
              <div className="form__row two">
                <select
                  className="select select--roomy"
                  value={
                    taskDraft.categoryId ??
                    settingsTaskTemplateCategories[0]?.id ??
                    ''
                  }
                  onChange={(event) =>
                    setTaskDraft((prev) => ({
                      ...prev,
                      categoryId: event.target.value,
                    }))
                  }
                >
                  {!settingsTaskTemplateCategories.length ? (
                    <option value="">Aucune catégorie</option>
                  ) : null}
                  {settingsTaskTemplateCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={`template-favorite-toggle${
                    taskDraft.favorite ? ' is-active' : ''
                  }`}
                  title={
                    taskDraft.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'
                  }
                  aria-label={
                    taskDraft.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'
                  }
                  aria-pressed={Boolean(taskDraft.favorite)}
                  onClick={() =>
                    setTaskDraft((prev) => ({
                      ...prev,
                      favorite: !prev.favorite,
                    }))
                  }
                >
                  ★
                </button>
              </div>
              <label className="task-template-visibility-toggle">
                <input
                  type="checkbox"
                  checked={Boolean(taskDraft.hiddenFromLists)}
                  onChange={(event) =>
                    setTaskDraft((prev) => ({
                      ...prev,
                      hiddenFromLists: event.target.checked,
                    }))
                  }
                />
                <span>
                  Masquer des listes de tâches
                  <small>La tâche reste disponible pour le Troubleshotgun.</small>
                </span>
              </label>
              {taskTemplateKind === 's-task' ? (
                <>
                  <label
                    className="workflow-step-label"
                    htmlFor="task-template-title"
                  >
                    Titre de la S-Task
                  </label>
                  <input
                    id="task-template-title"
                    className="input"
                    ref={taskTemplateTitleRef}
                    value={taskDraft.taskTitle ?? ''}
                    placeholder="Titre affiché au-dessus des sections"
                    onFocus={() => setTaskTemplateActiveField('title')}
                    onChange={(event) =>
                      setTaskDraft((prev) => ({
                        ...prev,
                        taskTitle: event.target.value,
                      }))
                    }
                  />
                  <div className="task-template-sections">
                    {TASK_SECTION_IDS.map((sectionId, index) => (
                      <div className="task-template-section" key={sectionId}>
                        <div className="task-template-section__marker">{index + 1}</div>
                        <div className="task-template-section__body">
                          <label
                            className="workflow-step-label"
                            htmlFor={`task-template-${sectionId}`}
                          >
                            {taskSectionNames[index]}
                          </label>
                          <textarea
                            id={`task-template-${sectionId}`}
                            className="textarea textarea--task-template-section"
                            placeholder={`Contenu de ${taskSectionNames[index]}`}
                            value={taskTemplateSections[index] ?? ''}
                            ref={(element) => {
                              taskTemplateSectionRefs.current[index] = element
                            }}
                            onFocus={() => setTaskTemplateActiveField(sectionId)}
                            onChange={(event) => {
                              const value = event.target.value
                              setTaskDraft((prev) => {
                                const sections = normalizeTaskTemplateSections(prev)
                                sections[index] = value
                                return { ...prev, taskSections: sections }
                              })
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <label
                    className="workflow-step-label"
                    htmlFor="task-template-content"
                  >
                    Contenu F-Task
                  </label>
                  <textarea
                    id="task-template-content"
                    className="textarea"
                    placeholder="Contenu libre du template"
                    value={taskDraft.content}
                    ref={taskTemplateContentRef}
                    onFocus={() => setTaskTemplateActiveField('content')}
                    onChange={(event) =>
                      setTaskDraft((prev) => ({
                        ...prev,
                        content: event.target.value,
                      }))
                    }
                  />
                </>
              )}
              <div className="task-template-preview-settings">
                <div className="task-template-preview-settings__title">Aperçu</div>
                <div
                  className="task-template-preview-settings__content settings-token-preview"
                  dangerouslySetInnerHTML={{
                    __html: highlightText(
                      (taskTemplateKind === 's-task'
                        ? buildStructuredTaskDraftWithTitle(
                            taskDraft.taskTitle?.trim() ?? '',
                            taskTemplateSections,
                            taskSectionNames,
                          ).trim()
                        : taskDraft.content.trim()) ||
                        'Le contenu du template apparaîtra ici.',
                    ),
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
