import type { AppData } from './types'

export const categoryColors = [
  { id: 'rouge', label: 'Rouge', hex: '#ff6b6b' },
  { id: 'orange', label: 'Orange', hex: '#ff922b' },
  { id: 'jaune', label: 'Jaune', hex: '#ffd43b' },
  { id: 'jaune-vert', label: 'Jaune-vert', hex: '#a9e34b' },
  { id: 'vert', label: 'Vert', hex: '#37b24d' },
  { id: 'vert-clair', label: 'Vert clair', hex: '#51cf66' },
  { id: 'turquoise', label: 'Turquoise', hex: '#12b886' },
  { id: 'cyan', label: 'Cyan', hex: '#22b8cf' },
  { id: 'bleu-clair', label: 'Bleu clair', hex: '#4dabf7' },
  { id: 'bleu', label: 'Bleu', hex: '#339af0' },
  { id: 'bleu-nuit', label: 'Bleu nuit', hex: '#3b5bdb' },
  { id: 'indigo', label: 'Indigo', hex: '#748ffc' },
  { id: 'violet', label: 'Violet', hex: '#8b6fc9' },
  { id: 'magenta', label: 'Magenta', hex: '#d6336c' },
  { id: 'rose', label: 'Rose', hex: '#f06595' },
  { id: 'fuchsia', label: 'Fuchsia', hex: '#e64980' },
] as const

export type TokenType = 'tag' | 'selector' | 'addition'

export interface Token {
  type: TokenType
  start: number
  end: number
  raw: string
  inner: string
  options?: string[]
  separator?: string | null
}

const tagRegexes = [/<[^<>\r\n]+>/g]
const additionBlockRegex = /(^|\n)§\n([\s\S]*?)\n§(?=\n|$)/g
const additionInlineRegex = /§([^\n§]+)§/g
const selectorRegexes = [/\[[^[\]\r\n]*[/:][^[\]\r\n]*\]/g]

const getSelectorSeparator = (value: string) => {
  if (value.includes('/')) return '/'
  if (value.includes(':')) return ':'
  return null
}

export function createId(prefix: string) {
  if ('randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }
  return `${prefix}-${Math.random().toString(16).slice(2)}`
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function parseTokens(value: string) {
  const tokens: Token[] = []

  const additionTokens: Token[] = []

  additionBlockRegex.lastIndex = 0
  for (const match of value.matchAll(additionBlockRegex)) {
    if (match.index === undefined) continue
    let raw = match[0]
    let start = match.index
    if (raw.startsWith('\n')) {
      raw = raw.slice(1)
      start += 1
    }
    const inner = match[2] ?? ''
    additionTokens.push({
      type: 'addition',
      start,
      end: start + raw.length,
      raw,
      inner,
      options: [inner],
      separator: null,
    })
  }

  const isInsideBlockAddition = (index: number) =>
    additionTokens.some((token) => index >= token.start && index < token.end)

  additionInlineRegex.lastIndex = 0
  for (const match of value.matchAll(additionInlineRegex)) {
    if (match.index === undefined) continue
    if (isInsideBlockAddition(match.index)) continue
    const raw = match[0]
    const inner = match[1] ?? ''
    additionTokens.push({
      type: 'addition',
      start: match.index,
      end: match.index + raw.length,
      raw,
      inner,
      options: [inner],
      separator: null,
    })
  }

  tokens.push(...additionTokens)

  const isInsideAddition = (index: number) =>
    additionTokens.some((token) => index >= token.start && index < token.end)

  for (const regex of tagRegexes) {
    regex.lastIndex = 0
    for (const match of value.matchAll(regex)) {
      if (match.index === undefined) continue
      if (isInsideAddition(match.index)) continue
      const raw = match[0]
      tokens.push({
        type: 'tag',
        start: match.index,
        end: match.index + raw.length,
        raw,
        inner: raw.slice(1, -1),
      })
    }
  }

  for (const regex of selectorRegexes) {
    regex.lastIndex = 0
    for (const match of value.matchAll(regex)) {
      if (match.index === undefined) continue
      if (isInsideAddition(match.index)) continue
      const raw = match[0]
      const inner = raw.slice(1, -1)
      const separator = getSelectorSeparator(inner)
      if (!separator) continue
      const parts = inner.split(separator)
      const left = parts.shift() ?? ''
      const right = parts.join(separator)
      const options = left === right ? [left] : [left, right]
      tokens.push({
        type: 'selector',
        start: match.index,
        end: match.index + raw.length,
        raw,
        inner,
        options,
        separator,
      })
    }
  }

  return tokens.sort((a, b) => a.start - b.start)
}

export function findTokenAt(value: string, position: number) {
  return parseTokens(value).find((token) => position >= token.start && position < token.end)
}

export function countTags(value: string) {
  return parseTokens(value).filter((token) => token.type === 'tag').length
}

export function countTokens(value: string) {
  return parseTokens(value).length
}

const TOKEN_NBSP = '\u00A0'
const TOKEN_BREAK = '\u200B'
const EMPTY_SELECTOR_SPACE_COUNT = 6
const EMPTY_SELECTOR_SPACES = ' '.repeat(EMPTY_SELECTOR_SPACE_COUNT)
const EMPTY_SELECTOR_PLACEHOLDER_TEXT = TOKEN_NBSP.repeat(EMPTY_SELECTOR_SPACE_COUNT)

function padEmptySelectorToken(rawToken: string) {
  if (!rawToken.startsWith('[') || !rawToken.endsWith(']')) return rawToken
  const inner = rawToken.slice(1, -1)
  const separator = getSelectorSeparator(inner)
  if (!separator) return rawToken
  const parts = inner.split(separator)
  const left = parts.shift() ?? ''
  const right = parts.join(separator)
  const leftHasValue = stripTokenSpacing(left).trim().length > 0
  const rightHasValue = stripTokenSpacing(right).trim().length > 0
  if (leftHasValue && rightHasValue) return rawToken
  const nextLeft = leftHasValue ? left : EMPTY_SELECTOR_SPACES
  const nextRight = rightHasValue ? right : EMPTY_SELECTOR_SPACES
  return `[${nextLeft}${separator}${nextRight}]`
}

export function normalizeTokenSpacing(value: string) {
  const cleaned = value.replace(/\u200B/g, '')
  const tokens = parseTokens(cleaned)
  if (!tokens.length) return cleaned.replace(/\u00A0/g, ' ')

  let result = ''
  let lastIndex = 0
  for (const token of tokens) {
    result += cleaned.slice(lastIndex, token.start).replace(/\u00A0/g, ' ')
    let rawToken = cleaned.slice(token.start, token.end)
    if (token.type === 'selector') {
      rawToken = padEmptySelectorToken(rawToken)
    }
    const before = token.start > 0 ? cleaned[token.start - 1] : ''
    const after = token.end < cleaned.length ? cleaned[token.end] : ''
    const needsBefore = before && !/[\s\u00A0\u200B]/.test(before)
    const needsAfter = after && !/[\s\u00A0\u200B]/.test(after)
    if (needsBefore) result += TOKEN_BREAK
    result += rawToken.replace(/ /g, TOKEN_NBSP)
    if (needsAfter) result += TOKEN_BREAK
    lastIndex = token.end
  }
  result += cleaned.slice(lastIndex).replace(/\u00A0/g, ' ')
  return result
}

export function stripTokenSpacing(value: string) {
  return value.replace(/\u200B/g, '').replace(/\u00A0/g, ' ')
}

export function padEmptySelectors(value: string) {
  const tokens = parseTokens(value)
  if (!tokens.length) return value
  let result = ''
  let lastIndex = 0
  for (const token of tokens) {
    result += value.slice(lastIndex, token.start)
    if (token.type === 'selector') {
      result += padEmptySelectorToken(value.slice(token.start, token.end))
    } else {
      result += value.slice(token.start, token.end)
    }
    lastIndex = token.end
  }
  result += value.slice(lastIndex)
  return result
}

const EMPTY_SELECTOR_PLACEHOLDER = `<span class="selector-empty-block" aria-hidden="true">${EMPTY_SELECTOR_PLACEHOLDER_TEXT}</span>`
const ADDITION_MARKER = '§'

const formatSelectorDisplay = (inner: string) => {
  const separator = getSelectorSeparator(inner) ?? '/'
  const parts = inner.split(separator).map((part) => {
    const cleaned = stripTokenSpacing(part)
    return cleaned.trim().length ? escapeHtml(cleaned) : EMPTY_SELECTOR_PLACEHOLDER
  })
  return parts.join(`<span class="selector-separator">${separator}</span>`)
}

const formatAdditionToken = (token: Token) => {
  const marker = escapeHtml(ADDITION_MARKER)
  const inner = escapeHtml(token.inner)
  const isBlock = token.raw.includes('\n')
  if (!isBlock) {
    return `<span class="token-wrap token-wrap--addition-inline"><span class="token-marker">${marker}</span><span class="token token--addition token--addition-inline">${inner}</span><span class="token-marker">${marker}</span></span>`
  }
  return `<span class="token-wrap token-wrap--addition"><span class="token-marker token-marker--addition">${marker}</span>\n<span class="token token--addition token--addition-block">${inner}</span>\n<span class="token-marker token-marker--addition">${marker}</span></span>`
}

const formatAdditionTokenPreview = (token: Token) => {
  const inner = escapeHtml(token.inner)
  const isBlock = token.raw.includes('\n')
  if (!isBlock) {
    return `<span class="token-wrap token-wrap--addition-inline"><span class="token token--addition token--addition-inline">${inner}</span></span>`
  }
  return `<span class="token token--addition token--addition-block">${inner}</span>`
}

export function highlightText(value: string) {
  const tokens = parseTokens(value)
  if (!tokens.length) return escapeHtml(value)

  let result = ''
  let lastIndex = 0
  for (const token of tokens) {
    result += escapeHtml(value.slice(lastIndex, token.start))
    if (token.type === 'tag') {
      const openMarker = escapeHtml(token.raw.charAt(0))
      const closeMarker = escapeHtml(token.raw.charAt(token.raw.length - 1))
      result += `<span class="token-wrap token-wrap--tag"><span class="token-marker">${openMarker}</span><span class="token token--tag">${escapeHtml(
        token.inner,
      )}</span><span class="token-marker">${closeMarker}</span></span>`
    } else if (token.type === 'selector') {
      const displayInner = formatSelectorDisplay(token.inner)
      const openMarker = escapeHtml(token.raw.charAt(0))
      const closeMarker = escapeHtml(token.raw.charAt(token.raw.length - 1))
      result += `<span class="token-wrap token-wrap--selector"><span class="token-marker">${openMarker}</span><span class="token token--selector">${displayInner}</span><span class="token-marker">${closeMarker}</span></span>`
    } else {
      result += formatAdditionToken(token)
    }
    lastIndex = token.end
  }
  result += escapeHtml(value.slice(lastIndex))
  return result
}

export function highlightTextPreview(value: string) {
  const tokens = parseTokens(value)
  if (!tokens.length) return escapeHtml(value)

  let result = ''
  let lastIndex = 0
  for (const token of tokens) {
    result += escapeHtml(value.slice(lastIndex, token.start))
    if (token.type === 'tag') {
      result += `<span class="token token--tag">${escapeHtml(token.inner)}</span>`
    } else if (token.type === 'selector') {
      const displayInner = formatSelectorDisplay(token.inner)
      result += `<span class="token token--selector">${displayInner}</span>`
    } else {
      result += formatAdditionTokenPreview(token)
    }
    lastIndex = token.end
  }
  result += escapeHtml(value.slice(lastIndex))
  return result
}

export function formatProcedureText(value: string) {
  const tokens = parseTokens(value)
  const placeholders: Array<{ key: string; html: string }> = []
  let result = ''
  let lastIndex = 0

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    result += value.slice(lastIndex, token.start)
    const key = `__TOKEN_${index}__`
    const html =
      token.type === 'tag'
        ? `<span class="token token--tag">${escapeHtml(token.inner)}</span>`
        : token.type === 'selector'
        ? `<span class="token token--selector">${formatSelectorDisplay(token.inner)}</span>`
        : formatAdditionToken(token)
    placeholders.push({ key, html })
    result += key
    lastIndex = token.end
  }
  result += value.slice(lastIndex)

  let escaped = escapeHtml(result)
  escaped = escaped.replace(/\[color=([^\]]+)\]([\s\S]*?)\[\/color\]/g, (_match, color, inner) => {
    const safeColor = String(color).trim()
    if (!safeColor || /[^a-zA-Z0-9#(),.%\s-]/.test(safeColor)) return inner
    return `<span class="procedure-color" style="color:${safeColor}">${inner}</span>`
  })
  escaped = escaped.replace(/\[size=([^\]]+)\]([\s\S]*?)\[\/size\]/g, (_match, size, inner) => {
    const safeSize = String(size).trim()
    const match = safeSize.match(/^(\d+(?:\.\d+)?)(px|em|rem|%)?$/)
    if (!match) return inner
    const unit = match[2] ?? 'em'
    return `<span class="procedure-size" style="font-size:${match[1]}${unit}">${inner}</span>`
  })
  escaped = escaped.replace(/\[b\]([\s\S]*?)\[\/b\]/g, '<strong>$1</strong>')
  escaped = escaped.replace(/\[i\]([\s\S]*?)\[\/i\]/g, '<em>$1</em>')
  escaped = escaped.replace(/==([^=]+)==/g, '<span class="procedure-highlight">$1</span>')
  escaped = escaped.replace(/<1>([\s\S]*?)<\/1>/g, '<span class="procedure-highlight-1">$1</span>')
  escaped = escaped.replace(/<2>([\s\S]*?)<\/2>/g, '<span class="procedure-highlight-2">$1</span>')
  escaped = escaped.replace(/<3>([\s\S]*?)<\/3>/g, '<span class="procedure-highlight-3">$1</span>')
  escaped = escaped.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a class="procedure-link" href="$2" target="_blank" rel="noreferrer">$1</a>',
  )

  for (const placeholder of placeholders) {
    escaped = escaped.split(placeholder.key).join(placeholder.html)
  }

  return escaped
}

const dashboardNewsLegacyColorMap: Record<string, '1' | '2' | '3'> = {
  '#ff6b6b': '1',
  '#69db7c': '2',
  '#74c0fc': '3',
}

export function normalizeDashboardNewsColorTags(value: string) {
  return value.replace(/\[color=([^\]]+)\]([\s\S]*?)\[\/color\]/g, (_match, color, inner) => {
    const colorId = dashboardNewsLegacyColorMap[String(color).trim().toLowerCase()]
    return colorId ? `(${colorId}*${inner}*${colorId})` : String(inner)
  })
}

export function formatDashboardNewsText(value: string) {
  const normalized = normalizeDashboardNewsColorTags(value)
  const colorTokenRegex = /\(([123])\*([\s\S]*?)\*\1\)/g
  let result = ''
  let lastIndex = 0

  for (const match of normalized.matchAll(colorTokenRegex)) {
    if (match.index === undefined) continue
    const colorId = match[1]
    const inner = match[2] ?? ''
    result += escapeHtml(normalized.slice(lastIndex, match.index))
    result += `<span class="dashboard-news-color dashboard-news-color--${colorId}">${escapeHtml(
      inner,
    )}</span>`
    lastIndex = match.index + match[0].length
  }

  result += escapeHtml(normalized.slice(lastIndex))
  return result
}

function normalizeStringRecord(value: unknown, fallback: Record<string, string>) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback

  const normalized = { ...fallback }
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') {
      normalized[key] = entry
    }
  }
  return normalized
}

export function normalizeData(raw: Partial<AppData> | null | undefined, fallback: AppData) {
  if (!raw || typeof raw !== 'object') return fallback
  const legacyTemplates = (raw as Partial<AppData> & { mailTemplates?: unknown }).mailTemplates
  return {
    ...fallback,
    ...raw,
    categories: Array.isArray(raw.categories) ? raw.categories : fallback.categories,
    snippets: Array.isArray(raw.snippets) ? raw.snippets : fallback.snippets,
    templates: Array.isArray(raw.templates)
      ? raw.templates
      : Array.isArray(legacyTemplates)
      ? legacyTemplates
      : fallback.templates,
    taskTemplates: Array.isArray(raw.taskTemplates) ? raw.taskTemplates : fallback.taskTemplates,
    procedures: Array.isArray(raw.procedures) ? raw.procedures : fallback.procedures,
    history: Array.isArray(raw.history) ? raw.history : fallback.history,
    callHistory: Array.isArray(raw.callHistory) ? raw.callHistory : fallback.callHistory,
    settings: {
      ...fallback.settings,
      ...(raw.settings ?? {}),
      predefinedTags: Array.isArray(raw.settings?.predefinedTags)
        ? raw.settings.predefinedTags
        : fallback.settings.predefinedTags,
      customerPortalCodes: Array.isArray(raw.settings?.customerPortalCodes)
        ? raw.settings.customerPortalCodes
        : fallback.settings.customerPortalCodes,
      quickLinkUrls: normalizeStringRecord(
        raw.settings?.quickLinkUrls,
        fallback.settings.quickLinkUrls,
      ),
      dashboardProducts: Array.isArray(raw.settings?.dashboardProducts)
        ? raw.settings.dashboardProducts
        : fallback.settings.dashboardProducts,
      products: Array.isArray(raw.settings?.products)
        ? raw.settings.products
        : fallback.settings.products,
      dashboardNews: Array.isArray(raw.settings?.dashboardNews)
        ? raw.settings.dashboardNews
        : fallback.settings.dashboardNews,
      dashboardReminders:
        typeof raw.settings?.dashboardReminders === 'string'
          ? raw.settings.dashboardReminders
          : fallback.settings.dashboardReminders,
    },
  }
}

export function createExportData(raw: Partial<AppData> | null | undefined, fallback: AppData) {
  const normalized = normalizeData(raw, fallback)
  return {
    ...normalized,
    history: [],
    settings: {
      ...normalized.settings,
      predefinedTags: Array.isArray(normalized.settings.predefinedTags)
        ? normalized.settings.predefinedTags
        : fallback.settings.predefinedTags,
      customerPortalCodes: Array.isArray(normalized.settings.customerPortalCodes)
        ? normalized.settings.customerPortalCodes
        : fallback.settings.customerPortalCodes,
      quickLinkUrls: normalizeStringRecord(
        normalized.settings.quickLinkUrls,
        fallback.settings.quickLinkUrls,
      ),
      dashboardProducts: Array.isArray(normalized.settings.dashboardProducts)
        ? normalized.settings.dashboardProducts
        : fallback.settings.dashboardProducts,
      products: Array.isArray(normalized.settings.products)
        ? normalized.settings.products
        : fallback.settings.products,
      dashboardNews: Array.isArray(normalized.settings.dashboardNews)
        ? normalized.settings.dashboardNews
        : fallback.settings.dashboardNews,
      dashboardReminders:
        typeof normalized.settings.dashboardReminders === 'string'
          ? normalized.settings.dashboardReminders
          : fallback.settings.dashboardReminders,
    },
  }
}
