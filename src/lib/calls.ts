/* Phone-call draft normalization helpers. */
import { stripLeadingBlankLines } from './taskDraft'
import { stripTokenSpacing } from './utils'

export function normalizeCallDraft(value: string) {
  return stripTokenSpacing(value).replace(/\r\n/g, '\n').trimEnd()
}

export function getMeaningfulCallDraft(value: string, template: string) {
  const normalized = normalizeCallDraft(value)
  if (!normalized.trim()) return null
  if (normalized.trim() === normalizeCallDraft(template).trim()) return null
  return normalized
}

export const normalizeCallDraftForCopy = (value: string) =>
  stripLeadingBlankLines(normalizeCallDraft(value))




