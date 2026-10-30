/* Case tabs: one working set (mail, notes, tasks) per open case, replacing the
   five anonymous draft boxes. Pure state logic; App holds the live working set
   of the active tab and swaps it in and out. */
import type { CaseContext } from '../context/caseContext'
import { createEmptyDraftBoxSlot, type DraftBoxSlot } from './taskDraft'

export const CASE_TABS_LIMIT = 12

export interface CaseTabKey {
  id: string
  number?: string
}

export interface CaseTab {
  id: string
  caseKey: CaseTabKey | null
  // Saved working set; stale for the active tab, whose content lives in App.
  workspace: DraftBoxSlot
  createdAt: string
  // Last case values seen for this tab. Saved only for a locked tab.
  context?: CaseContext | null
  // Locked (padlock): the tab cannot be closed, no other case takes it, and it
  // comes back with its case values when Agentor is reopened.
  locked?: boolean
}

export interface CaseTabsState {
  tabs: CaseTab[]
  activeId: string
}

let counter = 0
const newTabId = () => `case-tab-${Date.now().toString(36)}-${(counter += 1)}`

export const createCaseTab = (caseKey: CaseTabKey | null = null, now = new Date().toISOString()): CaseTab => ({
  id: newTabId(),
  caseKey,
  workspace: createEmptyDraftBoxSlot(),
  createdAt: now,
})

export const createCaseTabsState = (): CaseTabsState => {
  const tab = createCaseTab()
  return { tabs: [tab], activeId: tab.id }
}

export const activeCaseTab = (state: CaseTabsState) =>
  state.tabs.find((tab) => tab.id === state.activeId) ?? state.tabs[0]

export const findCaseTab = (state: CaseTabsState, caseId: string) =>
  state.tabs.find((tab) => tab.caseKey?.id === caseId)

export const caseTabLabel = (tab: CaseTab, index: number) =>
  tab.caseKey?.number || (tab.caseKey ? 'RQT sans numéro' : `Brouillon ${index + 1}`)

// Stores the working set of a tab (the one being left).
export const saveTabWorkspace = (state: CaseTabsState, tabId: string, workspace: DraftBoxSlot): CaseTabsState => ({
  ...state,
  tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, workspace } : tab)),
})

export const setActiveCaseTab = (state: CaseTabsState, tabId: string): CaseTabsState =>
  state.tabs.some((tab) => tab.id === tabId) ? { ...state, activeId: tabId } : state

export const addCaseTab = (state: CaseTabsState, tab: CaseTab): CaseTabsState => {
  const index = state.tabs.findIndex((item) => item.id === state.activeId)
  const tabs = [...state.tabs]
  tabs.splice(index + 1, 0, tab)
  return { tabs, activeId: tab.id }
}

export const toggleCaseTabLock = (state: CaseTabsState, tabId: string): CaseTabsState => ({
  ...state,
  tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, locked: !tab.locked } : tab)),
})

// Removing the last tab leaves one empty tab. The neighbour on the right (or
// left) becomes active when the active tab goes. A locked tab stays.
export const removeCaseTab = (state: CaseTabsState, tabId: string): CaseTabsState => {
  const index = state.tabs.findIndex((tab) => tab.id === tabId)
  if (index === -1 || state.tabs[index].locked) return state
  const tabs = state.tabs.filter((tab) => tab.id !== tabId)
  if (!tabs.length) return createCaseTabsState()
  const activeId = state.activeId === tabId ? tabs[Math.min(index, tabs.length - 1)].id : state.activeId
  return { tabs, activeId }
}

export const bindCaseTab = (state: CaseTabsState, tabId: string, caseKey: CaseTabKey): CaseTabsState => ({
  ...state,
  tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, caseKey } : tab)),
})

// Keeps the last values seen for the case in the tab bound to it.
export const rememberCaseContext = (state: CaseTabsState, context: CaseContext): CaseTabsState => {
  let changed = false
  const tabs = state.tabs.map((tab) => {
    if (tab.caseKey?.id !== context.caseKey.id) return tab
    changed = true
    const number = context.caseKey.number ?? tab.caseKey.number
    return { ...tab, context, caseKey: { id: tab.caseKey.id, number } }
  })
  return changed ? { ...state, tabs } : state
}

export type CaseArrival =
  | { kind: 'switch'; tabId: string }
  | { kind: 'bind'; tabId: string }
  | { kind: 'create' }
  | { kind: 'full' }
  | { kind: 'none' }

// What to do when the CRM opens a case: go to its tab, give it the active tab
// when that tab is empty and not bound yet, otherwise open a new tab.
export const planCaseArrival = (
  state: CaseTabsState,
  caseId: string,
  activeIsEmpty: boolean,
): CaseArrival => {
  const existing = findCaseTab(state, caseId)
  if (existing) return existing.id === state.activeId ? { kind: 'none' } : { kind: 'switch', tabId: existing.id }
  const active = activeCaseTab(state)
  if (active && !active.caseKey && !active.locked && activeIsEmpty) return { kind: 'bind', tabId: active.id }
  if (state.tabs.length >= CASE_TABS_LIMIT) return { kind: 'full' }
  return { kind: 'create' }
}

// A saved context may fill an empty tab, but must not switch a restored
// workspace. Defer it without marking it handled, so the same case arriving
// live from Cairm can still activate its tab.
export const planCaseReception = (
  state: CaseTabsState,
  caseId: string,
  activeIsEmpty: boolean,
  origin: 'stored' | 'live',
): CaseArrival | { kind: 'defer' } => {
  const plan = planCaseArrival(state, caseId, activeIsEmpty)
  return origin === 'stored' && plan.kind !== 'bind' ? { kind: 'defer' } : plan
}

// The case a tab works on: the live case when it is the same one, else the
// last values seen for it. A tab without a case has none.
export const caseForTab = (tab: CaseTab | undefined, live: CaseContext | null): CaseContext | null => {
  if (!tab?.caseKey) return null
  if (live && live.caseKey.id === tab.caseKey.id) return live
  return tab.context ?? null
}

// Saved form: the drafts and the case key. The case values only for a locked tab.
export const serializeCaseTabs = (state: CaseTabsState) =>
  JSON.stringify({
    version: 1,
    activeId: state.activeId,
    tabs: state.tabs.map(({ id, caseKey, workspace, createdAt, locked, context }) => ({
      id,
      caseKey,
      workspace,
      createdAt,
      ...(locked ? { locked: true, ...(context ? { context } : {}) } : {}),
    })),
  })

const parseContext = (raw: unknown, caseId: string | undefined): CaseContext | null => {
  if (!raw || typeof raw !== 'object' || !caseId) return null
  const context = raw as CaseContext
  return context.schema === 'agentor.case-context/1' &&
    context.caseKey?.id === caseId &&
    context.fields &&
    typeof context.fields === 'object'
    ? context
    : null
}

const asString = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback)

const parseWorkspace = (raw: unknown): DraftBoxSlot => {
  const empty = createEmptyDraftBoxSlot()
  if (!raw || typeof raw !== 'object') return empty
  const item = raw as Partial<DraftBoxSlot>
  const taskBoxes = Array.isArray(item.taskBoxes)
    ? empty.taskBoxes.map((box, index) => {
        const source = item.taskBoxes?.[index] as Partial<typeof box> | undefined
        return { task: asString(source?.task), savedAt: asString(source?.savedAt) }
      })
    : empty.taskBoxes
  return {
    email: asString(item.email),
    notes: asString(item.notes),
    task: asString(item.task),
    taskSkeletonEnabled: item.taskSkeletonEnabled !== false,
    taskBoxes,
    activeTaskBoxIndex: item.activeTaskBoxIndex === 1 ? 1 : 0,
    savedAt: asString(item.savedAt),
  }
}

export const parseCaseTabs = (raw: unknown): CaseTabsState => {
  if (!raw || typeof raw !== 'object') return createCaseTabsState()
  const source = raw as { activeId?: unknown; tabs?: unknown }
  if (!Array.isArray(source.tabs)) return createCaseTabsState()
  const seen = new Set<string>()
  const tabs: CaseTab[] = []
  for (const entry of source.tabs.slice(0, CASE_TABS_LIMIT)) {
    if (!entry || typeof entry !== 'object') continue
    const item = entry as Record<string, unknown>
    const id = asString(item.id)
    if (!id || seen.has(id)) continue
    seen.add(id)
    const key = item.caseKey as Record<string, unknown> | null | undefined
    const caseKey =
      key && typeof key === 'object' && asString(key.id)
        ? { id: asString(key.id), ...(asString(key.number) ? { number: asString(key.number) } : {}) }
        : null
    const locked = item.locked === true
    const context = locked ? parseContext(item.context, caseKey?.id) : null
    tabs.push({
      id,
      caseKey,
      workspace: parseWorkspace(item.workspace),
      createdAt: asString(item.createdAt),
      ...(locked ? { locked } : {}),
      ...(context ? { context } : {}),
    })
  }
  if (!tabs.length) return createCaseTabsState()
  const activeId = tabs.some((tab) => tab.id === source.activeId) ? asString(source.activeId) : tabs[0].id
  return { tabs, activeId }
}
