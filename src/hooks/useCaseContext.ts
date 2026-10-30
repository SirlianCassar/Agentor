import { useCallback, useEffect, useState } from 'react'
import type { CaseContext, ContextFieldKey } from '../context/caseContext'

export type BridgeStatus = {
  enabled: boolean
  port: number
  state: 'off' | 'listening' | 'error'
  error?: string
  tokenPersisted: boolean
}

// Active case context and bridge state, read from the main process. In the
// browser build (no Electron bridge) everything stays empty.
export function useCaseContext() {
  const api = typeof window !== 'undefined' ? window.agentor : undefined
  const [context, setContext] = useState<CaseContext | null>(null)
  const [bridge, setBridge] = useState<BridgeStatus | null>(null)
  // 'stored': the case kept from the last session; 'live': sent by Cairm+ since launch.
  const [origin, setOrigin] = useState<'stored' | 'live'>('stored')

  useEffect(() => {
    if (!api?.getCaseContext) return
    let alive = true
    void api.getCaseContext().then((value) => alive && setContext(value as CaseContext | null))
    void api.getBridgeStatus?.().then((value) => alive && setBridge(value as BridgeStatus | null))
    const offContext = api.onCaseContext?.((value) => {
      setOrigin('live')
      setContext(value as CaseContext | null)
    })
    const offBridge = api.onBridgeStatus?.((value) => setBridge(value as BridgeStatus | null))
    return () => {
      alive = false
      offContext?.()
      offBridge?.()
    }
  }, [api])

  const setManual = useCallback(
    (key: ContextFieldKey, value: string) =>
      context && api?.setCaseFieldManual ? api.setCaseFieldManual(context.caseKey.id, key, value) : Promise.resolve(false),
    [api, context],
  )
  const confirm = useCallback(
    (key: ContextFieldKey) =>
      context && api?.confirmCaseField ? api.confirmCaseField(context.caseKey.id, key) : Promise.resolve(false),
    [api, context],
  )
  const clear = useCallback(() => api?.clearCaseContext?.() ?? Promise.resolve(false), [api])
  const setBridgeEnabled = useCallback(
    async (enabled: boolean) => {
      const next = (await api?.setBridgeEnabled?.(enabled)) as BridgeStatus | undefined
      if (next) setBridge(next)
    },
    [api],
  )
  const getToken = useCallback(() => api?.getBridgeToken?.() ?? Promise.resolve(''), [api])
  const regenerateToken = useCallback(
    () => api?.regenerateBridgeToken?.() ?? Promise.resolve(''),
    [api],
  )

  return {
    available: Boolean(api?.getCaseContext),
    context,
    origin,
    bridge,
    setManual,
    confirm,
    clear,
    setBridgeEnabled,
    getToken,
    regenerateToken,
  }
}

export type CaseContextState = ReturnType<typeof useCaseContext>
