// The left panel always displays snippets and stays expanded.
import { useMemo, type CSSProperties, type MouseEvent } from 'react'
import { UiIcon } from '../../components/UiIcon'
import type { Category, CustomerPortalCode, MailTemplate, MailTemplateCategory, Snippet, TaskTemplate, TaskTemplateKind, TroubleshootgunFolder } from '../../lib/types'

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
  onEdit?: (entry: import('../../lib/unifiedSearch').SearchEntry) => void
}

export function LibrarySidebar({ snippets, snippetCategories, categoryColorById, editButtonLabel,
  onOpenSettings, onSnippet, showSnippetTooltip, hideSnippetTooltip, underPanel = false,
  hiddenPanelTitle, onShowPanel }: LibrarySidebarProps) {
  const groups = useMemo(() => {
    const categories = snippetCategories.map((category) => ({
      ...category, items: snippets.filter((snippet) => snippet.categoryId === category.id),
    }))
    const other = snippets.filter((snippet) => !snippetCategories.some((category) => category.id === snippet.categoryId))
    return [...categories, { id: '', name: 'Sans catégorie', items: other }].filter((group) => group.items.length)
  }, [snippets, snippetCategories])
  return (
    <aside className={`sidebar library${underPanel ? ' library--under-panel' : ''}`} aria-label="Snippets">
      <div className="sidebar-top library__top">
        <span className="library__heading">Snippets</span>
        <button type="button" className="sidebar-icon-btn" title={editButtonLabel} aria-label={editButtonLabel} onClick={onOpenSettings}><UiIcon name="settings" /></button>
      </div>
        {hiddenPanelTitle && onShowPanel ? <button type="button" className="library__panel-back" onClick={onShowPanel}><UiIcon name="caretRight" /><span>{hiddenPanelTitle}</span></button> : null}
        <div className="library__list">
          {groups.map((group) => <section key={group.id}>
            <p className="library__category">{group.name}</p>
            {group.items.map((snippet) => {
              const color = categoryColorById.get(snippet.categoryId)
              return <button key={snippet.id} type="button" className={`library-item library-item--snippet${color ? ' library-item--tinted' : ''}`}
                style={color ? ({ '--item-color': color } as CSSProperties) : undefined}
                onMouseEnter={(event) => showSnippetTooltip(snippet, event)} onMouseLeave={hideSnippetTooltip}
                onClick={() => { hideSnippetTooltip(); onSnippet(snippet) }}>
                {color ? <span className="library-item__dot" style={{ background: color }} /> : null}
                <span className="library-item__text">
                  <span className="library-item__name">{snippet.title}</span>
                  {snippet.content.trim() ? <span className="library-item__preview">{snippet.content.replace(/\s+/g, ' ').trim()}</span> : null}
                </span>
              </button>
            })}
          </section>)}
          {!groups.length ? <p className="library__empty">Aucun snippet.</p> : null}
        </div>
    </aside>
  )
}
