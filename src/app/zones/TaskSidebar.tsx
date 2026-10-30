// Right column: persistent notes and the task builder.
import type { ClipboardEvent, Dispatch, MouseEvent, RefObject, SetStateAction } from 'react'
import { CloseIcon, DeleteIcon } from '../../components/AppIcons'
import { type ProtectedTextRange, TextEditor, type TextEditorHandle } from '../../components/TextEditor'
import { UiIcon } from '../../components/UiIcon'
import { type TaskBoxSlot, taskBoxUsesSkeleton } from '../../lib/taskDraft'
import type { AppData } from '../../lib/types'

export interface TaskSidebarProps {
  activeTaskBoxIndex: number
  closeDraftBoxTooltip: () => void
  data: AppData
  handleClearTask: () => void
  handleCopyTask: () => Promise<void>
  handleTaskBoxHover: (index: number, event: MouseEvent<HTMLButtonElement>) => void
  handleTaskPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void
  hasTaskBoxContent: (task: string, index: number) => boolean
  openTaskBox: (index: number) => void
  setData: Dispatch<SetStateAction<AppData>>
  setTaskClearPulse: Dispatch<SetStateAction<boolean>>
  setTaskCopyPulse: Dispatch<SetStateAction<boolean>>
  taskClearArmed: boolean
  taskClearPulse: boolean
  taskCopied: boolean
  taskCopyPulse: boolean
  taskDraftBoxes: TaskBoxSlot[]
  taskDraftSkeletonEnabled: boolean
  taskEditorRef: RefObject<TextEditorHandle>
  taskHeadingProtectedRanges: ProtectedTextRange[]
  taskTags: number
  triggerPulse: (setPulse: (value: boolean) => void) => void
  updateTaskDraft: (next: string, cursor?: number, useSkeleton?: boolean) => void
}

export function TaskSidebar({
  activeTaskBoxIndex,
  closeDraftBoxTooltip,
  data,
  handleClearTask,
  handleCopyTask,
  handleTaskBoxHover,
  handleTaskPaste,
  hasTaskBoxContent,
  openTaskBox,
  setData,
  setTaskClearPulse,
  setTaskCopyPulse,
  taskClearArmed,
  taskClearPulse,
  taskCopied,
  taskCopyPulse,
  taskDraftBoxes,
  taskDraftSkeletonEnabled,
  taskEditorRef,
  taskHeadingProtectedRanges,
  taskTags,
  triggerPulse,
  updateTaskDraft,
}: TaskSidebarProps) {
  return (
    <aside className="right-sidebar">
      <div className="note-panel-workspace">
        <div className="note-panel-workspace__header">
          <p className="section-label section-label--tight">
            <UiIcon name="notes" className="section-label__icon" />
            <span>Notes</span>
          </p>
        </div>
        <div className="note-editor-wrapper">
          <textarea
            value={data.notes}
            onChange={(event) => setData((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Notes persistantes..."
          />
          <button
            className="note-clear-btn"
            type="button"
            onClick={() => setData((prev) => ({ ...prev, notes: '' }))}
            title="Effacer la note"
            aria-label="Effacer la note"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      <section className="task-builder">
        <div className="task-builder__header">
          <div className="task-builder__header-left">
            <p className="section-label section-label--tight">
              <UiIcon name="inbox" className="section-label__icon" />
              <span>Task</span>
            </p>
          </div>
        </div>
        <div className="task-editor-wrapper">
          <TextEditor
            ref={taskEditorRef}
            value={data.taskDraft}
            onChange={(value) => {
              const cursor = taskEditorRef.current?.getSelection().start
              updateTaskDraft(value, cursor)
            }}
            onPaste={handleTaskPaste}
            placeholder={
              taskDraftSkeletonEnabled
                ? 'Écrivez votre S-Task...'
                : 'Écrivez votre F-Task...'
            }
            className="task-editor"
            protectedRanges={taskHeadingProtectedRanges}
            decorateTaskSkeleton={taskDraftSkeletonEnabled}
          />
        </div>
        <div className="task-actions">
          <div className="task-actions__left">
            <div
              className="draft-boxes-inline task-draft-boxes-inline"
              aria-label="S-Task et F-Task"
            >
              {taskDraftBoxes.map((slot, index) => {
                const taskValue = index === activeTaskBoxIndex ? data.taskDraft : slot.task
                const hasContent = hasTaskBoxContent(taskValue, index)
                const isActive = index === activeTaskBoxIndex
                return (
                  <button
                    key={`task-draft-box-${index + 1}`}
                    type="button"
                    className={`draft-box-btn task-draft-box-btn${hasContent ? ' is-filled' : ''}${
                      isActive ? ' is-active' : ''
                    }`}
                    title={index === 0 ? 'S-Task' : 'F-Task'}
                    aria-label={
                      index === 0
                        ? 'Afficher la S-Task'
                        : 'Afficher la F-Task'
                    }
                    aria-pressed={isActive}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => openTaskBox(index)}
                    onMouseEnter={(event) => handleTaskBoxHover(index, event)}
                    onMouseLeave={closeDraftBoxTooltip}
                  >
                    <span className="draft-box-btn__icon" aria-hidden="true">
                      <UiIcon
                        name={taskBoxUsesSkeleton(index) ? 'template' : 'edit'}
                        className="draft-box-btn__icon-svg"
                      />
                      {hasContent ? <span className="draft-box-btn__badge">T</span> : null}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <div className="task-actions__right">
            <button
              className={`primary task-copy-btn copy-btn${taskCopied ? ' is-success' : ''}${
                taskCopyPulse ? ' btn-pulse' : ''
              }${taskTags ? ' has-tag-warning' : ''}`}
              onClick={() => {
                triggerPulse(setTaskCopyPulse)
                void handleCopyTask()
              }}
              onAnimationEnd={() => setTaskCopyPulse(false)}
            >
              {taskCopied ? 'Copié !' : 'Copy'}
            </button>
            <button
              className={`ghost task-clear-btn${taskClearArmed ? ' confirm' : ''}${
                taskClearPulse ? ' btn-pulse' : ''
              }`}
              type="button"
              onClick={() => {
                triggerPulse(setTaskClearPulse)
                handleClearTask()
              }}
              onAnimationEnd={() => setTaskClearPulse(false)}
              title={taskClearArmed ? 'Confirmer' : 'Clear'}
              aria-label={taskClearArmed ? 'Confirmer' : 'Clear'}
            >
              <DeleteIcon />
              <span>{taskClearArmed ? 'Confirmer' : 'Clear'}</span>
            </button>
          </div>
        </div>
      </section>
    </aside>
  )
}
