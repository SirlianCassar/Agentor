// Contents screen: every mail template, snippet, S-Task and F-Task template in
// one place, like a file manager. Types and categories on the left, the list
// with multiple selection and grouped actions in the middle, the item's editor
// on the right. Deleted items go to the trash.
import { useMemo, useState } from 'react'
import { CloseIcon } from '../../components/AppIcons'
import { UiIcon } from '../../components/UiIcon'
import {
  contentIssues,
  contentKey,
  contentRows,
  contentTypeLabels,
  contentUsage,
  describeIssue,
  duplicateItems,
  emptyTrash,
  extractTags,
  moveToCategory,
  moveToTrash,
  restoreFromTrash,
  saveContentText,
  saveTranslations,
  setFavorite,
  usedLanguages,
  type ContentRow,
  type ContentType,
} from '../../lib/contents'
import { matchesLibraryQuery } from '../../lib/library'
import { TEMPLATE_LANGUAGES, templateLanguageLabel } from '../../lib/templateLanguages'
import type { AppData, TaskTemplate, TaskTemplateKind } from '../../lib/types'
import { LibraryItemEditor } from '../zones/LibraryItemEditor'

const TYPES: ContentType[] = ['template', 'snippet', 's-task', 'f-task']

type View =
  | { kind: 'type'; type: ContentType; categoryId: string | null }
  | { kind: 'issues' }
  | { kind: 'favorites' }
  | { kind: 'trash' }

type EditorTab = 'content' | 'translations' | 'usage'

export interface ContentsScreenProps {
  data: AppData
  updateData: (change: (prev: AppData) => AppData) => void
  taskKind: (task: TaskTemplate) => TaskTemplateKind
  categoriesByType: Record<ContentType, Array<{ id: string; name: string }>>
  knownTags: string[]
  makeId: (type: ContentType) => string
  onClose: () => void
  onOpenSettings: (type: ContentType) => void
}

const sameView = (a: View, b: View) =>
  a.kind === b.kind && (a.kind !== 'type' || (b.kind === 'type' && a.type === b.type && a.categoryId === b.categoryId))

export function ContentsScreen({
  data,
  updateData,
  taskKind,
  categoriesByType,
  knownTags,
  makeId,
  onClose,
  onOpenSettings,
}: ContentsScreenProps) {
  const [view, setView] = useState<View>({ kind: 'type', type: 'template', categoryId: null })
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [focused, setFocused] = useState<string | null>(null)
  const [editorTab, setEditorTab] = useState<EditorTab>('content')
  const [deleteArmed, setDeleteArmed] = useState(false)
  const [moveTarget, setMoveTarget] = useState('')

  const rows = useMemo(() => contentRows(data, taskKind), [data, taskKind])
  const languages = useMemo(() => usedLanguages(data.templates), [data.templates])
  const issues = useMemo(() => contentIssues(data, rows, { knownTags, languages }), [data, knownTags, languages, rows])
  const trash = useMemo(() => data.trash ?? [], [data.trash])
  const rowByKey = useMemo(() => new Map(rows.map((row) => [contentKey(row.type, row.id), row])), [rows])

  const visibleRows = useMemo(() => {
    const inView = rows.filter((row) => {
      if (view.kind === 'issues') return issues.has(contentKey(row.type, row.id))
      if (view.kind === 'favorites') return Boolean(row.favorite)
      if (view.kind === 'trash') return false
      return row.type === view.type && (view.categoryId === null || (row.categoryId ?? '') === view.categoryId)
    })
    return inView.filter((row) => matchesLibraryQuery(`${row.name}\n${row.content}`, query))
  }, [issues, query, rows, view])

  const visibleTrash = useMemo(
    () =>
      view.kind === 'trash'
        ? trash.filter((entry) => {
            const item = entry.item as { name?: string; title?: string; content: string }
            return matchesLibraryQuery(`${item.name ?? item.title ?? ''}\n${item.content}`, query)
          })
        : [],
    [query, trash, view.kind],
  )

  const visibleKeys = view.kind === 'trash' ? visibleTrash.map((entry) => entry.id) : visibleRows.map((row) => contentKey(row.type, row.id))
  const selectedVisible = selected.filter((key) => visibleKeys.includes(key))
  const allSelected = visibleKeys.length > 0 && selectedVisible.length === visibleKeys.length
  const selectedRows = selectedVisible.map((key) => rowByKey.get(key)).filter((row): row is ContentRow => Boolean(row))
  const selectedTypes = [...new Set(selectedRows.map((row) => row.type))]
  const focusedRow = focused ? rowByKey.get(focused) ?? null : null

  const openView = (next: View) => {
    setView(next)
    setSelected([])
    setDeleteArmed(false)
    setMoveTarget('')
  }

  const toggle = (key: string) => {
    setDeleteArmed(false)
    setSelected((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]))
  }

  // Applies an action to the selection, one type at a time.
  const applyByType = (action: (prev: AppData, type: ContentType, ids: string[]) => AppData) => {
    const groups = new Map<ContentType, string[]>()
    selectedRows.forEach((row) => groups.set(row.type, [...(groups.get(row.type) ?? []), row.id]))
    updateData((prev) => [...groups.entries()].reduce((acc, [type, ids]) => action(acc, type, ids), prev))
  }

  const countFor = (type: ContentType, categoryId: string | null) =>
    rows.filter((row) => row.type === type && (categoryId === null || (row.categoryId ?? '') === categoryId)).length

  const categoryName = (type: ContentType, categoryId?: string) =>
    categoriesByType[type].find((category) => category.id === categoryId)?.name ?? null

  const favoritesCount = rows.filter((row) => row.favorite).length

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal contents-screen" role="dialog" aria-label="Contenus" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal__header">
          <div className="brand__title brand__title--with-icon">
            <UiIcon name="library" className="brand__title-icon" />
            <span>Contenus</span>
          </div>
          <button title="Fermer les contenus" className="close-modal close-modal--subtle" type="button" aria-label="Fermer les contenus" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>

        <div className="contents-screen__body">
          <nav className="contents-tree" aria-label="Types et catégories">
            <button
              type="button"
              className={`contents-tree__item contents-tree__item--special${view.kind === 'issues' ? ' is-active' : ''}`}
              onClick={() => openView({ kind: 'issues' })}
            >
              <UiIcon name="warning" />
              <span>À vérifier</span>
              <small>{issues.size}</small>
            </button>
            <button
              type="button"
              className={`contents-tree__item contents-tree__item--special${view.kind === 'favorites' ? ' is-active' : ''}`}
              onClick={() => openView({ kind: 'favorites' })}
            >
              <UiIcon name="star" />
              <span>Favoris</span>
              <small>{favoritesCount}</small>
            </button>
            <button
              type="button"
              className={`contents-tree__item contents-tree__item--special${view.kind === 'trash' ? ' is-active' : ''}`}
              onClick={() => openView({ kind: 'trash' })}
            >
              <UiIcon name="delete" />
              <span>Corbeille</span>
              <small>{trash.length}</small>
            </button>
            {TYPES.map((type) => (
              <div key={type} className="contents-tree__group">
                <button
                  type="button"
                  className={`contents-tree__item contents-tree__item--type${
                    sameView(view, { kind: 'type', type, categoryId: null }) ? ' is-active' : ''
                  }`}
                  onClick={() => openView({ kind: 'type', type, categoryId: null })}
                >
                  <span>{contentTypeLabels[type]}</span>
                  <small>{countFor(type, null)}</small>
                </button>
                {categoriesByType[type].map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    className={`contents-tree__item contents-tree__item--category${
                      sameView(view, { kind: 'type', type, categoryId: category.id }) ? ' is-active' : ''
                    }`}
                    onClick={() => openView({ kind: 'type', type, categoryId: category.id })}
                  >
                    <span>{category.name}</span>
                    <small>{countFor(type, category.id)}</small>
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <section className="contents-list" aria-label="Liste">
            <div className="contents-list__head">
              <label className="contents-list__all">
                <input
                  type="checkbox"
                  checked={allSelected}
                  disabled={!visibleKeys.length}
                  aria-label="Tout sélectionner"
                  onChange={() => setSelected(allSelected ? [] : visibleKeys)}
                />
              </label>
              <input
                className="input contents-list__search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher dans la liste"
                aria-label="Rechercher dans les contenus"
              />
              <span className="contents-list__count">{visibleKeys.length}</span>
            </div>

            {selectedVisible.length ? (
              <div className="contents-actions" aria-label="Actions sur la sélection">
                <span className="contents-actions__count">{selectedVisible.length} sélectionné{selectedVisible.length > 1 ? 's' : ''}</span>
                {view.kind === 'trash' ? (
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => {
                      updateData((prev) => restoreFromTrash(prev, selectedVisible))
                      setSelected([])
                    }}
                  >
                    Restaurer
                  </button>
                ) : (
                  <>
                    <select
                      className="select contents-actions__move"
                      value={moveTarget}
                      disabled={selectedTypes.length !== 1}
                      title={selectedTypes.length !== 1 ? 'Sélectionne un seul type pour changer de catégorie' : 'Déplacer vers une catégorie'}
                      aria-label="Déplacer vers"
                      onChange={(event) => {
                        const categoryId = event.target.value
                        setMoveTarget('')
                        if (!categoryId || selectedTypes.length !== 1) return
                        applyByType((prev, type, ids) => moveToCategory(prev, type, ids, categoryId))
                      }}
                    >
                      <option value="">Déplacer vers…</option>
                      {selectedTypes.length === 1
                        ? categoriesByType[selectedTypes[0]].map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))
                        : null}
                    </select>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => {
                        applyByType((prev, type, ids) => duplicateItems(prev, type, ids, () => makeId(type)))
                        setSelected([])
                      }}
                    >
                      Dupliquer
                    </button>
                    {selectedTypes.some((type) => type !== 'snippet') ? (
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => {
                          const favorite = !selectedRows.every((row) => row.type === 'snippet' || row.favorite)
                          applyByType((prev, type, ids) => setFavorite(prev, type, ids, favorite))
                        }}
                      >
                        {selectedRows.every((row) => row.type === 'snippet' || row.favorite) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={`ghost contents-actions__delete${deleteArmed ? ' is-armed' : ''}`}
                      onClick={() => {
                        if (!deleteArmed) {
                          setDeleteArmed(true)
                          return
                        }
                        applyByType((prev, type, ids) => moveToTrash(prev, type, ids))
                        setSelected([])
                        setDeleteArmed(false)
                        if (focused && selectedVisible.includes(focused)) setFocused(null)
                      }}
                    >
                      {deleteArmed ? 'Confirmer : vers la corbeille' : 'Supprimer'}
                    </button>
                  </>
                )}
              </div>
            ) : view.kind === 'trash' && trash.length ? (
              <div className="contents-actions">
                <span className="contents-actions__count">Les éléments supprimés restent ici jusqu’à ce que la corbeille soit vidée.</span>
                <button
                  type="button"
                  className={`ghost contents-actions__delete${deleteArmed ? ' is-armed' : ''}`}
                  onClick={() => {
                    if (!deleteArmed) {
                      setDeleteArmed(true)
                      return
                    }
                    updateData((prev) => emptyTrash(prev))
                    setDeleteArmed(false)
                  }}
                >
                  {deleteArmed ? 'Confirmer : vider pour de bon' : 'Vider la corbeille'}
                </button>
              </div>
            ) : null}

            <div className="contents-list__rows" role="list">
              {view.kind === 'trash'
                ? visibleTrash.map((entry) => {
                    const item = entry.item as { name?: string; title?: string }
                    return (
                      <div key={entry.id} role="listitem" className="contents-row contents-row--trash">
                        <input
                          type="checkbox"
                          checked={selected.includes(entry.id)}
                          aria-label={`Sélectionner ${item.name ?? item.title ?? ''}`}
                          onChange={() => toggle(entry.id)}
                        />
                        <span className="contents-row__name">{item.name ?? item.title}</span>
                        <span className="contents-row__badge">{contentTypeLabels[entry.type]}</span>
                        <span className="contents-row__meta">{new Date(entry.deletedAt).toLocaleString('fr-FR')}</span>
                      </div>
                    )
                  })
                : visibleRows.map((row) => {
                    const key = contentKey(row.type, row.id)
                    const rowIssues = issues.get(key) ?? []
                    return (
                      <div key={key} role="listitem" className={`contents-row${focused === key ? ' is-focused' : ''}`}>
                        <input type="checkbox" checked={selected.includes(key)} aria-label={`Sélectionner ${row.name}`} onChange={() => toggle(key)} />
                        <button
                          type="button"
                          className="contents-row__name"
                          onClick={() => {
                            setFocused(key)
                            setEditorTab('content')
                          }}
                        >
                          {row.favorite ? <span className="contents-row__star">★</span> : null}
                          {row.name}
                        </button>
                        {view.kind !== 'type' ? <span className="contents-row__badge">{contentTypeLabels[row.type]}</span> : null}
                        {row.languages.length ? (
                          <span className="contents-row__badge">{row.languages.map((code) => code.toUpperCase()).join(' ')}</span>
                        ) : null}
                        {rowIssues.length ? (
                          <span className="contents-row__issues" title={rowIssues.map(describeIssue).join('\n')}>
                            {rowIssues.length} à vérifier
                          </span>
                        ) : null}
                      </div>
                    )
                  })}
              {!visibleKeys.length ? <p className="contents-list__empty">Rien ici.</p> : null}
            </div>
          </section>

          <section className="contents-editor" aria-label="Élément">
            {focusedRow ? (
              <>
                <div className="contents-editor__tabs" role="tablist">
                  {(
                    [
                      ['content', 'Contenu'],
                      ...(focusedRow.type === 'template' ? [['translations', 'Traductions']] : []),
                      ['usage', 'Utilisation'],
                    ] as Array<[EditorTab, string]>
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={editorTab === id}
                      className={`contents-editor__tab${editorTab === id ? ' is-active' : ''}`}
                      onClick={() => setEditorTab(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {editorTab === 'content' ? (
                  <LibraryItemEditor
                    key={`${focused}-${focusedRow.name}-${focusedRow.content.length}`}
                    kind={focusedRow.type}
                    name={focusedRow.name}
                    content={focusedRow.content}
                    translationCount={Math.max(0, focusedRow.languages.length - 1)}
                    onSave={(name, content) => updateData((prev) => saveContentText(prev, focusedRow.type, focusedRow.id, name, content))}
                    onCancel={() => setFocused(null)}
                    onOpenSettings={() => onOpenSettings(focusedRow.type)}
                  />
                ) : null}
                {editorTab === 'translations' && focusedRow.type === 'template' ? (
                  <TranslationsEditor
                    key={focused ?? ''}
                    data={data}
                    templateId={focusedRow.id}
                    onSave={(translations) => updateData((prev) => saveTranslations(prev, focusedRow.id, translations))}
                  />
                ) : null}
                {editorTab === 'usage' ? (
                  <div className="contents-usage">
                    <ul>
                      {contentUsage(data, focusedRow, categoryName).map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                    {(issues.get(focused ?? '') ?? []).length ? (
                      <>
                        <p className="contents-usage__title">À vérifier</p>
                        <ul>
                          {(issues.get(focused ?? '') ?? []).map((issue) => (
                            <li key={describeIssue(issue)}>{describeIssue(issue)}</li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="contents-list__empty">Choisis un élément pour le modifier, ou coche-en plusieurs pour agir sur tous.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

// Main version and each translation side by side; tags of the main version
// missing from a translation are listed under it.
function TranslationsEditor({
  data,
  templateId,
  onSave,
}: {
  data: AppData
  templateId: string
  onSave: (translations: Array<{ language: string; content: string }>) => void
}) {
  const template = data.templates.find((item) => item.id === templateId)
  const [drafts, setDrafts] = useState(() => (template?.translations ?? []).map((item) => ({ ...item })))
  const [added, setAdded] = useState('')
  if (!template) return null
  const mainTags = extractTags(template.content)
  const usedCodes = new Set([template.language, ...drafts.map((item) => item.language)])
  const changed = JSON.stringify(drafts) !== JSON.stringify(template.translations ?? [])

  return (
    <div className="contents-translations">
      <div className="contents-translations__version">
        <p className="contents-usage__title">{templateLanguageLabel(template.language)} (principale)</p>
        <pre className="contents-translations__main">{template.content}</pre>
      </div>
      {drafts.map((draft, index) => {
        const missing = mainTags.filter((tag) => !draft.content.includes(tag))
        return (
          <div key={draft.language} className="contents-translations__version">
            <p className="contents-usage__title">{templateLanguageLabel(draft.language)}</p>
            <textarea
              className="input contents-translations__text"
              aria-label={`Version ${draft.language}`}
              value={draft.content}
              onChange={(event) =>
                setDrafts((prev) => prev.map((item, at) => (at === index ? { ...item, content: event.target.value } : item)))
              }
            />
            {missing.length ? <p className="library-editor__issue">Tags absents : {missing.join(' ')}</p> : null}
          </div>
        )
      })}
      <div className="contents-translations__actions">
        <select className="select" value={added} aria-label="Ajouter une langue" onChange={(event) => setAdded(event.target.value)}>
          <option value="">Ajouter une langue…</option>
          {TEMPLATE_LANGUAGES.filter((item) => !usedCodes.has(item.code)).map((item) => (
            <option key={item.code} value={item.code}>
              {item.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="ghost"
          disabled={!added}
          onClick={() => {
            setDrafts((prev) => [...prev, { language: added, content: '' }])
            setAdded('')
          }}
        >
          Ajouter
        </button>
        <button type="button" className="primary" disabled={!changed} onClick={() => onSave(drafts)}>
          Enregistrer
        </button>
      </div>
    </div>
  )
}
