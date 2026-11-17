import { describe, expect, it } from 'vitest'
import type { CaseContext } from '../../context/caseContext'
import {
  addCaseTab,
  bindCaseTab,
  CASE_HISTORY_LIMIT,
  CASE_TABS_LIMIT,
  canPinMain,
  caseForTab,
  caseHistoryLabel,
  caseTabLabel,
  createCaseTab,
  createCaseTabsState,
  mainCaseTab,
  parseCaseTabs,
  pinMainCase,
  planCaseArrival,
  planCaseReception,
  recallCaseHistory,
  rememberCaseContext,
  saveTabWorkspace,
  serializeCaseTabs,
  setActiveCaseTab,
  showCaseInMain,
  unpinCaseTab,
  type CaseTabsState,
} from '../caseTabs'
import { createEmptyDraftBoxSlot, type DraftBoxSlot } from '../taskDraft'

const context = (id: string, number: string, customer = 'Client Fictif'): CaseContext =>
  ({
    schema: 'agentor.case-context/1',
    caseKey: { system: 'dynamics', entity: 'incident', id, number },
    fields: { customerName: { value: customer, status: 'auto', source: 'crm', updatedAt: '2026-10-30T00:00:00Z' } },
    lastTask: null,
    updatedAt: '2026-10-30T00:00:00Z',
  }) as unknown as CaseContext

const withMail = (email: string) => ({ ...createEmptyDraftBoxSlot(), email })
const isFilled = (slot: DraftBoxSlot) => Boolean(slot.email.trim())
const main = (state: CaseTabsState) => mainCaseTab(state)
const boundMain = (key: { id: string; number?: string }) => {
  const state = createCaseTabsState()
  return bindCaseTab(state, state.activeId, key)
}
const show = (state: CaseTabsState, id: string) => showCaseInMain(state, { id, number: `RQT-${id}` }, isFilled).state

describe('case tabs', () => {
  it('starts with one empty main tab without a case', () => {
    const state = createCaseTabsState()
    expect(state.tabs).toHaveLength(1)
    expect(state.tabs[0].main).toBe(true)
    expect(state.tabs[0].caseKey).toBeNull()
    expect(caseTabLabel(state.tabs[0], 0)).toBe('Onglet principal')
    expect(caseTabLabel(createCaseTab(), 1)).toBe('Brouillon 1')
  })

  it('gives the empty main tab to the case that arrives', () => {
    const state = createCaseTabsState()
    expect(planCaseArrival(state, 'case-a', true)).toEqual({ kind: 'bind', tabId: state.activeId })
    const bound = bindCaseTab(state, state.activeId, { id: 'case-a', number: 'RQT-1' })
    expect(caseTabLabel(bound.tabs[0], 0)).toBe('RQT-1')
  })

  it('changes the main tab to the new case and keeps the previous one in its history', () => {
    let state = boundMain({ id: 'a' })
    expect(planCaseArrival(state, 'b', true)).toEqual({ kind: 'main' })
    state = saveTabWorkspace(state, state.activeId, withMail('Mail pour A'))
    state = show(state, 'b')
    expect(state.tabs).toHaveLength(1)
    expect(main(state).caseKey?.id).toBe('b')
    expect(main(state).workspace.email).toBe('')
    expect(main(state).history?.map((entry) => entry.caseKey?.id)).toEqual(['a'])
    // Coming back to A brings its draft back, B goes into the history.
    state = show(state, 'a')
    expect(main(state).workspace.email).toBe('Mail pour A')
    expect(main(state).history?.map((entry) => entry.caseKey?.id)).toEqual(['b'])
  })

  it('keeps a draft without a case in the history, but not an empty one', () => {
    const start = createCaseTabsState()
    const draft = show(saveTabWorkspace(start, start.activeId, withMail('Note libre')), 'a')
    expect(main(draft).history).toHaveLength(1)
    expect(caseHistoryLabel(main(draft).history![0])).toBe('Brouillon sans dossier')
    const back = recallCaseHistory(draft, 0, isFilled).state
    expect(main(back).caseKey).toBeNull()
    expect(main(back).workspace.email).toBe('Note libre')
    expect(main(back).history?.[0].caseKey?.id).toBe('a')
    expect(main(show(createCaseTabsState(), 'a')).history).toHaveLength(0)
  })

  it('remembers the last cases only, and pins a draft pushed out of the history', () => {
    let state = createCaseTabsState()
    state = bindCaseTab(state, state.activeId, { id: 'c0' })
    state = saveTabWorkspace(state, state.activeId, withMail('Brouillon du premier'))
    for (let index = 1; index <= CASE_HISTORY_LIMIT; index += 1) state = show(state, `c${index}`)
    expect(main(state).history).toHaveLength(CASE_HISTORY_LIMIT - 1)
    expect(main(state).history?.map((entry) => entry.caseKey?.id)).toEqual(['c4', 'c3', 'c2', 'c1'])
    // c0 had a draft: it is now a pinned tab instead of being lost.
    expect(state.tabs).toHaveLength(2)
    expect(state.tabs[1].caseKey?.id).toBe('c0')
    expect(state.tabs[1].workspace.email).toBe('Brouillon du premier')
    // c1 had none: pushed out quietly.
    state = show(state, 'c6')
    expect(state.tabs).toHaveLength(2)
  })

  it('recalls a case from the history by its position', () => {
    let state = boundMain({ id: 'a' })
    state = show(show(state, 'b'), 'c')
    const recalled = recallCaseHistory(state, 1, isFilled).state
    expect(main(recalled).caseKey?.id).toBe('a')
    expect(main(recalled).history?.map((entry) => entry.caseKey?.id)).toEqual(['c', 'b'])
    expect(recallCaseHistory(state, 9, isFilled).state).toBe(state)
  })

  it('pins the main case into a new tab and empties the main tab', () => {
    let state = createCaseTabsState()
    state = rememberCaseContext(bindCaseTab(state, state.activeId, { id: 'a', number: 'RQT-1' }), context('a', 'RQT-1'))
    state = saveTabWorkspace(state, state.activeId, withMail('À garder'))
    expect(canPinMain(state, isFilled)).toBe(true)
    const pinned = pinMainCase(state)
    expect(pinned.tabs).toHaveLength(2)
    expect(pinned.activeId).toBe(pinned.tabs[1].id)
    expect(pinned.tabs[1].caseKey?.id).toBe('a')
    expect(pinned.tabs[1].workspace.email).toBe('À garder')
    expect(pinned.tabs[1].context?.fields.customerName?.value).toBe('Client Fictif')
    expect(main(pinned).caseKey).toBeNull()
    expect(main(pinned).workspace.email).toBe('')
    expect(canPinMain(pinned, isFilled)).toBe(false)
    // The CRM opening the pinned case again goes to its tab, not to the main tab.
    expect(planCaseArrival(setActiveCaseTab(pinned, main(pinned).id), 'a', true)).toEqual({ kind: 'switch', tabId: pinned.tabs[1].id })
    // A new case takes the main tab and leaves the pinned one alone.
    expect(planCaseArrival(pinned, 'b', true)).toEqual({ kind: 'bind', tabId: main(pinned).id })
  })

  it('goes back to the main tab when the CRM reopens its case from a pinned tab', () => {
    let state = boundMain({ id: 'a' })
    state = addCaseTab(state, createCaseTab({ id: 'b' }))
    expect(planCaseArrival(state, 'a', false)).toEqual({ kind: 'switch', tabId: main(state).id })
    expect(planCaseArrival(state, 'b', false)).toEqual({ kind: 'none' })
  })

  it('unpins a tab into the main history and never removes the main tab', () => {
    let state = boundMain({ id: 'a' })
    state = pinMainCase(saveTabWorkspace(state, state.activeId, withMail('Brouillon A')))
    state = show(state, 'b')
    const pinnedId = state.tabs[1].id
    const unpinned = unpinCaseTab(setActiveCaseTab(state, pinnedId), pinnedId, isFilled).state
    expect(unpinned.tabs).toHaveLength(1)
    expect(unpinned.activeId).toBe(main(unpinned).id)
    expect(main(unpinned).history?.[0].caseKey?.id).toBe('a')
    expect(main(unpinned).history?.[0].workspace.email).toBe('Brouillon A')
    expect(unpinCaseTab(unpinned, main(unpinned).id, isFilled).state).toBe(unpinned)
  })

  it('does not pin beyond the tab limit', () => {
    let state = boundMain({ id: 'm' })
    for (let index = 1; index < CASE_TABS_LIMIT; index += 1) state = addCaseTab(state, createCaseTab({ id: `p${index}` }))
    state = setActiveCaseTab(state, main(state).id)
    expect(canPinMain(state, isFilled)).toBe(false)
    expect(pinMainCase(state)).toBe(state)
  })

  it('retries a saved case when Cairm sends it live, without losing the draft', () => {
    const state = createCaseTabsState()
    const first = saveTabWorkspace(state, state.activeId, withMail('Mail en cours'))
    expect(planCaseReception(first, 'case-a', false, 'stored')).toEqual({ kind: 'defer' })
    expect(planCaseReception(first, 'case-a', false, 'live')).toEqual({ kind: 'main' })
    expect(planCaseReception(state, 'case-a', true, 'stored')).toEqual({ kind: 'bind', tabId: state.activeId })
  })

  it('uses the live case only for its own tab, else the last values seen', () => {
    const tab = createCaseTabsState().tabs[0]
    const liveA = context('case-a', 'RQT-1')
    const liveB = context('case-b', 'RQT-2')
    expect(caseForTab({ ...tab, caseKey: { id: 'case-a' } }, liveA)).toBe(liveA)
    expect(caseForTab({ ...tab, caseKey: { id: 'case-a' } }, liveB)).toBeNull()
    const remembered = rememberCaseContext({ tabs: [{ ...tab, caseKey: { id: 'case-a' } }], activeId: tab.id }, liveA)
    expect(remembered.tabs[0].caseKey?.number).toBe('RQT-1')
    expect(caseForTab(remembered.tabs[0], liveB)).toBe(liveA)
    expect(caseForTab({ ...tab, caseKey: null }, liveA)).toBeNull()
  })

  it('keeps the case values of history entries in memory', () => {
    let state = boundMain({ id: 'a' })
    state = show(state, 'b')
    state = rememberCaseContext(state, context('a', 'RQT-7', 'Client A'))
    expect(main(state).history?.[0].context?.fields.customerName?.value).toBe('Client A')
    expect(main(state).history?.[0].caseKey?.number).toBe('RQT-7')
    expect(main(show(state, 'a')).context?.fields.customerName?.value).toBe('Client A')
  })

  it('saves drafts, case keys and history, case values only for pinned tabs', () => {
    let state = createCaseTabsState()
    state = bindCaseTab(state, state.activeId, { id: 'a', number: 'RQT-1' })
    state = rememberCaseContext(state, context('a', 'RQT-1', 'Nom Client Secret'))
    state = saveTabWorkspace(state, state.activeId, withMail('Texte'))
    state = rememberCaseContext(show(state, 'b'), context('b', 'RQT-2', 'Client Épinglé'))
    state = pinMainCase(state)
    const text = serializeCaseTabs(state)
    expect(text).not.toContain('Nom Client Secret')
    expect(text).toContain('Client Épinglé')
    const back = parseCaseTabs(JSON.parse(text))
    expect(back.activeId).toBe(state.activeId)
    expect(main(back).history?.[0].caseKey).toEqual({ id: 'a', number: 'RQT-1' })
    expect(main(back).history?.[0].workspace.email).toBe('Texte')
    expect(main(back).history?.[0].context).toBeUndefined()
    expect(back.tabs[1].context?.fields.customerName?.value).toBe('Client Épinglé')
    // A saved context that does not belong to the tab's case is ignored.
    const wrong = JSON.parse(text)
    wrong.tabs[1].context.caseKey.id = 'other'
    expect(parseCaseTabs(wrong).tabs[1].context).toBeUndefined()
  })

  it('turns tabs saved before the main tab into a main tab and pinned tabs', () => {
    const legacy = {
      version: 1,
      activeId: 'two',
      tabs: [
        { id: 'one', caseKey: { id: 'a', number: 'RQT-1' }, workspace: { email: 'A' }, locked: true, context: context('a', 'RQT-1', 'Gardé') },
        { id: 'two', caseKey: { id: 'b' }, workspace: { email: 'B' } },
        { id: 'three', caseKey: null, workspace: { email: 'C' } },
      ],
    }
    const state = parseCaseTabs(legacy)
    expect(state.tabs.map((tab) => tab.id)).toEqual(['two', 'one', 'three'])
    expect(state.tabs[0].main).toBe(true)
    expect(state.activeId).toBe('two')
    expect(state.tabs[1].context?.fields.customerName?.value).toBe('Gardé')
    // A locked active tab stays pinned; a new main tab is made.
    const locked = parseCaseTabs({ ...legacy, activeId: 'one' })
    expect(locked.tabs).toHaveLength(4)
    expect(locked.tabs[0].main).toBe(true)
    expect(locked.tabs[0].caseKey).toBeNull()
    expect(locked.activeId).toBe('one')
  })

  it('names a tab by its RQT number only', () => {
    expect(caseTabLabel(createCaseTab({ id: 'case-a', number: 'RQT-9' }), 0)).toBe('RQT-9')
    expect(caseTabLabel(createCaseTab({ id: 'case-a' }), 0)).toBe('RQT sans numéro')
  })

  it('reads damaged saved tabs without failing', () => {
    expect(parseCaseTabs(null).tabs).toHaveLength(1)
    expect(parseCaseTabs({ tabs: 'x' }).tabs).toHaveLength(1)
    const parsed = parseCaseTabs({ version: 2, activeId: 'gone', tabs: [{ id: 'a', main: true, history: [null, { caseKey: { id: 'h' } }, { caseKey: { id: 'h' } }], workspace: { email: 3, taskBoxes: [{ task: 'T' }] } }, { id: 'a' }, null] })
    expect(parsed.tabs).toHaveLength(1)
    expect(parsed.activeId).toBe('a')
    expect(parsed.tabs[0].workspace.email).toBe('')
    expect(parsed.tabs[0].workspace.taskBoxes[0].task).toBe('T')
    expect(parsed.tabs[0].workspace.taskBoxes).toHaveLength(2)
    expect(parsed.tabs[0].history?.map((entry) => entry.caseKey?.id)).toEqual(['h'])
  })
})
