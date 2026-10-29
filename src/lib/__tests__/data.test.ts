import { describe, expect, it } from 'vitest'
import { defaultData } from '../defaults'
import { createExportData, normalizeData, parseTokens } from '../utils'

describe('normalizeData', () => {
  it('returns defaults for empty or invalid input', () => {
    expect(normalizeData(null, defaultData)).toBe(defaultData)
    const fromEmpty = normalizeData({}, defaultData)
    expect(fromEmpty.settings.taskSectionNames).toEqual(defaultData.settings.taskSectionNames)
    expect(fromEmpty.templates).toEqual([])
  })

  it('keeps user data and migrates legacy mailTemplates', () => {
    const raw = { mailTemplates: [{ id: 't1', name: 'A', content: 'x', language: 'fr' }] } as never
    expect(normalizeData(raw, defaultData).templates).toHaveLength(1)
  })

  it('replaces malformed lists by defaults instead of crashing', () => {
    const raw = { snippets: 'oops', settings: { rqtReminders: 3 } } as never
    const data = normalizeData(raw, defaultData)
    expect(data.snippets).toEqual([])
    expect(data.settings.rqtReminders).toEqual([])
  })

  it('drops copy history from exports', () => {
    const raw = { history: [{ id: 'h', content: 'x', createdAt: '' }] }
    expect(createExportData(raw, defaultData).history).toEqual([])
  })
})

describe('parseTokens', () => {
  it('finds selector and addition tokens', () => {
    const tokens = parseTokens('Bonjour [Madame/Monsieur], §texte§')
    const types = tokens.map((token) => token.type).sort()
    expect(types).toContain('selector')
    expect(types).toContain('addition')
  })
})
