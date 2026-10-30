// Settings › Tags proposés while typing.
import type { Dispatch, SetStateAction } from 'react'
import { ButtonIcon, DeleteIcon } from '../../components/AppIcons'
import { highlightText } from '../../lib/utils'

export interface SuggestedTagsSettingsProps {
  handleAddPredefinedTag: () => void
  handleRemovePredefinedTag: (tag: string) => void
  predefinedTagDraft: string
  predefinedTags: string[]
  setPredefinedTagDraft: Dispatch<SetStateAction<string>>
}

export function SuggestedTagsSettings({
  handleAddPredefinedTag,
  handleRemovePredefinedTag,
  predefinedTagDraft,
  predefinedTags,
  setPredefinedTagDraft,
}: SuggestedTagsSettingsProps) {
  return (
    <div className="modal__grid modal__grid--single">
      <div className="list-card list-card--form">
        <div className="list-card__header">
          <div className="list-card__title">Gestion</div>
        </div>
        <div className="list-card__body">
          <div className="tag-settings">
            <div className="tag-settings__composer">
              <input
                className="input"
                placeholder="Ex: CLIENT ou <CLIENT>"
                value={predefinedTagDraft}
                onChange={(event) => setPredefinedTagDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return
                  event.preventDefault()
                  handleAddPredefinedTag()
                }}
              />
              <button
                className="btn btn--primary btn--small btn--with-icon"
                type="button"
                onClick={handleAddPredefinedTag}
              >
                <ButtonIcon name="add" />
                Ajouter
              </button>
            </div>
            <div className="tag-settings__list">
              {predefinedTags.length ? (
                predefinedTags.map((tag) => (
                  <div className="tag-settings__item" key={tag}>
                    <div
                      className="tag-settings__token settings-token-preview"
                      dangerouslySetInnerHTML={{ __html: highlightText(tag) }}
                    />
                    <button
                      className="icon-btn-sm danger"
                      type="button"
                      title="Supprimer"
                      onClick={() => handleRemovePredefinedTag(tag)}
                    >
                  <DeleteIcon />
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-state">Aucun tag prédéfini enregistré.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
