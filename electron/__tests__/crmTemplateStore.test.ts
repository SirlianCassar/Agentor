import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { CrmTemplateStore, CRM_TEMPLATE_INDEX_MAX_AGE_MS } from '../crmTemplateStore'
import type { TemplateIndex } from '../../src/context/bridgeMessages'

let directory: string | null = null
const file = () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'agentor-crm-templates-'))
  return path.join(directory, 'crm-templates.json')
}

afterEach(() => {
  if (directory) fs.rmSync(directory, { recursive: true, force: true })
  directory = null
})

const index = (fetchedAt: string): TemplateIndex => ({
  org: 'https://guillemot.crm4.dynamics.com',
  fetchedAt,
  entries: [
    { id: 'a', title: 'TM EN - Paid Spare Part proposal - WW', languageCode: 1033 },
    { id: 'b', title: 'TM FR - Paid Spare Part proposal - WW', languageCode: 1036 },
    { id: 'c', title: 'Test WilCarlos', languageCode: 1033 },
  ],
})

describe('CrmTemplateStore', () => {
  it('wants an index while it has none', () => {
    expect(new CrmTemplateStore(file()).wanted()).toBe(true)
  })

  it('keeps the harvest, folds it into families and stops asking', () => {
    const now = Date.parse('2026-11-19T22:00:00.000Z')
    const store = new CrmTemplateStore(file(), () => now)
    store.handleIndex(index('2026-11-19T21:00:00.000Z'))

    expect(store.wanted()).toBe(false)
    const folded = store.index()
    expect(folded.families).toHaveLength(1)
    expect(folded.families[0].variants).toHaveLength(2)
    expect(folded.unclassified.map((entry) => entry.title)).toEqual(['Test WilCarlos'])
  })

  it('asks again once the harvest has aged', () => {
    const fetchedAt = Date.parse('2026-11-01T00:00:00.000Z')
    const store = new CrmTemplateStore(file(), () => fetchedAt + CRM_TEMPLATE_INDEX_MAX_AGE_MS + 1)
    store.handleIndex(index(new Date(fetchedAt).toISOString()))
    expect(store.wanted()).toBe(true)
  })

  it('reloads what it wrote and forgets on demand', () => {
    const filePath = file()
    const first = new CrmTemplateStore(filePath)
    first.handleIndex(index(new Date().toISOString()))

    expect(new CrmTemplateStore(filePath).get()?.entries).toHaveLength(3)

    first.clear()
    const cleared = new CrmTemplateStore(filePath)
    expect(cleared.get()).toBeNull()
    expect(cleared.wanted()).toBe(true)
  })
})
