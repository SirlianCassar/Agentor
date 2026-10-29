import { describe, expect, it } from 'vitest'
import {
  closeWindow,
  emptyLayout,
  fitLayout,
  focusWindow,
  minimizeWindow,
  moveWindow,
  openWindow,
  parseLayout,
  resizeWindow,
  toggleWindow,
  MIN_WINDOW_HEIGHT,
  MIN_WINDOW_WIDTH,
} from '../windowLayout'

const viewport = { width: 1400, height: 900 }

describe('dashboard windows', () => {
  it('opens several windows at once, the last one in front', () => {
    let layout = openWindow(emptyLayout(), 'portal', viewport)
    layout = openWindow(layout, 'calculator', viewport)
    expect(layout.windows.map((item) => item.kind)).toEqual(['portal', 'calculator'])
    expect(layout.windows[1].z).toBeGreaterThan(layout.windows[0].z)
  })

  it('brings an open window to the front instead of duplicating it', () => {
    let layout = openWindow(emptyLayout(), 'portal', viewport)
    layout = openWindow(layout, 'calculator', viewport)
    layout = openWindow(layout, 'portal', viewport)
    expect(layout.windows).toHaveLength(2)
    const portal = layout.windows.find((item) => item.kind === 'portal')
    expect(portal?.z).toBe(Math.max(...layout.windows.map((item) => item.z)))
  })

  it('minimizes, restores and closes independently', () => {
    let layout = openWindow(openWindow(emptyLayout(), 'reminders', viewport), 'parts', viewport)
    layout = minimizeWindow(layout, 'reminders')
    expect(layout.windows.find((item) => item.kind === 'reminders')?.minimized).toBe(true)
    expect(layout.windows.find((item) => item.kind === 'parts')?.minimized).toBe(false)
    layout = focusWindow(layout, 'reminders')
    expect(layout.windows.find((item) => item.kind === 'reminders')?.minimized).toBe(false)
    layout = closeWindow(layout, 'parts')
    expect(layout.windows.map((item) => item.kind)).toEqual(['reminders'])
  })

  it('toggles: open, then minimize when already in front', () => {
    let layout = toggleWindow(emptyLayout(), 'case', viewport)
    expect(layout.windows[0].minimized).toBe(false)
    layout = toggleWindow(layout, 'case', viewport)
    expect(layout.windows[0].minimized).toBe(true)
    layout = toggleWindow(layout, 'case', viewport)
    expect(layout.windows[0].minimized).toBe(false)
  })

  it('keeps the title bar reachable and respects the minimum size', () => {
    let layout = openWindow(emptyLayout(), 'portal', viewport)
    layout = moveWindow(layout, 'portal', 5000, -300, viewport)
    const moved = layout.windows[0]
    expect(moved.y).toBe(0)
    expect(moved.x).toBeLessThanOrEqual(viewport.width - 80)
    layout = resizeWindow(layout, 'portal', 10, 10, viewport)
    expect(layout.windows[0].width).toBe(MIN_WINDOW_WIDTH)
    expect(layout.windows[0].height).toBe(MIN_WINDOW_HEIGHT)
  })

  it('pulls windows back when the main window gets smaller', () => {
    const layout = moveWindow(openWindow(emptyLayout(), 'portal', viewport), 'portal', 1200, 800, viewport)
    const fitted = fitLayout(layout, { width: 1100, height: 720 })
    expect(fitted.windows[0].x).toBeLessThanOrEqual(1100 - 80)
    expect(fitted.windows[0].y).toBeLessThanOrEqual(720 - 32)
    expect(fitLayout(fitted, { width: 1100, height: 720 })).toBe(fitted)
  })

  it('restores a saved layout and ignores anything malformed', () => {
    const saved = JSON.parse(JSON.stringify(openWindow(emptyLayout(), 'case', viewport)))
    expect(parseLayout(saved)).toEqual(saved)
    expect(parseLayout({ version: 2, windows: [] })).toEqual(emptyLayout())
    expect(
      parseLayout({
        version: 1,
        windows: [
          { kind: 'unknown', x: 0, y: 0, width: 300, height: 200, z: 1 },
          { kind: 'case', x: 'a', y: 0, width: 300, height: 200, z: 1 },
          { kind: 'news', x: 0, y: 0, width: 300, height: 200, z: 1 },
          { kind: 'news', x: 5, y: 5, width: 300, height: 200, z: 2 },
        ],
      }).windows.map((item) => item.kind),
    ).toEqual(['news'])
  })

  it('reopens a closed window with the size and place it had', () => {
    let layout = openWindow(emptyLayout(), 'news', viewport)
    layout = resizeWindow(moveWindow(layout, 'news', 120, 90, viewport), 'news', 610, 470, viewport)
    layout = closeWindow(layout, 'news')
    expect(layout.windows).toHaveLength(0)
    const saved = parseLayout(JSON.parse(JSON.stringify(layout)))
    const reopened = openWindow(saved, 'news', viewport).windows[0]
    expect([reopened.x, reopened.y, reopened.width, reopened.height]).toEqual([120, 90, 610, 470])
    expect(openWindow(saved, 'news', viewport).closed?.news).toBeUndefined()
  })
})
