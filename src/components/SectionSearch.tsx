// Search bar of one section (mail templates, tasks): the same search as the
// library, limited to the section's own items, in a list under the field.
import { useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { UiIcon } from './UiIcon'
import { searchLibrary, type SearchEntry, type SearchResult } from '../lib/unifiedSearch'

const RESULT_LIMIT = 30

export interface SectionSearchProps {
  entries: SearchEntry[]
  productTerms: string[]
  placeholder: string
  label: string
  className?: string
  onPick: (entry: SearchEntry) => void
}

export function SectionSearch({ entries, productTerms, placeholder, label, className = '', onPick }: SectionSearchProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const results = useMemo((): SearchResult[] => {
    const text = query.trim()
    if (!text) return []
    return searchLibrary(entries, text, { productTerms, limit: RESULT_LIMIT })
      .flatMap((group) => group.items)
      .slice(0, RESULT_LIMIT)
  }, [entries, productTerms, query])
  const shown = open && query.trim().length > 0

  const pick = (entry: SearchEntry) => {
    onPick(entry)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  const handleKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(results.length - 1, index + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(0, index - 1))
    } else if (event.key === 'Enter' && results[activeIndex]) {
      event.preventDefault()
      pick(results[activeIndex])
    } else if (event.key === 'Escape') {
      event.stopPropagation()
      if (query) setQuery('')
      else inputRef.current?.blur()
    }
  }

  return (
    <div className={`section-search ${className}`.trim()}>
      <UiIcon name="search" className="section-search__icon" />
      <input
        ref={inputRef}
        value={query}
        placeholder={placeholder}
        aria-label={label}
        onChange={(event) => {
          setQuery(event.target.value)
          setActiveIndex(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={handleKey}
      />
      {query ? (
        <button
          type="button"
          className="section-search__clear"
          title="Effacer la recherche"
          aria-label="Effacer la recherche"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setQuery('')}
        >
          <UiIcon name="close" />
        </button>
      ) : null}
      {shown ? (
        <div className="section-search__results" role="listbox" aria-label={label} onMouseDown={(event) => event.preventDefault()}>
          {results.length ? (
            results.map((entry, index) => (
              <button
                key={`${entry.kind}-${entry.folderId ?? ''}-${entry.id}`}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                className={`section-search__item${index === activeIndex ? ' is-active' : ''}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => pick(entry)}
              >
                <span className="section-search__title">
                  <span className="section-search__name">{entry.title}</span>
                  {entry.kind === 's-task' || entry.kind === 'f-task' ? (
                    <span className="library-item__badge">{entry.kind === 's-task' ? 'S' : 'F'}</span>
                  ) : null}
                  {entry.language ? <span className="library-item__badge">{entry.language.toUpperCase()}</span> : null}
                  {entry.productMatch ? (
                    <span className="library-item__badge library-item__badge--product">Produit</span>
                  ) : null}
                </span>
                {entry.folderName || entry.preview ? (
                  <span className="section-search__sub">
                    {entry.folderName ? `${entry.folderName} · ` : ''}
                    {entry.preview}
                  </span>
                ) : null}
              </button>
            ))
          ) : (
            <p className="section-search__empty">Aucun résultat pour « {query.trim()} ».</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
