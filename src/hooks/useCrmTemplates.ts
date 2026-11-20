import { useCallback, useEffect, useMemo, useState } from 'react'
import { buildCrmTemplateIndex, type CrmTemplateIndexEntry } from '../lib/crmTemplates'

export interface CrmTemplateIndexState {
  org: string
  fetchedAt: string
  entries: CrmTemplateIndexEntry[]
}

const asState = (value: unknown): CrmTemplateIndexState | null => {
  const raw = value as Partial<CrmTemplateIndexState> | null
  if (!raw || !Array.isArray(raw.entries) || !raw.entries.length) return null
  return { org: String(raw.org ?? ''), fetchedAt: String(raw.fetchedAt ?? ''), entries: raw.entries }
}

// The harvested index of CRM templates, read from the main process. In the
// browser build there is no bridge, so it stays empty.
export function useCrmTemplates() {
  const api = typeof window !== 'undefined' ? window.agentor : undefined
  const [state, setState] = useState<CrmTemplateIndexState | null>(null)

  useEffect(() => {
    if (!api?.getCrmTemplates) return
    let alive = true
    void api.getCrmTemplates().then((value) => alive && setState(asState(value)))
    const off = api.onCrmTemplates?.((value) => setState(asState(value)))
    return () => {
      alive = false
      off?.()
    }
  }, [api])

  const clear = useCallback(async () => {
    await api?.clearCrmTemplates?.()
    setState(null)
  }, [api])

  const index = useMemo(() => buildCrmTemplateIndex(state?.entries ?? []), [state])

  return { available: Boolean(api?.getCrmTemplates), state, index, clear }
}
