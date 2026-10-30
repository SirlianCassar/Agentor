// Settings › Call template.
import type { RefObject } from 'react'
import { PHONE_CALL_TEMPLATE } from '../../lib/constants'
import type { TagSuggestionFieldId } from '../../lib/tags'
import { ADDITION_TOKEN, SELECTOR_TOKEN, TAG_TOKEN } from '../appShared'

export interface CallTemplateSettingsProps {
  applySuggestedTag: (fieldId: TagSuggestionFieldId, ref: RefObject<HTMLInputElement | HTMLTextAreaElement>, value: string, setValue: (next: string) => void, tag: string) => void
  callTemplate: string
  callTemplateRef: RefObject<HTMLTextAreaElement>
  insertCallTemplateToken: (token: string) => void
  renderTagSuggestions: (fieldId: TagSuggestionFieldId, onSelect: (tag: string) => void) => JSX.Element | null
  updateCallTemplate: (next: string) => void
  updateTagSuggestionFromTarget: (fieldId: TagSuggestionFieldId, target: HTMLInputElement | HTMLTextAreaElement | null, value: string) => void
}

export function CallTemplateSettings({
  applySuggestedTag,
  callTemplate,
  callTemplateRef,
  insertCallTemplateToken,
  renderTagSuggestions,
  updateCallTemplate,
  updateTagSuggestionFromTarget,
}: CallTemplateSettingsProps) {
  return (
    <div className="modal__grid modal__grid--single">
      <div className="list-card list-card--form">
        <div className="list-card__body">
          <div className="settings-block">
            <button
              className="btn btn--ghost btn--small btn--with-icon"
              type="button"
              onClick={() => updateCallTemplate(PHONE_CALL_TEMPLATE)}
            >
              Réinitialiser
            </button>
            <div className="token-buttons">
              <button
                type="button"
                className="token-btn token-btn--tag"
                title="Insérer un tag"
                onClick={() => insertCallTemplateToken(TAG_TOKEN)}
              >
                T
              </button>
              <button
                type="button"
                className="token-btn token-btn--selector"
                title="Insérer un sélecteur"
                onClick={() => insertCallTemplateToken(SELECTOR_TOKEN)}
              >
                S
              </button>
              <button
                type="button"
                className="token-btn token-btn--addition"
                title="Insérer un ajout"
                onClick={() => insertCallTemplateToken(ADDITION_TOKEN)}
              >
                A
              </button>
            </div>
            <textarea
              className="textarea textarea--tall textarea--call-template"
              ref={callTemplateRef}
              value={callTemplate}
              placeholder="Template d’appel"
              data-tag-autocomplete-field="true"
              onFocus={(event) =>
                updateTagSuggestionFromTarget(
                  'call-template',
                  event.currentTarget,
                  event.currentTarget.value,
                )
              }
              onClick={(event) =>
                updateTagSuggestionFromTarget(
                  'call-template',
                  event.currentTarget,
                  event.currentTarget.value,
                )
              }
              onKeyUp={(event) =>
                updateTagSuggestionFromTarget(
                  'call-template',
                  event.currentTarget,
                  event.currentTarget.value,
                )
              }
              onChange={(event) => {
                const nextValue = event.target.value
                updateCallTemplate(nextValue)
                updateTagSuggestionFromTarget(
                  'call-template',
                  event.currentTarget,
                  nextValue,
                )
              }}
            />
            {renderTagSuggestions('call-template', (tag) =>
              applySuggestedTag(
                'call-template',
                callTemplateRef,
                callTemplate,
                updateCallTemplate,
                tag,
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
