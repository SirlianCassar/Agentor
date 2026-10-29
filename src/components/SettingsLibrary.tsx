import { UiIcon } from './UiIcon'
import { LIBRARY_ALL, LIBRARY_FAVORITES } from '../lib/library'

export interface LibraryCategoryEntry {
  id: string
  label: string
  count: number
  color?: string
}

interface LibraryCategoryRailProps {
  title: string
  total: number
  favorites?: number
  entries: LibraryCategoryEntry[]
  active: string
  onSelect: (id: string) => void
  onManage?: () => void
}

// Left column of a settings library: every category with its number of entries.
export function LibraryCategoryRail({
  title,
  total,
  favorites,
  entries,
  active,
  onSelect,
  onManage,
}: LibraryCategoryRailProps) {
  const renderEntry = (id: string, label: string, count: number, color?: string) => (
    <button
      key={id}
      type="button"
      className={`library-rail__item${active === id ? ' is-active' : ''}`}
      aria-pressed={active === id}
      onClick={() => onSelect(id)}
      title={label}
    >
      {color ? <span className="library-rail__swatch" style={{ background: color }} aria-hidden="true" /> : null}
      <span className="library-rail__label">{label}</span>
      <span className="library-rail__count">{count}</span>
    </button>
  )

  return (
    <nav className="library-rail" aria-label={title}>
      <div className="library-rail__head">
        <span>{title}</span>
        {onManage ? (
          <button type="button" className="library-rail__manage" title="Gérer les catégories" onClick={onManage}>
            <UiIcon name="edit" />
          </button>
        ) : null}
      </div>
      <div className="library-rail__list">
        {renderEntry(LIBRARY_ALL, 'Tout', total)}
        {favorites !== undefined ? renderEntry(LIBRARY_FAVORITES, '★ Favoris', favorites) : null}
        {entries.map((entry) => renderEntry(entry.id, entry.label, entry.count, entry.color))}
      </div>
    </nav>
  )
}

interface LibrarySearchProps {
  value: string
  onChange: (value: string) => void
  shown: number
  total: number
  placeholder: string
}

export function LibrarySearch({ value, onChange, shown, total, placeholder }: LibrarySearchProps) {
  return (
    <div className="library-search">
      <UiIcon name="search" className="library-search__icon" />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      <span className="library-search__count" title={`${shown} affiché(s) sur ${total}`}>
        {shown === total ? total : `${shown} / ${total}`}
      </span>
    </div>
  )
}
