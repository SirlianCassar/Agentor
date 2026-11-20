/* Case tabs: one main tab that follows the case opened in the CRM, plus the
   cases the user pinned aside. The main tab remembers the last cases it showed
   (CASE_HISTORY_LIMIT, the current one included) with their drafts, so the
   user can go back to one. Pure state logic; App holds the live working set of
   the active tab and swaps it in and out. */
import { normalizeRqtNumber, onlyRqtContext, type CaseContext } from '../context/caseContext'
import { createEmptyDraftBoxSlot, type DraftBoxSlot } from './taskDraft'

// Main tab and pinned tabs together.
export const CASE_TABS_LIMIT = 12
// Cases the main tab lets the user go back to, the current one included.
export const CASE_HISTORY_LIMIT = 5

export interface CaseTabKey {
  id: string
  number?: string
}

// A case the main tab showed before the current one.
export interface CaseHistoryEntry {
  caseKey: CaseTabKey | null
  workspace: DraftBoxSlot
  // Last case values seen. Kept in memory only.
  context?: CaseContext | null
  viewedAt: string
}

export interface CaseTab {
  id: string
  caseKey: CaseTabKey | null
  // Saved working set; stale for the active tab, whose content lives in App.
  workspace: DraftBoxSlot
  createdAt: string
  // Last case values seen for this tab. Saved only for a pinned tab.
  context?: CaseContext | null
  // The main tab: always first, never closed, takes each new case from the CRM.
  // Every other tab is a pinned tab.
  main?: boolean
  // Main tab only: the cases shown before the current one, newest first.
  history?: CaseHistoryEntry[]
}

export interface CaseTabsState {
  tabs: CaseTab[]
  activeId: string
}

// Tells whether a working set holds a draft worth keeping (App knows the task skeletons).
export type WorkspaceFilled = (workspace: DraftBoxSlot) => boolean

let counter = 0
const newTabId = () => `case-tab-${Date.now().toString(36)}-${(counter += 1)}`

export const createCaseTab = (caseKey: CaseTabKey | null = null, now = new Date().toISOString()): CaseTab => ({
  id: newTabId(),
  caseKey,
  workspace: createEmptyDraftBoxSlot(),
  createdAt: now,
})

const createMainTab = (): CaseTab => ({ ...createCaseTab(), main: true, history: [] })

export const createCaseTabsState = (): CaseTabsState => {
  const tab = createMainTab()
  return { tabs: [tab], activeId: tab.id }
}

export const activeCaseTab = (state: CaseTabsState) =>
  state.tabs.find((tab) => tab.id === state.activeId) ?? state.tabs[0]

export const mainCaseTab = (state: CaseTabsState) => state.tabs.find((tab) => tab.main) ?? state.tabs[0]

export const findCaseTab = (state: CaseTabsState, caseId: string) =>
  state.tabs.find((tab) => tab.caseKey?.id === caseId)

const keyLabel = (caseKey: CaseTabKey | null, fallback: string) =>
  normalizeRqtNumber(caseKey?.number) || (caseKey ? 'RQT sans numéro' : fallback)

export const caseTabLabel = (tab: CaseTab, index: number) =>
  keyLabel(tab.caseKey, tab.main ? 'Onglet principal' : `Brouillon ${index}`)

export const caseHistoryLabel = (entry: CaseHistoryEntry) => keyLabel(entry.caseKey, 'Brouillon sans dossier')

// Stores the working set of a tab (the one being left).
export const saveTabWorkspace = (state: CaseTabsState, tabId: string, workspace: DraftBoxSlot): CaseTabsState => ({
  ...state,
  tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, workspace } : tab)),
})

export const setActiveCaseTab = (state: CaseTabsState, tabId: string): CaseTabsState =>
  state.tabs.some((tab) => tab.id === tabId) ? { ...state, activeId: tabId } : state

// Adds a pinned tab next to the active one (never before the main tab) and activates it.
export const addCaseTab = (state: CaseTabsState, tab: CaseTab): CaseTabsState => {
  const index = state.tabs.findIndex((item) => item.id === state.activeId)
  const tabs = [...state.tabs]
  tabs.splice(Math.max(index, 0) + 1, 0, { ...tab, main: false, history: undefined })
  return { tabs, activeId: tab.id }
}

const replaceMain = (state: CaseTabsState, main: CaseTab): CaseTabsState => ({
  ...state,
  tabs: state.tabs.map((tab) => (tab.main ? main : tab)),
})

export interface HistoryResult {
  state: CaseTabsState
  // Drafts pushed out of the history with no room left to pin them.
  dropped: CaseHistoryEntry[]
}

// Puts an entry at the head of the main tab's history. An empty draft without
// a case is not kept. A draft pushed out of the history is pinned while there
// is room, so it is never lost silently.
const pushHistory = (state: CaseTabsState, entry: CaseHistoryEntry, isFilled: WorkspaceFilled): HistoryResult => {
  const main = mainCaseTab(state)
  const keep = Boolean(entry.caseKey) || isFilled(entry.workspace)
  const rest = (main.history ?? []).filter((item) => !entry.caseKey || item.caseKey?.id !== entry.caseKey.id)
  const history = keep ? [entry, ...rest] : rest
  const kept = history.slice(0, CASE_HISTORY_LIMIT - 1)
  let next = replaceMain(state, { ...main, history: kept })
  const dropped: CaseHistoryEntry[] = []
  for (const item of history.slice(CASE_HISTORY_LIMIT - 1)) {
    if (!isFilled(item.workspace)) continue
    if (next.tabs.length >= CASE_TABS_LIMIT) {
      dropped.push(item)
      continue
    }
    next = { ...next, tabs: [...next.tabs, { ...createCaseTab(item.caseKey), workspace: item.workspace, context: item.context ?? null }] }
  }
  return { state: next, dropped }
}

const currentEntry = (tab: CaseTab, now: string): CaseHistoryEntry => ({
  caseKey: tab.caseKey,
  workspace: tab.workspace,
  context: tab.context ?? null,
  viewedAt: now,
})

// Shows a case in the main tab and activates it. The case shown until then
// goes into the history; a case found in the history comes back with its draft.
// The state must hold the live working set of the active tab.
export const showCaseInMain = (
  state: CaseTabsState,
  caseKey: CaseTabKey,
  isFilled: WorkspaceFilled,
  now = new Date().toISOString(),
): HistoryResult => {
  const main = mainCaseTab(state)
  if (main.caseKey?.id === caseKey.id) return { state: { ...state, activeId: main.id }, dropped: [] }
  const previous = (main.history ?? []).find((item) => item.caseKey?.id === caseKey.id)
  const withoutTarget = replaceMain(state, {
    ...main,
    history: (main.history ?? []).filter((item) => item !== previous),
  })
  const pushed = pushHistory(withoutTarget, currentEntry(main, now), isFilled)
  const nextMain = mainCaseTab(pushed.state)
  return {
    state: {
      ...replaceMain(pushed.state, {
        ...nextMain,
        caseKey: previous?.caseKey ? { ...previous.caseKey, ...(caseKey.number ? { number: caseKey.number } : {}) } : caseKey,
        workspace: previous?.workspace ?? createEmptyDraftBoxSlot(),
        context: previous?.context ?? null,
      }),
      activeId: nextMain.id,
    },
    dropped: pushed.dropped,
  }
}

// Brings back an entry of the main tab's history (0 = the most recent one).
export const recallCaseHistory = (
  state: CaseTabsState,
  index: number,
  isFilled: WorkspaceFilled,
  now = new Date().toISOString(),
): HistoryResult => {
  const main = mainCaseTab(state)
  const entry = main.history?.[index]
  if (!entry) return { state, dropped: [] }
  if (entry.caseKey) return showCaseInMain(state, entry.caseKey, isFilled, now)
  // A draft without a case: swap it with the current content.
  const withoutTarget = replaceMain(state, { ...main, history: (main.history ?? []).filter((item) => item !== entry) })
  const pushed = pushHistory(withoutTarget, currentEntry(main, now), isFilled)
  const nextMain = mainCaseTab(pushed.state)
  return {
    state: { ...replaceMain(pushed.state, { ...nextMain, caseKey: null, workspace: entry.workspace, context: null }), activeId: nextMain.id },
    dropped: pushed.dropped,
  }
}

// Main tab worth pinning: a case or a draft.
export const canPinMain = (state: CaseTabsState, isFilled: WorkspaceFilled) => {
  const main = mainCaseTab(state)
  return state.tabs.length < CASE_TABS_LIMIT && (Boolean(main.caseKey) || isFilled(main.workspace))
}

// Moves the main tab's case (and its draft) into a new pinned tab, which
// becomes active. The main tab is left empty and waits for the next case.
export const pinMainCase = (state: CaseTabsState, now = new Date().toISOString()): CaseTabsState => {
  const main = mainCaseTab(state)
  if (state.tabs.length >= CASE_TABS_LIMIT) return state
  const pinned: CaseTab = {
    ...createCaseTab(main.caseKey, now),
    workspace: main.workspace,
    context: main.context ?? null,
  }
  const emptied = replaceMain(state, { ...main, caseKey: null, workspace: createEmptyDraftBoxSlot(), context: null })
  return { tabs: [...emptied.tabs, pinned], activeId: pinned.id }
}

// Unpins a tab: its case goes back into the main tab's history, so nothing is
// lost. The main tab becomes active when the unpinned tab was. The main tab stays.
export const unpinCaseTab = (
  state: CaseTabsState,
  tabId: string,
  isFilled: WorkspaceFilled,
  now = new Date().toISOString(),
): HistoryResult => {
  const tab = state.tabs.find((item) => item.id === tabId)
  if (!tab || tab.main) return { state, dropped: [] }
  const without: CaseTabsState = {
    tabs: state.tabs.filter((item) => item.id !== tabId),
    activeId: state.activeId === tabId ? mainCaseTab(state).id : state.activeId,
  }
  return pushHistory(without, currentEntry(tab, now), isFilled)
}

export const bindCaseTab = (state: CaseTabsState, tabId: string, caseKey: CaseTabKey): CaseTabsState => ({
  ...state,
  tabs: state.tabs.map((tab) => (tab.id === tabId ? { ...tab, caseKey } : tab)),
})

// Keeps the last values seen for the case in the tab (or history entry) bound to it.
export const rememberCaseContext = (state: CaseTabsState, context: CaseContext): CaseTabsState => {
  let changed = false
  const remember = <T extends { caseKey: CaseTabKey | null; context?: CaseContext | null }>(item: T): T => {
    if (!item.caseKey || item.caseKey.id !== context.caseKey.id) return item
    changed = true
    const number = normalizeRqtNumber(context.caseKey.number) ?? normalizeRqtNumber(item.caseKey.number)
    return { ...item, context, caseKey: { id: item.caseKey.id, ...(number ? { number } : {}) } }
  }
  const tabs = state.tabs.map((tab) => {
    const next = remember(tab)
    return tab.history ? { ...next, history: tab.history.map(remember) } : next
  })
  return changed ? { ...state, tabs } : state
}

export type CaseArrival =
  | { kind: 'switch'; tabId: string }
  | { kind: 'bind'; tabId: string }
  | { kind: 'main' }
  | { kind: 'none' }

// What to do when the CRM opens a case: go to its pinned tab, or to the main
// tab when it already shows it; give it the main tab when that tab is empty and
// has no case; otherwise the main tab changes to the new case.
export const planCaseArrival = (state: CaseTabsState, caseId: string, mainIsEmpty: boolean): CaseArrival => {
  const existing = findCaseTab(state, caseId)
  if (existing) return existing.id === state.activeId ? { kind: 'none' } : { kind: 'switch', tabId: existing.id }
  const main = mainCaseTab(state)
  if (!main.caseKey && mainIsEmpty) return { kind: 'bind', tabId: main.id }
  return { kind: 'main' }
}

// A saved context may fill an empty main tab, but must not change a restored
// workspace. Defer it without marking it handled, so the same case arriving
// live from Agentor Bridge can still be shown.
export const planCaseReception = (
  state: CaseTabsState,
  caseId: string,
  mainIsEmpty: boolean,
  origin: 'stored' | 'live',
): CaseArrival | { kind: 'defer' } => {
  const plan = planCaseArrival(state, caseId, mainIsEmpty)
  return origin === 'stored' && plan.kind !== 'bind' ? { kind: 'defer' } : plan
}

// The case a tab works on: the live case when it is the same one, else the
// last values seen for it. A tab without a case has none.
export const caseForTab = (
  tab: Pick<CaseTab, 'caseKey' | 'context'> | undefined,
  live: CaseContext | null,
): CaseContext | null => {
  if (!tab?.caseKey) return null
  if (live && live.caseKey.id === tab.caseKey.id) return live
  return tab.context ?? null
}

// Saved form: the drafts and the case keys. The case values only for a pinned tab.
export const serializeCaseTabs = (state: CaseTabsState) =>
  JSON.stringify({
    version: 2,
    activeId: state.activeId,
    tabs: state.tabs.map(({ id, caseKey, workspace, createdAt, main, history, context }) => ({
      id,
      caseKey,
      workspace,
      createdAt,
      ...(main
        ? { main: true, history: (history ?? []).map(({ caseKey: key, workspace: slot, viewedAt }) => ({ caseKey: key, workspace: slot, viewedAt })) }
        : context
          ? { context }
          : {}),
    })),
  })

const parseContext = (raw: unknown, caseId: string | undefined): CaseContext | null => {
  if (!raw || typeof raw !== 'object' || !caseId) return null
  const context = raw as CaseContext
  return context.schema === 'agentor.case-context/1' &&
    context.caseKey?.id === caseId &&
    context.fields &&
    typeof context.fields === 'object'
    ? onlyRqtContext(context)
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

const parseCaseKey = (raw: unknown): CaseTabKey | null => {
  const key = raw as Record<string, unknown> | null | undefined
  if (!key || typeof key !== 'object' || !asString(key.id)) return null
  const number = normalizeRqtNumber(key.number)
  return { id: asString(key.id), ...(number ? { number } : {}) }
}

const parseHistory = (raw: unknown, taken: Set<string>): CaseHistoryEntry[] => {
  if (!Array.isArray(raw)) return []
  const history: CaseHistoryEntry[] = []
  for (const entry of raw) {
    if (history.length >= CASE_HISTORY_LIMIT - 1) break
    if (!entry || typeof entry !== 'object') continue
    const item = entry as Record<string, unknown>
    const caseKey = parseCaseKey(item.caseKey)
    if (caseKey && taken.has(caseKey.id)) continue
    if (caseKey) taken.add(caseKey.id)
    history.push({ caseKey, workspace: parseWorkspace(item.workspace), viewedAt: asString(item.viewedAt) })
  }
  return history
}

// Reads the saved tabs. The first tab marked main is the main tab. Tabs saved
// before the main tab existed (version 1): the active tab becomes the main tab
// unless it was locked; every other tab, locked or not, becomes a pinned tab.
export const parseCaseTabs = (raw: unknown): CaseTabsState => {
  if (!raw || typeof raw !== 'object') return createCaseTabsState()
  const source = raw as { activeId?: unknown; tabs?: unknown; version?: unknown }
  if (!Array.isArray(source.tabs)) return createCaseTabsState()
  const legacy = source.version !== 2
  const seen = new Set<string>()
  const entries: Array<{ tab: CaseTab; item: Record<string, unknown> }> = []
  for (const entry of source.tabs) {
    if (entries.length >= CASE_TABS_LIMIT) break
    if (!entry || typeof entry !== 'object') continue
    const item = entry as Record<string, unknown>
    const id = asString(item.id)
    if (!id || seen.has(id)) continue
    seen.add(id)
    const caseKey = parseCaseKey(item.caseKey)
    entries.push({ tab: { id, caseKey, workspace: parseWorkspace(item.workspace), createdAt: asString(item.createdAt) }, item })
  }
  const mainIndex = legacy
    ? entries.findIndex(({ tab, item }) => tab.id === source.activeId && item.locked !== true)
    : entries.findIndex(({ item }) => item.main === true)
  const taken = new Set(entries.map(({ tab }) => tab.caseKey?.id).filter((id): id is string => Boolean(id)))
  const tabs: CaseTab[] = entries.map(({ tab, item }, index) => {
    if (index === mainIndex) return { ...tab, main: true, history: legacy ? [] : parseHistory(item.history, taken) }
    const context = parseContext(item.context, tab.caseKey?.id)
    return { ...tab, ...(context ? { context } : {}) }
  })
  const main = mainIndex === -1 ? createMainTab() : tabs.splice(mainIndex, 1)[0]
  const all = [main, ...tabs].slice(0, CASE_TABS_LIMIT)
  const activeId = all.some((tab) => tab.id === source.activeId) ? asString(source.activeId) : main.id
  return { tabs: all, activeId }
}
