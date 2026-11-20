// Template preview: pick the language, the mail lines and the task sections to load.
import type { Dispatch, SetStateAction } from 'react'
import { getTaskSectionLabel, getTemplateTaskSections, TASK_SECTION_IDS } from '../../lib/taskDraft'
import { getTemplateVersion, getTemplateVersions, templateLanguageLabel } from '../../lib/templateLanguages'
import type { AppData, MailTemplate, TroubleshootgunFolder } from '../../lib/types'
import { highlightText } from '../../lib/utils'
import { resolvePreviewTemplate, type TemplatePreviewState, writeStoredTemplateLanguage } from '../appShared'

export interface TemplatePreviewModalProps {
  data: AppData
  importTemplatePreview: (mode?: 'replace' | 'insert') => void
  setTemplatePreview: Dispatch<SetStateAction<TemplatePreviewState | null>>
  taskSectionNames: string[]
  templatePreview: TemplatePreviewState
  troubleshootgunFolders: TroubleshootgunFolder[]
  // Shown in the contextual panel; a mail already started gets the template at the cursor.
  mailHasContent?: boolean
  // The merged CRM template, when that is what is being previewed.
  crmTemplate?: MailTemplate | null
  // Writes it in the Dynamics mail form. Absent outside the installed app.
  onComposeInCrm?: () => void
}

export function TemplatePreviewModal({
  data,
  importTemplatePreview,
  setTemplatePreview,
  taskSectionNames,
  templatePreview,
  troubleshootgunFolders,
  mailHasContent = false,
  crmTemplate = null,
  onComposeInCrm,
}: TemplatePreviewModalProps) {
  const template = resolvePreviewTemplate(templatePreview, {
    templates: data.templates,
    troubleshootgunFolders,
    crmTemplate,
  })
  if (!template) return null
  const isCrmTemplate = template === crmTemplate
  const versions = getTemplateVersions(template)
  const emailLines = getTemplateVersion(template, templatePreview.language).content.split(/\r?\n/)
  const taskSections = getTemplateTaskSections(template, data.taskTemplates)
  const templateUsesCustomTask =
    template.taskImportMode === 'custom' ||
    template.taskImportMode === 'sections' ||
    (template.taskCustom ?? (!!template.taskText && !template.taskTemplateId))
  const subtitle = isCrmTemplate
    ? 'Corps fusionné par le CRM. Les emplacements restants sont à compléter.'
    : templateUsesCustomTask
      ? 'Le contenu sera ajouté aux sections choisies.'
      : 'La task complète sera importée.'
  const content = (
      <div
        className="modal troubleshootgun-preview-modal troubleshootgun-preview-modal--panel"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="context-panel__note">{subtitle}</p>
        <div className="troubleshootgun-preview-modal__body">
          <div className="troubleshootgun-preview-modal__grid">
            <section className="troubleshootgun-preview-modal__section">
              <div className="troubleshootgun-preview-modal__label template-language-head">
                <span>Mail</span>
                {versions.length > 1 ? (
                  <span className="template-language-tabs" role="tablist" aria-label="Langue du mail">
                    {versions.map((version) => (
                      <button
                        key={version.language}
                        type="button"
                        role="tab"
                        aria-selected={templatePreview.language === version.language}
                        className={`template-language-tab${
                          templatePreview.language === version.language ? ' is-active' : ''
                        }`}
                        title={templateLanguageLabel(version.language)}
                        onClick={() => {
                          writeStoredTemplateLanguage(version.language)
                          setTemplatePreview((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  language: version.language,
                                  selectedEmailLines: version.content
                                    .split(/\r?\n/)
                                    .map((line) => Boolean(line.trim())),
                                }
                              : prev,
                          )
                        }}
                      >
                        {version.language.toUpperCase()}
                      </button>
                    ))}
                  </span>
                ) : null}
              </div>
              <div className="troubleshootgun-preview-sections">
                {emailLines.map((line, index) =>
                  !line.trim() ? null : (
                    <label className="troubleshootgun-preview-section" key={`${line}-${index}`}>
                      <input
                        type="checkbox"
                        checked={Boolean(templatePreview.selectedEmailLines[index])}
                        onChange={(event) =>
                          setTemplatePreview((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  selectedEmailLines: prev.selectedEmailLines.map((checked, lineIndex) =>
                                    lineIndex === index ? event.target.checked : checked,
                                  ),
                                }
                              : prev,
                          )
                        }
                      />
                      <span className="troubleshootgun-preview-section__body">
                        <span
                          className="troubleshootgun-preview-modal__content"
                          dangerouslySetInnerHTML={{
                            __html: highlightText(line.trim()),
                          }}
                        />
                      </span>
                    </label>
                  )
                )}
              </div>
            </section>
            <section
              className={`troubleshootgun-preview-modal__section troubleshootgun-preview-modal__section--task${
                templatePreview.importTask ? '' : ' is-disabled'
              }`}
            >
              <div className="troubleshootgun-preview-modal__label troubleshootgun-preview-modal__label--task">
                <span>Task</span>
                <label className="import-task-toggle">
                  <input
                    type="checkbox"
                    checked={templatePreview.importTask}
                    onChange={(event) =>
                      setTemplatePreview((prev) =>
                        prev ? { ...prev, importTask: event.target.checked } : prev,
                      )
                    }
                  />
                  <span>{templateUsesCustomTask ? 'Ajouter aux sections' : 'Importer la task'}</span>
                </label>
              </div>
              <div className="troubleshootgun-preview-sections">
                {TASK_SECTION_IDS.map((sectionId, index) => (
                  <label className="troubleshootgun-preview-section" key={sectionId}>
                    <input
                      type="checkbox"
                      checked={
                        templatePreview.importTask &&
                        Boolean(templatePreview.selectedTaskSections[index])
                      }
                      disabled={!templatePreview.importTask || !taskSections[index]?.trim()}
                      onChange={(event) =>
                        setTemplatePreview((prev) =>
                          prev
                            ? {
                                ...prev,
                                selectedTaskSections: prev.selectedTaskSections.map((checked, sectionIndex) =>
                                  sectionIndex === index ? event.target.checked : checked,
                                ),
                              }
                            : prev,
                        )
                      }
                    />
                    <span className="troubleshootgun-preview-section__body">
                      <strong>
                        {getTaskSectionLabel(sectionId, taskSectionNames)}
                      </strong>
                      <span
                        className="troubleshootgun-preview-modal__content"
                        dangerouslySetInnerHTML={{
                          __html: highlightText(taskSections[index]?.trim() || 'Section vide'),
                        }}
                      />
                    </span>
                  </label>
                ))}
              </div>
            </section>
          </div>
          <div className="troubleshootgun-preview-modal__actions">
            <button className="ghost" type="button" onClick={() => setTemplatePreview(null)}>
              Annuler
            </button>
            {mailHasContent ? (
              <button className="ghost" type="button" onClick={() => importTemplatePreview('replace')}>
                Remplacer le mail
              </button>
            ) : null}
            {isCrmTemplate && onComposeInCrm ? (
              <button
                className="ghost"
                type="button"
                title="Écrit l’objet et le corps dans le formulaire de mail du CRM, sans l’envoyer"
                onClick={onComposeInCrm}
              >
                Poser dans le CRM
              </button>
            ) : null}
            <button
              className="primary"
              type="button"
              title={mailHasContent ? 'Insère le template à la place du curseur dans le mail' : undefined}
              onClick={() => importTemplatePreview(mailHasContent ? 'insert' : 'replace')}
            >
              {mailHasContent ? 'Insérer' : 'Importer'}
            </button>
          </div>
        </div>
      </div>
  )
  return content
}
