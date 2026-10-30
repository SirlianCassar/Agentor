// Quick edit of one library item in the contextual panel, without leaving the
// case: its name and its text. Everything else stays in the settings pages.
import { useState } from 'react'
import { TextEditor } from '../../components/TextEditor'
import type { SearchKind } from '../../lib/unifiedSearch'

export interface LibraryEditTarget {
  kind: Exclude<SearchKind, 'procedure'>
  id: string
  folderId?: string
}

export interface LibraryItemEditorProps {
  kind: LibraryEditTarget['kind']
  name: string
  content: string
  // Mail templates with translations: only the main language is edited here.
  translationCount?: number
  onSave: (name: string, content: string) => void
  onCancel: () => void
  onOpenSettings: () => void
}

const kindLabels: Record<LibraryEditTarget['kind'], string> = {
  template: 'Template mail',
  troubleshootgun: 'Template Troubleshotgun',
  snippet: 'Snippet',
  's-task': 'Template S-Task',
  'f-task': 'Template F-Task',
}

export function LibraryItemEditor({
  kind,
  name,
  content,
  translationCount = 0,
  onSave,
  onCancel,
  onOpenSettings,
}: LibraryItemEditorProps) {
  const [draftName, setDraftName] = useState(name)
  const [draftContent, setDraftContent] = useState(content)
  const changed = draftName !== name || draftContent !== content
  const valid = draftName.trim() !== '' && draftContent.trim() !== ''

  return (
    <form
      className="library-editor"
      onSubmit={(event) => {
        event.preventDefault()
        if (changed && valid) onSave(draftName.trim(), draftContent)
      }}
    >
      <label className="library-editor__field">
        <span className="library-editor__label">{kindLabels[kind]}</span>
        <input
          className="input"
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          aria-label="Nom"
          placeholder="Nom"
        />
      </label>
      <div className="library-editor__field library-editor__field--grow">
        <span className="library-editor__label">Texte</span>
        <TextEditor value={draftContent} onChange={setDraftContent} className="library-editor__text" placeholder="Texte" />
      </div>
      {translationCount ? (
        <p className="context-panel__note">
          Langue principale seulement : {translationCount} traduction{translationCount > 1 ? 's' : ''} à revoir dans
          Paramètres si besoin.
        </p>
      ) : null}
      {!valid ? <p className="library-editor__issue">Le nom et le texte sont obligatoires.</p> : null}
      <div className="library-editor__actions">
        <button type="button" className="ghost library-editor__settings" onClick={onOpenSettings}>
          Tout modifier dans Paramètres
        </button>
        <button type="button" className="ghost" onClick={onCancel}>
          Annuler
        </button>
        <button type="submit" className="primary" disabled={!changed || !valid}>
          Enregistrer
        </button>
      </div>
    </form>
  )
}
