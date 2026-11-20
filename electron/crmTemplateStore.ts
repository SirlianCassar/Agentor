import { buildCrmTemplateIndex, type CrmTemplateIndexEntry } from '../src/lib/crmTemplates'
import type { TemplateIndex } from '../src/context/bridgeMessages'
import { readJsonObject, writeFileAtomic } from './dataFile'

export const CRM_TEMPLATE_INDEX_SCHEMA = 'agentor.crm-template-index/1'
// Titles move rarely. Past this, the next case push asks the extension for a
// fresh harvest; nothing is ever fetched behind the agent's back more often.
export const CRM_TEMPLATE_INDEX_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000

export interface CrmTemplateIndexState {
  schema: typeof CRM_TEMPLATE_INDEX_SCHEMA
  org: string
  fetchedAt: string
  entries: CrmTemplateIndexEntry[]
}

/** Keeps the harvested index of CRM templates, in its own file. */
export class CrmTemplateStore {
  private state: CrmTemplateIndexState | null = null
  private readonly listeners = new Set<(state: CrmTemplateIndexState | null) => void>()

  constructor(
    private readonly filePath: string,
    private readonly now: () => number = () => Date.now(),
  ) {
    const saved = readJsonObject(filePath) as CrmTemplateIndexState | null
    if (saved?.schema === CRM_TEMPLATE_INDEX_SCHEMA && Array.isArray(saved.entries) && saved.entries.length) {
      this.state = saved
    }
  }

  get(): CrmTemplateIndexState | null {
    return this.state
  }

  /** Families and leftovers, recomputed from the stored titles. */
  index() {
    return buildCrmTemplateIndex(this.state?.entries ?? [])
  }

  /** True while Agentor has no index, or one older than the maximum age. */
  wanted(): boolean {
    if (!this.state) return true
    const fetchedAt = Date.parse(this.state.fetchedAt)
    return !Number.isFinite(fetchedAt) || this.now() - fetchedAt > CRM_TEMPLATE_INDEX_MAX_AGE_MS
  }

  subscribe(listener: (state: CrmTemplateIndexState | null) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Takes a harvest: the result of a `template.harvest` job. */
  handleIndex(index: TemplateIndex) {
    this.set({
      schema: CRM_TEMPLATE_INDEX_SCHEMA,
      org: index.org,
      fetchedAt: index.fetchedAt,
      entries: index.entries,
    })
  }

  clear() {
    this.set(null)
  }

  private set(state: CrmTemplateIndexState | null) {
    this.state = state
    writeFileAtomic(this.filePath, JSON.stringify(state ?? {}, null, 2))
    for (const listener of this.listeners) listener(state)
  }
}
