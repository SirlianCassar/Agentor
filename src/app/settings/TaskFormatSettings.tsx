// Settings › S-Task sections and their formatting.
import { useEffect, useState } from 'react'
import { defaultData } from '../../lib/defaults'
import {
  buildStructuredTaskDraft,
  normalizeTaskTemplateKind,
  simplifyTaskHeading,
  TASK_SECTION_IDS,
} from '../../lib/taskDraft'
import type { TaskTemplate } from '../../lib/types'
import { highlightText } from '../../lib/utils'

export interface TaskFormatSettingsProps {
  taskSectionNames: string[]
  taskTemplates: TaskTemplate[]
  updateTaskSectionName: (index: number, name: string) => void
}

const SECTION_ROLES = [
  'Résumé du cas : produit, symptôme, contexte.',
  'Historique : échanges et actions déjà faites.',
  'Prochaine étape : ce qui doit se passer ensuite.',
  'Notes libres.',
]

// Fictional sample, only to show how a filled S-Task reads.
const SAMPLE_CONTENTS = [
  'Volant : perte du retour de force après mise à jour.',
  'Firmware réinstallé avec le client, sans effet.',
  'Envoyer l’étiquette de retour.',
  '',
]

type PreviewMode = 'skeleton' | 'sample'

// An S-Task model fills the sections where it has text.
const countTemplatesBySection = (templates: TaskTemplate[]) =>
  TASK_SECTION_IDS.map((_, index) =>
    templates.filter(
      (task) => normalizeTaskTemplateKind(task) === 's-task' && Boolean(task.taskSections?.[index]?.trim()),
    ).length,
  )

export function TaskFormatSettings({
  taskSectionNames,
  taskTemplates,
  updateTaskSectionName,
}: TaskFormatSettingsProps) {
  const [drafts, setDrafts] = useState(taskSectionNames)
  const [errors, setErrors] = useState<string[]>(() => TASK_SECTION_IDS.map(() => ''))
  const [previewMode, setPreviewMode] = useState<PreviewMode>('skeleton')
  const defaults = defaultData.settings.taskSectionNames
  const counts = countTemplatesBySection(taskTemplates)
  const changedCount = taskSectionNames.filter((name, index) => name !== defaults[index]).length

  useEffect(() => {
    setDrafts(taskSectionNames)
  }, [taskSectionNames])

  const setError = (index: number, message: string) =>
    setErrors((prev) => prev.map((value, position) => (position === index ? message : value)))

  // A title is saved on blur or Enter, so clearing the field while
  // typing never brings the default back mid-edit.
  const commit = (index: number) => {
    const value = (drafts[index] ?? '').trim()
    const next = value || defaults[index]
    const clash = taskSectionNames.findIndex(
      (name, position) => position !== index && simplifyTaskHeading(name) === simplifyTaskHeading(next),
    )
    if (clash !== -1) {
      setError(index, `Même titre que la section ${clash + 1} : les deux sections se confondraient.`)
      return
    }
    setError(index, '')
    if (next !== taskSectionNames[index]) updateTaskSectionName(index, value)
    else setDrafts(taskSectionNames)
  }

  const reset = (index: number) => {
    setError(index, '')
    updateTaskSectionName(index, '')
  }

  const resetAll = () => {
    TASK_SECTION_IDS.forEach((_, index) => updateTaskSectionName(index, ''))
    setErrors(TASK_SECTION_IDS.map(() => ''))
  }

  const preview = buildStructuredTaskDraft(
    previewMode === 'sample' ? SAMPLE_CONTENTS : TASK_SECTION_IDS.map(() => ''),
    taskSectionNames,
  ).trim()

  return (
    <div className="task-format">
      <section className="list-card list-card--form task-format__editor" aria-label="Sections du squelette">
        <div className="list-card__header">
          <div className="list-card__title">Sections du squelette</div>
          <button type="button" className="btn btn--ghost btn--small" disabled={changedCount === 0} onClick={resetAll}>
            Titres par défaut
          </button>
        </div>
        <div className="list-card__body">
          <p className="settings-option__desc">
            Chaque titre ouvre une section de la S-Task. Les modèles S-Task écrivent leur texte dans ces sections.
          </p>
          <ol className="task-format__list">
            {TASK_SECTION_IDS.map((sectionId, index) => {
              const isDefault = taskSectionNames[index] === defaults[index]
              const count = counts[index]
              return (
                <li key={sectionId} className={`task-format__row${errors[index] ? ' has-error' : ''}`}>
                  <span className="task-format__number" aria-hidden="true">{index + 1}</span>
                  <div className="task-format__field">
                    <div className="task-format__field-top">
                      <span className="task-format__arrow" aria-hidden="true">►</span>
                      <input
                        className="input"
                        aria-label={`Titre de la section ${index + 1}`}
                        value={drafts[index] ?? ''}
                        placeholder={defaults[index]}
                        onChange={(event) => {
                          const value = event.target.value
                          setDrafts((prev) => prev.map((name, position) => (position === index ? value : name)))
                        }}
                        onBlur={() => commit(index)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            commit(index)
                          } else if (event.key === 'Escape') {
                            event.stopPropagation()
                            setDrafts(taskSectionNames)
                            setError(index, '')
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn--ghost btn--small task-format__reset"
                        aria-label={`Titre par défaut pour la section ${index + 1}`}
                        title={`Par défaut : ${defaults[index]}`}
                        disabled={isDefault}
                        onClick={() => reset(index)}
                      >
                        Défaut
                      </button>
                    </div>
                    <div className="task-format__meta">
                      <span>{SECTION_ROLES[index]}</span>
                      <span className="task-format__count">
                        {count === 0 ? 'Aucun modèle' : count === 1 ? '1 modèle' : `${count} modèles`}
                      </span>
                    </div>
                    {errors[index] ? (
                      <div className="task-format__error" role="alert">{errors[index]}</div>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>
          <p className="settings-option__desc task-format__hint">
            Entrée enregistre, Échap annule. Un champ vidé reprend le titre par défaut. La S-Task en cours suit le
            nouveau titre.
          </p>
        </div>
      </section>

      <section className="list-card list-card--form task-format__preview" aria-label="Aperçu de la S-Task">
        <div className="list-card__header">
          <div className="list-card__title">Aperçu</div>
          <div className="task-format__switch" role="group" aria-label="Contenu de l’aperçu">
            <button
              type="button"
              className={previewMode === 'skeleton' ? 'is-active' : ''}
              aria-pressed={previewMode === 'skeleton'}
              onClick={() => setPreviewMode('skeleton')}
            >
              Squelette
            </button>
            <button
              type="button"
              className={previewMode === 'sample' ? 'is-active' : ''}
              aria-pressed={previewMode === 'sample'}
              onClick={() => setPreviewMode('sample')}
            >
              Exemple
            </button>
          </div>
        </div>
        <div className="list-card__body">
          <div
            className="task-format__preview-content settings-token-preview"
            data-testid="task-format-preview"
            dangerouslySetInnerHTML={{ __html: highlightText(preview) }}
          />
        </div>
      </section>
    </div>
  )
}
