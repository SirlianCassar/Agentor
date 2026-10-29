import { describe, expect, it } from 'vitest'
import { defaultData } from '../defaults'
import {
  buildStructuredTaskDraft,
  buildStructuredTaskDraftWithTitle,
  ensureStructuredTaskDraft,
  hasMeaningfulTaskContent,
  insertTaskTextInSection,
  normalizeTaskTemplateKind,
  parseStructuredTaskDraft,
  parseStructuredTaskDraftWithLeadingContent,
  taskSectionHasFragment,
} from '../taskDraft'

const names = defaultData.settings.taskSectionNames

describe('S-Task skeleton', () => {
  it('builds an empty skeleton with two blank lines above the first section', () => {
    const draft = buildStructuredTaskDraft(['', '', '', ''], names)
    expect(draft.startsWith('\n\n► ─ CASE OVERVIEW ─')).toBe(true)
    expect(draft.trimEnd().endsWith('► ─ NOTES ─')).toBe(true)
  })

  it('round-trips title and sections', () => {
    const draft = buildStructuredTaskDraftWithTitle('Retour SAV', ['a', 'b\nc', '', 'd'], names)
    const parsed = parseStructuredTaskDraftWithLeadingContent(draft, names)
    expect(parsed.leadingContent).toBe('Retour SAV')
    expect(parsed.contents).toEqual(['a', 'b\nc', '', 'd'])
  })

  it('rebuilds a partial structure without losing text', () => {
    const draft = ensureStructuredTaskDraft('texte libre', names)
    expect(parseStructuredTaskDraft(draft, names)[0]).toBe('texte libre')
  })

  it('inserts a fragment in the requested section', () => {
    const base = buildStructuredTaskDraft(['', 'Data Gathering', '', ''], names)
    const next = insertTaskTextInSection(base, 'RMA créée', 'section-2', names)
    expect(parseStructuredTaskDraft(next, names)[1]).toBe('Data Gathering\nRMA créée')
  })

  it('detects an existing fragment, ignoring a legacy trailing number', () => {
    expect(taskSectionHasFragment('Data Gathering (2)\nRMA', 'Data Gathering')).toBe(true)
    expect(taskSectionHasFragment('RMA', 'Data Gathering')).toBe(false)
  })

  it('treats an empty skeleton as having no content', () => {
    expect(hasMeaningfulTaskContent(buildStructuredTaskDraft(['', '', '', ''], names), names)).toBe(false)
    expect(hasMeaningfulTaskContent(buildStructuredTaskDraft(['x', '', '', ''], names), names)).toBe(true)
  })

  it('normalizes legacy templates without kind to F-Task', () => {
    expect(normalizeTaskTemplateKind({})).toBe('f-task')
    expect(normalizeTaskTemplateKind({ kind: 's-task' })).toBe('s-task')
  })
})
