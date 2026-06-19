/* Procedure "mailto:" link normalization and href building. */
import { defaultData } from './defaults'
import type { ProcedureMailtoLink } from './types'

export const defaultProcedureMailtos = defaultData.settings.procedureMailtoLinks ?? []

export const normalizeMailRecipients = (value: string) =>
  value
    .trim()
    .replace(/^mailto:/i, '')
    .split(/[;,]/)
    .map((recipient) => recipient.trim())
    .filter(Boolean)
    .join(',')

export const encodeMailtoValue = (value: string) => encodeURIComponent(value)

export function normalizeProcedureMailtoLink(link: ProcedureMailtoLink, fallbackId: string) {
  const to = normalizeMailRecipients(link.to)
  const cc = normalizeMailRecipients(link.cc ?? '')
  const subject = link.subject?.trim() ?? ''
  const body = link.body?.trim() ?? ''
  return {
    id: link.id.trim() || fallbackId,
    label: link.label.trim() || 'Mailto',
    to,
    cc,
    subject,
    body,
  }
}

export function buildProcedureMailtoHref(link: ProcedureMailtoLink) {
  const to = normalizeMailRecipients(link.to)
  if (!to) return ''
  const params: string[] = []
  const cc = normalizeMailRecipients(link.cc ?? '')
  if (cc) params.push(`cc=${encodeMailtoValue(cc)}`)
  if (link.subject?.trim()) params.push(`subject=${encodeMailtoValue(link.subject.trim())}`)
  if (link.body?.trim()) params.push(`body=${encodeMailtoValue(link.body.trim())}`)
  const query = params.join('&')
  return `mailto:${to}${query ? `?${query}` : ''}`
}
