import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { readJsonObject, writeFileAtomic } from '../dataFile'

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
