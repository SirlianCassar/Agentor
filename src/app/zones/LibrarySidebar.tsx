// Left column: a list per type with its search (Ctrl+K), which can be widened
// to the whole library, and its filters. It folds down to a column of icons.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent } from 'react'
import { UiIcon } from '../../components/UiIcon'
import type { AppIconName } from '../../lib/iconTypes'
import type {
  Category,
  CustomerPortalCode,
  MailTemplate,
  MailTemplateCategory,
  Snippet,
  TaskTemplate,
  TaskTemplateKind,
  TroubleshootgunFolder,
} from '../../lib/types'
import {
  buildSearchEntries,
  matchesProduct,
  productSearchTerms,
  searchLibrary,
  type SearchEntry,
  type SearchKind,
} from '../../lib/unifiedSearch'

export type LibraryTab = 'snippet' | 'template' | 'troubleshootgun' | 'task' | 'procedure'

const LIBRARY_STORAGE_KEY = 'agentor:library:v1'
const GROUP_LIMIT = 8

const libraryTabs: Array<{ id: LibraryTab; label: string; icon: AppIconName }> = [
  { id: 'snippet', label: 'Snippets', icon: 'list' },
  { id: 'template', label: 'Mails', icon: 'mail' },
  { id: 'troubleshootgun', label: 'Troubleshotgun', icon: 'target' },
  { id: 'task', label: 'Tâches', icon: 'notes' },
  { id: 'procedure', label: 'Procédures', icon: 'portal' },
]

const kindIcons: Record<SearchKind, AppIconName> = {
  snippet: 'list',
  template: 'mail',
  troubleshootgun: 'target',
  's-task': 'notes',
  'f-task': 'notes',
  procedure: 'portal',
}

const tabOfKind = (kind: SearchKind): LibraryTab =>
  kind === 's-task' || kind === 'f-task' ? 'task' : kind

interface StoredLibrary {
  collapsed: boolean
  tab: LibraryTab
}

const readStoredLibrary = (): StoredLibrary => {
  try {
    const raw = JSON.parse(window.localStorage.getItem(LIBRARY_STORAGE_KEY) ?? 'null') as Partial<StoredLibrary> | null
    return {
      collapsed: raw?.collapsed === true,
      tab: libraryTabs.some((tab) => tab.id === raw?.tab) ? (raw?.tab as LibraryTab) : 'snippet',
    }
  } catch {
    return { collapsed: false, tab: 'snippet' }
  }
}

const writeStoredLibrary = (value: StoredLibrary) => {
  try {
    window.localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(value))
  } catch {
    // The column state is a convenience; nothing to do when storage is unavailable.
  }
}

export interface LibrarySidebarProps {
  snippets: Snippet[]
  snippetCategories: Category[]
  categoryColorById: Map<string, string>
  templates: MailTemplate[]
  mailTemplateCategories: MailTemplateCategory[]
  troubleshootgunFolders: TroubleshootgunFolder[]
  taskTemplates: TaskTemplate[]
  taskKind: (task: TaskTemplate) => TaskTemplateKind
  procedures: CustomerPortalCode[]
  // Product of the tab's case: its name in the mails and its CRM name.
  productNames: string[]
  productLabel: string | null
  editButtonLabel: string
  onOpenSettings: () => void
  onSnippet: (snippet: Snippet) => void
  onTemplate: (template: MailTemplate, folderId?: string) => void
  onTask: (task: TaskTemplate) => void
  onProcedure: (procedureId: string) => void
  showSnippetTooltip: (snippet: Snippet, event: MouseEvent<HTMLElement>) => void
  hideSnippetTooltip: () => void
  // Narrow window with the panel open: the panel takes the column's place.
  underPanel?: boolean
  // Title of what the panel holds while the library is shown over it.
  hiddenPanelTitle?: string | null
  onShowPanel?: () => void
  // Opens the quick editor of an item (not for procedures).
  onEdit?: (entry: SearchEntry) => void
}

interface Filter {
  id: string
  label: string
  color?: string
}

export function LibrarySidebar({
  snippets,
  snippetCategories,
  categoryColorById,
  templates,
  mailTemplateCategories,
  troubleshootgunFolders,
  taskTemplates,
  taskKind,
  procedures,
  productNames,
  editButtonLabel,
  onOpenSettings,
  onSnippet,
  onTemplate,
  onTask,
  onProcedure,
  showSnippetTooltip,
  hideSnippetTooltip,
  underPanel = false,
  hiddenPanelTitle = null,
  onShowPanel,
  onEdit,
}: LibrarySidebarProps) {
  const [stored, setStored] = useState(readStoredLibrary)
  const { collapsed, tab } = stored
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<Record<LibraryTab, string>>({
    snippet: 'all',
    template: 'all',
    troubleshootgun: 'all',
    task: 'all',
    procedure: 'all',
  })
  const [browsing, setBrowsing] = useState(false)
  // The search looks in the open tab; « Partout » widens it to the whole library.
  const [scope, setScope] = useState<'tab' | 'all'>('tab')
  const [activeIndex, setActiveIndex] = useState(0)
  // Groups shown in full after « Voir tout »; the others keep their first results.
  const [expandedKinds, setExpandedKinds] = useState<SearchKind[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const update = (next: Partial<StoredLibrary>) =>
    setStored((prev) => {
      const value = { ...prev, ...next }
      writeStoredLibrary(value)
      return value
    })

  // Ctrl+K (Cmd+K on macOS) opens the column and searches the whole library.
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== 'k') return
      event.preventDefault()
      setScope('all')
      // Focus at once when the field is there, so that the next key typed
      // goes into the search and not into the mail.
      if (inputRef.current) {
        inputRef.current.focus()
        inputRef.current.select()
      }
      setStored((prev) => {
        if (!prev.collapsed) return prev
        const value = { ...prev, collapsed: false }
        writeStoredLibrary(value)
        return value
      })
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const entries = useMemo(
    () => buildSearchEntries({ snippets, templates, troubleshootgunFolders, taskTemplates, procedures, taskKind }),
    [procedures, snippets, taskKind, taskTemplates, templates, troubleshootgunFolders],
  )
  const productTerms = useMemo(() => productSearchTerms(productNames), [productNames])
  const productFilterOn = false

  const searching = query.trim().length > 0
  const allGroups = useMemo(
    () =>
      (searching ? searchLibrary(entries, query, { productTerms, limit: 500 }) : []).map((group) => {
        const matching = productFilterOn ? group.items.filter((item) => item.productMatch) : group.items
        return { ...group, matching, total: matching.length }
      }).filter((group) => group.total > 0),
    [entries, productFilterOn, productTerms, query, searching],
  )
  const searchEverywhere = scope === 'all'
  const groups = useMemo(
    () =>
      allGroups
        .filter((group) => searchEverywhere || tabOfKind(group.kind) === tab)
        .map((group) => ({
          ...group,
          // In the open tab every result shows; everywhere, each type starts with its first ones.
          items: !searchEverywhere || expandedKinds.includes(group.kind) ? group.matching : group.matching.slice(0, GROUP_LIMIT),
        })),
    [allGroups, expandedKinds, searchEverywhere, tab],
  )
  const elsewhereCount = searchEverywhere
    ? 0
    : allGroups.filter((group) => tabOfKind(group.kind) !== tab).reduce((sum, group) => sum + group.total, 0)

  // Snippets have no category selector: they are sorted by category instead.
  const tabFilters = useMemo((): Filter[] => {
    if (tab === 'snippet') return [
      ...snippetCategories.map((category) => ({ id: category.id, label: category.name, color: categoryColorById.get(category.id) })),
      ...(snippets.some((snippet) => !snippetCategories.some((category) => category.id === snippet.categoryId)) ? [{ id: 'uncategorized', label: 'Sans catégorie' }] : []),
    ]
    if (tab === 'template') {
      return [
        { id: 'all', label: 'Tous' },
        { id: 'favorites', label: '★ Favoris' },
        ...mailTemplateCategories.map((category) => ({ id: category.id, label: category.name })),
      ]
    }
    if (tab === 'troubleshootgun') {
      return [
        { id: 'all', label: 'Tous' },
        ...troubleshootgunFolders.map((folder) => ({ id: folder.id, label: folder.name })),
      ]
    }
    if (tab === 'task') {
      return [
        { id: 'all', label: 'Toutes' },
        { id: 'favorites', label: '★ Favoris' },
        { id: 's-task', label: 'S-Task' },
        { id: 'f-task', label: 'F-Task' },
      ]
    }
    return []
  }, [mailTemplateCategories, snippetCategories, snippets, categoryColorById, tab, troubleshootgunFolders])
  const categoryOrder = useMemo(
    () => new Map(snippetCategories.map((category, index) => [category.id, index])),
    [snippetCategories],
  )
  const categoryById = useMemo(() => new Map(snippetCategories.map((category) => [category.id, category])), [snippetCategories])

  const filter = tabFilters.some((item) => item.id === filters[tab]) ? filters[tab] : 'all'

  const listItems = useMemo(() => {
    if (searching) return []
    const inTab = entries.filter((entry) => tabOfKind(entry.kind) === tab)
    const narrowed = inTab.filter((entry) => {
      if (tab === 'snippet' || filter === 'all') return true
      if (filter === 'uncategorized') return !categoryById.has(entry.categoryId ?? '')
      if (filter === 'favorites') return Boolean(entry.favorite)
      if (tab === 'task') return entry.kind === filter
      if (tab === 'troubleshootgun') return entry.folderId === filter
      return entry.categoryId === filter
    })
    const withProduct = narrowed.map((entry) => ({ ...entry, productMatch: entry.kind === 'troubleshootgun' && matchesProduct(entry, productTerms) }))
    const kept = productFilterOn ? withProduct.filter((entry) => entry.productMatch) : withProduct
    if (tab === 'snippet') {
      // By category, in the settings' order; the case's product first inside a category.
      const rank = (entry: SearchEntry) => categoryOrder.get(entry.categoryId ?? '') ?? categoryOrder.size
      return kept
        .map((entry, index) => ({ entry, index }))
        .sort((a, b) =>
          rank(a.entry) - rank(b.entry) ||
          Number(b.entry.productMatch) - Number(a.entry.productMatch) ||
          a.index - b.index,
        )
        .map(({ entry }) => entry)
    }
    // The case's product first, the library order otherwise.
    return [...kept.filter((entry) => entry.productMatch), ...kept.filter((entry) => !entry.productMatch)]
  }, [categoryById, categoryOrder, entries, filter, productFilterOn, productTerms, searching, tab])

  const visible = useMemo(
    () =>
      searching ? groups.flatMap((group) => group.items) : listItems,
    [groups, listItems, searching],
  )

  useEffect(() => setActiveIndex(0), [query, tab, filter, productFilterOn, scope])
  useEffect(() => setExpandedKinds([]), [query])
  useEffect(() => { if (tab === 'snippet') { setQuery(''); setBrowsing(false) } }, [tab])
  useEffect(() => {
    if (!query.trim()) setScope('tab')
  }, [query])

  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const snippetById = useMemo(() => new Map(snippets.map((item) => [item.id, item])), [snippets])
  const templateById = useMemo(() => new Map(templates.map((item) => [item.id, item])), [templates])
  const taskById = useMemo(() => new Map(taskTemplates.map((item) => [item.id, item])), [taskTemplates])

  const activate = (entry: SearchEntry) => {
    if (entry.kind === 'snippet') {
      const snippet = snippetById.get(entry.id)
      if (snippet) onSnippet(snippet)
    } else if (entry.kind === 'template') {
      const template = templateById.get(entry.id)
      if (template) onTemplate(template)
    } else if (entry.kind === 'troubleshootgun') {
      const template = troubleshootgunFolders
        .find((folder) => folder.id === entry.folderId)
        ?.templates.find((item) => item.id === entry.id)
      if (template) onTemplate(template, entry.folderId)
    } else if (entry.kind === 'procedure') {
      onProcedure(entry.id)
    } else {
      const task = taskById.get(entry.id)
      if (task) onTask(task)
    }
  }

  const categoryChoices = tabFilters.filter((item) => item.id !== 'all' && item.id !== 'favorites')
  const showingCategories = tab !== 'snippet' && browsing && !searching && filter === 'all' && categoryChoices.length > 0
  const handleSearchKey = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(0, Math.min((showingCategories ? categoryChoices.length : visible.length) - 1, index + 1)))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(0, index - 1))
    } else if (event.key === 'Enter' && showingCategories) {
      event.preventDefault()
      const choice = categoryChoices[activeIndex]
      if (choice) setFilters((prev) => ({ ...prev, [tab]: choice.id }))
    } else if (event.key === 'Enter') {
      const entry = visible[activeIndex]
      if (entry) {
        event.preventDefault()
        activate(entry)
      }
    } else if (event.key === 'Escape' && !query) {
      if (filter !== 'all') setFilters((prev) => ({ ...prev, [tab]: 'all' }))
      else inputRef.current?.blur()
    }
  }

  // While searching, a tab keeps the words and shows its own results.
  const openTab = (next: LibraryTab) => {
    setScope('tab')
    update({ tab: next, collapsed: false })
  }
  const tabLabel = libraryTabs.find((item) => item.id === tab)?.label ?? ''

  if (collapsed) {
    return (
      <aside
        className={`sidebar library library--collapsed${underPanel ? ' library--under-panel' : ''}`}
        aria-label="Bibliothèque repliée"
      >
        <button
          type="button"
          className="library__rail-btn"
          title="Déplier la bibliothèque"
          aria-label="Déplier la bibliothèque"
          onClick={() => update({ collapsed: false })}
        >
          <UiIcon name="caretRight" />
        </button>
        <button
          type="button"
          className="library__rail-btn"
          title="Rechercher (Ctrl+K)"
          aria-label="Rechercher"
          onClick={() => {
            update({ collapsed: false })
            requestAnimationFrame(() => inputRef.current?.focus())
          }}
        >
          <UiIcon name="search" />
        </button>
        <div className="library__rail-sep" />
        {libraryTabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`library__rail-btn${item.id === tab ? ' is-active' : ''}`}
            title={item.label}
            aria-label={item.label}
            onClick={() => openTab(item.id)}
          >
            <UiIcon name={item.icon} />
          </button>
        ))}
        <div className="sidebar-top-actions library__rail-bottom">
          <button className="sidebar-icon-btn" onClick={onOpenSettings} title={editButtonLabel} aria-label={editButtonLabel}>
            <UiIcon name="settings" className="sidebar-icon-btn__icon" />
          </button>
        </div>
      </aside>
    )
  }

  const renderItem = (entry: SearchEntry & { productMatch: boolean }, index: number, showKind: boolean) => {
    const snippet = entry.kind === 'snippet' ? snippetById.get(entry.id) : undefined
    const color = entry.kind === 'snippet' ? categoryColorById.get(entry.categoryId ?? '') : undefined
    return (
      <div key={`${entry.kind}-${entry.folderId ?? ''}-${entry.id}`} className="library-item-row">
      <button
        type="button"
        role="option"
        id={`library-option-${index}`}
        aria-selected={index === activeIndex}
        data-index={index}
        className={`library-item library-item--${entry.kind}${color ? ' library-item--tinted' : ''}${index === activeIndex ? ' is-active' : ''}`}
        style={color ? ({ '--item-color': color } as CSSProperties) : undefined}
        onMouseEnter={(event) => {
          setActiveIndex(index)
          if (snippet) showSnippetTooltip(snippet, event)
        }}
        onMouseLeave={snippet ? hideSnippetTooltip : undefined}
        onClick={() => {
          hideSnippetTooltip()
          activate(entry)
        }}
      >
        {color ? (
          <span className="library-item__dot" style={{ background: color }} />
        ) : showKind ? (
          <UiIcon name={kindIcons[entry.kind]} className="library-item__icon" />
        ) : null}
        <span className="library-item__text">
          <span className="library-item__title">
            <span className="library-item__name">{entry.title}</span>
            {entry.kind === 's-task' || entry.kind === 'f-task' ? (
              <span className="library-item__badge">{entry.kind === 's-task' ? 'S' : 'F'}</span>
            ) : null}
            {entry.language ? <span className="library-item__badge">{entry.language.toUpperCase()}</span> : null}
            {entry.productMatch ? (
              <span className="library-item__badge library-item__badge--product" title="Produit du dossier">
                Produit
              </span>
            ) : null}
          </span>
          {entry.folderName || entry.preview ? (
            <span className="library-item__sub">
              {entry.folderName ? `${entry.folderName} · ` : ''}
              {entry.preview}
            </span>
          ) : null}
        </span>
      </button>
      {onEdit && entry.kind !== 'procedure' && entry.kind !== 'snippet' ? (
        <button
          type="button"
          className="library-item__edit"
          title="Modifier ici, sans quitter le dossier"
          aria-label={`Modifier ${entry.title}`}
          onClick={() => {
            hideSnippetTooltip()
            onEdit(entry)
          }}
        >
          <UiIcon name="edit" />
        </button>
      ) : null}
      </div>
    )
  }

  let index = -1
  const nextIndex = () => (index += 1)

  return (
    <aside
      className={`sidebar library${underPanel ? ' library--under-panel' : ''}`}
      aria-label="Bibliothèque"
      onKeyDown={(event) => {
        // Escape empties the search from anywhere in the column, then leaves the field.
        if (event.key !== 'Escape' || !query) return
        setQuery('')
        inputRef.current?.focus()
      }}
    >
      <div className="sidebar-top library__top">
        <button
          type="button"
          className="library__fold"
          title="Replier la bibliothèque"
          aria-label="Replier la bibliothèque"
          onClick={() => update({ collapsed: true })}
        >
          <UiIcon name="caretRight" />
        </button>
        <span className="library__heading">Bibliothèque</span>
        <div className="sidebar-top-actions">
          <button className="sidebar-icon-btn" onClick={onOpenSettings} title={editButtonLabel} aria-label={editButtonLabel}>
            <UiIcon name="settings" className="sidebar-icon-btn__icon" />
          </button>
        </div>
      </div>

      {tab !== 'snippet' ? <div className="library__search">
        <UiIcon name="search" className="library__search-icon" />
        <input
          ref={inputRef}
          value={query}
          onFocus={() => { setBrowsing(true); if (!query) setFilters((prev) => ({ ...prev, [tab]: 'all' })) }}
          onClick={() => { if (!query) setFilters((prev) => ({ ...prev, [tab]: 'all' })); setBrowsing(true) }}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleSearchKey}
          placeholder={searchEverywhere ? 'Rechercher partout' : `Rechercher dans ${tabLabel} · Ctrl+K : partout`}
          aria-label="Rechercher dans la bibliothèque"
          aria-controls="library-results"
          aria-activedescendant={visible.length ? `library-option-${activeIndex}` : undefined}
        />
        {query ? (
          <button title="Effacer la recherche" type="button" className="library__search-clear" aria-label="Effacer la recherche" onClick={() => setQuery('')}>
            <UiIcon name="close" />
          </button>
        ) : null}
      </div>

      : null}

      {hiddenPanelTitle && onShowPanel ? (
        <button type="button" className="library__panel-back" onClick={onShowPanel} title="Revenir au panneau">
          <UiIcon name="caretRight" />
          <span>{hiddenPanelTitle}</span>
        </button>
      ) : null}

      {tab !== 'snippet' && browsing && !searching && filter !== 'all' ? (
        <button type="button" className="library__scope-btn" onClick={() => setFilters((prev) => ({ ...prev, [tab]: 'all' }))}>
          ← Catégories
        </button>
      ) : null}

      {searching ? (
        <div className="library__scope">
          {searchEverywhere ? (
            <button type="button" className="library__scope-btn" onClick={() => setScope('tab')}>
              <UiIcon name="caretRight" />
              Seulement {tabLabel}
            </button>
          ) : (
            <button
              type="button"
              className="library__scope-btn"
              disabled={!elsewhereCount}
              title="Chercher dans toute la bibliothèque"
              onClick={() => {
                setScope('all')
                inputRef.current?.focus()
              }}
            >
              <UiIcon name="search" />
              {elsewhereCount ? `Partout : ${elsewhereCount} autre${elsewhereCount > 1 ? 's' : ''} résultat${elsewhereCount > 1 ? 's' : ''}` : 'Rien ailleurs'}
            </button>
          )}
        </div>
      ) : null}

      <div className="library__list" id="library-results" role="listbox" aria-label="Résultats" ref={listRef}>
        {showingCategories ? (
          categoryChoices.map((item, index) => (
            <button key={item.id} type="button" role="option" aria-selected={index === activeIndex} onMouseEnter={() => setActiveIndex(index)} className={`library-item${index === activeIndex ? ' is-active' : ''}`} onClick={() => setFilters((prev) => ({ ...prev, [tab]: item.id }))}>
              <span className="library-item__name">{item.label}</span><UiIcon name="caretRight" />
            </button>
          ))
        ) : searching ? (
          groups.length ? (
            groups.map((group) => {
              const items = group.items
              if (!items.length) return null
              return (
                <section key={group.kind} className="library__group">
                  <p className="library__group-title">
                    <UiIcon name={kindIcons[group.kind]} />
                    <span>{group.label}</span>
                    <span className="library__group-count">
                      {group.total > group.items.length ? `${group.items.length} sur ${group.total}` : group.total}
                    </span>
                  </p>
                  {items.map((item) => renderItem(item, nextIndex(), false))}
                  {searchEverywhere && group.total > group.items.length ? (
                    <button
                      type="button"
                      className="library__more"
                      onClick={() => {
                        setExpandedKinds((prev) => [...prev, group.kind])
                        inputRef.current?.focus()
                      }}
                    >
                      Voir les {group.total} {group.label}
                    </button>
                  ) : null}
                </section>
              )
            })
          ) : (
            <p className="library__empty">
              Aucun résultat pour « {query.trim()} »{searchEverywhere ? '' : ` dans ${tabLabel}`}.
            </p>
          )
        ) : listItems.length ? (
          listItems.map((item, position) => {
            const row = renderItem(item, nextIndex(), tab === 'task')
            if (tab !== 'snippet' || listItems[position - 1]?.categoryId === item.categoryId) return row
            const category = categoryById.get(item.categoryId ?? '')
            return [
              <p key={`category-${item.categoryId ?? 'none'}`} className="library__category">
                <span className="library__chip-dot" style={{ background: categoryColorById.get(item.categoryId ?? '') }} />
                {category?.name ?? 'Sans catégorie'}
              </p>,
              row,
            ]
          })
        ) : (
          <p className="library__empty">
            {'Rien dans cette liste.'}
          </p>
        )}
      </div>
    </aside>
  )
}
