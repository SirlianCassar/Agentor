import { describe, expect, it } from 'vitest'
import { defaultData } from '../defaults'
import {
  buildCompactTaskPreviewText,
  buildStructuredTaskDraftWithTitle,
  formatTaskCopyText,
  getTaskHeadingProtectedRanges,
  hasMeaningfulTaskContent,
  parseStructuredTaskDraftWithLeadingContent,
  stripLegacyTaskNumbering,
  stripLegacyTaskTitleNumber,
  taskSectionEndsWithFragment,
} from '../taskDraft'

const names = defaultData.settings.taskSectionNames

describe('S-Task without numbering', () => {
  it('copies the title and sections without any number', () => {
    const draft = buildStructuredTaskDraftWithTitle('Retour SAV', ['Contact', 'Data Gathering', '', ''], names)
    const copied = formatTaskCopyText(draft, names)
    expect(copied.startsWith('Retour SAV\n')).toBe(true)
    expect(copied).not.toMatch(/\(\d+\)/)
  })

  it('removes the legacy "(N) " title prefix from saved drafts', () => {
    const legacy = buildStructuredTaskDraftWithTitle('(3) Retour SAV', ['', 'Data Gathering (2)', '', ''], names)
    const cleaned = stripLegacyTaskNumbering(legacy, names)
    const { leadingContent, contents } = parseStructuredTaskDraftWithLeadingContent(cleaned, names)
    expect(leadingContent).toBe('Retour SAV')
    // Timeline text is user content and is never rewritten.
    expect(contents[1]).toBe('Data Gathering (2)')
    expect(formatTaskCopyText(legacy, names).startsWith('Retour SAV\n')).toBe(true)
  })

  it('leaves a draft without legacy number untouched', () => {
    const draft = buildStructuredTaskDraftWithTitle('2 manettes HS', ['', '', '', ''], names)
    expect(stripLegacyTaskNumbering(draft, names)).toBe(draft)
    expect(stripLegacyTaskTitleNumber('2 manettes HS')).toBe('2 manettes HS')
  })

  it('does not protect anything in the title any more', () => {
    const draft = buildStructuredTaskDraftWithTitle('(1) Titre', ['', '', '', ''], names)
    const ranges = getTaskHeadingProtectedRanges(draft, names)
    expect(ranges).toHaveLength(4)
    expect(ranges.every((range) => range.start > 0)).toBe(true)
  })

  it('does not count a legacy number alone as content', () => {
    const draft = buildStructuredTaskDraftWithTitle('(1)', ['', '', '', ''], names)
    expect(hasMeaningfulTaskContent(draft, names)).toBe(false)
  })

  it('hides the legacy number in previews', () => {
    const draft = buildStructuredTaskDraftWithTitle('(4) Retour', ['x', '', '', ''], names)
    expect(buildCompactTaskPreviewText(draft, 0, names).startsWith('Retour')).toBe(true)
  })

  it('skips only an immediate repeat in the timeline', () => {
    expect(taskSectionEndsWithFragment('Data Gathering\nRMA', 'RMA')).toBe(true)
    expect(taskSectionEndsWithFragment('RMA\nRelance', 'RMA')).toBe(false)
    expect(taskSectionEndsWithFragment('RMA (2)', 'RMA')).toBe(true)
  })
})
