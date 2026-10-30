// Settings › S-Task sections and their formatting.
import { buildStructuredTaskDraft, TASK_SECTION_IDS } from '../../lib/taskDraft'
import { highlightText } from '../../lib/utils'

export interface TaskFormatSettingsProps {
  taskSectionNames: string[]
  updateTaskSectionName: (index: number, name: string) => void
}

export function TaskFormatSettings({
  taskSectionNames,
  updateTaskSectionName,
}: TaskFormatSettingsProps) {
  return (
    <div className="modal__grid modal__grid--single">
      <div className="list-card list-card--form">
        <div className="list-card__header">
          <div className="list-card__title-group">
            <div className="list-card__title">Structure du squelette</div>
          </div>
        </div>
        <div className="list-card__body">
          <div className="settings-block">
            {TASK_SECTION_IDS.map((sectionId, index) => (
              <input
                key={sectionId}
                className="input"
                value={taskSectionNames[index]}
                onChange={(event) => updateTaskSectionName(index, event.target.value)}
              />
            ))}
          </div>
          <div className="task-template-preview-settings">
            <div className="task-template-preview-settings__title">Squelette</div>
            <div
              className="task-template-preview-settings__content settings-token-preview"
              dangerouslySetInnerHTML={{
                __html: highlightText(
                  buildStructuredTaskDraft(['', '', '', ''], taskSectionNames).trim(),
                ),
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
