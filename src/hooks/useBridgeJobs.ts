import { useCallback } from 'react'
import {
  bridgeJobReasonLabel,
  normalizeJobReason,
  type BridgeJobRequest,
  type BridgeJobResult,
} from '../context/bridgeJobs'

// Hands a job to Agentor Bridge through the main process and waits for what the
// browser actually did. In the browser build there is no bridge, so every job
// is refused at once rather than left hanging.
export function useBridgeJobs() {
  const api = typeof window !== 'undefined' ? window.agentor : undefined
  const available = Boolean(api?.submitBridgeJob)

  const submit = useCallback(
    async (request: BridgeJobRequest): Promise<BridgeJobResult> => {
      if (!api?.submitBridgeJob) return { ok: false, reason: 'bridge-off' }
      try {
        const raw = (await api.submitBridgeJob(request)) as BridgeJobResult | null
        if (!raw || typeof raw !== 'object') return { ok: false, reason: 'unknown' }
        if (raw.ok === true) return raw
        return { ok: false, reason: normalizeJobReason((raw as { reason?: unknown }).reason) }
      } catch (error) {
        return { ok: false, reason: normalizeJobReason(error instanceof Error ? error.message : error) }
      }
    },
    [api],
  )

  return { available, submit, reasonLabel: bridgeJobReasonLabel }
}
