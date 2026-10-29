import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { BridgeMessage } from '../../src/context/bridgeMessages'
import { CaseContextStore } from '../caseContextStore'

const dirs: string[] = []
const tempFile = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentor-ctx-'))
  dirs.push(dir)
  return path.join(dir, 'case-context.json')
}
afterEach(() => dirs.splice(0).forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })))

const idA = '11111111-2222-4333-8444-555555555555'
const idB = '99999999-2222-4333-8444-555555555555'
const observed = (id: string, serial: string): BridgeMessage => ({
  type: 'case.observed',
  caseKey: { system: 'dynamics', entity: 'incident', id },
  observations: [{ key: 'serialNumber', value: serial, source: 'crm', fetchedAt: '2026-10-29T08:00:00.000Z' }],
})

describe('CaseContextStore', () => {
  it('persists the active case and restores it', () => {
    const file = tempFile()
    const clock = () => '2026-10-29T08:00:01.000Z'
    const store = new CaseContextStore(file, clock)
    store.handleBridgeMessage(observed(idA, '3030303030'))
    const restored = new CaseContextStore(file, clock)
    expect(restored.get()?.fields.serialNumber?.value).toBe('3030303030')
  })

  it('drops an expired context on start', () => {
    const file = tempFile()
    new CaseContextStore(file, () => '2026-10-29T08:00:01.000Z').handleBridgeMessage(observed(idA, '1'))
    const later = new CaseContextStore(file, () => '2026-10-30T09:00:00.000Z')
    expect(later.get()).toBeNull()
    expect(fs.existsSync(file)).toBe(false)
  })

  it('replaces the context when another case arrives and notifies windows', () => {
    const store = new CaseContextStore(tempFile(), () => '2026-10-29T08:00:01.000Z')
    const seen: Array<string | undefined> = []
    store.subscribe((context) => seen.push(context?.caseKey.id))
    store.handleBridgeMessage(observed(idA, '1'))
    store.handleBridgeMessage(observed(idB, '2'))
    expect(store.get()?.caseKey.id).toBe(idB)
    expect(store.get()?.fields.serialNumber?.value).toBe('2')
    expect(seen).toEqual([idA, idB])
  })

  it('refuses an edit made for a case that is no longer active', () => {
    const store = new CaseContextStore(tempFile(), () => '2026-10-29T08:00:01.000Z')
    store.handleBridgeMessage(observed(idA, '1'))
    store.handleBridgeMessage(observed(idB, '2'))
    expect(store.setManual(idA, 'serialNumber', 'X')).toBe(false)
    expect(store.setManual(idB, 'serialNumber', 'Y')).toBe(true)
    expect(store.get()?.fields.serialNumber).toMatchObject({ value: 'Y', status: 'manual' })
  })
})
