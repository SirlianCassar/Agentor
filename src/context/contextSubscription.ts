import type { CaseContext } from './caseContext'

export type ContextOrigin = 'stored' | 'live'

// Subscribe before reading the saved value. An IPC update can arrive while the
// initial read is pending; that older reply must never replace a live case.
export function subscribeCaseContext(
  api: {
    getCaseContext: () => Promise<unknown>
    onCaseContext?: (callback: (value: unknown) => void) => (() => void) | undefined
  },
  receive: (context: CaseContext | null, origin: ContextOrigin) => void,
) {
  let alive = true
  let receivedLive = false
  const unsubscribe = api.onCaseContext?.((value) => {
    if (!alive) return
    receivedLive = true
    receive(value as CaseContext | null, 'live')
  })
  void api.getCaseContext().then((value) => {
    if (alive && !receivedLive) receive(value as CaseContext | null, 'stored')
  }).catch((error) => {
    if (alive) console.warn('[case-context] initial read failed', error)
  })
  return () => {
    alive = false
    unsubscribe?.()
  }
}
