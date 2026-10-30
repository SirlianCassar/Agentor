import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { readJsonObject, retiredDataExport, writeFileAtomic, writeRetiredDataExport } from '../dataFile'

const dirs: string[] = []
const tempDir = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentor-data-'))
  dirs.push(dir)
  return dir
}
afterEach(() => dirs.splice(0).forEach((dir) => fs.rmSync(dir, { recursive: true, force: true })))

describe('writeFileAtomic', () => {
  it('replaces the file and leaves no temporary file', () => {
    const dir = tempDir()
    const file = path.join(dir, 'agentor-data.json')
    writeFileAtomic(file, '{"a":1}')
    writeFileAtomic(file, '{"a":2}')
    expect(fs.readFileSync(file, 'utf-8')).toBe('{"a":2}')
    expect(fs.readdirSync(dir)).toEqual(['agentor-data.json'])
  })

  it('keeps the previous file when the write fails', () => {
    const dir = tempDir()
    const file = path.join(dir, 'agentor-data.json')
    writeFileAtomic(file, '{"a":1}')
    fs.mkdirSync(path.join(dir, 'blocked'))
    expect(() => writeFileAtomic(path.join(dir, 'blocked'), 'x')).toThrow()
    expect(fs.readFileSync(file, 'utf-8')).toBe('{"a":1}')
    expect(fs.readdirSync(dir).sort()).toEqual(['agentor-data.json', 'blocked'])
  })
})

describe('readJsonObject', () => {
  it('returns null for missing, invalid or non-object content', () => {
    const dir = tempDir()
    expect(readJsonObject(path.join(dir, 'missing.json'))).toBeNull()
    fs.writeFileSync(path.join(dir, 'bad.json'), '{oops')
    expect(readJsonObject(path.join(dir, 'bad.json'))).toBeNull()
    fs.writeFileSync(path.join(dir, 'list.json'), '[1]')
    expect(readJsonObject(path.join(dir, 'list.json'))).toBeNull()
    fs.writeFileSync(path.join(dir, 'ok.json'), '{"version":30}')
    expect(readJsonObject(path.join(dir, 'ok.json'))).toEqual({ version: 30 })
  })
})

describe('retired data export', () => {
  const data = {
    procedures: [{ id: 'p1', name: 'Ancienne procédure' }],
    settings: {
      dashboardProducts: [{ id: 'fw1', name: 'Firmware fictif', category: 'firmware' }],
      products: [
        { id: 'a', name: 'Produit A', spareParts: [], note: 'Note', firmwareIds: ['fw1'], editions: [] },
        { id: 'b', name: 'Produit B', spareParts: [{ id: 's' }], note: '  ' },
      ],
    },
  }

  it('keeps the old procedures, the catalogs and the catalog fields of the products', () => {
    const result = retiredDataExport(data, '2026-10-30T00:00:00.000Z')
    expect(result?.procedures).toEqual(data.procedures)
    expect(result?.dashboardProducts).toEqual(data.settings.dashboardProducts)
    expect(result?.productCatalogFields).toEqual([{ id: 'a', name: 'Produit A', note: 'Note', firmwareIds: ['fw1'] }])
  })

  it('returns null when there is nothing to keep', () => {
    expect(retiredDataExport({ procedures: [], settings: { products: [{ id: 'b', name: 'B', spareParts: [] }] } })).toBeNull()
  })

  it('writes the copy once and never replaces it', () => {
    const dir = tempDir()
    const file = path.join(dir, 'agentor-donnees-retirees.json')
    expect(writeRetiredDataExport(file, { procedures: [] })).toBe('empty')
    expect(fs.existsSync(file)).toBe(false)
    expect(writeRetiredDataExport(file, data)).toBe('written')
    const first = fs.readFileSync(file, 'utf-8')
    expect(writeRetiredDataExport(file, { procedures: [{ id: 'other' }] })).toBe('exists')
    expect(fs.readFileSync(file, 'utf-8')).toBe(first)
  })
})
