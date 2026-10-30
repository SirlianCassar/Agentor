// Floating dashboard windows over the main window.
import type { Dispatch, SetStateAction } from 'react'
import { FloatingWindow } from '../../components/FloatingWindow'
import {
  closeWindow,
  type DashboardWindowKind,
  focusWindow,
  minimizeWindow,
  moveWindow,
  resizeWindow,
  type WindowLayout,
} from '../../windows/windowLayout'
import { dashboardWindowOptions } from '../appShared'

export interface WindowLayerProps {
  appZoom: number
  canDetach: boolean
  getWindowViewport: () => { width: number; height: number; }
  handleDetachDashboard: (kind: DashboardWindowKind) => void
  renderDashboardWindowContent: (kind: DashboardWindowKind) => JSX.Element
  setWindowLayout: Dispatch<SetStateAction<WindowLayout>>
  topWindowZ: number
  windowLayout: WindowLayout
}

export function WindowLayer({
  appZoom,
  canDetach,
  getWindowViewport,
  handleDetachDashboard,
  renderDashboardWindowContent,
  setWindowLayout,
  topWindowZ,
  windowLayout,
}: WindowLayerProps) {
  return (
    <div className="window-layer">
      {windowLayout.windows.map((frame) => {
        const option = dashboardWindowOptions.find((item) => item.id === frame.kind)
        if (!option) return null
        return (
          <FloatingWindow
            key={frame.kind}
            window={frame}
            title={option.title}
            icon={option.icon}
            active={frame.z === topWindowZ}
            scale={appZoom}
            onFocus={() => setWindowLayout((prev) => focusWindow(prev, frame.kind))}
            onMove={(x, y) => setWindowLayout((prev) => moveWindow(prev, frame.kind, x, y, getWindowViewport()))}
            onResize={(width, height) =>
              setWindowLayout((prev) => resizeWindow(prev, frame.kind, width, height, getWindowViewport()))
            }
            onMinimize={() => setWindowLayout((prev) => minimizeWindow(prev, frame.kind))}
            onClose={() => setWindowLayout((prev) => closeWindow(prev, frame.kind))}
            onDetach={canDetach ? () => handleDetachDashboard(frame.kind) : undefined}
          >
            {renderDashboardWindowContent(frame.kind)}
          </FloatingWindow>
        )
      })}
    </div>
  )
}
