// Contextual panel of the new interface, between the library and the mail:
// template preview, Troubleshotgun, call and the launcher's references, one at
// a time. The items opened before stay as chips to go back to them.
import type { ReactNode } from 'react'
import { UiIcon } from '../../components/UiIcon'
import type { AppIconName } from '../../lib/iconTypes'

export interface ContextPanelEntry {
  id: string
  title: string
  icon: AppIconName
}

export interface ContextPanelProps {
  current: ContextPanelEntry
  // Items opened before the current one, oldest first.
  previous: ContextPanelEntry[]
  onShow: (id: string) => void
  onClose: () => void
  onFloat?: () => void
  onDetach?: () => void
  children: ReactNode
}

export function ContextPanel({ current, previous, onShow, onClose, onFloat, onDetach, children }: ContextPanelProps) {
  return (
    <section className="context-panel" aria-label={current.title}>
      <header className="context-panel__head">
        <UiIcon name={current.icon} className="context-panel__icon" />
        <span className="context-panel__title">{current.title}</span>
        {onFloat ? (
          <button type="button" className="context-panel__btn" title="Ouvrir en fenêtre flottante" aria-label="Fenêtre flottante" onClick={onFloat}>
            <UiIcon name="portal" />
          </button>
        ) : null}
        {onDetach ? (
          <button type="button" className="context-panel__btn" title="Ouvrir dans une fenêtre séparée" aria-label="Détacher" onClick={onDetach}>
            <UiIcon name="detach" />
          </button>
        ) : null}
        <button
          type="button"
          className="context-panel__btn context-panel__close"
          title={previous.length ? `Fermer et revenir à ${previous[previous.length - 1].title}` : 'Fermer le panneau'}
          aria-label="Fermer"
          onClick={onClose}
        >
          <UiIcon name="close" />
        </button>
      </header>
      {previous.length ? (
        <nav className="context-panel__history" aria-label="Ouverts avant">
          {[...previous].reverse().map((entry) => (
            <button key={entry.id} type="button" className="context-panel__chip" onClick={() => onShow(entry.id)}>
              <UiIcon name={entry.icon} />
              <span>{entry.title}</span>
            </button>
          ))}
        </nav>
      ) : null}
      <div className="context-panel__body">{children}</div>
    </section>
  )
}
