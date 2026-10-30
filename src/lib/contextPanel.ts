/* Contextual panel of the new interface: one item shown at a time, the others
   kept in the order they were opened so that closing the shown item brings the
   previous one back. Pure state logic; App owns what each item displays. */
import type { DashboardWindowKind } from '../windows/windowLayout'

// 'edit' is the quick editor of a library item.
export type PanelItem = 'preview' | 'troubleshootgun' | 'call' | 'edit' | `ref:${DashboardWindowKind}`

export const referenceItem = (kind: DashboardWindowKind): PanelItem => `ref:${kind}`

export const referenceKind = (item: PanelItem): DashboardWindowKind | null =>
  item.startsWith('ref:') ? (item.slice(4) as DashboardWindowKind) : null

export const currentPanelItem = (stack: PanelItem[]): PanelItem | null => stack[stack.length - 1] ?? null

// Shows an item: on top of the others, without a second copy.
export const showPanelItem = (stack: PanelItem[], item: PanelItem): PanelItem[] =>
  currentPanelItem(stack) === item ? stack : [...stack.filter((entry) => entry !== item), item]

export const closePanelItem = (stack: PanelItem[], item: PanelItem): PanelItem[] =>
  stack.includes(item) ? stack.filter((entry) => entry !== item) : stack

// A launcher button: the first click shows the reference, a second click on
// the reference already shown closes it.
export const togglePanelReference = (stack: PanelItem[], kind: DashboardWindowKind): PanelItem[] => {
  const item = referenceItem(kind)
  return currentPanelItem(stack) === item ? closePanelItem(stack, item) : showPanelItem(stack, item)
}

// The panel takes the library's place instead of shrinking the mail when the
// window is narrower than this.
export const PANEL_WIDE_MIN_WIDTH = 1560
