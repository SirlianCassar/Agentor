import { useRef, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { UiIcon } from './UiIcon'
import type { AppIconName } from '../lib/iconTypes'
import type { DashboardWindow } from '../windows/windowLayout'

interface FloatingWindowProps {
  window: DashboardWindow
  title: string
  icon: AppIconName
  active: boolean
  // Zoom applied to the app root: pointer deltas are divided by it.
  scale?: number
  onFocus: () => void
  onMove: (x: number, y: number) => void
  onResize: (width: number, height: number) => void
  onMinimize: () => void
  onClose: () => void
  // Opens the dashboard in its own system window, outside the main one.
  onDetach?: () => void
  children: ReactNode
}

type Drag = { mode: 'move' | 'resize'; startX: number; startY: number; originX: number; originY: number }

// Window chrome for a dashboard: drag by the title bar, resize from the corner.
// Geometry is owned by the layout; this component only reports pointer moves.
export function FloatingWindow({
  window: frame,
  title,
  icon,
  active,
  scale = 1,
  onFocus,
  onMove,
  onResize,
  onMinimize,
  onClose,
  onDetach,
  children,
}: FloatingWindowProps) {
  const drag = useRef<Drag | null>(null)

  const start = (mode: Drag['mode']) => (event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return
    if (mode === 'move' && (event.target as HTMLElement).closest('button')) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    onFocus()
    drag.current = {
      mode,
      startX: event.clientX,
      startY: event.clientY,
      originX: mode === 'move' ? frame.x : frame.width,
      originY: mode === 'move' ? frame.y : frame.height,
    }
  }

  const track = (event: ReactPointerEvent<HTMLElement>) => {
    const current = drag.current
    if (!current) return
    const nextX = current.originX + (event.clientX - current.startX) / scale
    const nextY = current.originY + (event.clientY - current.startY) / scale
    if (current.mode === 'move') onMove(nextX, nextY)
    else onResize(nextX, nextY)
  }

  const stop = (event: ReactPointerEvent<HTMLElement>) => {
    if (!drag.current) return
    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  if (frame.minimized) return null

  return (
    <section
      className={`floating-window${active ? ' is-active' : ''}`}
      role="dialog"
      aria-label={title}
      data-window={frame.kind}
      style={{ left: frame.x, top: frame.y, width: frame.width, height: frame.height, zIndex: 40 + frame.z }}
      onPointerDown={onFocus}
    >
      <header
        className="floating-window__bar"
        onPointerDown={start('move')}
        onPointerMove={track}
        onPointerUp={stop}
        onPointerCancel={stop}
      >
        <UiIcon name={icon} className="floating-window__icon" />
        <span className="floating-window__title">{title}</span>
        {onDetach ? (
          <button
            type="button"
            className="floating-window__btn"
            title="Détacher hors de la fenêtre principale"
            aria-label={`Détacher ${title}`}
            onClick={onDetach}
          >
            <UiIcon name="detach" />
          </button>
        ) : null}
        <button type="button" className="floating-window__btn" title="Réduire" aria-label={`Réduire ${title}`} onClick={onMinimize}>
          <UiIcon name="minimize" />
        </button>
        <button type="button" className="floating-window__btn" title="Fermer" aria-label={`Fermer ${title}`} onClick={onClose}>
          <UiIcon name="close" />
        </button>
      </header>
      <div className="floating-window__body">{children}</div>
      <div
        className="floating-window__resize"
        aria-hidden="true"
        onPointerDown={start('resize')}
        onPointerMove={track}
        onPointerUp={stop}
        onPointerCancel={stop}
      />
    </section>
  )
}
