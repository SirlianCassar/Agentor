/* Task-draft model: section parsing, structured-draft building, mail
   numbering, and template-section helpers. Pure string logic. */
import type { ProtectedTextRange } from '../components/TextEditor'
import { defaultData } from './defaults'
import type { MailTemplate, TaskSectionId, TaskTemplate } from './types'
import { padEmptySelectors, stripTokenSpacing } from './utils'

export const TASK_SECTION_IDS: TaskSectionId[] = ['section-1', 'section-2', 'section-3', 'section-4']
export const LEGACY_TASK_SECTION_NAMES = ['Diagnostic', 'SAV', 'Infos client', 'Suivi']
export type TaskBoxSlot = {
  task: string
  savedAt: string
}

export type DraftBoxSlot = {
  email: string
  task: string
  taskSkeletonEnabled: boolean
  taskBoxes: TaskBoxSlot[]
  activeTaskBoxIndex: number
  savedAt: string
}
export const createEmptyTaskBoxSlot = (): TaskBoxSlot => ({
  task: '',
  savedAt: '',
})

export const createEmptyDraftBoxSlot = (): DraftBoxSlot => ({
  email: '',
  task: '',
  taskSkeletonEnabled: true,
  taskBoxes: Array.from({ length: 2 }, createEmptyTaskBoxSlot),
  activeTaskBoxIndex: 0,
  savedAt: '',
})

export const TASK_SKELETON_BOX_INDEX = 0
export const TASK_FREE_BOX_INDEX = 1
export const taskBoxUsesSkeleton = (index: number) => index === TASK_SKELETON_BOX_INDEX
export const normalizeTaskSectionNames = (names: string[] | undefined) =>
  TASK_SECTION_IDS.map((_, index) => {
    const fallback = defaultData.settings.taskSectionNames[index] ?? `Section ${index + 1}`
    const value = names?.[index]
    return typeof value === 'string' && value.trim() ? value.trim() : fallback
  })

export const normalizeStoredTaskSectionNames = (names: string[] | undefined) => {
  const normalized = normalizeTaskSectionNames(names)
  const isLegacyDefault = LEGACY_TASK_SECTION_NAMES.every((name, index) => normalized[index] === name)
  return isLegacyDefault ? normalizeTaskSectionNames(defaultData.settings.taskSectionNames) : normalized
}

export const getTaskSectionIndex = (sectionId: TaskSectionId | undefined) => {
  const index = sectionId ? TASK_SECTION_IDS.indexOf(sectionId) : -1
  return index === -1 ? 0 : index
}

export const normalizeTaskSectionId = (sectionId: unknown): TaskSectionId =>
  TASK_SECTION_IDS.includes(sectionId as TaskSectionId) ? (sectionId as TaskSectionId) : 'section-3'

export const getTaskSectionLabel = (sectionId: TaskSectionId | undefined, sectionNames: string[]) =>
  sectionNames[getTaskSectionIndex(sectionId)] ?? sectionNames[0] ?? 'Section 1'

export const trimBlankLines = (lines: string[]) => {
  const next = [...lines]
  while (next.length && !next[0].trim()) next.shift()
  while (next.length && !next[next.length - 1].trim()) next.pop()
  return next.join('\n')
}

export const getTaskSectionHeading = (index: number, sectionNames: string[]) =>
  `► ${sectionNames[index]}`

export const simplifyTaskHeading = (value: string) =>
  value
    .replace(/^#+\s*/, '')
    .replace(/^\d+[).:-]?\s*/, '')
    .replace(/[:-]\s*$/, '')
    .trim()
    .toLowerCase()

export const hasMeaningfulTaskContent = (taskContent: string, sectionNames: string[]) => {
  const { contents, leadingContent } = parseStructuredTaskDraftWithLeadingContent(
    stripTokenSpacing(taskContent),
    sectionNames,
  )
  // A lone title number (e.g. just "(1)") does not count as real content.
  if (stripTaskTitleNumber(leadingContent).trim()) return true
  return contents.some((section) => stripTokenSpacing(section).trim())
}

export const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export const findTaskSectionHeadingIndex = (line: string, sectionNames: string[]) => {
  const trimmed = line.trim()
  const arrowMatch = trimmed.match(/^►\s*(.*)$/)
  if (arrowMatch) {
    const text = arrowMatch[1]
    const index = sectionNames.findIndex((name) => simplifyTaskHeading(name) === simplifyTaskHeading(text))
    if (index !== -1) return index
  }
  const numberedMatch = trimmed.match(/^#+\s*(\d+)[).:-]?\s*(.*)$/)
  if (numberedMatch) {
    const index = Number(numberedMatch[1]) - 1
    if (index >= 0 && index < TASK_SECTION_IDS.length) return index
  }

  const simplified = simplifyTaskHeading(trimmed)
  if (!simplified) return -1
  const candidates = [sectionNames, defaultData.settings.taskSectionNames, LEGACY_TASK_SECTION_NAMES]
  for (const names of candidates) {
    const index = names.findIndex((name) => simplifyTaskHeading(name) === simplified)
    if (index !== -1) return index
  }
  return -1
}

export const findInlineTaskSectionHeading = (line: string, sectionNames: string[]) => {
  const trimmed = line.trim()
  const candidates = [sectionNames, defaultData.settings.taskSectionNames, LEGACY_TASK_SECTION_NAMES]
  for (const names of candidates) {
    for (const [index, name] of names.entries()) {
      const arrowPattern = new RegExp(`^►\\s*${escapeRegExp(name)}\\s*[:\\-]\\s*(.*)$`, 'i')
      const arrowMatch = trimmed.match(arrowPattern)
      if (arrowMatch) return { index, content: arrowMatch[1] ?? '' }
      const pattern = new RegExp(`^#{0,6}\\s*(?:${index + 1}[\\).:\\-]?\\s*)?${escapeRegExp(name)}\\s*[:\\-]\\s*(.*)$`, 'i')
      const match = trimmed.match(pattern)
      if (match) return { index, content: match[1] ?? '' }
    }
  }
  return null
}

export const buildStructuredTaskDraftWithTitle = (
  title: string,
  contents: string[],
  sectionNames: string[],
) => {
  const body = TASK_SECTION_IDS.map((_, index) => {
    const content = (contents[index] ?? '').trimEnd()
    const heading = getTaskSectionHeading(index, sectionNames)
    return content ? `${heading}\n${content}` : heading
  }).join('\n\n')
  // Title written -> "(N) Titre" on the first line, one blank line, then the
  // first section. Title empty -> two blank lines above the first section.
  const lead = title ? `${title}\n\n` : '\n\n'
  return `${lead}${body}\n`
}

export const buildStructuredTaskDraft = (contents: string[], sectionNames: string[]) =>
  buildStructuredTaskDraftWithTitle('', contents, sectionNames)

export const stripLeadingBlankLines = (value: string) => value.replace(/^(?:[ \t]*\r?\n)+/, '')

export const parseStructuredTaskDraftWithLeadingContent = (value: string, sectionNames: string[]) => {
  const contents = TASK_SECTION_IDS.map(() => '')
  const contentLines = TASK_SECTION_IDS.map(() => [] as string[])
  const leadingLines: string[] = []
  let currentIndex = -1

  value.replace(/\r\n/g, '\n').split('\n').forEach((line) => {
    const inlineHeading = findInlineTaskSectionHeading(line, sectionNames)
    if (inlineHeading) {
      currentIndex = inlineHeading.index
      if (inlineHeading.content.trim()) {
        contentLines[currentIndex].push(inlineHeading.content)
      }
      return
    }

    const headingIndex = findTaskSectionHeadingIndex(line, sectionNames)
    if (headingIndex !== -1) {
      currentIndex = headingIndex
      return
    }
    if (currentIndex === -1) {
      leadingLines.push(line)
      return
    }
    contentLines[currentIndex].push(line)
  })

  contentLines.forEach((lines, index) => {
    contents[index] = trimBlankLines(lines)
  })

  const leadingContent = trimBlankLines(leadingLines)
  return { contents, leadingContent }
}

export const parseStructuredTaskDraft = (value: string, sectionNames: string[]) => {
  const { contents, leadingContent } = parseStructuredTaskDraftWithLeadingContent(value, sectionNames)
  if (leadingContent) {
    contents[0] = [leadingContent, contents[0]].filter(Boolean).join('\n')
  }

  return contents
}

export const hasCompleteTaskStructure = (value: string, sectionNames: string[]) =>
  sectionNames.every((_, index) =>
    value.replace(/\r\n/g, '\n').split('\n').some(
      (line) => line.trim() === getTaskSectionHeading(index, sectionNames),
    ),
  )

export const hasRecognizedTaskHeadings = (value: string, sectionNames: string[]) =>
  value
    .replace(/\r\n/g, '\n')
    .split('\n')
    .some(
      (line) =>
        findTaskSectionHeadingIndex(line, sectionNames) !== -1 ||
        Boolean(findInlineTaskSectionHeading(line, sectionNames)),
    )

export const ensureTaskTitleSpace = (value: string, sectionNames: string[]) => {
  const normalized = value.replace(/\r\n/g, '\n')
  const firstTextIndex = normalized.search(/\S/)
  if (firstTextIndex === -1) return value
  const firstLine = normalized.slice(firstTextIndex).split('\n')[0]
  if (findTaskSectionHeadingIndex(firstLine, sectionNames) === -1) return value
  const leadingBreaks = (normalized.slice(0, firstTextIndex).match(/\n/g) ?? []).length
  return `${'\n'.repeat(Math.max(0, 2 - leadingBreaks))}${value}`
}

export const ensureTaskTrailingEditableLine = (value: string, sectionNames: string[]) => {
  if (value.endsWith('\n')) return value
  const lines = value.replace(/\r\n/g, '\n').split('\n')
  const lastLine = lines[lines.length - 1] ?? ''
  return findTaskSectionHeadingIndex(lastLine, sectionNames) !== -1 ? `${value}\n` : value
}

export const ensureStructuredTaskDraft = (value: string, sectionNames: string[]) => {
  if (hasCompleteTaskStructure(value, sectionNames)) {
    return ensureTaskTrailingEditableLine(ensureTaskTitleSpace(value, sectionNames), sectionNames)
  }
  return buildStructuredTaskDraft(parseStructuredTaskDraft(value, sectionNames), sectionNames)
}

export const getTaskHeadingProtectedRanges = (
  value: string,
  sectionNames: string[],
): ProtectedTextRange[] => {
  const ranges: ProtectedTextRange[] = []
  let offset = 0
  let seenHeading = false
  let titleResolved = false

  value.replace(/\r\n/g, '\n').split('\n').forEach((line) => {
    if (findTaskSectionHeadingIndex(line, sectionNames) !== -1) {
      ranges.push({ start: offset, end: offset + line.length })
      seenHeading = true
    } else if (!seenHeading && !titleResolved) {
      // The auto-managed task number lives at the very start of the title and
      // is protected so it always stays first and can't be corrupted by typing.
      const match = line.match(/^(\s*)(\(\d+\)|\d{1,3}(?=\s|$))/)
      if (match) {
        const start = offset + match[1].length
        ranges.push({ start, end: start + match[2].length })
        titleResolved = true
      } else if (line.trim()) {
        titleResolved = true
      }
    }
    offset += line.length + 1
  })

  return ranges
}

export const insertTaskTextInSection = (
  value: string,
  text: string,
  sectionId: TaskSectionId | undefined,
  sectionNames: string[],
) => {
  const { contents, leadingContent } = parseStructuredTaskDraftWithLeadingContent(value, sectionNames)
  const index = getTaskSectionIndex(sectionId)
  const insert = padEmptySelectors(text.trimEnd())
  contents[index] = [contents[index].trimEnd(), insert].filter(Boolean).join('\n')
  return buildStructuredTaskDraftWithTitle(leadingContent, contents, sectionNames)
}

export const normalizeTaskTemplateSections = (task: Partial<TaskTemplate>) => {
  const sections = TASK_SECTION_IDS.map((_, index) =>
    typeof task.taskSections?.[index] === 'string' ? task.taskSections[index] : '',
  )
  const hasSections = sections.some((section) => section.trim())
  if (hasSections) return sections

  const legacyContent = typeof task.content === 'string' ? task.content : ''
  if (!legacyContent.trim()) return sections
  const index = getTaskSectionIndex(normalizeTaskSectionId(task.taskSectionId))
  return sections.map((section, sectionIndex) => (sectionIndex === index ? legacyContent : section))
}

export const getTaskTemplatePreviewText = (task: Partial<TaskTemplate>) => {
  const sections = normalizeTaskTemplateSections(task)
  const preview = sections
    .map((section) => stripTokenSpacing(section).trim())
    .find((section) => section.length > 0)
  return preview ?? 'Aucun contenu.'
}

export const buildTaskTemplateContent = (task: Partial<TaskTemplate>) =>
  normalizeTaskTemplateSections(task).filter((section) => section.trim()).join('\n\n')

export const buildTaskDraftFromTemplate = (task: TaskTemplate, sectionNames: string[]) =>
  buildStructuredTaskDraft(normalizeTaskTemplateSections(task), sectionNames)

export const TASK_MAIL_NUMBER_PATTERN = /\((\d+)\)/g

export const getHighestTaskMailNumber = (value: string) => {
  let max = 0
  // The title number is bare (no parentheses) — count it too.
  const titleMatch = value.match(/^\s*(\d{1,3})(?=\s|$)/)
  if (titleMatch) max = Number(titleMatch[1])
  TASK_MAIL_NUMBER_PATTERN.lastIndex = 0
  for (const match of value.matchAll(TASK_MAIL_NUMBER_PATTERN)) {
    const next = Number(match[1])
    if (Number.isFinite(next)) {
      max = Math.max(max, next)
    }
  }
  return max
}

export const getNextTaskMailNumber = (value: string) => Math.max(1, getHighestTaskMailNumber(value) + 1)

// Strips a leading mail number — "(3) " or a bare "3 " left by transitional
// drafts — from a task title so it can be re-applied.
export const stripTaskTitleNumber = (title: string) =>
  title.replace(/^\s*(?:\(\d+\)|\d{1,3}(?=\s|$))\s*/, '')

// Ensures the task number is always present and first in the title, as "(N)".
// Only the +/- counter chip shows it bare.
export const applyTaskTitleNumber = (title: string, taskNumber: number) => {
  const rest = stripTaskTitleNumber(title).trimStart()
  return rest ? `(${taskNumber}) ${rest}` : `(${taskNumber}) `
}

// Compact preview for a stored task: skeleton tasks keep only their title and
// the sections that actually hold text; free tasks are shown as-is.
export const buildCompactTaskPreviewText = (
  task: string,
  boxIndex: number,
  sectionNames: string[],
) => {
  const normalized = stripTokenSpacing(task)
  if (!taskBoxUsesSkeleton(boxIndex)) return normalized.trim()
  const { contents, leadingContent } = parseStructuredTaskDraftWithLeadingContent(
    normalized,
    sectionNames,
  )
  const parts: string[] = []
  const title = leadingContent.trim()
  if (stripTaskTitleNumber(title).trim()) parts.push(title)
  contents.forEach((section, index) => {
    const text = section.trim()
    if (text) parts.push(`${getTaskSectionHeading(index, sectionNames)}\n${text}`)
  })
  return parts.join('\n\n')
}

export const formatPortalTimelineTitle = (value: string) => {
  const trimmed = stripTokenSpacing(value).trim()
  return trimmed
}

export const formatTaskCopyText = (value: string, sectionNames: string[], taskNumber: number) => {
  const normalized = stripTokenSpacing(value).replace(/\r\n/g, '\n')
  const { contents, leadingContent } = parseStructuredTaskDraftWithLeadingContent(
    normalized,
    sectionNames,
  )
  const titleText = stripTaskTitleNumber(stripTokenSpacing(leadingContent).trim()).trim() || 'Task'
  const titleLine = `${taskNumber ? `(${taskNumber}) ` : ''}${titleText}`.trim()
  const body = TASK_SECTION_IDS.map((_, index) => {
    const sectionLabel = stripTokenSpacing(sectionNames[index] ?? '').trim() || `Section ${index + 1}`
    const sectionText = stripTokenSpacing(contents[index] ?? '').trimEnd()
    return sectionText ? `${sectionLabel}\n${sectionText}` : sectionLabel
  }).join('\n\n')
  return `${titleLine}\n\n${body}\n`
}

// Appends the current mail number to a manually-typed timeline line once the
// caret leaves it: the line holding the \uE000 cursor marker is left untouched
// so Enter and further typing behave normally. Existing numbers are kept.
export const numberTimelineLine = (line: string, taskNumber: number) => {
  if (line.includes('\uE000')) return line
  const trimmed = stripTokenSpacing(line).trimEnd()
  if (!trimmed.trim()) return line
  if (/\(\d+\)\s*$/.test(trimmed)) return line
  return `${line.trimEnd()} (${taskNumber})`
}

export const normalizeTaskDraftNumbering = (
  value: string,
  taskNumber: number,
  sectionNames: string[],
) => {
  const { contents, leadingContent } = parseStructuredTaskDraftWithLeadingContent(
    value,
    sectionNames,
  )
  // The mail number is always first in the title (even when the title is empty
  // or the task was cleared) and appended to every timeline line.
  const title = applyTaskTitleNumber(leadingContent, taskNumber)
  const numbered = contents.map((section, index) =>
    index === 1
      ? section
          .replace(/\r\n/g, '\n')
          .split('\n')
          .map((sectionLine) => numberTimelineLine(sectionLine, taskNumber))
          .join('\n')
      : section,
  )
  return buildStructuredTaskDraftWithTitle(title, numbered, sectionNames)
}

// Appends the current mail number to a timeline fragment, e.g.
// "Data Gathering" -> "Data Gathering (3)". Keeps an already-numbered fragment.
export const annotateTaskFragment = (text: string, mailNumber: number) => {
  const trimmed = text.trimEnd()
  if (!trimmed.trim()) return text
  if (/\(\d+\)\s*$/.test(trimmed)) return trimmed
  return `${trimmed} (${mailNumber})`
}

// True when the section already holds this fragment (any trailing number is
// ignored, so it also matches fragments saved by older numbered versions).
export const taskSectionHasFragment = (section: string, text: string) => {
  const target = stripTokenSpacing(text).replace(/\s*\(\d+\)\s*$/, '').trim()
  if (!target) return false
  return section
    .replace(/\r\n/g, '\n')
    .split('\n')
    .some((line) => stripTokenSpacing(line).replace(/\s*\(\d+\)\s*$/, '').trim() === target)
}

// True when the timeline already holds this exact fragment for this mail number,
// so "Data Gathering (3)" is a duplicate but "Data Gathering (2)" is not.
export const taskSectionHasNumberedFragment = (
  section: string,
  text: string,
  mailNumber: number,
) => {
  const target = stripTokenSpacing(annotateTaskFragment(text, mailNumber)).trim()
  if (!target) return false
  return section
    .replace(/\r\n/g, '\n')
    .split('\n')
    .some((line) => stripTokenSpacing(line).trim() === target)
}

export const getTemplateTaskSections = (
  template: MailTemplate,
  taskTemplates: TaskTemplate[],
): string[] => {
  const usesCustom = template.taskCustom ?? (!!template.taskText && !template.taskTemplateId)
  if (usesCustom) {
    const sections = TASK_SECTION_IDS.map(() => '')
    sections[getTaskSectionIndex(normalizeTaskSectionId(template.taskSectionId))] =
      template.taskText ?? ''
    return sections
  }
  const linkedTask = template.taskTemplateId
    ? taskTemplates.find((task) => task.id === template.taskTemplateId)
    : null
  return linkedTask ? normalizeTaskTemplateSections(linkedTask) : TASK_SECTION_IDS.map(() => '')
}

export const getTemplateEmailLines = (template: MailTemplate) => template.content.split(/\r?\n/)
