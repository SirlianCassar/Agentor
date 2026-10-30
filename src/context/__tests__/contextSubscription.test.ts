import { describe, expect, it, vi } from 'vitest'
import { subscribeCaseContext } from '../contextSubscription'

function setup() {
  let resolve!: (value: unknown) => void
  let push!: (value: unknown) => void
  const unsubscribe = vi.fn()
  const api = {
    getCaseContext: () => new Promise<unknown>((done) => { resolve = done }),
    onCaseContext: (callback: (value: unknown) => void) => { push = callback; return unsubscribe },
  }
  const receive = vi.fn()
  const stop = subscribeCaseContext(api, receive)
  return { resolve, push, receive, stop, unsubscribe }
}

describe('case context subscription', () => {
  it('does not overwrite a live case with a delayed saved value', async () => {
    const test = setup()
    const live = { caseKey: { id: 'new-case' }, fields: { productName: { value: 'T598' } } }
    test.push(live)
    test.resolve(null)
    await Promise.resolve()
    expect(test.receive.mock.calls).toEqual([[live, 'live']])
  })

  it('loads saved context before accepting live changes', async () => {
    const test = setup()
    const saved = { caseKey: { id: 'saved-case' } }
    test.resolve(saved)
    await Promise.resolve()
    test.push(null)
    expect(test.receive.mock.calls).toEqual([[saved, 'stored'], [null, 'live']])
  })

  it('ignores a pending read and events after cleanup', async () => {
    const test = setup()
    test.stop()
    test.resolve({ caseKey: { id: 'saved-case' } })
    test.push(null)
    await Promise.resolve()
    expect(test.receive).not.toHaveBeenCalled()
    expect(test.unsubscribe).toHaveBeenCalledOnce()
  })
})
