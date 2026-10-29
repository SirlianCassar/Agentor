/* Floating dashboard windows inside the main window: pure layout model.
   Windows are independent of any page; their geometry is restored at the next
   launch and always kept reachable inside the visible area. */

export type DashboardWindowKind =
  | 'case'
  | 'reminders'
  | 'news'
  | 'calculator'
  | 'portal'
  | 'parts'
  | 'decorations'

export const DASHBOARD_WINDOW_KINDS: DashboardWindowKind[] = [
  'case',
  'reminders',
  'news',
  'calculator',
  'portal',
  'parts',
  'decorations',
]

export interface WindowRect {
  x: number
  y: number
  width: number
  height: number
}

export interface DashboardWindow extends WindowRect {
  kind: DashboardWindowKind
  z: number
  minimized: boolean
}

export interface WindowLayout {
  version: 1
  windows: DashboardWindow[]
  // Last geometry of closed windows, so a window reopens where it was left.
  closed?: Partial<Record<DashboardWindowKind, WindowRect>>
}

export interface Viewport {
  width: number
  height: number
}

export const MIN_WINDOW_WIDTH = 280
export const MIN_WINDOW_HEIGHT = 160
// Part of the title bar that must stay visible so a window can always be grabbed.
const GRAB_MARGIN = 80
const TITLE_HEIGHT = 32

const defaultSizes: Record<DashboardWindowKind, { width: number; height: number }> = {
  case: { width: 420, height: 560 },
  reminders: { width: 360, height: 360 },
  news: { width: 420, height: 420 },
  calculator: { width: 420, height: 460 },
  portal: { width: 640, height: 520 },
  parts: { width: 620, height: 500 },
  decorations: { width: 420, height: 380 },
}

export const emptyLayout = (): WindowLayout => ({ version: 1, windows: [] })

const topZ = (layout: WindowLayout) => layout.windows.reduce((max, item) => Math.max(max, item.z), 0)

export function clampRect(rect: WindowRect, viewport: Viewport): WindowRect {
  const width = Math.max(MIN_WINDOW_WIDTH, Math.min(rect.width, Math.max(MIN_WINDOW_WIDTH, viewport.width)))
  const height = Math.max(MIN_WINDOW_HEIGHT, Math.min(rect.height, Math.max(MIN_WINDOW_HEIGHT, viewport.height)))
  const x = Math.min(Math.max(rect.x, GRAB_MARGIN - width), Math.max(0, viewport.width - GRAB_MARGIN))
  const y = Math.min(Math.max(rect.y, 0), Math.max(0, viewport.height - TITLE_HEIGHT))
  return { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) }
}

const update = (
  layout: WindowLayout,
  kind: DashboardWindowKind,
  change: (item: DashboardWindow) => DashboardWindow,
): WindowLayout => {
  if (!layout.windows.some((item) => item.kind === kind)) return layout
  return { ...layout, windows: layout.windows.map((item) => (item.kind === kind ? change(item) : item)) }
}

export function focusWindow(layout: WindowLayout, kind: DashboardWindowKind): WindowLayout {
  const target = layout.windows.find((item) => item.kind === kind)
  if (!target) return layout
  const z = topZ(layout)
  if (target.z === z && !target.minimized) return layout
  return update(layout, kind, (item) => ({ ...item, z: item.z === z ? z : z + 1, minimized: false }))
}

// Opens a window, or brings it back to the front when it is already open.
// New windows cascade from the top-right so the editor stays visible.
export function openWindow(layout: WindowLayout, kind: DashboardWindowKind, viewport: Viewport): WindowLayout {
  if (layout.windows.some((item) => item.kind === kind)) return focusWindow(layout, kind)
  const remembered = layout.closed?.[kind]
  const size = defaultSizes[kind]
  const offset = (layout.windows.length % 6) * 28
  const rect = clampRect(
    remembered ?? {
      x: viewport.width - size.width - 24 - offset,
      y: 56 + offset,
      width: size.width,
      height: size.height,
    },
    viewport,
  )
  const closed = { ...layout.closed }
  delete closed[kind]
  return {
    ...layout,
    windows: [...layout.windows, { kind, ...rect, z: topZ(layout) + 1, minimized: false }],
    closed,
  }
}

export function toggleWindow(layout: WindowLayout, kind: DashboardWindowKind, viewport: Viewport): WindowLayout {
  const target = layout.windows.find((item) => item.kind === kind)
  if (!target) return openWindow(layout, kind, viewport)
  if (target.minimized || target.z !== topZ(layout)) return focusWindow(layout, kind)
  return minimizeWindow(layout, kind)
}

export function closeWindow(layout: WindowLayout, kind: DashboardWindowKind): WindowLayout {
  const target = layout.windows.find((item) => item.kind === kind)
  if (!target) return layout
  const { x, y, width, height } = target
  return {
    ...layout,
    windows: layout.windows.filter((item) => item.kind !== kind),
    closed: { ...layout.closed, [kind]: { x, y, width, height } },
  }
}

export function minimizeWindow(layout: WindowLayout, kind: DashboardWindowKind): WindowLayout {
  return update(layout, kind, (item) => ({ ...item, minimized: true }))
}

export function moveWindow(
  layout: WindowLayout,
  kind: DashboardWindowKind,
  x: number,
  y: number,
  viewport: Viewport,
): WindowLayout {
  return update(layout, kind, (item) => ({ ...item, ...clampRect({ ...item, x, y }, viewport) }))
}

export function resizeWindow(
  layout: WindowLayout,
  kind: DashboardWindowKind,
  width: number,
  height: number,
  viewport: Viewport,
): WindowLayout {
  return update(layout, kind, (item) => ({ ...item, ...clampRect({ ...item, width, height }, viewport) }))
}

// After the main window shrinks, windows are pulled back inside it.
export function fitLayout(layout: WindowLayout, viewport: Viewport): WindowLayout {
  let changed = false
  const windows = layout.windows.map((item) => {
    const rect = clampRect(item, viewport)
    if (rect.x === item.x && rect.y === item.y && rect.width === item.width && rect.height === item.height) {
      return item
    }
    changed = true
    return { ...item, ...rect }
  })
  return changed ? { ...layout, windows } : layout
}

export function parseLayout(raw: unknown): WindowLayout {
  if (!raw || typeof raw !== 'object') return emptyLayout()
  const source = raw as { version?: unknown; windows?: unknown }
  if (source.version !== 1 || !Array.isArray(source.windows)) return emptyLayout()
  const seen = new Set<DashboardWindowKind>()
  const windows: DashboardWindow[] = []
  for (const item of source.windows) {
    if (!item || typeof item !== 'object') continue
    const candidate = item as Partial<DashboardWindow>
    const kind = candidate.kind as DashboardWindowKind
    if (!DASHBOARD_WINDOW_KINDS.includes(kind) || seen.has(kind)) continue
    const numbers = [candidate.x, candidate.y, candidate.width, candidate.height, candidate.z]
    if (!numbers.every((value) => typeof value === 'number' && Number.isFinite(value))) continue
    seen.add(kind)
    windows.push({
      kind,
      x: candidate.x as number,
      y: candidate.y as number,
      width: candidate.width as number,
      height: candidate.height as number,
      z: candidate.z as number,
      minimized: candidate.minimized === true,
    })
  }
  const closed: Partial<Record<DashboardWindowKind, WindowRect>> = {}
  const rawClosed = (raw as { closed?: unknown }).closed
  if (rawClosed && typeof rawClosed === 'object') {
    for (const [kind, rect] of Object.entries(rawClosed as Record<string, unknown>)) {
      if (!DASHBOARD_WINDOW_KINDS.includes(kind as DashboardWindowKind) || seen.has(kind as DashboardWindowKind)) continue
      if (!rect || typeof rect !== 'object') continue
      const value = rect as Partial<WindowRect>
      const numbers = [value.x, value.y, value.width, value.height]
      if (!numbers.every((item) => typeof item === 'number' && Number.isFinite(item))) continue
      closed[kind as DashboardWindowKind] = {
        x: value.x as number,
        y: value.y as number,
        width: value.width as number,
        height: value.height as number,
      }
    }
  }
  return { version: 1, windows, closed }
}
