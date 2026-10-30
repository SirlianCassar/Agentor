import { describe, expect, it } from 'vitest'
import type { CaseContext } from '../../context/caseContext'
import {
  addCaseTab,
  bindCaseTab,
  CASE_TABS_LIMIT,
  caseForTab,
  caseTabLabel,
  createCaseTab,
  createCaseTabsState,
  parseCaseTabs,
  planCaseArrival,
  rememberCaseContext,
  removeCaseTab,
  saveTabWorkspace,
  serializeCaseTabs,
  setActiveCaseTab,
  toggleCaseTabLock,
} from '../caseTabs'
import { createEmptyDraftBoxSlot } from '../taskDraft'

const context = (id: string, number: string, customer = 'Client Fictif'): CaseContext =>
  ({
    schema: 'agentor.case-context/1',
    caseKey: { system: 'dynamics', entity: 'incident', id, number },
    fields: { customerName: { value: customer, status: 'auto', source: 'crm', updatedAt: '2026-10-30T00:00:00Z' } },
    lastTask: null,
    updatedAt: '2026-10-30T00:00:00Z',
  }) as unknown as CaseContext

const withMail = (email: string) => ({ ...createEmptyDraftBoxSlot(), email })

describe('case tabs', () => {
  it('starts with one empty tab without a case', () => {
    const state = createCaseTabsState()
    expect(state.tabs).toHaveLength(1)
    expect(state.tabs[0].caseKey).toBeNull()
    expect(caseTabLabel(state.tabs[0], 0)).toBe('Brouillon 1')
  })

  it('gives the empty active tab to the case that arrives', () => {
    const state = createCaseTabsState()
    expect(planCaseArrival(state, 'case-a', true)).toEqual({ kind: 'bind', tabId: state.activeId })
    const bound = bindCaseTab(state, state.activeId, { id: 'case-a', number: 'RQT-1' })
    expect(caseTabLabel(bound.tabs[0], 0)).toBe('RQT-1')
  })

  it('opens a new tab when the active one holds a draft or another case', () => {
    const state = createCaseTabsState()
    expect(planCaseArrival(state, 'case-a', false)).toEqual({ kind: 'create' })
    const bound = bindCaseTab(state, state.activeId, { id: 'case-a' })
    expect(planCaseArrival(bound, 'case-b', true)).toEqual({ kind: 'create' })
  })

  it('goes back to the tab of a case already open', () => {
    const start = createCaseTabsState()
    let state = bindCaseTab(start, start.activeId, { id: 'x' })
    const first = createCaseTab({ id: 'case-a' })
    state = addCaseTab(state, first)
    state = addCaseTab(state, createCaseTab({ id: 'case-b' }))
    expect(planCaseArrival(state, 'case-a', true)).toEqual({ kind: 'switch', tabId: first.id })
    expect(planCaseArrival(setActiveCaseTab(state, first.id), 'case-a', false)).toEqual({ kind: 'none' })
  })

  it('refuses a new tab when the limit is reached', () => {
    let state = createCaseTabsState()
    state = bindCaseTab(state, state.activeId, { id: 'case-0' })
    for (let index = 1; index < CASE_TABS_LIMIT; index += 1) state = addCaseTab(state, createCaseTab({ id: `case-${index}` }))
    expect(planCaseArrival(state, 'case-new', true)).toEqual({ kind: 'full' })
  })

  it('adds a tab next to the active one and activates it', () => {
    const state = createCaseTabsState()
    const second = createCaseTab()
    const third = createCaseTab()
    const next = addCaseTab(addCaseTab(state, second), third)
    expect(next.tabs.map((tab) => tab.id)).toEqual([state.activeId, second.id, third.id])
    const between = addCaseTab(setActiveCaseTab(next, state.activeId), createCaseTab())
    expect(between.tabs[1].id).toBe(between.activeId)
  })

  it('activates the neighbour when the active tab is closed, and never ends empty', () => {
    const state = createCaseTabsState()
    const second = createCaseTab()
    const both = addCaseTab(state, second)
    expect(removeCaseTab(both, second.id).activeId).toBe(state.activeId)
    expect(removeCaseTab(setActiveCaseTab(both, state.activeId), state.activeId).activeId).toBe(second.id)
    const last = removeCaseTab(state, state.activeId)
    expect(last.tabs).toHaveLength(1)
    expect(last.tabs[0].id).not.toBe(state.activeId)
  })

  it('keeps the working set of the tab being left', () => {
    const state = createCaseTabsState()
    const saved = saveTabWorkspace(state, state.activeId, withMail('Bonjour'))
    expect(saved.tabs[0].workspace.email).toBe('Bonjour')
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

  it('saves the drafts and the case key but never the case values', () => {
    let state = createCaseTabsState()
    state = bindCaseTab(state, state.activeId, { id: 'case-a', number: 'RQT-1' })
    state = rememberCaseContext(state, context('case-a', 'RQT-1', 'Nom Client Secret'))
    state = saveTabWorkspace(state, state.activeId, withMail('Texte'))
    const text = serializeCaseTabs(state)
    expect(text).not.toContain('Nom Client Secret')
    const back = parseCaseTabs(JSON.parse(text))
    expect(back.activeId).toBe(state.activeId)
    expect(back.tabs[0].caseKey).toEqual({ id: 'case-a', number: 'RQT-1' })
    expect(back.tabs[0].workspace.email).toBe('Texte')
  })

  it('keeps a locked tab: no closing, no other case, values saved', () => {
    let state = createCaseTabsState()
    state = bindCaseTab(state, state.activeId, { id: 'case-a', number: 'RQT-1' })
    state = rememberCaseContext(state, context('case-a', 'RQT-1', 'Client Gardé'))
    state = toggleCaseTabLock(state, state.activeId)
    expect(state.tabs[0].locked).toBe(true)
    expect(removeCaseTab(state, state.activeId)).toBe(state)
    const back = parseCaseTabs(JSON.parse(serializeCaseTabs(state)))
    expect(back.tabs[0].locked).toBe(true)
    expect(back.tabs[0].context?.fields.customerName?.value).toBe('Client Gardé')
    // A saved context that does not belong to the tab's case is ignored.
    const wrong = JSON.parse(serializeCaseTabs(state))
    wrong.tabs[0].context.caseKey.id = 'case-b'
    expect(parseCaseTabs(wrong).tabs[0].context).toBeUndefined()
    // An empty locked tab is not given to the next case.
    let empty = toggleCaseTabLock(createCaseTabsState(), createCaseTabsState().activeId)
    empty = toggleCaseTabLock(empty, empty.activeId)
    expect(planCaseArrival(empty, 'case-c', true)).toEqual({ kind: 'create' })
    const unlocked = toggleCaseTabLock(state, state.activeId)
    expect(unlocked.tabs[0].locked).toBe(false)
    expect(serializeCaseTabs(unlocked)).not.toContain('Client Gardé')
  })

  it('names a tab by its RQT number only', () => {
    expect(caseTabLabel(createCaseTab({ id: 'case-a', number: 'RQT-9' }), 0)).toBe('RQT-9')
    expect(caseTabLabel(createCaseTab({ id: 'case-a' }), 0)).toBe('RQT sans numéro')
  })

  it('reads damaged saved tabs without failing', () => {
    expect(parseCaseTabs(null).tabs).toHaveLength(1)
    expect(parseCaseTabs({ tabs: 'x' }).tabs).toHaveLength(1)
    const parsed = parseCaseTabs({ activeId: 'gone', tabs: [{ id: 'a', workspace: { email: 3, taskBoxes: [{ task: 'T' }] } }, { id: 'a' }, null] })
    expect(parsed.tabs).toHaveLength(1)
    expect(parsed.activeId).toBe('a')
    expect(parsed.tabs[0].workspace.email).toBe('')
    expect(parsed.tabs[0].workspace.taskBoxes[0].task).toBe('T')
    expect(parsed.tabs[0].workspace.taskBoxes).toHaveLength(2)
  })
})
