// Phone call notes, shown in the contextual panel.
import type { Dispatch, RefObject, SetStateAction } from 'react'
import { TextEditor, type TextEditorHandle } from '../../components/TextEditor'
import { formatHistoryTimestamp } from '../../lib/formatting'
import type { HistoryItem } from '../../lib/types'
import { normalizeTokenSpacing } from '../../lib/utils'

export interface CallModalProps {
  callCopied: boolean
  callDraft: string
  callEditorRef: RefObject<TextEditorHandle>
  callModalHistoryItems: HistoryItem[]
  currentCallMemory: string
  currentCallMemoryLocked: boolean
  currentCallPreview: string
  handleCopyCall: () => Promise<void>
  selectedCallHistoryId: string | null
  setCallDraft: Dispatch<SetStateAction<string>>
  setCurrentCallMemory: Dispatch<SetStateAction<string>>
  setCurrentCallMemoryLocked: Dispatch<SetStateAction<boolean>>
  setSelectedCallHistoryId: Dispatch<SetStateAction<string | null>>
  updateCallDraft: (next: string, cursor?: number) => void
  // The notes can go into the task.
  onSendToTask?: () => void
}

export function CallModal({
  callCopied,
  callDraft,
  callEditorRef,
  callModalHistoryItems,
  currentCallMemory,
  currentCallMemoryLocked,
  currentCallPreview,
  handleCopyCall,
  selectedCallHistoryId,
  setCallDraft,
  setCurrentCallMemory,
  setCurrentCallMemoryLocked,
  setSelectedCallHistoryId,
  updateCallDraft,
  onSendToTask,
}: CallModalProps) {
  const content = (
      <div className="modal call-modal call-modal--panel" onClick={(event) => event.stopPropagation()}>
        <div className="call-modal__body">
          <div className="call-modal__main">
            <div className="call-modal__editor-pane">
              <div className="call-modal__label">Appel téléphonique</div>
              <TextEditor
                ref={callEditorRef}
                value={callDraft}
                onChange={(value) => updateCallDraft(value)}
                placeholder="Appel téléphonique"
                className="call-modal__editor"
              />
            </div>
            <aside className="call-modal__history" aria-label="Derniers appels">
              <div className="call-modal__history-title">5 derniers appels</div>
              <div className="call-modal__history-list">
                <button
                  className={`call-modal__history-item call-modal__history-item--current${
                    selectedCallHistoryId === null ? ' is-active' : ''
                  }`}
                  type="button"
                  onClick={() => {
                    setCallDraft(normalizeTokenSpacing(currentCallMemory))
                    setSelectedCallHistoryId(null)
                    setCurrentCallMemoryLocked(false)
                    requestAnimationFrame(() => {
                      const cursor = currentCallMemory.length
                      callEditorRef.current?.focus()
                      callEditorRef.current?.setSelection(cursor, cursor)
                    })
                  }}
                >
                  <span>Appel en cours</span>
                  <strong>{currentCallPreview}</strong>
                </button>
                {callModalHistoryItems.length ? (
                  callModalHistoryItems.map((item) => (
                    <button
                      className={`call-modal__history-item${
                        selectedCallHistoryId === item.id ? ' is-active' : ''
                      }`}
                      type="button"
                      key={item.id}
                      onClick={() => {
                        if (!currentCallMemoryLocked) {
                          setCurrentCallMemory(callDraft)
                          setCurrentCallMemoryLocked(true)
                        }
                        setCallDraft(normalizeTokenSpacing(item.content))
                        setSelectedCallHistoryId(item.id)
                        requestAnimationFrame(() => callEditorRef.current?.focus())
                      }}
                    >
                      <span>{formatHistoryTimestamp(item.createdAt)}</span>
                      <strong>{item.content.split(/\r?\n/)[0]?.trim() || 'Appel'}</strong>
                    </button>
                  ))
                ) : (
                  <div className="call-modal__history-empty">Aucun appel enregistré.</div>
                )}
              </div>
            </aside>
          </div>
          <div className="call-modal__footer">
            {onSendToTask ? (
              <button className="ghost call-modal__to-task" type="button" onClick={onSendToTask} title="Ajoute ces notes à la section Notes de la tâche">
                Ajouter à la tâche
              </button>
            ) : null}
            <button
              className={`primary copy-btn${callCopied ? ' is-success' : ''}`}
              type="button"
              onClick={() => void handleCopyCall()}
            >
              {callCopied ? 'Copié !' : 'Copy'}
            </button>
          </div>
        </div>
      </div>
  )
  return content
}
