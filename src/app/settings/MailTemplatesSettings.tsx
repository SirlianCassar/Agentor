// Settings › Mail templates, their translations and linked task.
import type { Dispatch, RefObject, SetStateAction } from 'react'
import { ButtonIcon, DeleteIcon, MoveIcon } from '../../components/AppIcons'
import { LibraryCategoryRail, LibrarySearch } from '../../components/SettingsLibrary'
import { SortableList } from '../../components/SortableList'
import { assetUrl } from '../../lib/constants'
import { countByCategory, type LibraryFilter, mergeSubsetOrder } from '../../lib/library'
import type { SettingsTab } from '../../lib/settingsNavigation'
import { getMailTemplateIssues, type SettingsValidationScope } from '../../lib/settingsValidation'
import type { TagSuggestionFieldId } from '../../lib/tags'
import { getTaskSectionLabel, normalizeTaskTemplateKind, TASK_SECTION_IDS } from '../../lib/taskDraft'
import { getTemplateVersions, TEMPLATE_LANGUAGES, templateLanguageLabel } from '../../lib/templateLanguages'
import type { AppData, Language, MailTemplate, MailTemplateCategory, TaskSectionId } from '../../lib/types'
import { ADDITION_TOKEN, SELECTOR_TOKEN, TAG_TOKEN } from '../appShared'

export interface MailTemplatesSettingsProps {
  applySuggestedTag: (fieldId: TagSuggestionFieldId, ref: RefObject<HTMLInputElement | HTMLTextAreaElement>, value: string, setValue: (next: string) => void, tag: string) => void
  beginNewTemplateDraft: (focusField?: boolean) => void
  clearSettingsValidationTouched: (scope: SettingsValidationScope) => void
  data: AppData
  deleteTemplate: (template: MailTemplate) => boolean
  handleTemplateSave: () => void
  insertTemplateToken: (token: string) => void
  isTemplateSelectionEmpty: boolean
  libraryTemplates: MailTemplate[]
  mailTemplateCategories: MailTemplateCategory[]
  openSettingsTab: (tab: SettingsTab) => void
  renderIssueBadge: (issues: string[]) => JSX.Element | null
  renderTagSuggestions: (fieldId: TagSuggestionFieldId, onSelect: (tag: string) => void) => JSX.Element | null
  renderValidationIssues: (scope: SettingsValidationScope, issues: string[]) => JSX.Element | null
  selectedTemplateId: string | null
  setData: Dispatch<SetStateAction<AppData>>
  setLibraryFilter: (tab: string, patch: Partial<LibraryFilter>) => void
  setSelectedTemplateId: Dispatch<SetStateAction<string | null>>
  setTemplateActiveField: Dispatch<SetStateAction<'task' | 'content' | 'name'>>
  setTemplateDraft: Dispatch<SetStateAction<MailTemplate>>
  taskSectionNames: string[]
  taskTemplateIdSet: Set<string>
  templateContentRef: RefObject<HTMLTextAreaElement>
  templateDraft: MailTemplate
  templateDraftIssues: string[]
  templateFilter: LibraryFilter
  templateNameRef: RefObject<HTMLInputElement>
  templateTaskMode: 'template' | 'none' | 'custom' | 'sections'
  templateTaskRef: RefObject<HTMLTextAreaElement>
  updateTagSuggestionFromTarget: (fieldId: TagSuggestionFieldId, target: HTMLInputElement | HTMLTextAreaElement | null, value: string) => void
}

export function MailTemplatesSettings({
  applySuggestedTag,
  beginNewTemplateDraft,
  clearSettingsValidationTouched,
  data,
  deleteTemplate,
  handleTemplateSave,
  insertTemplateToken,
  isTemplateSelectionEmpty,
  libraryTemplates,
  mailTemplateCategories,
  openSettingsTab,
  renderIssueBadge,
  renderTagSuggestions,
  renderValidationIssues,
  selectedTemplateId,
  setData,
  setLibraryFilter,
  setSelectedTemplateId,
  setTemplateActiveField,
  setTemplateDraft,
  taskSectionNames,
  taskTemplateIdSet,
  templateContentRef,
  templateDraft,
  templateDraftIssues,
  templateFilter,
  templateNameRef,
  templateTaskMode,
  templateTaskRef,
  updateTagSuggestionFromTarget,
}: MailTemplatesSettingsProps) {
  return (
    <div className="modal__grid modal__grid--library">
      {(() => {
        const counts = countByCategory(data.templates, (template) => template.categoryId)
        return (
          <LibraryCategoryRail
            title="Catégories"
            total={data.templates.length}
            favorites={data.templates.filter((template) => template.favorite).length}
            entries={mailTemplateCategories.map((category) => ({
              id: category.id,
              label: category.name,
              count: counts.get(category.id) ?? 0,
            }))}
            active={templateFilter.category}
            onSelect={(category) => setLibraryFilter('templates', { category })}
            onManage={() => openSettingsTab('templateCategories')}
          />
        )
      })()}
      <div className="list-card library-list">
        <LibrarySearch
          value={templateFilter.query}
          onChange={(query) => setLibraryFilter('templates', { query })}
          shown={libraryTemplates.length}
          total={data.templates.length}
          placeholder="Chercher un mail (nom, texte)"
        />
        <div className="list-card__body">
          <SortableList
            items={libraryTemplates}
            getId={(item) => item.id}
            onReorder={(next) =>
              setData((prev) => ({ ...prev, templates: mergeSubsetOrder(prev.templates, next) }))
            }
            renderItem={(template, handleProps) => {
              const issues = getMailTemplateIssues(template, taskTemplateIdSet)
              return (
                <div
                  className={`list-item list-item--compact${
                    selectedTemplateId === template.id ? ' is-selected' : ''
                  }${issues.length ? ' is-incomplete' : ''}`}
                  onClick={() => {
                    clearSettingsValidationTouched('template')
                    setTemplateDraft(template)
                    setSelectedTemplateId(template.id)
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
                      {template.name || 'Template sans titre'}
                    </div>
                    <div className="list-item__meta">
                      {template.content.split('\n')[0] || 'Contenu manquant'}
                    </div>
                    {renderIssueBadge(issues)}
                  </div>
                  <div className="list-item__actions">
                    <img
                      className="list-item__flag"
                      src={
                        template.language === 'fr'
                          ? assetUrl('/agentor/assets/fr.svg')
                          : assetUrl('/agentor/assets/gb.svg')
                      }
                      alt={template.language === 'fr' ? 'FR' : 'EN'}
                    />
                    {getTemplateVersions(template).length > 1 ? (
                      <span
                        className="list-item__languages"
                        title={getTemplateVersions(template)
                          .map((version) => templateLanguageLabel(version.language))
                          .join(', ')}
                      >
                        +{getTemplateVersions(template).length - 1}
                      </span>
                    ) : null}
                    <button
                      className="icon-btn-sm danger"
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        const deleted = deleteTemplate(template)
                        if (!deleted) return
                        if (selectedTemplateId === template.id) {
                          beginNewTemplateDraft()
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
                onClick={() => insertTemplateToken(TAG_TOKEN)}
              >
                T
              </button>
              <button
                type="button"
                className="token-btn token-btn--selector"
                title="Insérer un sélecteur"
                onClick={() => insertTemplateToken(SELECTOR_TOKEN)}
              >
                S
              </button>
              <button
                type="button"
                className="token-btn token-btn--addition"
                title="Insérer un ajout"
                onClick={() => insertTemplateToken(ADDITION_TOKEN)}
              >
                A
              </button>
            </div>
            <button
              type="button"
              className="btn btn--ghost btn--small btn--with-icon"
              onClick={() => beginNewTemplateDraft()}
            >
              <ButtonIcon name="add" />
              Nouveau
            </button>
            <button
              type="button"
              className="btn btn--primary btn--small btn--with-icon"
              onClick={handleTemplateSave}
            >
              <ButtonIcon name="save" />
              Sauver
            </button>
          </div>
        </div>
        <div className="list-card__body">
          {isTemplateSelectionEmpty ? (
            <div className="empty-state">
              Sélectionnez un template mail ou créez-en un avec Nouveau.
            </div>
          ) : (
            <div className="form">
              {renderValidationIssues('template', templateDraftIssues)}
              <div className="workflow-step-label">Nom</div>
              <input
                className="input"
                placeholder="Nom du template mail"
                value={templateDraft.name}
                ref={templateNameRef}
                data-tag-autocomplete-field="true"
                onFocus={(event) => {
                  setTemplateActiveField('name')
                  updateTagSuggestionFromTarget(
                    'template-name',
                    event.currentTarget,
                    event.currentTarget.value,
                  )
                }}
                onClick={(event) =>
                  updateTagSuggestionFromTarget(
                    'template-name',
                    event.currentTarget,
                    event.currentTarget.value,
                  )
                }
                onKeyUp={(event) =>
                  updateTagSuggestionFromTarget(
                    'template-name',
                    event.currentTarget,
                    event.currentTarget.value,
                  )
                }
                onChange={(event) => {
                  const nextValue = event.target.value
                  setTemplateDraft((prev) => ({ ...prev, name: nextValue }))
                  updateTagSuggestionFromTarget(
                    'template-name',
                    event.currentTarget,
                    nextValue,
                  )
                }}
              />
              {renderTagSuggestions('template-name', (tag) =>
                applySuggestedTag(
                  'template-name',
                  templateNameRef,
                  templateDraft.name,
                  (next) => setTemplateDraft((prev) => ({ ...prev, name: next })),
                  tag,
                ),
              )}
              <div className="workflow-step-label">Langue</div>
              <select
                className="select"
                value={templateDraft.language}
                onChange={(event) =>
                  setTemplateDraft((prev) => ({
                    ...prev,
                    language: event.target.value as Language,
                  }))
                }
              >
                <option value="fr">Français</option>
                <option value="en">Anglais</option>
              </select>
              <div className="workflow-step-label">Catégorie</div>
              <div className="form__row two">
                <select
                  className="select select--roomy"
                  value={templateDraft.categoryId ?? mailTemplateCategories[0]?.id ?? ''}
                  onChange={(event) =>
                    setTemplateDraft((prev) => ({
                      ...prev,
                      categoryId: event.target.value,
                    }))
                  }
                >
                  {!mailTemplateCategories.length ? (
                    <option value="">Aucune catégorie</option>
                  ) : null}
                  {mailTemplateCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className={`template-favorite-toggle${
                    templateDraft.favorite ? ' is-active' : ''
                  }`}
                  title={
                    templateDraft.favorite
                      ? 'Retirer des favoris'
                      : 'Ajouter aux favoris'
                  }
                  aria-label={
                    templateDraft.favorite
                      ? 'Retirer des favoris'
                      : 'Ajouter aux favoris'
                  }
                  aria-pressed={Boolean(templateDraft.favorite)}
                  onClick={() =>
                    setTemplateDraft((prev) => ({
                      ...prev,
                      favorite: !prev.favorite,
                    }))
                  }
                >
                  ★
                </button>
              </div>
              <div className="workflow-step-label">Contenu</div>
              <textarea
                className="textarea textarea--tall"
                placeholder="Contenu complet"
                value={templateDraft.content}
                ref={templateContentRef}
                data-tag-autocomplete-field="true"
                onFocus={(event) => {
                  setTemplateActiveField('content')
                  updateTagSuggestionFromTarget(
                    'template-content',
                    event.currentTarget,
                    event.currentTarget.value,
                  )
                }}
                onClick={(event) =>
                  updateTagSuggestionFromTarget(
                    'template-content',
                    event.currentTarget,
                    event.currentTarget.value,
                  )
                }
                onKeyUp={(event) =>
                  updateTagSuggestionFromTarget(
                    'template-content',
                    event.currentTarget,
                    event.currentTarget.value,
                  )
                }
                onChange={(event) => {
                  const nextValue = event.target.value
                  setTemplateDraft((prev) => ({ ...prev, content: nextValue }))
                  updateTagSuggestionFromTarget(
                    'template-content',
                    event.currentTarget,
                    nextValue,
                  )
                }}
              />
              {renderTagSuggestions('template-content', (tag) =>
                applySuggestedTag(
                  'template-content',
                  templateContentRef,
                  templateDraft.content,
                  (next) => setTemplateDraft((prev) => ({ ...prev, content: next })),
                  tag,
                ),
              )}
              <section className="template-translations">
                <div className="template-translations__head">
                  <strong>Autres langues</strong>
                  <span>
                    Au chargement, la langue du pays du dossier actif est proposée en premier.
                  </span>
                </div>
                {(templateDraft.translations ?? []).map((translation, index) => (
                  <div className="template-translation" key={`${translation.language}-${index}`}>
                    <div className="template-translation__bar">
                      <select
                        className="select"
                        aria-label="Langue de la traduction"
                        value={translation.language}
                        onChange={(event) =>
                          setTemplateDraft((prev) => ({
                            ...prev,
                            translations: (prev.translations ?? []).map((item, itemIndex) =>
                              itemIndex === index ? { ...item, language: event.target.value } : item,
                            ),
                          }))
                        }
                      >
                        {TEMPLATE_LANGUAGES.filter(
                          (option) =>
                            option.code === translation.language ||
                            (option.code !== templateDraft.language &&
                              !(templateDraft.translations ?? []).some((item) => item.language === option.code)),
                        ).map((option) => (
                          <option key={option.code} value={option.code}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="icon-btn-sm danger"
                        title="Retirer cette langue"
                        onClick={() =>
                          setTemplateDraft((prev) => ({
                            ...prev,
                            translations: (prev.translations ?? []).filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                      >
                        <DeleteIcon />
                      </button>
                    </div>
                    <textarea
                      className="textarea"
                      aria-label={`Contenu en ${templateLanguageLabel(translation.language)}`}
                      placeholder={`Contenu en ${templateLanguageLabel(translation.language)}`}
                      value={translation.content}
                      onChange={(event) =>
                        setTemplateDraft((prev) => ({
                          ...prev,
                          translations: (prev.translations ?? []).map((item, itemIndex) =>
                            itemIndex === index ? { ...item, content: event.target.value } : item,
                          ),
                        }))
                      }
                    />
                  </div>
                ))}
                {(() => {
                  const used = new Set([
                    templateDraft.language,
                    ...(templateDraft.translations ?? []).map((item) => item.language),
                  ])
                  const next = TEMPLATE_LANGUAGES.find((option) => !used.has(option.code))
                  return next ? (
                    <button
                      type="button"
                      className="btn btn--ghost btn--small btn--with-icon"
                      onClick={() =>
                        setTemplateDraft((prev) => ({
                          ...prev,
                          translations: [...(prev.translations ?? []), { language: next.code, content: '' }],
                        }))
                      }
                    >
                      <ButtonIcon name="translate" />
                      Ajouter une langue
                    </button>
                  ) : null
                })()}
              </section>
              <section className="content-sequence-editor">
                <div className="content-sequence-editor__head">
                  <strong>Task associée</strong>
                  <span>Choisissez comment ce mail alimente la task.</span>
                </div>
                <div className="content-mode-tabs" role="tablist" aria-label="Mode d’import de la task">
                  {([
                    ['none', 'Aucune'],
                    ['custom', 'Bloc ciblé'],
                    ['sections', 'Par section'],
                    ['template', 'Task complète'],
                  ] as const).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      className={`content-mode-tab${templateTaskMode === mode ? ' is-active' : ''}`}
                      onClick={() => setTemplateDraft((prev) => ({
                        ...prev,
                        taskImportMode: mode,
                        taskOptional: mode === 'none',
                        taskCustom: mode === 'custom',
                      }))}
                    >{label}</button>
                  ))}
                </div>
              {templateTaskMode === 'custom' ? (
                <div className="content-sequence-step">
                  <div className="content-sequence-step__marker">1</div>
                  <div className="content-sequence-step__body">
                    <select
                      className="select"
                      value={templateDraft.taskSectionId ?? 'section-2'}
                      onChange={(event) => setTemplateDraft((prev) => ({ ...prev, taskSectionId: event.target.value as TaskSectionId }))}
                    >
                      {TASK_SECTION_IDS.map((sectionId) => <option key={sectionId} value={sectionId}>{getTaskSectionLabel(sectionId, taskSectionNames)}</option>)}
                    </select>
                <textarea
                  className="textarea"
                  placeholder="Contenu ajouté à cette section"
                  value={templateDraft.taskText ?? ''}
                  ref={templateTaskRef}
                  data-tag-autocomplete-field="true"
                  onFocus={(event) => {
                    setTemplateActiveField('task')
                    updateTagSuggestionFromTarget(
                      'template-task',
                      event.currentTarget,
                      event.currentTarget.value,
                    )
                  }}
                  onClick={(event) =>
                    updateTagSuggestionFromTarget(
                      'template-task',
                      event.currentTarget,
                      event.currentTarget.value,
                    )
                  }
                  onKeyUp={(event) =>
                    updateTagSuggestionFromTarget(
                      'template-task',
                      event.currentTarget,
                      event.currentTarget.value,
                    )
                  }
                  onChange={(event) => {
                    const nextValue = event.target.value
                    setTemplateDraft((prev) => ({
                      ...prev,
                      taskText: nextValue,
                    }))
                    updateTagSuggestionFromTarget(
                      'template-task',
                      event.currentTarget,
                      nextValue,
                    )
                  }}
                />
                  </div>
                </div>
              ) : null}
              {templateTaskMode === 'sections' ? (
                <div className="content-sequence-list">
                  {TASK_SECTION_IDS.map((sectionId, index) => (
                    <div className="content-sequence-step" key={sectionId}>
                      <div className="content-sequence-step__marker">{index + 1}</div>
                      <label className="content-sequence-step__body">
                        <span>{getTaskSectionLabel(sectionId, taskSectionNames)}</span>
                        <textarea
                          className="textarea"
                          placeholder="Laisser vide pour ne rien ajouter"
                          value={templateDraft.taskSections?.[index] ?? ''}
                          onChange={(event) => setTemplateDraft((prev) => {
                            const sections = TASK_SECTION_IDS.map((_, sectionIndex) => prev.taskSections?.[sectionIndex] ?? '')
                            sections[index] = event.target.value
                            return { ...prev, taskSections: sections }
                          })}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              ) : null}
              {templateTaskMode === 'template' ? (
                <div className="content-sequence-step">
                  <div className="content-sequence-step__marker">1</div>
                  <div className="content-sequence-step__body">
                <select
                  className="select select--roomy"
                  value={templateDraft.taskTemplateId ?? ''}
                  onChange={(event) =>
                    setTemplateDraft((prev) => ({
                      ...prev,
                      taskTemplateId: event.target.value,
                    }))
                  }
                >
                  <option value="">Choisir une task complète</option>
                  {data.taskTemplates.filter((task) => !task.hiddenFromLists).map((task) => (
                    <option key={task.id} value={task.id}>
                      [{normalizeTaskTemplateKind(task) === 's-task' ? 'S-Task' : 'F-Task'}]{' '}
                      {task.name}
                    </option>
                  ))}
                </select>
                  </div>
                </div>
              ) : null}
              {templateTaskMode === 'custom'
                ? renderTagSuggestions('template-task', (tag) =>
                    applySuggestedTag(
                      'template-task',
                      templateTaskRef,
                      templateDraft.taskText ?? '',
                      (next) =>
                        setTemplateDraft((prev) => ({ ...prev, taskText: next })),
                      tag,
                    ),
                  )
                : null}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
