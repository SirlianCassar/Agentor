import { describe, expect, it } from 'vitest'
import {
  closePanelItem,
  currentPanelItem,
  referenceItem,
  referenceKind,
  showPanelItem,
  togglePanelReference,
  type PanelItem,
} from '../contextPanel'

describe('context panel', () => {
  it('shows the last opened item and keeps one copy of each', () => {
    let stack: PanelItem[] = []
    stack = showPanelItem(stack, 'preview')
    stack = showPanelItem(stack, 'call')
    stack = showPanelItem(stack, 'preview')
    expect(stack).toEqual(['call', 'preview'])
    expect(currentPanelItem(stack)).toBe('preview')
    expect(showPanelItem(stack, 'preview')).toBe(stack)
  })

  it('brings the previous item back when the shown one closes', () => {
    const stack = closePanelItem(['ref:news', 'troubleshootgun', 'preview'], 'preview')
    expect(currentPanelItem(stack)).toBe('troubleshootgun')
    expect(currentPanelItem(closePanelItem(['call'], 'call'))).toBeNull()
  })

  it('closing an item that is not there changes nothing', () => {
    const stack: PanelItem[] = ['call']
    expect(closePanelItem(stack, 'preview')).toBe(stack)
  })

  it('a second click on the reference shown closes it, otherwise it comes to the front', () => {
    let stack: PanelItem[] = ['ref:news', 'call']
    stack = togglePanelReference(stack, 'news')
    expect(stack).toEqual(['call', 'ref:news'])
    stack = togglePanelReference(stack, 'news')
    expect(stack).toEqual(['call'])
  })

  it('names references by their window kind', () => {
    expect(referenceItem('calculator')).toBe('ref:calculator')
    expect(referenceKind('ref:portal')).toBe('portal')
    expect(referenceKind('preview')).toBeNull()
  })
})
