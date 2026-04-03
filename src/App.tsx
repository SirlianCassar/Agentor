import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type RefObject,
  type TransitionEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { TextEditor, type TextEditorHandle } from './components/TextEditor'
import { SortableList } from './components/SortableList'
import { defaultData } from './lib/defaults'
import herculesLogo from './assets/hercules.svg'
import thrustmasterLogo from './assets/thrustmaster.svg'
import {
  checkForUpdatesNow,
  installDownloadedUpdate,
  exportJson,
  exportHistory,
  getUpdateStatus,
  importJson,
  loadData,
  onUpdateStatus,
  openExternal,
  openProcedure,
  saveData,
  copyText,
  type UpdateStatus,
} from './lib/storage'
import type {
  AppData,
  AppSettings,
  Category,
  CustomerPortalCode,
  CustomerPortalCodeLine,
  DashboardNewsItem,
  DashboardProduct,
  DashboardProductCategory,
  InsertMode,
  Language,
  MailTemplate,
  ProductCatalogItem,
  Procedure,
  ProcedureBrand,
  ProcedureCoverage,
  SparePart,
  Snippet,
  TaskTemplate,
} from './lib/types'
import {
  categoryColors,
  countTokens,
  createId,
  escapeHtml,
  highlightText,
  highlightTextPreview,
  formatProcedureText,
  normalizeTokenSpacing,
  padEmptySelectors,
  stripTokenSpacing,
  normalizeData,
} from './lib/utils'
import './App.css'

const assetBase = import.meta.env.BASE_URL
const assetUrl = (path: string) => `${assetBase}${path.replace(/^\//, '')}`
const TAG_TOKEN = '<TAG>'
const SELECTOR_TOKEN = '[Option1/Option2]'
const ADDITION_TOKEN = '§texte§'
const PROCEDURE_CHECK_MARKER = '[ ]'
const showLegacyProcedureUI = false
const APP_VERSION = (import.meta.env.VITE_APP_VERSION || '2.0.0').trim()
const APP_VERSION_LABEL = APP_VERSION.replace(/\.0$/, '')
const VAT_DIVISOR = 1.2
const DEFAULT_SUPPORT_SITE_URL = 'https://support.guillemot.com/'
const DATA_HISTORY_LIMIT = 160
const dashboardProductCategoryOrder: DashboardProductCategory[] = [
  'software',
  'driver',
  'firmware',
  'product',
]
const dashboardProductCategoryLabels: Record<DashboardProductCategory, string> = {
  software: 'Logiciel',
  driver: 'Driver',
  firmware: 'Firmware',
  product: 'Legacy',
}
const dashboardProductCategoryGroupLabels: Record<DashboardProductCategory, string> = {
  software: 'Logiciels',
  driver: 'Drivers',
  firmware: 'Firmwares',
  product: 'Legacy',
}
type DashboardCalculatorItem = {
  id: string
  productPrice: string
  shippingPrice: string
}
type DashboardCalculatorCopyKey =
  | 'productsTtc'
  | 'productsHt'
  | 'shippingTtc'
  | 'shippingHt'
  | 'totalTtc'
  | 'totalHt'

const createDashboardCalculatorItem = (): DashboardCalculatorItem => ({
  id: createId('dashboard-calculator'),
  productPrice: '',
  shippingPrice: '',
})

const CloseIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M18 6L6 18" />
    <path d="M6 6l12 12" />
  </svg>
)

const PHONE_CALL_TEMPLATE = defaultData.settings.callTemplate
const CALL_HISTORY_LIMIT = 5
type WorkspaceDashboardPage =
  | 'tools'
  | 'portal'
  | 'versions'
  | 'parts'
  | 'troubleshooting'
  | 'news'

const workspaceDashboardPageOptions: Array<{
  id: WorkspaceDashboardPage
  label: string
  title: string
}> = [
  { id: 'tools', label: '1', title: 'Name format + price calculator' },
  { id: 'portal', label: '2', title: 'Portal procédures' },
  { id: 'versions', label: '3', title: 'Versions (soft / firm / driver)' },
  { id: 'parts', label: '4', title: 'Spare parts' },
  { id: 'troubleshooting', label: '5', title: 'Troubleshotgun (WIP)' },
  { id: 'news', label: '6', title: 'News' },
]

type SettingsTab =
  | 'categories'
  | 'snippets'
  | 'templates'
  | 'tasks'
  | 'tags'
  | 'products'
  | 'calls'
  | 'callHistory'
  | 'callTemplate'
  | 'procedure'
  | 'dashboard'
  | 'dashboardPortal'
  | 'dashboardVersions'
  | 'dashboardSpareParts'
  | 'dashboardNews'
  | 'updates'
  | 'display'
  | 'export'
  | 'general'
  | 'snippetSettings'
  | 'history'
  | 'preferences'

type SettingsNavSection = {
  id: 'emails' | 'calls' | 'dashboard' | 'general'
  label: string
  items: Array<{
    id: SettingsTab
    label: string
    description: string
  }>
}

const settingsNavigation: SettingsNavSection[] = [
  {
    id: 'emails',
    label: 'Emails',
    items: [
      {
        id: 'categories',
        label: 'Catégories',
        description: 'Organisation des familles utilisées pour les snippets email.',
      },
      {
        id: 'snippets',
        label: 'Snippets',
        description: 'Bibliothèque de snippets et comportements d’insertion.',
      },
      {
        id: 'templates',
        label: 'Templates de mails',
        description: 'Gestion des modèles email et de leurs tâches associées.',
      },
      {
        id: 'tasks',
        label: 'Templates de task',
        description: 'Modèles de tâches réutilisés dans l’application.',
      },
      {
        id: 'tags',
        label: 'Tags',
        description: 'Rappel des syntaxes de tags et variables supportées.',
      },
    ],
  },
  {
    id: 'calls',
    label: 'Appels',
    items: [
      {
        id: 'callHistory',
        label: 'Historique des 5 derniers appels',
        description: 'Consultation et copie rapide des derniers appels sauvegardés.',
      },
      {
        id: 'callTemplate',
        label: 'Template d’appel',
        description: 'Template injecté automatiquement à l’ouverture d’un nouvel appel.',
      },
    ],
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    items: [
      {
        id: 'products',
        label: 'Produits',
        description: 'Catalogue des produits utilisés dans les compatibilités et spare parts.',
      },
      {
        id: 'dashboardPortal',
        label: 'Procédure Portal',
        description: 'Configuration des codes Portal et de leurs variantes.',
      },
      {
        id: 'dashboardVersions',
        label: 'Catalogue de versions',
        description: 'Catalogue logiciels, drivers et firmwares avec produits compatibles.',
      },
      {
        id: 'dashboardSpareParts',
        label: 'Catalogue des Spare Parts',
        description: 'Liste des spare parts organisées par produit.',
      },
      {
        id: 'dashboardNews',
        label: 'News',
        description: 'Liste des news affichées dans la page 6 du dashboard.',
      },
      {
        id: 'procedure',
        label: 'Troubleshotgun',
        description: 'Section temporairement vide pendant le rework.',
      },
    ],
  },
  {
    id: 'general',
    label: 'Générale',
    items: [
      {
        id: 'updates',
        label: 'Mise à jour',
        description: 'Statut de l’application et recherche de nouvelles versions.',
      },
      {
        id: 'display',
        label: 'Affichage',
        description: 'Zoom global, densité et confort de lecture.',
      },
      {
        id: 'history',
        label: 'Paramètres d’historique',
        description: 'Comportement de sauvegarde des emails copiés.',
      },
      {
        id: 'preferences',
        label: 'Préférences',
        description: 'Préférences globales, snippets et format d’export.',
      },
    ],
  },
]

const settingsTabIndex = settingsNavigation.flatMap((section) =>
  section.items.map((item) => ({
    ...item,
    sectionId: section.id,
    sectionLabel: section.label,
  })),
)

const tokenReferenceItems = [
  {
    title: 'Tag dynamique',
    token: '<CLIENT>',
    description: 'Place un tag remplaçable dans un email, une task ou une procédure.',
  },
  {
    title: 'Sélecteur rapide',
    token: '[OK/KO]',
    description: 'Propose plusieurs variantes directement dans le texte.',
  },
  {
    title: 'Ajout optionnel',
    token: '§texte§',
    description: 'Signale un bloc optionnel ou contextuel à personnaliser.',
  },
]

const quickLinks = [
  {
    id: 'crm',
    label: 'CRM',
    icon: assetUrl('/speedmail/crm.ico'),
    url: 'https://guillemot.crm4.dynamics.com/main.aspx?appid=2f4bd5ed-80df-ed11-a7c6-0022489fd23c&pagetype=dashboard&id=f320ce73-dad8-ef11-8eea-0022489b522b&type=system&_canOverride=true',
  },
  {
    id: 'share',
    label: 'ShareConseiller',
    icon: assetUrl('/speedmail/share.ico'),
    url: 'https://guillemot.sharepoint.com/sites/ShareConseiller/SitePages/ShareConseiller.aspx',
  },
  {
    id: 'global',
    label: 'Global Action',
    icon: assetUrl('/speedmail/global.ico'),
    url: 'https://guillemot.sharepoint.com/:x:/r/sites/ShareConseiller/_layouts/15/Doc.aspx?sourcedoc=%7BB5FC152C-34B0-4CEB-A69E-561C60DF9272%7D&file=TS%20-%20Global%20actions%20for%20products.xlsx&action=default&mobileredirect=true',
  },
  {
    id: 'portal',
    label: 'Portal',
    icon: assetUrl('/speedmail/portal.png'),
    url: 'https://portal.guillemot.fr/portal3/',
  },
  {
    id: 'assist',
    label: 'AssistBot',
    icon: assetUrl('/speedmail/Bot.png'),
    url: 'https://m365.cloud.microsoft/chat/?fromcode=cmmiadtp424&origindomain=Office&auth=2&client-request-id=f9582af1-e339-437f-9315-9e004f3716f4',
  },
]

const categoryColorMap = new Map(categoryColors.map((color) => [color.id, color.hex]))
const exportFontOptions = [
  { label: 'Calibri', value: 'Calibri, "Segoe UI", Arial, sans-serif' },
  { label: 'Segoe UI', value: '"Segoe UI", Arial, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
]
const EXPORT_FONT_SIZE_MIN = 10
const EXPORT_FONT_SIZE_MAX = 22
const historyTimestampFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})
const dashboardNewsDateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'long',
})
const euroFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
type TagSuggestionFieldId =
  | 'snippet-title'
  | 'snippet-content'
  | 'snippet-task'
  | 'template-name'
  | 'template-content'
  | 'template-task'
  | 'task-name'
  | 'task-content'
  | 'call-template'
  | 'procedure-name'
  | 'procedure-product'
  | 'procedure-info'
  | 'procedure-notes'
  | 'procedure-steps'
  | 'procedure-task'

type TagSuggestionState = {
  fieldId: TagSuggestionFieldId
  start: number
  end: number
  query: string
}

function getUpdateSettingsLabel(status: UpdateStatus | null) {
  if (!status) return 'Statut inconnu.'
  if (status.phase === 'disabled') return 'Mises à jour auto disponibles sur l’application installée.'
  return status.message
}

function formatVersionLabel(value?: string | null) {
  const normalized = value?.trim()
  if (!normalized) return null
  return normalized.replace(/\.0$/, '')
}

function getUpdateAvailableVersionLabel(status: UpdateStatus | null, currentVersion: string) {
  const remoteVersion = formatVersionLabel(status?.version)
  if (remoteVersion) return remoteVersion
  switch (status?.phase) {
    case 'not-available':
      return currentVersion
    case 'checking':
      return 'Recherche...'
    case 'error':
      return 'Indisponible'
    default:
      return 'En attente'
  }
}

function getUpdateAvailableVersionMeta(status: UpdateStatus | null) {
  switch (status?.phase) {
    case 'available':
      return 'Nouvelle version détectée, téléchargement prêt à démarrer.'
    case 'downloading':
      return 'La nouvelle version est en cours de téléchargement.'
    case 'downloaded':
      return 'Le package est téléchargé et prêt à être installé.'
    case 'not-available':
      return 'Aucune nouvelle version détectée pour le moment.'
    case 'checking':
      return 'Recherche de la dernière version en cours.'
    case 'error':
      return 'Impossible de récupérer la version distante.'
    case 'disabled':
      return 'Les mises à jour sont gérées sur l’application installée.'
    default:
      return 'La prochaine vérification affichera ici la version distante.'
  }
}

function formatHistoryTimestamp(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return historyTimestampFormatter.format(date)
}

function getTodayIsoDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatDashboardNewsDate(value: string) {
  if (!value.trim()) return 'Date non renseignée'
  const [year, month, day] = value.split('-').map((item) => Number(item))
  if (!year || !month || !day) return value
  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return value
  return dashboardNewsDateFormatter.format(date)
}

function parseDashboardAmount(value: string) {
  const normalized = value.replace(/\s+/g, '').replace(',', '.').trim()
  if (!normalized) return null
  const parsed = Number.parseFloat(normalized)
  if (!Number.isFinite(parsed)) return null
  return Math.max(0, parsed)
}

function formatEuroAmount(value: number) {
  return euroFormatter.format(value)
}

function formatAmountForCopy(value: number) {
  return value.toFixed(2).replace('.', ',')
}

function getSliderProgress(value: number, min: number, max: number) {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max) || max <= min) {
    return '0%'
  }
  const clamped = Math.min(max, Math.max(min, value))
  return `${((clamped - min) / (max - min)) * 100}%`
}

function formatUpdateCheckedAt(value?: string) {
  if (!value) return 'Aucune vérification récente.'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return historyTimestampFormatter.format(date)
}

function getUpdatePhaseTitle(status: UpdateStatus | null) {
  switch (status?.phase) {
    case 'checking':
      return 'Recherche en cours'
    case 'available':
      return 'Mise à jour trouvée'
    case 'downloading':
      return 'Téléchargement en cours'
    case 'downloaded':
      return 'Prête à installer'
    case 'not-available':
      return 'Application à jour'
    case 'error':
      return 'Vérification impossible'
    case 'disabled':
      return 'Mises à jour désactivées'
    default:
      return 'Statut inconnu'
  }
}

function getUpdatePhaseTone(status: UpdateStatus | null) {
  switch (status?.phase) {
    case 'checking':
    case 'available':
    case 'downloading':
      return 'active'
    case 'downloaded':
      return 'ready'
    case 'not-available':
      return 'success'
    case 'error':
      return 'error'
    default:
      return 'idle'
  }
}

function normalizeCallDraft(value: string) {
  return stripTokenSpacing(value).replace(/\r\n/g, '\n').trimEnd()
}

function getMeaningfulCallDraft(value: string, template: string) {
  const normalized = normalizeCallDraft(value)
  if (!normalized.trim()) return null
  if (normalized.trim() === normalizeCallDraft(template).trim()) return null
  return normalized
}

function cloneAppData(payload: AppData): AppData {
  return JSON.parse(JSON.stringify(payload)) as AppData
}

function normalizePredefinedTag(value: string) {
  const inner = value.trim().replace(/^<+|>+$/g, '').replace(/\s+/g, ' ').trim()
  if (!inner) return null
  return `<${inner.toUpperCase()}>`
}

function normalizePredefinedTags(values: string[]) {
  const seen = new Set<string>()
  const normalized: string[] = []
  values.forEach((value) => {
    const tag = normalizePredefinedTag(value)
    if (!tag || seen.has(tag)) return
    seen.add(tag)
    normalized.push(tag)
  })
  return normalized
}

function getTagAutocompleteContext(value: string, cursor: number | null | undefined) {
  if (cursor === null || cursor === undefined) return null

  const beforeCursor = value.slice(0, cursor)
  const start = beforeCursor.lastIndexOf('<')
  if (start === -1) return null

  const rawPrefix = beforeCursor.slice(start)
  if (rawPrefix.includes('>') || /[\r\n]/.test(rawPrefix)) return null

  const afterCursor = value.slice(cursor)
  const closingOffset = afterCursor.indexOf('>')
  const lineBreakOffset = afterCursor.search(/[\r\n]/)
  const hasClosingTag = closingOffset !== -1 && (lineBreakOffset === -1 || closingOffset < lineBreakOffset)
  const end = hasClosingTag ? cursor + closingOffset + 1 : cursor
  const query = stripTokenSpacing(value.slice(start + 1, cursor)).trim().toUpperCase()

  return { start, end, query }
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]) {
  const map = new Map(current.map((item) => [item.id, item]))
  for (const item of incoming) map.set(item.id, item)
  return Array.from(map.values())
}

const sanitizeProcedureDraft = (procedure: Procedure & { categoryId?: string }) => {
  const { categoryId, ...rest } = procedure
  void categoryId
  return {
    ...rest,
    productName: rest.productName ?? '',
    optionalNotes: rest.optionalNotes ?? '',
  }
}

const convertLegacyTokens = (value: string) =>
  value.replace(/\*([^*\r\n]+)\*/g, '<$1>').replace(/#([^#\r\n]+)#/g, '§$1§')

const convertLegacyTokensMaybe = (value?: string) =>
  typeof value === 'string' ? convertLegacyTokens(value) : value

type LegacyCustomerPortalCode = Partial<
  Omit<CustomerPortalCode, 'codes'> &
    CustomerPortalCodeLine & {
      codes: unknown
    }
>
type LegacyDashboardProduct = Partial<
  DashboardProduct & {
    category: unknown
    latestVersion: unknown
    compatibleProductIds: unknown
    softwareIds: unknown
    driverIds: unknown
  } & {
    supportUrl: unknown
    sheet: unknown
  }
>
type LegacySparePart = Partial<
  SparePart & {
    guideAvailable: unknown
  }
>
type LegacyProductCatalogItem = Partial<
  ProductCatalogItem & {
    spareParts: unknown
  }
>
type LegacyDashboardNewsItem = Partial<
  DashboardNewsItem & {
    date: unknown
    title: unknown
    content: unknown
  }
>

const createEmptyPortalCodeLine = (id = createId('portal-code')): CustomerPortalCodeLine => ({
  id,
  title: '',
  code: '',
  showDraft: false,
  showForward: false,
  forwardTarget: '',
  infoNote: '',
})

const normalizePortalCodeLine = (raw: unknown, fallbackId: string): CustomerPortalCodeLine => {
  const item =
    raw && typeof raw === 'object'
      ? (raw as Partial<CustomerPortalCodeLine>)
      : createEmptyPortalCodeLine(fallbackId)
  const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : fallbackId
  const showForward = Boolean(item.showForward)
  return {
    id,
    title: typeof item.title === 'string' ? item.title : '',
    code: typeof item.code === 'string' ? item.code : '',
    showDraft: Boolean(item.showDraft),
    showForward,
    forwardTarget: showForward && typeof item.forwardTarget === 'string' ? item.forwardTarget : '',
    infoNote: typeof item.infoNote === 'string' ? item.infoNote : '',
  }
}

const normalizePortalProcedure = (raw: unknown, index: number): CustomerPortalCode => {
  const item =
    raw && typeof raw === 'object'
      ? (raw as LegacyCustomerPortalCode)
      : ({}) as LegacyCustomerPortalCode
  const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `portal-${index + 1}`
  const rawCodes = Array.isArray(item.codes) ? item.codes : []
  const codes = rawCodes.length
    ? rawCodes.map((entry, codeIndex) =>
        normalizePortalCodeLine(entry, `${id}-code-${codeIndex + 1}`),
      )
    : [normalizePortalCodeLine(item, `${id}-code-1`)]

  return {
    id,
    procedureName: typeof item.procedureName === 'string' ? item.procedureName : '',
    codes,
  }
}

const normalizePortalProcedures = (raw: unknown): CustomerPortalCode[] => {
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => normalizePortalProcedure(item, index))
}

const normalizePortalProceduresInData = (payload: AppData): AppData => ({
  ...payload,
  settings: {
    ...payload.settings,
    customerPortalCodes: normalizePortalProcedures(payload.settings.customerPortalCodes),
  },
})

const normalizeDashboardProductCategory = (value: unknown): DashboardProductCategory => {
  if (
    value === 'software' ||
    value === 'firmware' ||
    value === 'driver' ||
    value === 'product'
  ) {
    return value
  }
  return 'product'
}

const normalizeIdList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  )
}

const normalizeDashboardProduct = (raw: unknown, index: number): DashboardProduct => {
  const item =
    raw && typeof raw === 'object'
      ? (raw as LegacyDashboardProduct)
      : ({}) as LegacyDashboardProduct
  const id =
    typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `dashboard-item-${index + 1}`

  return {
    id,
    name: typeof item.name === 'string' ? item.name : '',
    category: normalizeDashboardProductCategory(item.category),
    latestVersion: typeof item.latestVersion === 'string' ? item.latestVersion : '',
    sheet: typeof item.sheet === 'string' ? item.sheet : '',
    supportUrl: typeof item.supportUrl === 'string' ? item.supportUrl : '',
    compatibleProductIds: normalizeIdList(item.compatibleProductIds),
    softwareIds: normalizeIdList(item.softwareIds),
    driverIds: normalizeIdList(item.driverIds),
  }
}

const normalizeDashboardProducts = (raw: unknown): DashboardProduct[] => {
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => normalizeDashboardProduct(item, index))
}

const normalizeDashboardProductsInData = (payload: AppData): AppData => ({
  ...payload,
  settings: {
    ...payload.settings,
    dashboardProducts: normalizeDashboardProducts(payload.settings.dashboardProducts),
  },
})

const normalizeSparePart = (raw: unknown, fallbackId: string): SparePart => {
  const item =
    raw && typeof raw === 'object' ? (raw as LegacySparePart) : ({} as LegacySparePart)
  const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : fallbackId
  return {
    id,
    name: typeof item.name === 'string' ? item.name : '',
    sku: typeof item.sku === 'string' ? item.sku : '',
    guideAvailable: Boolean(item.guideAvailable),
  }
}

const normalizeProductCatalogItem = (raw: unknown, index: number): ProductCatalogItem => {
  const item =
    raw && typeof raw === 'object'
      ? (raw as LegacyProductCatalogItem)
      : ({} as LegacyProductCatalogItem)
  const id =
    typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `catalog-product-${index + 1}`
  const rawSpareParts = Array.isArray(item.spareParts) ? item.spareParts : []
  return {
    id,
    name: typeof item.name === 'string' ? item.name : '',
    spareParts: rawSpareParts.map((entry, spareIndex) =>
      normalizeSparePart(entry, `${id}-spare-${spareIndex + 1}`),
    ),
  }
}

const normalizeProducts = (raw: unknown): ProductCatalogItem[] => {
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => normalizeProductCatalogItem(item, index))
}

const normalizeProductsInData = (payload: AppData): AppData => ({
  ...payload,
  settings: {
    ...payload.settings,
    products: normalizeProducts(payload.settings.products),
  },
})

const normalizeDashboardNewsItem = (raw: unknown, index: number): DashboardNewsItem => {
  const item =
    raw && typeof raw === 'object'
      ? (raw as LegacyDashboardNewsItem)
      : ({} as LegacyDashboardNewsItem)
  const id =
    typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `dashboard-news-${index + 1}`
  return {
    id,
    date: typeof item.date === 'string' ? item.date.trim() : '',
    title: typeof item.title === 'string' ? item.title : '',
    content: typeof item.content === 'string' ? item.content : '',
  }
}

const normalizeDashboardNews = (raw: unknown): DashboardNewsItem[] => {
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => normalizeDashboardNewsItem(item, index))
}

const normalizeDashboardNewsInData = (payload: AppData): AppData => ({
  ...payload,
  settings: {
    ...payload.settings,
    dashboardNews: normalizeDashboardNews(payload.settings.dashboardNews),
  },
})

const normalizeDashboardData = (payload: AppData): AppData =>
  normalizeDashboardNewsInData(
    normalizeProductsInData(
      normalizeDashboardProductsInData(normalizePortalProceduresInData(payload)),
    ),
  )

const convertLegacyTokensInData = (payload: AppData): AppData =>
  normalizeDashboardData({
    ...payload,
    notes: convertLegacyTokens(payload.notes),
    emailDraft: convertLegacyTokens(payload.emailDraft),
    taskDraft: convertLegacyTokens(payload.taskDraft),
    history: payload.history.map((item) => ({
      ...item,
      content: convertLegacyTokens(item.content),
    })),
    callHistory: payload.callHistory.map((item) => ({
      ...item,
      content: convertLegacyTokens(item.content),
    })),
    snippets: payload.snippets.map((snippet) => ({
      ...snippet,
      title: convertLegacyTokens(snippet.title),
      content: convertLegacyTokens(snippet.content),
      taskText: convertLegacyTokensMaybe(snippet.taskText),
    })),
    templates: payload.templates.map((template) => ({
      ...template,
      name: convertLegacyTokens(template.name),
      content: convertLegacyTokens(template.content),
      taskText: convertLegacyTokensMaybe(template.taskText),
    })),
    taskTemplates: payload.taskTemplates.map((task) => ({
      ...task,
      name: convertLegacyTokens(task.name),
      content: convertLegacyTokens(task.content),
    })),
    procedures: payload.procedures.map((procedure) => ({
      ...procedure,
      name: convertLegacyTokens(procedure.name),
      productName: convertLegacyTokensMaybe(procedure.productName),
      infoText: convertLegacyTokens(procedure.infoText),
      optionalNotes: convertLegacyTokensMaybe(procedure.optionalNotes),
      steps: convertLegacyTokens(procedure.steps),
      taskText: convertLegacyTokensMaybe(procedure.taskText),
    })),
    settings: {
      ...payload.settings,
      callTemplate: convertLegacyTokens(payload.settings.callTemplate ?? PHONE_CALL_TEMPLATE),
      dashboardProducts: normalizeDashboardProducts(payload.settings.dashboardProducts).map(
        (product) => ({
          ...product,
          name: convertLegacyTokens(product.name),
          sheet: convertLegacyTokens(product.sheet),
        }),
      ),
      products: normalizeProducts(payload.settings.products).map((product) => ({
        ...product,
        name: convertLegacyTokens(product.name),
        spareParts: product.spareParts.map((sparePart) => ({
          ...sparePart,
          name: convertLegacyTokens(sparePart.name),
          sku: convertLegacyTokens(sparePart.sku),
        })),
      })),
      dashboardNews: normalizeDashboardNews(payload.settings.dashboardNews).map((item) => ({
        ...item,
        title: convertLegacyTokens(item.title),
        content: convertLegacyTokens(item.content),
      })),
    },
  })

function mergeData(current: AppData, incoming: AppData) {
  return {
    ...current,
    categories: mergeById(current.categories, incoming.categories),
    snippets: mergeById(current.snippets, incoming.snippets),
    templates: mergeById(current.templates, incoming.templates),
    taskTemplates: mergeById(current.taskTemplates, incoming.taskTemplates),
    procedures: mergeById(current.procedures, incoming.procedures),
    history: mergeById(current.history, incoming.history).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    ),
    callHistory: mergeById(current.callHistory, incoming.callHistory)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, CALL_HISTORY_LIMIT),
    settings: {
      ...current.settings,
      ...incoming.settings,
    },
  }
}

interface PortalCodeListProps {
  items: CustomerPortalCode[]
  copiedId: string | null
  onCopy: (id: string, code: string) => void
  onToggle: (id: string) => void
  title: string
  expandedIds: Record<string, boolean>
  onInfoEnter: (text: string, anchor: HTMLElement) => void
  onInfoLeave: () => void
}

function PortalCodeList({
  items,
  copiedId,
  onCopy,
  onToggle,
  title,
  expandedIds,
  onInfoEnter,
  onInfoLeave,
}: PortalCodeListProps) {
  return items.length ? (
    <div className="portal-code-list-scroll">
      <div className="portal-code-list" aria-label={title}>
        {items.map((item) => {
          const procedureName = item.procedureName.trim() || 'Procédure sans nom'
          const isOpen = expandedIds[item.id] ?? false

          return (
            <div className={`portal-code-item${isOpen ? ' is-open' : ''}`} key={item.id}>
              <button
                className="portal-code-item__summary"
                type="button"
                onClick={() => onToggle(item.id)}
                aria-expanded={isOpen}
              >
                <span className="portal-code-item__name">{procedureName}</span>
                <span className={`portal-code-item__toggle${isOpen ? ' is-open' : ''}`} aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 6 15 12 9 18" />
                  </svg>
                </span>
              </button>
              {isOpen ? (
                <div className="portal-code-item__rows">
                  {item.codes.map((entry, index) => {
                    const title = entry.title?.trim() ?? ''
                    const code = entry.code.trim()
                    const forwardTarget = entry.forwardTarget?.trim() ?? ''
                    const infoNote = entry.infoNote?.trim() ?? ''
                    const showForward = Boolean(entry.showForward && forwardTarget)
                    const lineLabel =
                      item.codes.length > 1 ? `${procedureName} - étape ${index + 1}` : procedureName

                    return (
                      <div className="portal-code-item__row" key={entry.id}>
                        <div className="portal-code-item__step">
                          <span className="portal-code-item__index">{index + 1}</span>
                        </div>
                        <div className="portal-code-item__row-main">
                          <div className="portal-code-item__line">
                            {title ? (
                              <span className="portal-code-item__line-title">{title}</span>
                            ) : null}
                            {entry.showDraft ? (
                              <span className="portal-code-item__badge">Draft</span>
                            ) : null}
                            {showForward ? (
                              <span className="portal-code-item__badge portal-code-item__badge--accent">
                                Forward to {forwardTarget}
                              </span>
                            ) : null}
                            {infoNote ? (
                              <span className="portal-code-item__info">
                                <button
                                  className="portal-code-item__info-btn"
                                  type="button"
                                  aria-label={`Note pour ${lineLabel}`}
                                  onMouseEnter={(event) => onInfoEnter(infoNote, event.currentTarget)}
                                  onMouseLeave={onInfoLeave}
                                  onFocus={(event) => onInfoEnter(infoNote, event.currentTarget)}
                                  onBlur={onInfoLeave}
                                >
                                  i
                                </button>
                              </span>
                            ) : null}
                          </div>
                          <div className="portal-code-item__actions">
                            <code className="portal-code-item__code">{code || '—'}</code>
                            <button
                              className={`ghost dashboard-copy-btn dashboard-copy-btn--compact${
                                copiedId === entry.id ? ' is-success' : ''
                              }`}
                              type="button"
                              onClick={() => onCopy(entry.id, entry.code)}
                              disabled={!code}
                            >
                              {copiedId === entry.id ? 'Copié !' : 'Copier'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  ) : (
    <div className="dashboard-empty">Aucun code configuré dans Paramètres.</div>
  )
}

function App() {
  const [data, setData] = useState<AppData>(defaultData)
  const callTemplate = data.settings.callTemplate
  const isProcedureWindow =
    typeof window !== 'undefined' && window.location.hash === '#procedure'
  const [loaded, setLoaded] = useState(false)
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all')
  const [templateQuery, setTemplateQuery] = useState('')
  const [taskQuery, setTaskQuery] = useState('')
  const [dashboardProductQuery, setDashboardProductQuery] = useState('')
  const [dashboardSparePartQuery, setDashboardSparePartQuery] = useState('')
  const [procedureQuery, setProcedureQuery] = useState('')
  const [dashboardProcedureQuery, setDashboardProcedureQuery] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null)
  const [checkingUpdateManually, setCheckingUpdateManually] = useState(false)
  const [installingDownloadedUpdate, setInstallingDownloadedUpdate] = useState(false)
  const [clearArmed, setClearArmed] = useState(false)
  const [clearAllArmed, setClearAllArmed] = useState(false)
  const [taskClearArmed, setTaskClearArmed] = useState(false)
  const [emailCopyPulse, setEmailCopyPulse] = useState(false)
  const [emailClearPulse, setEmailClearPulse] = useState(false)
  const [taskCopyPulse, setTaskCopyPulse] = useState(false)
  const [taskClearPulse, setTaskClearPulse] = useState(false)
  const [templateFocused, setTemplateFocused] = useState(false)
  const [taskFocused, setTaskFocused] = useState(false)
  const [templateListKey, setTemplateListKey] = useState(0)
  const [taskListKey, setTaskListKey] = useState(0)
  const [emailCopied, setEmailCopied] = useState(false)
  const [taskCopied, setTaskCopied] = useState(false)
  const [portalCopiedId, setPortalCopiedId] = useState<string | null>(null)
  const [dashboardCalculatorCopiedKey, setDashboardCalculatorCopiedKey] =
    useState<DashboardCalculatorCopyKey | null>(null)
  const [callModalOpen, setCallModalOpen] = useState(false)
  const [callDraft, setCallDraft] = useState(PHONE_CALL_TEMPLATE)
  const [callCopied, setCallCopied] = useState(false)
  const [callHistoryCopiedId, setCallHistoryCopiedId] = useState<string | null>(null)
  const [callEntryId, setCallEntryId] = useState<string | null>(null)
  const [callOpenedAt, setCallOpenedAt] = useState<string | null>(null)
  const [procedureLanguage] = useState<Language>('fr')
  const [procedureBrand, setProcedureBrand] = useState<ProcedureBrand>('hercules')
  const [procedureCoverage, setProcedureCoverage] = useState<ProcedureCoverage>('oow')
  const [activeProcedureId, setActiveProcedureId] = useState<string | null>(null)
  const [activeDashboardProductId, setActiveDashboardProductId] = useState<string | null>(null)
  const [activeDashboardProcedureProduct, setActiveDashboardProcedureProduct] = useState<
    string | null
  >(null)
  const [procedureChecks, setProcedureChecks] = useState<Record<number, boolean>>({})
  const [procedureInfoDraft, setProcedureInfoDraft] = useState('')
  const [editTab, setEditTab] = useState<SettingsTab>('categories')
  const [editSnippetCategoryId, setEditSnippetCategoryId] = useState('all')
  const [snippetTooltip, setSnippetTooltip] = useState<{
    text: string
    x: number
    y: number
  } | null>(null)
  const [portalInfoTooltip, setPortalInfoTooltip] = useState<{
    text: string
    x: number
    y: number
  } | null>(null)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedSnippetId, setSelectedSnippetId] = useState<string | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedProcedureId, setSelectedProcedureId] = useState<string | null>(null)
  const [selectedDashboardProductId, setSelectedDashboardProductId] = useState<string | null>(null)
  const [selectedProductCatalogId, setSelectedProductCatalogId] = useState<string | null>(null)
  const [selectedDashboardNewsId, setSelectedDashboardNewsId] = useState<string | null>(null)
  const [snippetActiveField, setSnippetActiveField] = useState<'title' | 'content' | 'task'>(
    'content',
  )
  const [templateActiveField, setTemplateActiveField] = useState<'name' | 'content' | 'task'>(
    'content',
  )
  const [taskTemplateActiveField, setTaskTemplateActiveField] = useState<'name' | 'content'>(
    'content',
  )
  const [procedureActiveField, setProcedureActiveField] = useState<'info' | 'notes' | 'steps'>(
    'info',
  )
  const [procedureFormatHelpOpen, setProcedureFormatHelpOpen] = useState(false)
  const [nameFormatterValue, setNameFormatterValue] = useState('')
  const [dashboardCalculatorItems, setDashboardCalculatorItems] = useState<DashboardCalculatorItem[]>(
    () => [createDashboardCalculatorItem()],
  )
  const [dashboardSectionOpen, setDashboardSectionOpen] = useState(true)
  const [dashboardSectionMounted, setDashboardSectionMounted] = useState(true)
  const [predefinedTagDraft, setPredefinedTagDraft] = useState('')
  const [tagSuggestionState, setTagSuggestionState] = useState<TagSuggestionState | null>(null)
  const [mailInsertMode, setMailInsertMode] = useState<InsertMode>('line')
  const [noteImportFeedbackVisible, setNoteImportFeedbackVisible] = useState(false)
  const [portalDashboardOpenIds, setPortalDashboardOpenIds] = useState<Record<string, boolean>>({})
  const [portalEditorOpenIds, setPortalEditorOpenIds] = useState<Record<string, boolean>>({})
  const [workspaceDashboardPage, setWorkspaceDashboardPage] =
    useState<WorkspaceDashboardPage>('tools')
  const isCategorySelectionEmpty = selectedCategoryId === null
  const isSnippetSelectionEmpty = selectedSnippetId === null
  const isTemplateSelectionEmpty = selectedTemplateId === null
  const isTaskSelectionEmpty = selectedTaskId === null
  const isProcedureSelectionEmpty = selectedProcedureId === null
  const isDashboardProductSelectionEmpty = selectedDashboardProductId === null
  const isProductCatalogSelectionEmpty = selectedProductCatalogId === null
  const isDashboardNewsSelectionEmpty = selectedDashboardNewsId === null

  const emailEditorRef = useRef<TextEditorHandle>(null)
  const taskEditorRef = useRef<TextEditorHandle>(null)
  const callEditorRef = useRef<TextEditorHandle>(null)
  const emailCopyTimeoutRef = useRef<number | null>(null)
  const taskCopyTimeoutRef = useRef<number | null>(null)
  const portalCopyTimeoutRef = useRef<number | null>(null)
  const dashboardCalculatorCopyTimeoutRef = useRef<number | null>(null)
  const callCopyTimeoutRef = useRef<number | null>(null)
  const callHistoryCopyTimeoutRef = useRef<number | null>(null)
  const noteImportFeedbackTimeoutRef = useRef<number | null>(null)
  const snippetTitleRef = useRef<HTMLInputElement>(null)
  const snippetContentRef = useRef<HTMLTextAreaElement>(null)
  const snippetTaskRef = useRef<HTMLTextAreaElement>(null)
  const templateNameRef = useRef<HTMLInputElement>(null)
  const templateContentRef = useRef<HTMLTextAreaElement>(null)
  const templateTaskRef = useRef<HTMLTextAreaElement>(null)
  const callTemplateRef = useRef<HTMLTextAreaElement>(null)
  const taskTemplateNameRef = useRef<HTMLInputElement>(null)
  const taskTemplateContentRef = useRef<HTMLTextAreaElement>(null)
  const procedureNameRef = useRef<HTMLInputElement>(null)
  const procedureProductNameRef = useRef<HTMLInputElement>(null)
  const procedureInfoRef = useRef<HTMLTextAreaElement>(null)
  const procedureNotesRef = useRef<HTMLTextAreaElement>(null)
  const procedureStepsRef = useRef<HTMLTextAreaElement>(null)
  const procedureTaskRef = useRef<HTMLTextAreaElement>(null)
  const templateSearchRef = useRef<HTMLDivElement>(null)
  const taskSearchRef = useRef<HTMLDivElement>(null)
  const dashboardProductSheetRef = useRef<HTMLTextAreaElement>(null)
  const callModalBackdropPointerDownRef = useRef(false)
  const manualUpdateCheckRequestedRef = useRef(false)
  const dashboardOpenFrameRef = useRef<number | null>(null)
  const undoStackRef = useRef<AppData[]>([])
  const redoStackRef = useRef<AppData[]>([])
  const lastCommittedDataRef = useRef<AppData>(cloneAppData(defaultData))
  const historyReadyRef = useRef(false)
  const skipNextHistoryRef = useRef(false)
  const isApplyingHistoryRef = useRef(false)
  const previousLoadedRef = useRef(loaded)
  const legacyProcedureEditorEnabled = false

  const persistCallDraft = useCallback(() => {
    const content = getMeaningfulCallDraft(callDraft, callTemplate)
    if (!content) return null

    const id = callEntryId ?? createId('call')
    const createdAt = callOpenedAt ?? new Date().toISOString()
    const entry = { id, content, createdAt }

    setData((prev) => ({
      ...prev,
      callHistory: [entry, ...prev.callHistory.filter((item) => item.id !== id)].slice(
        0,
        CALL_HISTORY_LIMIT,
      ),
    }))

    if (!callEntryId) {
      setCallEntryId(id)
    }

    return content
  }, [callDraft, callEntryId, callOpenedAt, callTemplate])

  const closeTemplateSearch = useCallback(() => {
    setTemplateFocused(false)
    setTemplateQuery('')
    setTemplateListKey((prev) => prev + 1)
  }, [])

  const closeTaskSearch = useCallback(() => {
    setTaskFocused(false)
    setTaskQuery('')
    setTaskListKey((prev) => prev + 1)
  }, [])

  const closeSearchMenus = useCallback(() => {
    closeTemplateSearch()
    closeTaskSearch()
  }, [closeTemplateSearch, closeTaskSearch])

  const toggleDashboardSection = useCallback(() => {
    if (dashboardSectionOpen) {
      if (dashboardOpenFrameRef.current !== null) {
        window.cancelAnimationFrame(dashboardOpenFrameRef.current)
        dashboardOpenFrameRef.current = null
      }
      setDashboardSectionOpen(false)
      return
    }

    setDashboardSectionMounted(true)
    if (dashboardOpenFrameRef.current !== null) {
      window.cancelAnimationFrame(dashboardOpenFrameRef.current)
    }
    dashboardOpenFrameRef.current = window.requestAnimationFrame(() => {
      dashboardOpenFrameRef.current = null
      setDashboardSectionOpen(true)
    })
  }, [dashboardSectionOpen])

  const handleSelectWorkspaceDashboardPage = useCallback(
    (page: WorkspaceDashboardPage) => {
      setWorkspaceDashboardPage(page)
      closeSearchMenus()
    },
    [closeSearchMenus],
  )

  const handleDashboardTransitionEnd = useCallback(
    (event: TransitionEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget) return
      if (event.propertyName !== 'max-height') return
      if (!dashboardSectionOpen) {
        setDashboardSectionMounted(false)
      }
    },
    [dashboardSectionOpen],
  )

  const triggerPulse = useCallback((setPulse: (value: boolean) => void) => {
    setPulse(false)
    requestAnimationFrame(() => setPulse(true))
  }, [])

  const [categoryDraft, setCategoryDraft] = useState<Category>({
    id: '',
    name: '',
    color: 'violet',
  })
  const [snippetDraft, setSnippetDraft] = useState<Snippet>({
    id: '',
    title: '',
    content: '',
    insertMode: defaultData.settings.defaultSnippetInsertMode,
    taskText: '',
    taskOptional: false,
    categoryId: defaultData.categories[0]?.id ?? '',
  })
  const [templateDraft, setTemplateDraft] = useState<MailTemplate>({
    id: '',
    name: '',
    content: '',
    language: 'fr',
    taskText: '',
    taskOptional: false,
    taskTemplateId: '',
    taskCustom: false,
  })
  const [taskDraft, setTaskDraft] = useState<TaskTemplate>({
    id: '',
    name: '',
    content: '',
  })
  const [procedureDraft, setProcedureDraft] = useState<Procedure>({
    id: '',
    name: '',
    productName: '',
    language: 'fr',
    brand: 'hercules',
    coverage: 'oow',
    infoText: '',
    optionalNotes: '',
    steps: '',
    taskTemplateId: '',
    taskCustom: false,
    taskText: '',
  })
  const [dashboardProductDraft, setDashboardProductDraft] = useState<DashboardProduct>({
    id: '',
    name: '',
    category: 'software',
    latestVersion: '',
    sheet: '',
    supportUrl: '',
    compatibleProductIds: [],
    softwareIds: [],
    driverIds: [],
  })
  const [productDraft, setProductDraft] = useState<ProductCatalogItem>({
    id: '',
    name: '',
    spareParts: [],
  })
  const [dashboardNewsDraft, setDashboardNewsDraft] = useState<DashboardNewsItem>({
    id: '',
    date: getTodayIsoDate(),
    title: '',
    content: '',
  })

  const getEmptyCategoryDraft = useCallback(
    () => ({ id: '', name: '', color: 'violet' } as Category),
    [],
  )
  const getDefaultSnippetCategoryId = useCallback(() => {
    if (editSnippetCategoryId !== 'all') return editSnippetCategoryId
    return data.categories[0]?.id ?? ''
  }, [data.categories, editSnippetCategoryId])
  const defaultSnippetInsertMode =
    data.settings.defaultSnippetInsertMode === 'cursor' ? 'cursor' : 'line'
  const snippetCategoryDisplay =
    data.settings.snippetCategoryDisplay === 'buttons' ? 'buttons' : 'dropdown'
  const customerPortalCodes = useMemo(() => {
    return normalizePortalProcedures(data.settings.customerPortalCodes)
  }, [data.settings.customerPortalCodes])
  const dashboardProducts = useMemo(() => {
    return normalizeDashboardProducts(data.settings.dashboardProducts)
  }, [data.settings.dashboardProducts])
  const productCatalog = useMemo(() => {
    return normalizeProducts(data.settings.products)
  }, [data.settings.products])
  const dashboardNews = useMemo(() => {
    return normalizeDashboardNews(data.settings.dashboardNews)
  }, [data.settings.dashboardNews])

  const getEmptySnippetDraft = useCallback(
    () =>
      ({
        id: '',
        title: '',
        content: '',
        insertMode: defaultSnippetInsertMode,
        taskText: '',
        taskOptional: false,
        categoryId: getDefaultSnippetCategoryId(),
      }) as Snippet,
    [getDefaultSnippetCategoryId, defaultSnippetInsertMode],
  )
  const getEmptyTemplateDraft = useCallback(
    () =>
      ({
        id: '',
        name: '',
        content: '',
        language: 'fr',
        taskText: '',
        taskOptional: false,
        taskTemplateId: '',
        taskCustom: false,
      }) as MailTemplate,
    [],
  )
  const getEmptyTaskDraft = useCallback(
    () => ({ id: '', name: '', content: '' } as TaskTemplate),
    [],
  )
  const getEmptyProcedureDraft = useCallback(
    () =>
      ({
        id: '',
        name: '',
        productName: '',
        language: 'fr',
        brand: 'hercules',
        coverage: 'oow',
        infoText: '',
        optionalNotes: '',
        steps: '',
        taskTemplateId: '',
        taskCustom: false,
        taskText: '',
      }) as Procedure,
    [],
  )
  const getEmptyDashboardProductDraft = useCallback(
    (category: DashboardProductCategory = 'software') =>
      ({
        id: '',
        name: '',
        category,
        latestVersion: '',
        sheet: '',
        supportUrl: '',
        compatibleProductIds: [],
        softwareIds: [],
        driverIds: [],
      }) as DashboardProduct,
    [],
  )
  const getEmptyProductDraft = useCallback(
    () =>
      ({
        id: '',
        name: '',
        spareParts: [],
      }) as ProductCatalogItem,
    [],
  )
  const getEmptyDashboardNewsDraft = useCallback(
    () =>
      ({
        id: '',
        date: getTodayIsoDate(),
        title: '',
        content: '',
      }) as DashboardNewsItem,
    [],
  )

  useEffect(() => {
    let active = true
    loadData()
      .then((loadedData) => {
        if (!active) return
        setData(normalizeDashboardData(loadedData))
        setLoaded(true)
      })
      .catch(() => {
        if (!active) return
        setData(JSON.parse(JSON.stringify(defaultData)) as AppData)
        setLoaded(true)
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    getUpdateStatus()
      .then((status) => {
        if (!active) return
        setUpdateStatus(status)
      })
      .catch(() => {
        if (!active) return
        setUpdateStatus({
          phase: 'error',
          message: 'Impossible de récupérer le statut de mise à jour.',
        })
      })

    const unsubscribe = onUpdateStatus((status) => {
      if (!active) return
      setUpdateStatus(status)

      if (!manualUpdateCheckRequestedRef.current) return

      if (status.phase === 'not-available') {
        setToast('Aucune mise à jour disponible.')
        manualUpdateCheckRequestedRef.current = false
        setCheckingUpdateManually(false)
      } else if (status.phase === 'available' || status.phase === 'downloading') {
        setToast('Mise à jour trouvée. Téléchargement en cours…')
        manualUpdateCheckRequestedRef.current = false
        setCheckingUpdateManually(false)
      } else if (status.phase === 'downloaded') {
        setToast('Mise à jour prête. Ouvre Paramètres > Mise à jour pour l’installer.')
        manualUpdateCheckRequestedRef.current = false
        setCheckingUpdateManually(false)
      } else if (status.phase === 'error') {
        setToast(status.message)
        manualUpdateCheckRequestedRef.current = false
        setCheckingUpdateManually(false)
      }
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!loaded) return
    const handle = window.setTimeout(() => saveData(data), 600)
    return () => window.clearTimeout(handle)
  }, [data, loaded])

  useEffect(() => {
    const wasLoaded = previousLoadedRef.current
    previousLoadedRef.current = loaded

    if (!loaded) {
      undoStackRef.current = []
      redoStackRef.current = []
      historyReadyRef.current = false
      lastCommittedDataRef.current = cloneAppData(data)
      return
    }

    if (wasLoaded === loaded) return

    lastCommittedDataRef.current = cloneAppData(data)
    historyReadyRef.current = true
    skipNextHistoryRef.current = true
  }, [data, loaded])

  useEffect(() => {
    if (!historyReadyRef.current) {
      lastCommittedDataRef.current = cloneAppData(data)
      return
    }

    if (skipNextHistoryRef.current) {
      skipNextHistoryRef.current = false
      lastCommittedDataRef.current = cloneAppData(data)
      return
    }

    if (isApplyingHistoryRef.current) {
      isApplyingHistoryRef.current = false
      lastCommittedDataRef.current = cloneAppData(data)
      return
    }

    undoStackRef.current = [...undoStackRef.current, cloneAppData(lastCommittedDataRef.current)].slice(
      -DATA_HISTORY_LIMIT,
    )
    redoStackRef.current = []
    lastCommittedDataRef.current = cloneAppData(data)
  }, [data])

  useEffect(() => {
    if (!toast) return
    const handle = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(handle)
  }, [toast])

  useEffect(() => {
    return () => {
      if (dashboardOpenFrameRef.current !== null) {
        window.cancelAnimationFrame(dashboardOpenFrameRef.current)
      }
      if (emailCopyTimeoutRef.current !== null) {
        window.clearTimeout(emailCopyTimeoutRef.current)
      }
      if (taskCopyTimeoutRef.current !== null) {
        window.clearTimeout(taskCopyTimeoutRef.current)
      }
      if (portalCopyTimeoutRef.current !== null) {
        window.clearTimeout(portalCopyTimeoutRef.current)
      }
      if (dashboardCalculatorCopyTimeoutRef.current !== null) {
        window.clearTimeout(dashboardCalculatorCopyTimeoutRef.current)
      }
      if (callCopyTimeoutRef.current !== null) {
        window.clearTimeout(callCopyTimeoutRef.current)
      }
      if (callHistoryCopyTimeoutRef.current !== null) {
        window.clearTimeout(callHistoryCopyTimeoutRef.current)
      }
      if (noteImportFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(noteImportFeedbackTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (callModalOpen) {
        persistCallDraft()
      }
      if (callCopyTimeoutRef.current !== null) {
        window.clearTimeout(callCopyTimeoutRef.current)
        callCopyTimeoutRef.current = null
      }
      setCallModalOpen(false)
      setCallCopied(false)
      setCallHistoryCopiedId(null)
      setCallEntryId(null)
      setCallOpenedAt(null)
      setEditOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [callModalOpen, persistCallDraft])

  useEffect(() => {
    if (!callModalOpen) return
    const handle = window.requestAnimationFrame(() => {
      const target = callEditorRef.current
      if (!target) return
      target.focus()
      const cursor = callDraft.length
      target.setSelection(cursor, cursor)
    })
    return () => window.cancelAnimationFrame(handle)
  }, [callDraft.length, callModalOpen])

  useEffect(() => {
    if (!editOpen) return
    setSelectedCategoryId(null)
    setSelectedSnippetId(null)
    setSelectedTemplateId(null)
    setSelectedTaskId(null)
    setSelectedProcedureId(null)
    setSelectedDashboardProductId(null)
    setSelectedProductCatalogId(null)
    setSelectedDashboardNewsId(null)
    setSelectedDashboardNewsId(null)
    setClearAllArmed(false)
    setCategoryDraft(getEmptyCategoryDraft())
    setSnippetDraft(getEmptySnippetDraft())
    setTemplateDraft(getEmptyTemplateDraft())
    setTaskDraft(getEmptyTaskDraft())
    setProcedureDraft(getEmptyProcedureDraft())
    setDashboardProductDraft(getEmptyDashboardProductDraft())
    setProductDraft(getEmptyProductDraft())
    setDashboardNewsDraft(getEmptyDashboardNewsDraft())
  }, [
    editOpen,
    editTab,
    getEmptyCategoryDraft,
    getEmptyDashboardProductDraft,
    getEmptyDashboardNewsDraft,
    getEmptySnippetDraft,
    getEmptyProductDraft,
    getEmptyTemplateDraft,
    getEmptyTaskDraft,
    getEmptyProcedureDraft,
  ])

  useEffect(() => {
    if (!editOpen) {
      setTagSuggestionState(null)
      return
    }
    setTagSuggestionState(null)
  }, [editOpen, editTab])

  useEffect(() => {
    if (editOpen || isProcedureWindow || data.settings.autoFocusEditor === false) return
    const handle = window.requestAnimationFrame(() => {
      emailEditorRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(handle)
  }, [editOpen, isProcedureWindow, data.settings.autoFocusEditor])

  useEffect(() => {
    if (!editOpen) return
    if (editSnippetCategoryId === 'all') return
    setSnippetDraft((prev) => {
      if (prev.id) return prev
      if (prev.categoryId === editSnippetCategoryId) return prev
      return { ...prev, categoryId: editSnippetCategoryId }
    })
  }, [editOpen, editSnippetCategoryId])

  useEffect(() => {
    const handleWindowBlur = () => {
      closeSearchMenus()
    }
    const handleWindowFocus = () => {
      closeSearchMenus()
    }
    const handleVisibilityChange = () => {
      if (document.hidden) {
        closeSearchMenus()
      }
    }
    window.addEventListener('blur', handleWindowBlur)
    window.addEventListener('focus', handleWindowFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      window.removeEventListener('blur', handleWindowBlur)
      window.removeEventListener('focus', handleWindowFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [closeSearchMenus])

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (templateSearchRef.current?.contains(target)) return
      if (taskSearchRef.current?.contains(target)) return
      closeSearchMenus()
    }
    window.addEventListener('pointerdown', handlePointerDown, true)
    return () => window.removeEventListener('pointerdown', handlePointerDown, true)
  }, [closeSearchMenus])

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) return
      if (target.closest('.tag-autocomplete')) return
      if (target.closest('[data-tag-autocomplete-field="true"]')) return
      setTagSuggestionState(null)
    }

    window.addEventListener('pointerdown', handlePointerDown, true)
    return () => window.removeEventListener('pointerdown', handlePointerDown, true)
  }, [])

  const emailTags = useMemo(() => countTokens(data.emailDraft), [data.emailDraft])
  const taskTags = useMemo(() => countTokens(data.taskDraft), [data.taskDraft])
  const mailInsertModeLabel = mailInsertMode === 'line' ? 'À la ligne' : 'Au curseur'
  const zoomValue = Number.isFinite(data.settings.zoom) ? data.settings.zoom : 1
  const textScale = Number.isFinite(data.settings.textScale) ? data.settings.textScale : 1
  const editorLineHeight = Number.isFinite(data.settings.editorLineHeight)
    ? Math.min(2, Math.max(1.3, data.settings.editorLineHeight))
    : 1.6
  const historyLimit = Number.isFinite(data.settings.historyLimit)
    ? Math.min(400, Math.max(50, Math.round(data.settings.historyLimit)))
    : 200
  const historyOnCopy = data.settings.historyOnCopy !== false
  const autoFocusEditor = data.settings.autoFocusEditor !== false
  const exportFont =
    exportFontOptions.find((option) => option.value === data.settings.exportFont)?.value ??
    defaultData.settings.exportFont
  const exportFontSize = Number.isFinite(data.settings.exportFontSize)
    ? Math.min(EXPORT_FONT_SIZE_MAX, Math.max(EXPORT_FONT_SIZE_MIN, data.settings.exportFontSize))
    : defaultData.settings.exportFontSize
  const updateSettingsLabel = getUpdateSettingsLabel(updateStatus)
  const isUpdateReadyToInstall = updateStatus?.phase === 'downloaded'
  const availableUpdateVersionLabel = getUpdateAvailableVersionLabel(updateStatus, APP_VERSION_LABEL)
  const availableUpdateVersionMeta = getUpdateAvailableVersionMeta(updateStatus)
  const updateDownloadProgress =
    updateStatus?.phase === 'downloaded'
      ? 100
      : typeof updateStatus?.progress === 'number'
        ? Math.max(0, Math.min(100, Math.round(updateStatus.progress)))
        : null
  const showUpdateProgress =
    updateStatus?.phase === 'available' ||
    updateStatus?.phase === 'downloading' ||
    updateStatus?.phase === 'downloaded'
  const showUpdateIndicator =
    updateStatus?.phase === 'available' ||
    updateStatus?.phase === 'downloading' ||
    isUpdateReadyToInstall
  const callHistory = useMemo(
    () => [...data.callHistory].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.callHistory],
  )
  const recentCallHistory = useMemo(
    () => callHistory.slice(0, CALL_HISTORY_LIMIT),
    [callHistory],
  )
  const activeSettingsTab =
    settingsTabIndex.find((tab) => tab.id === editTab) ?? settingsTabIndex[0]
  const editButtonLabel = 'Settings'
  const isUpdateCheckRunning =
    updateStatus?.phase === 'checking' ||
    updateStatus?.phase === 'available' ||
    updateStatus?.phase === 'downloading'
  const categoryIdSet = useMemo(
    () => new Set(data.categories.map((category) => category.id)),
    [data.categories],
  )
  const categoryColorById = useMemo(() => {
    const map = new Map<string, string>()
    data.categories.forEach((category) => {
      map.set(category.id, categoryColorMap.get(category.color) ?? '#8b6fc9')
    })
    return map
  }, [data.categories])
  const productCatalogById = useMemo(() => {
    const map = new Map<string, ProductCatalogItem>()
    productCatalog.forEach((product) => {
      map.set(product.id, product)
    })
    return map
  }, [productCatalog])
  const predefinedTags = useMemo(
    () => normalizePredefinedTags(data.settings.predefinedTags ?? defaultData.settings.predefinedTags),
    [data.settings.predefinedTags],
  )
  const activeTagSuggestions = useMemo(() => {
    if (!tagSuggestionState) return []

    const query = tagSuggestionState.query.trim().toUpperCase()
    const matches = predefinedTags.filter((tag) => {
      const inner = tag.slice(1, -1).toUpperCase()
      if (!query) return true
      return inner.startsWith(query) || inner.includes(query)
    })

    return matches.sort((left, right) => {
      const leftInner = left.slice(1, -1).toUpperCase()
      const rightInner = right.slice(1, -1).toUpperCase()
      const leftStarts = leftInner.startsWith(query)
      const rightStarts = rightInner.startsWith(query)
      if (leftStarts !== rightStarts) return leftStarts ? -1 : 1
      return leftInner.localeCompare(rightInner, 'fr')
    })
  }, [predefinedTags, tagSuggestionState])
  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setData((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
  }, [])
  const updateTagSuggestionFromTarget = useCallback(
    (
      fieldId: TagSuggestionFieldId,
      target: HTMLInputElement | HTMLTextAreaElement | null,
      value: string,
    ) => {
      const context = getTagAutocompleteContext(value, target?.selectionStart)
      if (!context) {
        setTagSuggestionState((current) => (current?.fieldId === fieldId ? null : current))
        return
      }
      setTagSuggestionState({ fieldId, ...context })
    },
    [],
  )
  const applySuggestedTag = useCallback(
    (
      fieldId: TagSuggestionFieldId,
      ref: RefObject<HTMLInputElement | HTMLTextAreaElement>,
      value: string,
      setValue: (next: string) => void,
      tag: string,
    ) => {
      const target = ref.current
      const context =
        getTagAutocompleteContext(value, target?.selectionStart) ??
        (tagSuggestionState?.fieldId === fieldId ? tagSuggestionState : null)
      if (!context) return

      const next = `${value.slice(0, context.start)}${tag}${value.slice(context.end)}`
      setValue(next)
      setTagSuggestionState(null)

      requestAnimationFrame(() => {
        const cursor = context.start + tag.length
        target?.setSelectionRange(cursor, cursor)
        target?.focus()
      })
    },
    [tagSuggestionState],
  )
  const renderTagSuggestions = useCallback(
    (
      fieldId: TagSuggestionFieldId,
      onSelect: (tag: string) => void,
    ) => {
      if (tagSuggestionState?.fieldId !== fieldId) return null

      return (
        <div className="tag-autocomplete">
          {activeTagSuggestions.length ? (
            <>
              <div className="tag-autocomplete__label">Tags prédéfinis</div>
              <div className="tag-autocomplete__list">
                {activeTagSuggestions.slice(0, 8).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="tag-autocomplete__item"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => onSelect(tag)}
                  >
                    <code>{tag}</code>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="tag-autocomplete__empty">
              Aucun tag prédéfini correspondant. Ajoutez-le dans Paramètres &gt; Tags.
            </div>
          )}
        </div>
      )
    },
    [activeTagSuggestions, tagSuggestionState],
  )
  const handleAddPredefinedTag = useCallback(() => {
    const tag = normalizePredefinedTag(predefinedTagDraft)
    if (!tag) {
      setToast('Tag vide.')
      return
    }
    if (predefinedTags.includes(tag)) {
      setToast('Tag déjà présent.')
      return
    }
    updateSettings({ predefinedTags: [...predefinedTags, tag] })
    setPredefinedTagDraft('')
    setToast('Tag ajouté.')
  }, [predefinedTagDraft, predefinedTags, updateSettings])
  const handleRemovePredefinedTag = useCallback(
    (tag: string) => {
      updateSettings({ predefinedTags: predefinedTags.filter((item) => item !== tag) })
      setToast('Tag supprimé.')
    },
    [predefinedTags, updateSettings],
  )
  const handleUndoData = useCallback(() => {
    const previous = undoStackRef.current[undoStackRef.current.length - 1]
    if (!previous) return

    undoStackRef.current = undoStackRef.current.slice(0, -1)
    redoStackRef.current = [...redoStackRef.current, cloneAppData(data)].slice(-DATA_HISTORY_LIMIT)
    isApplyingHistoryRef.current = true
    setData(cloneAppData(previous))
    setToast('Annulation')
  }, [data])
  const handleRedoData = useCallback(() => {
    const next = redoStackRef.current[redoStackRef.current.length - 1]
    if (!next) return

    redoStackRef.current = redoStackRef.current.slice(0, -1)
    undoStackRef.current = [...undoStackRef.current, cloneAppData(data)].slice(-DATA_HISTORY_LIMIT)
    isApplyingHistoryRef.current = true
    setData(cloneAppData(next))
    setToast('Rétabli')
  }, [data])
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const isModifierPressed = event.metaKey || event.ctrlKey
      if (!isModifierPressed) return

      const target = event.target instanceof HTMLElement ? event.target : null
      const isEditableTarget = Boolean(
        target?.closest('textarea, input, select, [contenteditable="true"], [contenteditable=""]'),
      )
      const usesAppHistory = Boolean(
        target?.closest('.editor--email') ||
          target?.closest('.task-editor') ||
          target?.closest('.note-panel-workspace'),
      )

      if (isEditableTarget && !usesAppHistory) return

      const key = event.key.toLowerCase()
      if (key === 'z') {
        event.preventDefault()
        if (event.shiftKey) {
          handleRedoData()
          return
        }
        handleUndoData()
        return
      }

      if (key === 'y') {
        event.preventDefault()
        handleRedoData()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleRedoData, handleUndoData])
  const updateCustomerPortalCodes = useCallback((next: CustomerPortalCode[]) => {
    updateSettings({ customerPortalCodes: next })
  }, [updateSettings])
  const updateCustomerPortalProcedure = useCallback(
    (id: string, patch: Partial<CustomerPortalCode>) => {
      updateCustomerPortalCodes(
        customerPortalCodes.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                ...patch,
              }
            : entry,
        ),
      )
    },
    [customerPortalCodes, updateCustomerPortalCodes],
  )
  const updateCustomerPortalCodeLineItem = useCallback(
    (procedureId: string, codeLineId: string, patch: Partial<CustomerPortalCodeLine>) => {
      updateCustomerPortalCodes(
        customerPortalCodes.map((entry) => {
          if (entry.id !== procedureId) return entry
          return {
            ...entry,
            codes: entry.codes.map((codeLine) => {
              if (codeLine.id !== codeLineId) return codeLine
              const nextLine = { ...codeLine, ...patch }
              if (!nextLine.showForward) {
                nextLine.forwardTarget = ''
              }
              return nextLine
            }),
          }
        }),
      )
    },
    [customerPortalCodes, updateCustomerPortalCodes],
  )
  const addCustomerPortalCodeLine = useCallback(
    (procedureId: string) => {
      updateCustomerPortalCodes(
        customerPortalCodes.map((entry) =>
          entry.id === procedureId
            ? {
                ...entry,
                codes: [...entry.codes, createEmptyPortalCodeLine()],
              }
            : entry,
        ),
      )
    },
    [customerPortalCodes, updateCustomerPortalCodes],
  )
  const removeCustomerPortalCodeLine = useCallback(
    (procedureId: string, codeLineId: string) => {
      updateCustomerPortalCodes(
        customerPortalCodes.map((entry) => {
          if (entry.id !== procedureId) return entry
          return {
            ...entry,
            codes: entry.codes.filter((codeLine) => codeLine.id !== codeLineId),
          }
        }),
      )
    },
    [customerPortalCodes, updateCustomerPortalCodes],
  )
  const handleAddPortalProcedure = useCallback(() => {
    const id = createId('portal')
    updateCustomerPortalCodes([
      ...customerPortalCodes,
      {
        id,
        procedureName: '',
        codes: [createEmptyPortalCodeLine()],
      },
    ])
    setPortalEditorOpenIds((prev) => ({ ...prev, [id]: true }))
  }, [customerPortalCodes, updateCustomerPortalCodes])
  const updateDashboardProducts = useCallback(
    (next: DashboardProduct[]) => {
      const legacyProductEntries = dashboardProducts.filter((product) => product.category === 'product')
      updateSettings({ dashboardProducts: [...next, ...legacyProductEntries] })
    },
    [dashboardProducts, updateSettings],
  )
  const updateProductCatalog = useCallback(
    (next: ProductCatalogItem[]) => {
      updateSettings({ products: normalizeProducts(next) })
    },
    [updateSettings],
  )
  const updateDashboardNews = useCallback(
    (next: DashboardNewsItem[]) => {
      updateSettings({ dashboardNews: normalizeDashboardNews(next) })
    },
    [updateSettings],
  )

  const handleCheckUpdatesNow = useCallback(async () => {
    manualUpdateCheckRequestedRef.current = true
    setCheckingUpdateManually(true)
    try {
      const result = await checkForUpdatesNow()
      if (!result.ok) {
        if (result.reason === 'disabled') {
          setToast('Recherche de MAJ disponible uniquement sur l’application installée.')
        } else if (result.reason === 'missing-token') {
          setToast('GH_TOKEN/GITHUB_TOKEN manquant pour accéder au repo privé.')
        } else if (result.reason === 'already-checking') {
          setToast('Une recherche de MAJ est déjà en cours.')
        } else if (result.reason === 'restart-pending') {
          setToast('Redémarrage déjà en cours pour installer la MAJ.')
        } else {
          setToast('Recherche de MAJ impossible.')
        }
        manualUpdateCheckRequestedRef.current = false
        setCheckingUpdateManually(false)
      }
    } catch {
      setToast('Recherche de MAJ impossible.')
      manualUpdateCheckRequestedRef.current = false
      setCheckingUpdateManually(false)
    }
  }, [])

  const handleInstallDownloadedUpdate = useCallback(async (skipConfirmation = false) => {
    if (updateStatus?.phase !== 'downloaded') return
    if (!skipConfirmation) {
      const confirmed = window.confirm(
        'Une mise à jour est prête. Voulez-vous redémarrer maintenant pour l’installer ?',
      )
      if (!confirmed) return
    }

    setInstallingDownloadedUpdate(true)
    try {
      const result = await installDownloadedUpdate()
      if (!result.ok) {
        if (result.reason === 'not-downloaded') {
          setToast('La mise à jour n’est pas encore prête.')
        } else if (result.reason === 'disabled') {
          setToast('Installation MAJ disponible uniquement sur l’application installée.')
        } else if (result.reason === 'missing-token') {
          setToast('GH_TOKEN/GITHUB_TOKEN manquant pour installer la MAJ.')
        } else if (result.reason === 'restart-pending') {
          setToast('Redémarrage déjà en cours pour installer la MAJ.')
        } else {
          setToast('Installation de la MAJ impossible.')
        }
        setInstallingDownloadedUpdate(false)
        return
      }
      setToast('Redémarrage pour installer la mise à jour…')
      window.setTimeout(() => setInstallingDownloadedUpdate(false), 5000)
    } catch {
      setToast('Installation de la MAJ impossible.')
      setInstallingDownloadedUpdate(false)
    }
  }, [updateStatus])

  useEffect(() => {
    const safeZoom = zoomValue > 0 ? zoomValue : 1
    document.documentElement.style.setProperty('--app-zoom', `${safeZoom}`)
  }, [zoomValue])

  useEffect(() => {
    document.documentElement.style.setProperty('--text-scale', `${textScale}`)
  }, [textScale])

  useEffect(() => {
    document.documentElement.style.setProperty('--editor-line-height', `${editorLineHeight}`)
  }, [editorLineHeight])

  useEffect(() => {
    if (activeCategoryId === 'all') return
    if (categoryIdSet.has(activeCategoryId)) return
    setActiveCategoryId('all')
  }, [activeCategoryId, categoryIdSet])

  useEffect(() => {
    if (editSnippetCategoryId === 'all') return
    if (categoryIdSet.has(editSnippetCategoryId)) return
    setEditSnippetCategoryId('all')
  }, [editSnippetCategoryId, categoryIdSet])

  useEffect(() => {
    if (!selectedProductCatalogId || selectedProductCatalogId === 'new') return
    if (productCatalog.some((product) => product.id === selectedProductCatalogId)) return
    setSelectedProductCatalogId(null)
    setProductDraft(getEmptyProductDraft())
  }, [getEmptyProductDraft, productCatalog, selectedProductCatalogId])

  useEffect(() => {
    if (!selectedDashboardNewsId || selectedDashboardNewsId === 'new') return
    if (dashboardNews.some((item) => item.id === selectedDashboardNewsId)) return
    setSelectedDashboardNewsId(null)
    setDashboardNewsDraft(getEmptyDashboardNewsDraft())
  }, [dashboardNews, getEmptyDashboardNewsDraft, selectedDashboardNewsId])

  useEffect(() => {
    if (!activeDashboardProductId) return
    if (
      dashboardProducts
        .filter((product) => product.category !== 'product')
        .some((product) => product.id === activeDashboardProductId)
    ) {
      return
    }
    setActiveDashboardProductId(null)
  }, [activeDashboardProductId, dashboardProducts])

  const visibleSnippets = useMemo(() => {
    if (activeCategoryId === 'all') {
      const categoryOrder = new Map(data.categories.map((category, index) => [category.id, index]))
      const snippetOrder = new Map(data.snippets.map((snippet, index) => [snippet.id, index]))
      return [...data.snippets].sort((a, b) => {
        const catA = categoryOrder.get(a.categoryId) ?? 999
        const catB = categoryOrder.get(b.categoryId) ?? 999
        if (catA !== catB) return catA - catB
        return (snippetOrder.get(a.id) ?? 0) - (snippetOrder.get(b.id) ?? 0)
      })
    }
    return data.snippets.filter((snippet) => snippet.categoryId === activeCategoryId)
  }, [data.snippets, activeCategoryId, data.categories])

  const templateResults = useMemo(() => {
    const query = templateQuery.trim().toLowerCase()
    const base = data.templates
    if (!templateFocused && !query) return []
    if (!query) return base
    return base.filter((template) => template.name.toLowerCase().includes(query))
  }, [templateQuery, data.templates, templateFocused])

  const dashboardVersionProducts = useMemo(
    () => dashboardProducts.filter((product) => product.category !== 'product'),
    [dashboardProducts],
  )

  const dashboardProductResults = useMemo(() => {
    const query = dashboardProductQuery.trim().toLowerCase()
    if (!query) return dashboardVersionProducts
    return dashboardVersionProducts.filter((product) => {
      const compatibleProducts = (product.compatibleProductIds ?? [])
        .map((id) => productCatalogById.get(id)?.name ?? '')
        .join(' ')
      return [product.name, product.latestVersion, product.sheet, compatibleProducts]
        .map((value) => value.toLowerCase())
        .some((value) => value.includes(query))
    })
  }, [dashboardProductQuery, dashboardVersionProducts, productCatalogById])

  const filteredProductsWithSpareParts = useMemo(() => {
    const query = dashboardSparePartQuery.trim().toLowerCase()
    const base = productCatalog
      .map((product) => {
        const matchingSpareParts = query
          ? product.spareParts.filter((sparePart) =>
              [sparePart.name, sparePart.sku, sparePart.guideAvailable ? 'guide' : '']
                .join(' ')
                .toLowerCase()
                .includes(query),
            )
          : product.spareParts
        const productMatches = product.name.toLowerCase().includes(query)
        if (!query) return { ...product, spareParts: matchingSpareParts }
        if (productMatches) return product
        return { ...product, spareParts: matchingSpareParts }
      })
      .filter((product) => {
        if (!query) return product.spareParts.length > 0
        return (
          product.name.toLowerCase().includes(query) ||
          product.spareParts.some((sparePart) =>
            [sparePart.name, sparePart.sku, sparePart.guideAvailable ? 'guide' : '']
              .join(' ')
              .toLowerCase()
              .includes(query),
          )
        )
      })
    return base.sort((left, right) => left.name.localeCompare(right.name, 'fr'))
  }, [dashboardSparePartQuery, productCatalog])

  const versionProductsByCategory = useMemo(
    () =>
      dashboardProductCategoryOrder
        .filter((category) => category !== 'product')
        .map((category) => ({
          category,
          label: dashboardProductCategoryGroupLabels[category],
          items: dashboardProductResults.filter((product) => product.category === category),
        })),
    [dashboardProductResults],
  )

  const productsSorted = useMemo(
    () => [...productCatalog].sort((left, right) => left.name.localeCompare(right.name, 'fr')),
    [productCatalog],
  )
  const dashboardNewsSorted = useMemo(
    () =>
      [...dashboardNews].sort((left, right) => {
        if (left.date !== right.date) return right.date.localeCompare(left.date)
        return left.title.localeCompare(right.title, 'fr')
      }),
    [dashboardNews],
  )

  const procedureList = useMemo(() => {
    const query = procedureQuery.trim().toLowerCase()
    const base = data.procedures.filter(
      (procedure) =>
        procedure.language === procedureLanguage &&
        procedure.brand === procedureBrand &&
        procedure.coverage === procedureCoverage,
    )
    if (!query) return base
    return base.filter((procedure) => procedure.name.toLowerCase().includes(query))
  }, [
    procedureQuery,
    data.procedures,
    procedureLanguage,
    procedureBrand,
    procedureCoverage,
  ])

  const activeProcedure = useMemo(
    () => data.procedures.find((procedure) => procedure.id === activeProcedureId) ?? null,
    [data.procedures, activeProcedureId],
  )
  const activeDashboardProduct = useMemo(
    () => dashboardVersionProducts.find((product) => product.id === activeDashboardProductId) ?? null,
    [dashboardVersionProducts, activeDashboardProductId],
  )
  const dashboardSoftwareProducts = useMemo(
    () => dashboardVersionProducts.filter((product) => product.category === 'software'),
    [dashboardVersionProducts],
  )
  const dashboardDriverProducts = useMemo(
    () => dashboardVersionProducts.filter((product) => product.category === 'driver'),
    [dashboardVersionProducts],
  )
  const activeDashboardVersionCompatibleProducts = useMemo(
    () =>
      activeDashboardProduct
        ? (activeDashboardProduct.compatibleProductIds ?? [])
            .map((id) => productCatalogById.get(id))
            .filter((product): product is ProductCatalogItem => Boolean(product))
        : [],
    [activeDashboardProduct, productCatalogById],
  )
  const filteredDashboardVersionProducts = useMemo(
    () => dashboardProductResults.filter((product) => product.category !== 'product'),
    [dashboardProductResults],
  )
  const dashboardProcedureGroups = useMemo(() => {
    const query = dashboardProcedureQuery.trim().toLowerCase()
    const groups = new Map<string, Procedure[]>()

    data.procedures.forEach((procedure) => {
      const productName = (procedure.productName?.trim() || procedure.name.trim()).trim()
      const searchHaystack = [
        productName,
        procedure.name,
        procedure.brand,
        procedure.coverage,
        procedure.infoText,
        procedure.optionalNotes ?? '',
        procedure.steps,
      ]
        .join(' ')
        .toLowerCase()

      if (query && !searchHaystack.includes(query)) return

      const existing = groups.get(productName) ?? []
      groups.set(productName, [...existing, procedure])
    })

    return Array.from(groups.entries())
      .map(([productName, procedures]) => ({
        productName,
        procedures: [...procedures].sort((a, b) => a.name.localeCompare(b.name, 'fr')),
      }))
      .sort((a, b) => a.productName.localeCompare(b.productName, 'fr'))
  }, [dashboardProcedureQuery, data.procedures])

  useEffect(() => {
    if (workspaceDashboardPage !== 'versions') return
    const visibleDashboardProducts = filteredDashboardVersionProducts
    if (!visibleDashboardProducts.length) {
      if (activeDashboardProductId !== null) {
        setActiveDashboardProductId(null)
      }
      return
    }
    const hasVisibleActive = visibleDashboardProducts.some(
      (product) => product.id === activeDashboardProductId,
    )
    if (hasVisibleActive) return
    setActiveDashboardProductId(visibleDashboardProducts[0].id)
  }, [
    activeDashboardProductId,
    filteredDashboardVersionProducts,
    workspaceDashboardPage,
  ])

  useEffect(() => {
    if (!dashboardProcedureGroups.length) {
      if (activeDashboardProcedureProduct !== null) {
        setActiveDashboardProcedureProduct(null)
      }
      return
    }

    const hasVisibleActive = dashboardProcedureGroups.some(
      (group) => group.productName === activeDashboardProcedureProduct,
    )
    if (hasVisibleActive) return
    setActiveDashboardProcedureProduct(dashboardProcedureGroups[0].productName)
  }, [activeDashboardProcedureProduct, dashboardProcedureGroups])

  const editSnippets = useMemo(() => {
    if (editSnippetCategoryId === 'all') return data.snippets
    return data.snippets.filter((snippet) => snippet.categoryId === editSnippetCategoryId)
  }, [data.snippets, editSnippetCategoryId])

  const templateUsesCustomTask =
    templateDraft.taskCustom ?? (!!templateDraft.taskText && !templateDraft.taskTemplateId)
  const procedureUsesCustomTask =
    procedureDraft.taskCustom ?? (!!procedureDraft.taskText && !procedureDraft.taskTemplateId)

  const insertSnippetToken = (token: string) => {
    if (snippetActiveField === 'title') {
      insertTokenAtCursor(snippetTitleRef, snippetDraft.title, (next) =>
        setSnippetDraft((prev) => ({ ...prev, title: next })),
      token)
      return
    }
    if (snippetActiveField === 'task' && !snippetDraft.taskOptional) {
      insertTokenAtCursor(snippetTaskRef, snippetDraft.taskText ?? '', (next) =>
        setSnippetDraft((prev) => ({ ...prev, taskText: next })),
      token)
      return
    }
    insertTokenAtCursor(snippetContentRef, snippetDraft.content, (next) =>
      setSnippetDraft((prev) => ({ ...prev, content: next })),
    token)
  }

  const insertTemplateToken = (token: string) => {
    if (templateActiveField === 'name') {
      insertTokenAtCursor(templateNameRef, templateDraft.name, (next) =>
        setTemplateDraft((prev) => ({ ...prev, name: next })),
      token)
      return
    }
    if (templateActiveField === 'task' && templateUsesCustomTask && !templateDraft.taskOptional) {
      insertTokenAtCursor(templateTaskRef, templateDraft.taskText ?? '', (next) =>
        setTemplateDraft((prev) => ({ ...prev, taskText: next })),
      token)
      return
    }
    insertTokenAtCursor(templateContentRef, templateDraft.content, (next) =>
      setTemplateDraft((prev) => ({ ...prev, content: next })),
    token)
  }

  const insertTaskTemplateToken = (token: string) => {
    if (taskTemplateActiveField === 'name') {
      insertTokenAtCursor(taskTemplateNameRef, taskDraft.name, (next) =>
        setTaskDraft((prev) => ({ ...prev, name: next })),
      token)
      return
    }
    insertTokenAtCursor(taskTemplateContentRef, taskDraft.content, (next) =>
      setTaskDraft((prev) => ({ ...prev, content: next })),
    token)
  }

  const insertProcedureToken = (token: string) => {
    if (procedureActiveField === 'info') {
      insertTokenAtCursor(procedureInfoRef, procedureDraft.infoText, (next) =>
        setProcedureDraft((prev) => ({ ...prev, infoText: next })),
      token)
      return
    }
    if (procedureActiveField === 'notes') {
      insertTokenAtCursor(procedureNotesRef, procedureDraft.optionalNotes ?? '', (next) =>
        setProcedureDraft((prev) => ({ ...prev, optionalNotes: next })),
      token)
      return
    }
    insertTokenAtCursor(procedureStepsRef, procedureDraft.steps, (next) =>
      setProcedureDraft((prev) => ({ ...prev, steps: next })),
    token)
  }

  const insertCallTemplateToken = (token: string) => {
    insertTokenAtCursor(callTemplateRef, callTemplate, updateCallTemplate, token, true)
  }

  const insertProcedureStepsWrap = (before: string, after: string, placeholder: string) => {
    const target = procedureStepsRef.current
    const value = procedureDraft.steps
    const start = target?.selectionStart ?? value.length
    const end = target?.selectionEnd ?? value.length
    const selection = value.slice(start, end) || placeholder
    const next = `${value.slice(0, start)}${before}${selection}${after}${value.slice(end)}`
    setProcedureDraft((prev) => ({ ...prev, steps: next }))
    setProcedureActiveField('steps')
    requestAnimationFrame(() => {
      const selectionStart = start + before.length
      const selectionEnd = selectionStart + selection.length
      target?.setSelectionRange(selectionStart, selectionEnd)
      target?.focus()
    })
  }

  const insertProcedureStepsLink = () => {
    const target = procedureStepsRef.current
    const value = procedureDraft.steps
    const start = target?.selectionStart ?? value.length
    const end = target?.selectionEnd ?? value.length
    const selection = value.slice(start, end) || 'texte'
    const urlPlaceholder = 'https://...'
    const next = `${value.slice(0, start)}[${selection}](${urlPlaceholder})${value.slice(end)}`
    setProcedureDraft((prev) => ({ ...prev, steps: next }))
    setProcedureActiveField('steps')
    requestAnimationFrame(() => {
      const urlStart = start + selection.length + 3
      const urlEnd = urlStart + urlPlaceholder.length
      target?.setSelectionRange(urlStart, urlEnd)
      target?.focus()
    })
  }

  const insertProcedureCheckMarker = () => {
    const target = procedureStepsRef.current
    const value = procedureDraft.steps
    const cursor = target?.selectionStart ?? value.length
    const lineStart = value.lastIndexOf('\n', Math.max(0, cursor - 1)) + 1
    if (
      value.slice(lineStart, lineStart + PROCEDURE_CHECK_MARKER.length) ===
      PROCEDURE_CHECK_MARKER
    ) {
      return
    }
    const insert = `${PROCEDURE_CHECK_MARKER} `
    const next = `${value.slice(0, lineStart)}${insert}${value.slice(lineStart)}`
    setProcedureDraft((prev) => ({ ...prev, steps: next }))
    setProcedureActiveField('steps')
    requestAnimationFrame(() => {
      const pos = cursor + insert.length
      target?.setSelectionRange(pos, pos)
      target?.focus()
    })
  }

  const taskTemplateResults = useMemo(() => {
    const query = taskQuery.trim().toLowerCase()
    if (!taskFocused && !query) return []
    if (!query) return data.taskTemplates
    return data.taskTemplates.filter((task) => task.name.toLowerCase().includes(query))
  }, [taskQuery, data.taskTemplates, taskFocused])

  const normalizeDraftWithCursor = useCallback((value: string, cursor: number) => {
    const marker = '\uE000'
    const safeCursor = Math.max(0, Math.min(cursor, value.length))
    const markedValue = `${value.slice(0, safeCursor)}${marker}${value.slice(safeCursor)}`
    const normalizedMarkedValue = normalizeTokenSpacing(markedValue)
    const nextCursor = normalizedMarkedValue.indexOf(marker)
    return {
      value: normalizedMarkedValue.replace(marker, ''),
      cursor: nextCursor === -1 ? safeCursor : nextCursor,
    }
  }, [])

  const updateEmailDraft = useCallback((next: string, cursor?: number) => {
    if (cursor !== undefined) {
      const normalized = normalizeDraftWithCursor(next, cursor)
      setData((prev) => ({ ...prev, emailDraft: normalized.value }))
      requestAnimationFrame(() =>
        emailEditorRef.current?.setSelection(normalized.cursor, normalized.cursor),
      )
      return
    }
    const normalized = normalizeTokenSpacing(next)
    setData((prev) => ({ ...prev, emailDraft: normalized }))
  }, [normalizeDraftWithCursor])

  const updateTaskDraft = useCallback((next: string, cursor?: number) => {
    if (cursor !== undefined) {
      const normalized = normalizeDraftWithCursor(next, cursor)
      setData((prev) => ({ ...prev, taskDraft: normalized.value }))
      requestAnimationFrame(() =>
        taskEditorRef.current?.setSelection(normalized.cursor, normalized.cursor),
      )
      return
    }
    const normalized = normalizeTokenSpacing(next)
    setData((prev) => ({ ...prev, taskDraft: normalized }))
  }, [normalizeDraftWithCursor])

  const updateCallDraft = useCallback((next: string, cursor?: number) => {
    if (cursor !== undefined) {
      const normalized = normalizeDraftWithCursor(next, cursor)
      setCallDraft(normalized.value)
      requestAnimationFrame(() =>
        callEditorRef.current?.setSelection(normalized.cursor, normalized.cursor),
      )
      return
    }
    const normalized = normalizeTokenSpacing(next)
    setCallDraft(normalized)
  }, [normalizeDraftWithCursor])

  const updateCallTemplate = useCallback((next: string) => {
    updateSettings({ callTemplate: normalizeTokenSpacing(next) })
  }, [updateSettings])

  const toggleMailInsertMode = useCallback(() => {
    setMailInsertMode((current) => (current === 'line' ? 'cursor' : 'line'))
  }, [])

  const triggerNoteImportFeedback = useCallback(() => {
    if (noteImportFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(noteImportFeedbackTimeoutRef.current)
    }
    setNoteImportFeedbackVisible(true)
    noteImportFeedbackTimeoutRef.current = window.setTimeout(() => {
      setNoteImportFeedbackVisible(false)
      noteImportFeedbackTimeoutRef.current = null
    }, 900)
  }, [])

  const togglePortalDashboardItem = useCallback((id: string) => {
    setPortalDashboardOpenIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const togglePortalEditorItem = useCallback((id: string) => {
    setPortalEditorOpenIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  useEffect(() => {
    if (editOpen || isProcedureWindow) return

    const handleContextMenu = (event: PointerEvent) => {
      event.preventDefault()
      toggleMailInsertMode()
    }

    window.addEventListener('contextmenu', handleContextMenu, true)
    return () => window.removeEventListener('contextmenu', handleContextMenu, true)
  }, [editOpen, isProcedureWindow, toggleMailInsertMode])

  useEffect(() => {
    if (isProcedureWindow) return
    const channel = new BroadcastChannel('speedmail-procedure')
    channel.onmessage = (event) => {
      const payload = event.data as { type?: string; taskText?: string } | null
      if (!payload || payload.type !== 'procedure:import-task') return
      if (!payload.taskText?.trim()) return
      updateTaskDraft(payload.taskText, payload.taskText.length)
      setTaskQuery('')
      setTaskFocused(false)
      setTaskListKey((prev) => prev + 1)
    }
    return () => channel.close()
  }, [isProcedureWindow, updateTaskDraft])

  useEffect(() => {
    setProcedureChecks({})
  }, [activeProcedureId])

  useEffect(() => {
    setProcedureInfoDraft(activeProcedure?.infoText ?? '')
  }, [activeProcedureId, activeProcedure])

  const insertTokenAtCursor = (
    ref: RefObject<HTMLInputElement | HTMLTextAreaElement>,
    value: string,
    setValue: (next: string) => void,
    token: string,
    normalizeInsertedValue = false,
  ) => {
    const target = ref.current
    const start = target?.selectionStart ?? value.length
    const end = target?.selectionEnd ?? value.length
    const rawNext = `${value.slice(0, start)}${token}${value.slice(end)}`
    const next = normalizeInsertedValue ? normalizeTokenSpacing(rawNext) : rawNext
    setValue(next)
    requestAnimationFrame(() => {
      const pos = normalizeInsertedValue
        ? normalizeDraftWithCursor(rawNext, start + token.length).cursor
        : start + token.length
      target?.setSelectionRange(pos, pos)
      target?.focus()
    })
  }

  const insertDashboardProductSheetWrap = (before: string, after: string, placeholder: string) => {
    const target = dashboardProductSheetRef.current
    const value = dashboardProductDraft.sheet
    const start = target?.selectionStart ?? value.length
    const end = target?.selectionEnd ?? value.length
    const selection = value.slice(start, end) || placeholder
    const next = `${value.slice(0, start)}${before}${selection}${after}${value.slice(end)}`
    setDashboardProductDraft((prev) => ({ ...prev, sheet: next }))
    requestAnimationFrame(() => {
      const selectionStart = start + before.length
      const selectionEnd = selectionStart + selection.length
      target?.setSelectionRange(selectionStart, selectionEnd)
      target?.focus()
    })
  }

  const insertDashboardProductSheetLink = () => {
    const target = dashboardProductSheetRef.current
    const value = dashboardProductDraft.sheet
    const start = target?.selectionStart ?? value.length
    const end = target?.selectionEnd ?? value.length
    const selection = value.slice(start, end) || 'texte'
    const urlPlaceholder = 'https://...'
    const next = `${value.slice(0, start)}[${selection}](${urlPlaceholder})${value.slice(end)}`
    setDashboardProductDraft((prev) => ({ ...prev, sheet: next }))
    requestAnimationFrame(() => {
      const urlStart = start + selection.length + 3
      const urlEnd = urlStart + urlPlaceholder.length
      target?.setSelectionRange(urlStart, urlEnd)
      target?.focus()
    })
  }

  const insertTaskText = (text: string) => {
    if (!text.trim()) return
    const base = data.taskDraft
    const prefix = base && !base.endsWith('\n') ? `${base}\n` : base
    const insert = padEmptySelectors(text.trimEnd())
    const withBreak = insert.endsWith('\n') ? insert : `${insert}\n`
    const next = `${prefix ?? ''}${withBreak}`
    updateTaskDraft(next, next.length)
  }

  const insertSnippet = (snippet: Snippet) => {
    const selection = emailEditorRef.current?.getSelection() ?? {
      start: data.emailDraft.length,
      end: data.emailDraft.length,
    }
    const base = data.emailDraft
    const insertContent = padEmptySelectors(snippet.content.trimEnd())
    if (mailInsertMode === 'line') {
      const cursor = selection.start
      const lineBreakIndex = base.indexOf('\n', cursor)
      const insertAt = lineBreakIndex === -1 ? base.length : lineBreakIndex + 1
      const before = base.slice(0, insertAt)
      const after = base.slice(insertAt)
      const leadingBreak = before.length > 0 && !before.endsWith('\n') ? '\n' : ''
      const trailingBreak = after.length > 0 && !after.startsWith('\n') ? '\n' : ''
      const next = `${before}${leadingBreak}${insertContent}${trailingBreak}${after}`
      const nextCursor = before.length + leadingBreak.length + insertContent.length + trailingBreak.length
      updateEmailDraft(next, nextCursor)
    } else {
      const before = base.slice(0, selection.start)
      const after = base.slice(selection.end)
      const needsSpace = before.length > 0 && !/\s$/.test(before)
      const content = `${needsSpace ? ' ' : ''}${insertContent} `
      const next = `${before}${content}${after}`
      updateEmailDraft(next, before.length + content.length)
    }
    if (snippet.taskText) {
      insertTaskText(snippet.taskText)
    }
  }

  const applyTemplate = (template: MailTemplate) => {
    const paddedContent = padEmptySelectors(template.content)
    updateEmailDraft(paddedContent, paddedContent.length)
    requestAnimationFrame(() => emailEditorRef.current?.focus())
    const usesCustom =
      template.taskCustom ?? (!!template.taskText && !template.taskTemplateId)
    const taskText = usesCustom
      ? template.taskText ?? ''
      : template.taskTemplateId
      ? data.taskTemplates.find((task) => task.id === template.taskTemplateId)?.content ?? ''
      : ''
    if (taskText) {
      const paddedTaskText = padEmptySelectors(taskText)
      updateTaskDraft(paddedTaskText, paddedTaskText.length)
    }
  }

  const applyTaskTemplate = (template: TaskTemplate) => {
    const paddedContent = padEmptySelectors(template.content)
    updateTaskDraft(paddedContent, paddedContent.length)
    requestAnimationFrame(() => taskEditorRef.current?.focus())
  }

  const getProcedureTaskText = (procedure: Procedure) => {
    const usesCustom =
      procedure.taskCustom ?? (!!procedure.taskText && !procedure.taskTemplateId)
    if (usesCustom) return procedure.taskText ?? ''
    if (!procedure.taskTemplateId) return ''
    return data.taskTemplates.find((task) => task.id === procedure.taskTemplateId)?.content ?? ''
  }

  const buildExportHtml = useCallback(
    (text: string) => {
      const escaped = escapeHtml(text).replace(/\r?\n/g, '<br>')
      return `<div style='font-family:${exportFont}; font-size:${exportFontSize}px; line-height:1.5;'>${escaped}</div>`
    },
    [exportFont, exportFontSize],
  )

  const handleCopyEmail = async () => {
    if (emailCopyTimeoutRef.current) {
      window.clearTimeout(emailCopyTimeoutRef.current)
    }
    setEmailCopied(true)
    emailCopyTimeoutRef.current = window.setTimeout(() => setEmailCopied(false), 1600)

    if (!data.emailDraft.trim()) return
    const cleaned = stripTokenSpacing(data.emailDraft)
    const didCopy = await copyText(cleaned, buildExportHtml(cleaned))
    if (!didCopy) {
      setToast('Copie impossible.')
      return
    }
    if (historyOnCopy) {
      const newItem = {
        id: createId('hist'),
        content: cleaned,
        createdAt: new Date().toISOString(),
      }
      setData((prev) => ({
        ...prev,
        history: [newItem, ...prev.history].slice(0, historyLimit),
      }))
    }
  }

  const handleCopyTask = async () => {
    if (taskCopyTimeoutRef.current) {
      window.clearTimeout(taskCopyTimeoutRef.current)
    }
    setTaskCopied(true)
    taskCopyTimeoutRef.current = window.setTimeout(() => setTaskCopied(false), 1600)

    if (!data.taskDraft.trim()) return
    const cleaned = stripTokenSpacing(data.taskDraft)
    const didCopy = await copyText(cleaned, buildExportHtml(cleaned))
    if (!didCopy) {
      setToast('Copie impossible.')
      return
    }
  }

  const formatNameValue = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return ''
    return trimmed
      .split(/\s+/)
      .map((word) => {
        const lower = word.toLowerCase()
        return `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`
      })
      .join(' ')
  }

  const handleFormatName = async () => {
    const formatted = formatNameValue(nameFormatterValue)
    if (!formatted) return
    const didCopy = await copyText(formatted)
    if (!didCopy) {
      setToast('Copie impossible.')
      return
    }
    setNameFormatterValue('')
  }

  const handleCopyPortalCode = async (id: string, code: string) => {
    const value = code.trim()
    if (!value) return
    const didCopy = await copyText(value)
    if (!didCopy) {
      setToast('Copie impossible.')
      return
    }
    if (portalCopyTimeoutRef.current) {
      window.clearTimeout(portalCopyTimeoutRef.current)
    }
    setPortalCopiedId(id)
    portalCopyTimeoutRef.current = window.setTimeout(() => {
      setPortalCopiedId((current) => (current === id ? null : current))
    }, 1600)
  }

  const addDashboardCalculatorItem = () => {
    setDashboardCalculatorItems((prev) => [...prev, createDashboardCalculatorItem()])
  }

  const updateDashboardCalculatorItem = (
    id: string,
    field: keyof Omit<DashboardCalculatorItem, 'id'>,
    value: string,
  ) => {
    setDashboardCalculatorItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    )
  }

  const removeDashboardCalculatorItem = (id: string) => {
    setDashboardCalculatorItems((prev) => {
      if (prev.length <= 1) {
        return prev.map((item) =>
          item.id === id ? { ...item, productPrice: '', shippingPrice: '' } : item,
        )
      }
      return prev.filter((item) => item.id !== id)
    })
  }

  const handleCopyDashboardAmount = async (key: DashboardCalculatorCopyKey, value: number) => {
    const didCopy = await copyText(formatAmountForCopy(value))
    if (!didCopy) {
      setToast('Copie impossible.')
      return
    }
    if (dashboardCalculatorCopyTimeoutRef.current) {
      window.clearTimeout(dashboardCalculatorCopyTimeoutRef.current)
    }
    setDashboardCalculatorCopiedKey(key)
    dashboardCalculatorCopyTimeoutRef.current = window.setTimeout(
      () => setDashboardCalculatorCopiedKey((current) => (current === key ? null : current)),
      1600,
    )
  }

  const openCallModal = () => {
    callModalBackdropPointerDownRef.current = false
    setCallDraft(normalizeTokenSpacing(callTemplate))
    setCallCopied(false)
    setCallEntryId(createId('call'))
    setCallOpenedAt(new Date().toISOString())
    if (callCopyTimeoutRef.current !== null) {
      window.clearTimeout(callCopyTimeoutRef.current)
      callCopyTimeoutRef.current = null
    }
    setCallModalOpen(true)
  }

  const closeCallModal = () => {
    callModalBackdropPointerDownRef.current = false
    persistCallDraft()
    if (callCopyTimeoutRef.current !== null) {
      window.clearTimeout(callCopyTimeoutRef.current)
      callCopyTimeoutRef.current = null
    }
    setCallModalOpen(false)
    setCallCopied(false)
    setCallEntryId(null)
    setCallOpenedAt(null)
  }

  const handleCopyCall = async () => {
    const content = normalizeCallDraft(callDraft)
    if (!content.trim()) return
    if (callCopyTimeoutRef.current !== null) {
      window.clearTimeout(callCopyTimeoutRef.current)
    }

    persistCallDraft()
    const didCopy = await copyText(content)
    if (!didCopy) {
      setToast('Copie impossible.')
      return
    }

    setCallCopied(true)
    callCopyTimeoutRef.current = window.setTimeout(() => setCallCopied(false), 1600)
  }

  const handleCopyHistoryCall = async (id: string, content: string) => {
    const value = content.trim()
    if (!value) return
    if (callHistoryCopyTimeoutRef.current !== null) {
      window.clearTimeout(callHistoryCopyTimeoutRef.current)
    }
    const didCopy = await copyText(value)
    if (!didCopy) {
      setToast('Copie impossible.')
      return
    }
    setCallHistoryCopiedId(id)
    callHistoryCopyTimeoutRef.current = window.setTimeout(() => {
      setCallHistoryCopiedId((current) => (current === id ? null : current))
    }, 1600)
  }

  const handleNoteImportClick = () => {
    triggerNoteImportFeedback()
  }

  const handleSaveDashboardProduct = () => {
    const name = dashboardProductDraft.name.trim()
    if (!name) return
    const category = dashboardProductDraft.category
    const payload: DashboardProduct = {
      id: dashboardProductDraft.id,
      name,
      category,
      latestVersion: dashboardProductDraft.latestVersion.trim(),
      sheet: dashboardProductDraft.sheet,
      supportUrl: dashboardProductDraft.supportUrl?.trim() ?? '',
      compatibleProductIds: normalizeIdList(dashboardProductDraft.compatibleProductIds),
      softwareIds: [],
      driverIds: [],
    }

    const exists = dashboardProducts.some((product) => product.id === payload.id)
    const id = exists ? payload.id : createId('product')
    const next = exists
      ? dashboardProducts.map((product) => (product.id === id ? { ...payload, id } : product))
      : [...dashboardProducts, { ...payload, id }]
    updateDashboardProducts(next)
    setActiveDashboardProductId(id)
    setSelectedDashboardProductId(null)
    setDashboardProductDraft(getEmptyDashboardProductDraft())
  }

  const handleDeleteDashboardProduct = (product: DashboardProduct) => {
    if (!window.confirm(`Supprimer l’élément "${product.name}" ?`)) return
    const next = dashboardProducts.filter((entry) => entry.id !== product.id)
    updateDashboardProducts(next)
    if (selectedDashboardProductId === product.id) {
      setSelectedDashboardProductId(null)
      setDashboardProductDraft(getEmptyDashboardProductDraft())
    }
    if (activeDashboardProductId === product.id) {
      setActiveDashboardProductId(null)
    }
  }

  const handleSaveProductCatalogItem = () => {
    const name = productDraft.name.trim()
    if (!name) return

    const payload: ProductCatalogItem = {
      id: productDraft.id,
      name,
      spareParts: productDraft.spareParts.map((sparePart) => ({
        ...sparePart,
        name: sparePart.name.trim(),
        sku: sparePart.sku.trim(),
      })),
    }

    const exists = productCatalog.some((product) => product.id === payload.id)
    const id = exists ? payload.id : createId('catalog-product')
    const next = exists
      ? productCatalog.map((product) => (product.id === id ? { ...payload, id } : product))
      : [...productCatalog, { ...payload, id }]

    updateProductCatalog(next)
    setSelectedProductCatalogId(null)
    setProductDraft(getEmptyProductDraft())
  }

  const handleDeleteProductCatalogItem = (product: ProductCatalogItem) => {
    if (!window.confirm(`Supprimer le produit "${product.name}" ?`)) return

    updateProductCatalog(productCatalog.filter((entry) => entry.id !== product.id))
    updateDashboardProducts(
      dashboardVersionProducts.map((entry) => ({
        ...entry,
        compatibleProductIds: (entry.compatibleProductIds ?? []).filter((id) => id !== product.id),
      })),
    )

    if (selectedProductCatalogId === product.id) {
      setSelectedProductCatalogId(null)
      setProductDraft(getEmptyProductDraft())
    }
  }

  const handleSaveDashboardNews = () => {
    const title = dashboardNewsDraft.title.trim()
    if (!title) return

    const payload: DashboardNewsItem = {
      id: dashboardNewsDraft.id,
      date: dashboardNewsDraft.date.trim() || getTodayIsoDate(),
      title,
      content: dashboardNewsDraft.content.trim(),
    }

    const exists = dashboardNews.some((item) => item.id === payload.id)
    const id = exists ? payload.id : createId('dashboard-news')
    const next = exists
      ? dashboardNews.map((item) => (item.id === id ? { ...payload, id } : item))
      : [...dashboardNews, { ...payload, id }]

    updateDashboardNews(next)
    setSelectedDashboardNewsId(id)
    setDashboardNewsDraft({ ...payload, id })
  }

  const handleDeleteDashboardNews = (item: DashboardNewsItem) => {
    if (!window.confirm(`Supprimer la news "${item.title}" ?`)) return
    updateDashboardNews(dashboardNews.filter((entry) => entry.id !== item.id))
    if (selectedDashboardNewsId === item.id) {
      setSelectedDashboardNewsId(null)
      setDashboardNewsDraft(getEmptyDashboardNewsDraft())
    }
  }

  const updateProductDraftSpareParts = (next: SparePart[]) => {
    setProductDraft((prev) => ({
      ...prev,
      spareParts: next,
    }))
  }

  const addProductDraftSparePart = () => {
    updateProductDraftSpareParts([
      ...productDraft.spareParts,
      {
        id: createId('spare'),
        name: '',
        sku: '',
        guideAvailable: false,
      },
    ])
  }

  const updateProductDraftSparePart = (sparePartId: string, patch: Partial<SparePart>) => {
    updateProductDraftSpareParts(
      productDraft.spareParts.map((sparePart) =>
        sparePart.id === sparePartId ? { ...sparePart, ...patch } : sparePart,
      ),
    )
  }

  const removeProductDraftSparePart = (sparePartId: string) => {
    updateProductDraftSpareParts(
      productDraft.spareParts.filter((sparePart) => sparePart.id !== sparePartId),
    )
  }

  const renderPortalCodeEditorSettings = () => (
    <div className="portal-code-editor">
      {customerPortalCodes.length ? (
        customerPortalCodes.map((item) => {
          const isOpen = portalEditorOpenIds[item.id] ?? !item.procedureName.trim()

          return (
            <div className={`portal-code-editor__card${isOpen ? ' is-open' : ''}`} key={item.id}>
              <button
                className="portal-code-editor__summary"
                type="button"
                onClick={() => togglePortalEditorItem(item.id)}
                aria-expanded={isOpen}
              >
                <span className="portal-code-editor__summary-name">
                  {item.procedureName.trim() || 'Procédure sans nom'}
                </span>
                <span
                  className={`portal-code-editor__summary-arrow${isOpen ? ' is-open' : ''}`}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="9 6 15 12 9 18" />
                  </svg>
                </span>
              </button>

              {isOpen ? (
                <>
                  <div className="portal-code-editor__header">
                    <input
                      className="input"
                      value={item.procedureName}
                      placeholder="Nom de procédure"
                      onChange={(event) =>
                        updateCustomerPortalProcedure(item.id, {
                          procedureName: event.target.value,
                        })
                      }
                    />
                    <div className="portal-code-editor__header-actions">
                      {item.codes.length < 2 ? (
                        <button
                          className="btn btn--ghost btn--small"
                          type="button"
                          onClick={() => addCustomerPortalCodeLine(item.id)}
                        >
                          Ajouter un code
                        </button>
                      ) : null}
                      <button
                        className="icon-btn-sm danger"
                        type="button"
                        title="Supprimer"
                        onClick={() =>
                          updateCustomerPortalCodes(
                            customerPortalCodes.filter((entry) => entry.id !== item.id),
                          )
                        }
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="portal-code-editor__codes">
                    {item.codes.map((codeLine, index) => (
                      <div className="portal-code-editor__code-card" key={codeLine.id}>
                        <div className="portal-code-editor__row">
                          {item.codes.length > 1 ? (
                            <span className="portal-code-editor__index">{index + 1}</span>
                          ) : null}
                          <input
                            className="input"
                            value={codeLine.code}
                            placeholder={`Code portal ${index + 1}`}
                            onChange={(event) =>
                              updateCustomerPortalCodeLineItem(item.id, codeLine.id, {
                                code: event.target.value,
                              })
                            }
                          />
                          {item.codes.length > 1 ? (
                            <button
                              className="icon-btn-sm danger"
                              type="button"
                              title="Supprimer ce code"
                              onClick={() => removeCustomerPortalCodeLine(item.id, codeLine.id)}
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          ) : null}
                        </div>

                        <input
                          className="input"
                          value={codeLine.title ?? ''}
                          placeholder={`Titre de l'étape ${index + 1}`}
                          onChange={(event) =>
                            updateCustomerPortalCodeLineItem(item.id, codeLine.id, {
                              title: event.target.value,
                            })
                          }
                        />

                        <div className="portal-code-editor__options">
                          <label className="portal-code-editor__check">
                            <input
                              type="checkbox"
                              checked={Boolean(codeLine.showDraft)}
                              onChange={(event) =>
                                updateCustomerPortalCodeLineItem(item.id, codeLine.id, {
                                  showDraft: event.target.checked,
                                })
                              }
                            />
                            <span>Afficher Draft</span>
                          </label>

                          <label className="portal-code-editor__check">
                            <input
                              type="checkbox"
                              checked={Boolean(codeLine.showForward)}
                              onChange={(event) =>
                                updateCustomerPortalCodeLineItem(item.id, codeLine.id, {
                                  showForward: event.target.checked,
                                })
                              }
                            />
                            <span>Afficher Forward to</span>
                          </label>
                        </div>

                        {codeLine.showForward ? (
                          <input
                            className="input"
                            value={codeLine.forwardTarget ?? ''}
                            placeholder="Nom à afficher après Forward to"
                            onChange={(event) =>
                              updateCustomerPortalCodeLineItem(item.id, codeLine.id, {
                                forwardTarget: event.target.value,
                              })
                            }
                          />
                        ) : null}

                        <textarea
                          className="textarea portal-code-editor__note"
                          value={codeLine.infoNote ?? ''}
                          placeholder="Note affichée au survol du bouton i"
                          onChange={(event) =>
                            updateCustomerPortalCodeLineItem(item.id, codeLine.id, {
                              infoNote: event.target.value,
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          )
        })
      ) : (
        <div className="empty-state">Aucun code configuré.</div>
      )}
    </div>
  )

  const renderDashboardCatalogEditor = ({
    title,
    subtitle,
    items,
    defaultCategory,
    categoryOptions,
    emptyListMessage,
    emptySelectionMessage,
    latestVersionPlaceholder,
  }: {
    title: string
    subtitle: string
    items: DashboardProduct[]
    defaultCategory: DashboardProductCategory
    categoryOptions: DashboardProductCategory[]
    emptyListMessage: string
    emptySelectionMessage: string
    latestVersionPlaceholder: string
    fixedCategoryLabel: string
  }) => {
    const selectionVisible =
      selectedDashboardProductId === 'new'
        ? categoryOptions.includes(dashboardProductDraft.category)
        : items.some((product) => product.id === selectedDashboardProductId)

    return (
      <div className="list-card list-card--form">
        <div className="list-card__header">
          <div className="list-card__title-group">
            <div className="list-card__title">{title}</div>
            <div className="list-card__subtitle">{subtitle}</div>
          </div>
          <div className="list-card__tools">
            <button
              className="btn btn--ghost btn--small"
              type="button"
              onClick={() => {
                setDashboardProductDraft(getEmptyDashboardProductDraft(defaultCategory))
                setSelectedDashboardProductId('new')
              }}
            >
              Nouveau
            </button>
            <button
              className="btn btn--primary btn--small"
              type="button"
              onClick={handleSaveDashboardProduct}
            >
              Sauver
            </button>
          </div>
        </div>
        <div className="list-card__body">
          <div className="dashboard-product-editor">
            <div className="dashboard-product-editor__list">
              {items.length ? (
                items.map((product) => (
                  <div
                    key={product.id}
                    className={`list-item list-item--compact${
                      selectedDashboardProductId === product.id ? ' is-selected' : ''
                    }`}
                    onClick={() => {
                      setDashboardProductDraft({
                        ...product,
                        compatibleProductIds: [...(product.compatibleProductIds ?? [])],
                        softwareIds: [...(product.softwareIds ?? [])],
                        driverIds: [...(product.driverIds ?? [])],
                      })
                      setSelectedDashboardProductId(product.id)
                    }}
                  >
                    <div className="list-item__content">
                      <div className="list-item__title">{product.name}</div>
                      <div className="list-item__meta">
                        {dashboardProductCategoryLabels[product.category]} •{' '}
                        {product.latestVersion.trim() || 'Version non renseignée'}
                      </div>
                    </div>
                    <div className="list-item__actions">
                      <button
                        className="icon-btn-sm danger"
                        type="button"
                        title="Supprimer"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleDeleteDashboardProduct(product)
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">{emptyListMessage}</div>
              )}
            </div>

            <div className="dashboard-product-editor__form">
              {!selectionVisible || isDashboardProductSelectionEmpty ? (
                <div className="empty-state">{emptySelectionMessage}</div>
              ) : (
                <div className="form">
                  <input
                    className="input"
                    placeholder="Nom"
                    value={dashboardProductDraft.name}
                    onChange={(event) =>
                      setDashboardProductDraft((prev) => ({
                        ...prev,
                        name: event.target.value,
                      }))
                    }
                  />

                  <select
                    className="select select--roomy"
                    value={dashboardProductDraft.category}
                    onChange={(event) =>
                      setDashboardProductDraft((prev) => ({
                        ...prev,
                        category: event.target.value as DashboardProductCategory,
                      }))
                    }
                  >
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {dashboardProductCategoryLabels[category]}
                      </option>
                    ))}
                  </select>

                  <input
                    className="input"
                    placeholder={latestVersionPlaceholder}
                    value={dashboardProductDraft.latestVersion}
                    onChange={(event) =>
                      setDashboardProductDraft((prev) => ({
                        ...prev,
                        latestVersion: event.target.value,
                      }))
                    }
                  />

                  <input
                    className="input"
                    placeholder="URL support (optionnel)"
                    value={dashboardProductDraft.supportUrl ?? ''}
                    onChange={(event) =>
                      setDashboardProductDraft((prev) => ({
                        ...prev,
                        supportUrl: event.target.value,
                      }))
                    }
                  />

                  <div className="dashboard-product-editor__relations">
                    <div className="settings-label">Produits compatibles</div>
                    {productsSorted.length ? (
                      <div className="dashboard-product-editor__relation-list">
                        {productsSorted.map((product) => {
                          const checked = (dashboardProductDraft.compatibleProductIds ?? []).includes(
                            product.id,
                          )
                          return (
                            <label
                              className="dashboard-product-editor__relation-item"
                              key={product.id}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(event) =>
                                  setDashboardProductDraft((prev) => ({
                                    ...prev,
                                    compatibleProductIds: event.target.checked
                                      ? [...(prev.compatibleProductIds ?? []), product.id]
                                      : (prev.compatibleProductIds ?? []).filter(
                                          (id) => id !== product.id,
                                        ),
                                  }))
                                }
                              />
                              <span>{product.name}</span>
                            </label>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="list-item__meta">
                        Ajoutez d’abord des produits dans Paramètres &gt; Produits.
                      </div>
                    )}
                  </div>

                  <div className="token-buttons">
                    <button
                      type="button"
                      className="token-btn token-btn--bold"
                      title="Gras"
                      onClick={() => insertDashboardProductSheetWrap('[b]', '[/b]', 'texte')}
                    >
                      B
                    </button>
                    <button
                      type="button"
                      className="token-btn token-btn--italic"
                      title="Italique"
                      onClick={() => insertDashboardProductSheetWrap('[i]', '[/i]', 'texte')}
                    >
                      I
                    </button>
                    <button
                      type="button"
                      className="token-btn token-btn--link"
                      title="Lien"
                      onClick={insertDashboardProductSheetLink}
                    >
                      L
                    </button>
                  </div>

                  <textarea
                    className="textarea textarea--tall"
                    ref={dashboardProductSheetRef}
                    placeholder="Notes, compatibilité, liens..."
                    value={dashboardProductDraft.sheet}
                    onChange={(event) =>
                      setDashboardProductDraft((prev) => ({
                        ...prev,
                        sheet: event.target.value,
                      }))
                    }
                  />

                  <div className="list-item__meta">
                    Mise en forme supportée : [b][/b], [i][/i], [texte](https://...)
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handlePullSupportSite = () => {
    const productUrl = activeDashboardProduct?.supportUrl?.trim()
    const targetUrl = productUrl || DEFAULT_SUPPORT_SITE_URL
    if (!targetUrl.startsWith('http')) {
      setToast('URL support invalide.')
      return
    }
    openExternal(targetUrl)
  }

  const handleOpenProcedure = () => {
    openProcedure()
  }

  const handleClearEmail = () => {
    if (!clearArmed) {
      setClearArmed(true)
      window.setTimeout(() => setClearArmed(false), 2000)
      return
    }
    updateEmailDraft('')
    setClearArmed(false)
  }

  const handleClearTask = () => {
    if (!taskClearArmed) {
      setTaskClearArmed(true)
      window.setTimeout(() => setTaskClearArmed(false), 2000)
      return
    }
    updateTaskDraft('')
    setTaskClearArmed(false)
  }

  const handleClearData = () => {
    if (!clearAllArmed) {
      setClearAllArmed(true)
      window.setTimeout(() => setClearAllArmed(false), 2400)
      return
    }
    const nextData = JSON.parse(JSON.stringify(defaultData)) as AppData
    setData(nextData)
    setActiveCategoryId('all')
    setEditSnippetCategoryId('all')
    setSelectedCategoryId(null)
    setSelectedSnippetId(null)
    setSelectedTemplateId(null)
    setSelectedTaskId(null)
    setSelectedProcedureId(null)
    setSelectedDashboardProductId(null)
    setSelectedProductCatalogId(null)
    setCategoryDraft({ id: '', name: '', color: 'violet' })
    setSnippetDraft({
      id: '',
      title: '',
      content: '',
      insertMode: defaultData.settings.defaultSnippetInsertMode,
      taskText: '',
      taskOptional: false,
      categoryId: '',
    })
    setTemplateDraft({
      id: '',
      name: '',
      content: '',
      language: 'fr',
      taskText: '',
      taskOptional: false,
      taskTemplateId: '',
      taskCustom: false,
    })
    setTaskDraft({ id: '', name: '', content: '' })
    setProcedureDraft({
      id: '',
      name: '',
      productName: '',
      language: 'fr',
      brand: 'hercules',
      coverage: 'oow',
      infoText: '',
      optionalNotes: '',
      steps: '',
      taskTemplateId: '',
      taskCustom: false,
      taskText: '',
    })
    setProcedureInfoDraft('')
    setDashboardProductDraft(getEmptyDashboardProductDraft())
    setProductDraft(getEmptyProductDraft())
    setDashboardNewsDraft(getEmptyDashboardNewsDraft())
    if (dashboardCalculatorCopyTimeoutRef.current !== null) {
      window.clearTimeout(dashboardCalculatorCopyTimeoutRef.current)
      dashboardCalculatorCopyTimeoutRef.current = null
    }
    setDashboardCalculatorItems([createDashboardCalculatorItem()])
    setDashboardCalculatorCopiedKey(null)
    setProcedureChecks({})
    setActiveProcedureId(null)
    setActiveDashboardProductId(null)
    setActiveDashboardProcedureProduct(null)
    setDashboardProductQuery('')
    setDashboardSparePartQuery('')
    setDashboardProcedureQuery('')
    setSnippetTooltip(null)
    setMailInsertMode('line')
    setNoteImportFeedbackVisible(false)
    setPortalDashboardOpenIds({})
    setPortalEditorOpenIds({})
    setClearAllArmed(false)
    setToast('Données effacées.')
  }

  const handleExportJson = async () => {
    const payload = normalizeData(data, defaultData)
    const result = await exportJson(payload)
    if (!result.canceled) setToast('Export JSON terminé.')
  }

  const handleExportHistory = async () => {
    const entries = data.history.map((item) => item.content.trim()).filter(Boolean)
    if (!entries.length) {
      setToast('Historique vide.')
      return
    }
    const payload = entries.join('\n\n-----\n\n')
    const result = await exportHistory(payload)
    if (!result.canceled) {
      setData((prev) => ({ ...prev, history: [] }))
      setToast('Historique exporté.')
    }
  }

  const handleImportReplace = async () => {
    const result = await importJson()
    if (result.canceled || !result.data) return
    const normalized = normalizeData(result.data as Partial<AppData>, defaultData)
    const converted = convertLegacyTokensInData(normalized)
    setData(converted)
    setToast('Import remplacé.')
  }

  const handleImportMerge = async () => {
    const result = await importJson()
    if (result.canceled || !result.data) return
    const normalized = normalizeData(result.data as Partial<AppData>, defaultData)
    const converted = convertLegacyTokensInData(normalized)
    setData((prev) => mergeData(prev, converted))
    setToast('Import fusionné.')
  }

  const handleImportClick = async (event: MouseEvent<HTMLButtonElement>) => {
    const shouldReplace = event.shiftKey
    if (shouldReplace) {
      await handleImportReplace()
      return
    }
    await handleImportMerge()
  }

  const handleCategorySave = () => {
    if (!categoryDraft.name.trim()) return
    setData((prev) => {
      const exists = prev.categories.some((category) => category.id === categoryDraft.id)
      const id = exists ? categoryDraft.id : createId('cat')
      const next = exists
        ? prev.categories.map((category) =>
            category.id === id ? { ...categoryDraft, id } : category,
          )
        : [...prev.categories, { ...categoryDraft, id }]
      return { ...prev, categories: next }
    })
    setCategoryDraft({ id: '', name: '', color: 'violet' })
    setSelectedCategoryId(null)
  }

  const handleSnippetSave = () => {
    if (!snippetDraft.title.trim()) return
    const categoryId = categoryIdSet.has(snippetDraft.categoryId)
      ? snippetDraft.categoryId
      : data.categories[0]?.id
    if (!categoryId) return
    setData((prev) => {
      const exists = prev.snippets.some((snippet) => snippet.id === snippetDraft.id)
      const id = exists ? snippetDraft.id : createId('snip')
      const next = exists
        ? prev.snippets.map((snippet) =>
            snippet.id === id ? { ...snippetDraft, id, categoryId } : snippet,
          )
        : [...prev.snippets, { ...snippetDraft, id, categoryId }]
      return { ...prev, snippets: next }
    })
    setSnippetDraft(getEmptySnippetDraft())
    setSelectedSnippetId(null)
  }

  const handleSnippetReorder = (next: Snippet[]) => {
    if (editSnippetCategoryId === 'all') {
      setData((prev) => ({ ...prev, snippets: next }))
      return
    }
    setData((prev) => {
      let index = 0
      const merged = prev.snippets.map((snippet) =>
        snippet.categoryId === editSnippetCategoryId ? next[index++] : snippet,
      )
      return { ...prev, snippets: merged }
    })
  }

  const handleTemplateSave = () => {
    if (!templateDraft.name.trim()) return
    setData((prev) => {
      const exists = prev.templates.some((template) => template.id === templateDraft.id)
      const id = exists ? templateDraft.id : createId('tmpl')
      const next = exists
        ? prev.templates.map((template) => (template.id === id ? { ...templateDraft, id } : template))
        : [...prev.templates, { ...templateDraft, id }]
      return { ...prev, templates: next }
    })
    setTemplateDraft(getEmptyTemplateDraft())
    setSelectedTemplateId(null)
  }

  const handleTaskTemplateSave = () => {
    if (!taskDraft.name.trim()) return
    setData((prev) => {
      const exists = prev.taskTemplates.some((task) => task.id === taskDraft.id)
      const id = exists ? taskDraft.id : createId('task')
      const next = exists
        ? prev.taskTemplates.map((task) => (task.id === id ? { ...taskDraft, id } : task))
        : [...prev.taskTemplates, { ...taskDraft, id }]
      return { ...prev, taskTemplates: next }
    })
    setTaskDraft({ id: '', name: '', content: '' })
    setSelectedTaskId(null)
  }

  const handleProcedureSave = () => {
    if (!procedureDraft.name.trim()) return
    setData((prev) => {
      const exists = prev.procedures.some((procedure) => procedure.id === procedureDraft.id)
      const id = exists ? procedureDraft.id : createId('proc')
      const payload = sanitizeProcedureDraft(procedureDraft as Procedure & { categoryId?: string })
      const next = exists
        ? prev.procedures.map((procedure) => (procedure.id === id ? { ...payload, id } : procedure))
        : [...prev.procedures, { ...payload, id }]
      return { ...prev, procedures: next }
    })
    setProcedureDraft(getEmptyProcedureDraft())
    setSelectedProcedureId(null)
  }

  const handleProcedureReorder = (next: Procedure[]) => {
    setData((prev) => ({ ...prev, procedures: next }))
  }

  const deleteCategory = (category: Category) => {
    if (!window.confirm(`Supprimer la catégorie "${category.name}" ?`)) return
    setData((prev) => ({
      ...prev,
      categories: prev.categories.filter((item) => item.id !== category.id),
      snippets: prev.snippets.filter((snippet) => snippet.categoryId !== category.id),
    }))
    if (activeCategoryId === category.id) setActiveCategoryId('all')
  }

  const deleteSnippet = (snippet: Snippet) => {
    if (!window.confirm(`Supprimer le snippet "${snippet.title}" ?`)) return false
    setData((prev) => ({
      ...prev,
      snippets: prev.snippets.filter((item) => item.id !== snippet.id),
    }))
    return true
  }

  const deleteTemplate = (template: MailTemplate) => {
    if (!window.confirm(`Supprimer le template "${template.name}" ?`)) return
    setData((prev) => ({
      ...prev,
      templates: prev.templates.filter((item) => item.id !== template.id),
    }))
  }

  const deleteTaskTemplate = (task: TaskTemplate) => {
    if (!window.confirm(`Supprimer le template "${task.name}" ?`)) return
    setData((prev) => ({
      ...prev,
      taskTemplates: prev.taskTemplates.filter((item) => item.id !== task.id),
    }))
  }

  const deleteProcedure = (procedure: Procedure) => {
    if (!window.confirm(`Supprimer la procédure "${procedure.name}" ?`)) return
    setData((prev) => ({
      ...prev,
      procedures: prev.procedures.filter((item) => item.id !== procedure.id),
    }))
  }

  const showSnippetTooltip = (snippet: Snippet, event: MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const tooltipWidth = 340
    const gutter = 12
    const tooltipHeight = Math.min(300, window.innerHeight - gutter * 2)
    let x = rect.right + gutter
    let y = rect.top
    if (x + tooltipWidth > window.innerWidth - gutter) {
      x = rect.left - tooltipWidth - gutter
    }
    if (y + tooltipHeight > window.innerHeight - gutter) {
      y = rect.bottom - tooltipHeight
    }
    y = Math.max(gutter, Math.min(y, window.innerHeight - tooltipHeight - gutter))
    setSnippetTooltip({ text: snippet.content, x, y })
  }

  const hideSnippetTooltip = () => setSnippetTooltip(null)

  const showPortalInfoTooltip = (text: string, anchor: HTMLElement) => {
    const rect = anchor.getBoundingClientRect()
    const tooltipWidth = 320
    const gutter = 2
    const tooltipHeight = Math.min(220, window.innerHeight - 12)
    let x = rect.right + gutter
    let y = rect.top - 8

    if (x + tooltipWidth > window.innerWidth - gutter) {
      x = rect.left - tooltipWidth - gutter
    }
    if (x < gutter) {
      x = gutter
    }
    y = Math.max(6, Math.min(y, window.innerHeight - tooltipHeight - 6))

    setPortalInfoTooltip({ text, x, y })
  }

  const hidePortalInfoTooltip = () => setPortalInfoTooltip(null)

  const openLink = (url: string) => {
    if (!url.startsWith('http')) return
    openExternal(url)
  }

  const handleProcedureLinkClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null
    if (!target) return
    const anchor = target.closest('a')
    if (!anchor || !(anchor instanceof HTMLAnchorElement)) return
    event.preventDefault()
    openExternal(anchor.href)
  }

  const procedureInfoText = activeProcedure ? procedureInfoDraft : ''
  const procedureNotesText = activeProcedure?.optionalNotes ?? ''
  const procedureNotesValue = procedureNotesText.trim()
    ? procedureNotesText
    : 'Aucune note optionnelle.'
  const procedureSteps = activeProcedure
    ? activeProcedure.steps
        .split('\n')
        .map((line) => line.trimEnd())
        .filter((line) => line.trim() !== '')
        .map((line) => {
          const trimmed = line.trimStart()
          const isCheckable = trimmed.startsWith(PROCEDURE_CHECK_MARKER)
          const text = isCheckable
            ? trimmed.slice(PROCEDURE_CHECK_MARKER.length).trimStart()
            : trimmed
          return { text, isCheckable }
        })
    : []
  const procedureTaskText = activeProcedure ? getProcedureTaskText(activeProcedure) : ''
  const dashboardCalculatorEntries = dashboardCalculatorItems.map((item) => ({
    ...item,
    productAmount: parseDashboardAmount(item.productPrice) ?? 0,
    shippingAmount: parseDashboardAmount(item.shippingPrice) ?? 0,
  }))
  const dashboardProductsTotalTtc = dashboardCalculatorEntries.reduce(
    (sum, item) => sum + item.productAmount,
    0,
  )
  const dashboardShippingValues = dashboardCalculatorEntries
    .map((item) => item.shippingAmount)
    .filter((value) => value > 0)
    .sort((left, right) => right - left)
  const dashboardShippingTotalTtc =
    dashboardShippingValues.length > 0
      ? dashboardShippingValues[0] +
        dashboardShippingValues.slice(1).reduce((sum, value) => sum + value / 2, 0)
      : 0
  const dashboardGrandTotalTtc = dashboardProductsTotalTtc + dashboardShippingTotalTtc
  const dashboardProductsTotalHt = dashboardProductsTotalTtc / VAT_DIVISOR
  const dashboardShippingTotalHt = dashboardShippingTotalTtc / VAT_DIVISOR
  const dashboardGrandTotalHt = dashboardGrandTotalTtc / VAT_DIVISOR

  const renderSettingsSlider = (
    label: string,
    valueLabel: string,
    minLabel: string,
    maxLabel: string,
    value: number,
    min: number,
    max: number,
    step: number | string,
    onChange: (next: number) => void,
    options?: {
      description?: string
      disabled?: boolean
    },
  ) => {
    const progress = getSliderProgress(value, min, max)
    const sliderBackground = `linear-gradient(90deg, rgba(83, 169, 255, 0.78) 0%, rgba(83, 169, 255, 0.78) ${progress}, rgba(255, 255, 255, 0.12) ${progress}, rgba(255, 255, 255, 0.12) 100%)`

    return (
      <div className={`settings-slider${options?.disabled ? ' is-disabled' : ''}`}>
        <div className="settings-slider__head">
          <div className="settings-slider__meta">
            <div className="settings-slider__label">{label}</div>
            {options?.description ? (
              <div className="settings-slider__description">{options.description}</div>
            ) : null}
          </div>
          <div className="settings-slider__value">{valueLabel}</div>
        </div>
        <input
          className="range range--settings"
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={options?.disabled}
          style={{ background: sliderBackground }}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <div className="settings-slider__legend">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      </div>
    )
  }

  const renderWorkspaceDashboardNameFormatter = (title: string) => (
    <article className="workspace-dashboard__panel workspace-dashboard__panel--formatter">
      <div className="workspace-dashboard__panel-title">{title}</div>
      <div className="dashboard-formatter">
        <div className="dashboard-formatter__input-wrap">
          <span className="dashboard-formatter__icon" aria-hidden="true">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c1.7-4 5-6 8-6s6.3 2 8 6" />
            </svg>
          </span>
          <input
            className="input dashboard-formatter__input"
            value={nameFormatterValue}
            onChange={(event) => setNameFormatterValue(event.target.value)}
            placeholder="Nom prenom"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void handleFormatName()
              }
            }}
          />
        </div>
        <button
          className="primary dashboard-formatter__action"
          type="button"
          onClick={() => void handleFormatName()}
          disabled={!nameFormatterValue.trim()}
        >
          Formater & copier
        </button>
      </div>
    </article>
  )

  const renderWorkspaceDashboardToolsFiller = () => (
    <article className="workspace-dashboard__panel workspace-dashboard__panel--filler">
      <div className="dashboard-placeholder">
        <strong>WIP</strong>
      </div>
    </article>
  )

  const renderWorkspaceDashboardVatPanel = (title: string) => (
    <article className="workspace-dashboard__panel workspace-dashboard__panel--calculator">
      <div className="workspace-dashboard__panel-title">{title}</div>
      <div className="dashboard-calculator">
        <div className="dashboard-calculator__scroll">
          <div className="dashboard-calculator__list">
            {dashboardCalculatorItems.map((item, index) => (
              <div className="dashboard-calculator__item" key={item.id}>
                <div className="dashboard-calculator__item-grid">
                  <span className="dashboard-calculator__item-index">{index + 1}</span>
                  <label className="dashboard-calculator__field dashboard-calculator__field--inline">
                    <span className="dashboard-calculator__label">Produit TTC</span>
                    <input
                      className="input"
                      value={item.productPrice}
                      onChange={(event) =>
                        updateDashboardCalculatorItem(item.id, 'productPrice', event.target.value)
                      }
                      placeholder="119,99"
                      inputMode="decimal"
                      aria-label={`Produit TTC ligne ${index + 1}`}
                    />
                  </label>
                  <label className="dashboard-calculator__field dashboard-calculator__field--inline">
                    <span className="dashboard-calculator__label">Livraison TTC</span>
                    <input
                      className="input"
                      value={item.shippingPrice}
                      onChange={(event) =>
                        updateDashboardCalculatorItem(item.id, 'shippingPrice', event.target.value)
                      }
                      placeholder="14,99"
                      inputMode="decimal"
                      aria-label={`Livraison TTC ligne ${index + 1}`}
                    />
                  </label>
                  <button
                    className="icon-btn-sm danger dashboard-calculator__remove"
                    type="button"
                    title="Supprimer cette ligne"
                    onClick={() => removeDashboardCalculatorItem(item.id)}
                    disabled={dashboardCalculatorItems.length === 1}
                  >
                    <CloseIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            className="btn btn--ghost btn--small dashboard-calculator__add"
            type="button"
            onClick={addDashboardCalculatorItem}
          >
            + Ajouter une ligne
          </button>
        </div>

        <div className="dashboard-calculator__results">
          <div className="dashboard-calculator__result">
            <div className="dashboard-calculator__result-head">
              <span className="dashboard-calculator__result-label">Produits</span>
            </div>
            <div className="dashboard-calculator__result-values">
              <div className="dashboard-calculator__result-value">
                <span className="dashboard-calculator__result-sub-label">TTC</span>
                <div className="dashboard-calculator__result-value-main">
                  <strong>{formatEuroAmount(dashboardProductsTotalTtc)}</strong>
                  <button
                    className={`icon-btn-sm dashboard-copy-icon${
                      dashboardCalculatorCopiedKey === 'productsTtc' ? ' is-success' : ''
                    }`}
                    type="button"
                    title="Copier le total produits TTC"
                    aria-label="Copier le total produits TTC"
                    onClick={() =>
                      void handleCopyDashboardAmount('productsTtc', dashboardProductsTotalTtc)
                    }
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="11" height="11" rx="2" />
                      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="dashboard-calculator__result-value">
                <span className="dashboard-calculator__result-sub-label">HT</span>
                <div className="dashboard-calculator__result-value-main">
                  <strong>{formatEuroAmount(dashboardProductsTotalHt)}</strong>
                  <button
                    className={`icon-btn-sm dashboard-copy-icon${
                      dashboardCalculatorCopiedKey === 'productsHt' ? ' is-success' : ''
                    }`}
                    type="button"
                    title="Copier le total produits HT"
                    aria-label="Copier le total produits HT"
                    onClick={() =>
                      void handleCopyDashboardAmount('productsHt', dashboardProductsTotalHt)
                    }
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="11" height="11" rx="2" />
                      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-calculator__result">
            <div className="dashboard-calculator__result-head">
              <span className="dashboard-calculator__result-label">Livraison</span>
            </div>
            <div className="dashboard-calculator__result-values">
              <div className="dashboard-calculator__result-value">
                <span className="dashboard-calculator__result-sub-label">TTC</span>
                <div className="dashboard-calculator__result-value-main">
                  <strong>{formatEuroAmount(dashboardShippingTotalTtc)}</strong>
                  <button
                    className={`icon-btn-sm dashboard-copy-icon${
                      dashboardCalculatorCopiedKey === 'shippingTtc' ? ' is-success' : ''
                    }`}
                    type="button"
                    title="Copier le total livraison TTC"
                    aria-label="Copier le total livraison TTC"
                    onClick={() =>
                      void handleCopyDashboardAmount('shippingTtc', dashboardShippingTotalTtc)
                    }
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="11" height="11" rx="2" />
                      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="dashboard-calculator__result-value">
                <span className="dashboard-calculator__result-sub-label">HT</span>
                <div className="dashboard-calculator__result-value-main">
                  <strong>{formatEuroAmount(dashboardShippingTotalHt)}</strong>
                  <button
                    className={`icon-btn-sm dashboard-copy-icon${
                      dashboardCalculatorCopiedKey === 'shippingHt' ? ' is-success' : ''
                    }`}
                    type="button"
                    title="Copier le total livraison HT"
                    aria-label="Copier le total livraison HT"
                    onClick={() =>
                      void handleCopyDashboardAmount('shippingHt', dashboardShippingTotalHt)
                    }
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="11" height="11" rx="2" />
                      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-calculator__result dashboard-calculator__result--total">
            <div className="dashboard-calculator__result-head">
              <span className="dashboard-calculator__result-label">Total</span>
            </div>
            <div className="dashboard-calculator__result-values">
              <div className="dashboard-calculator__result-value">
                <span className="dashboard-calculator__result-sub-label">TTC</span>
                <div className="dashboard-calculator__result-value-main">
                  <strong>{formatEuroAmount(dashboardGrandTotalTtc)}</strong>
                  <button
                    className={`icon-btn-sm dashboard-copy-icon${
                      dashboardCalculatorCopiedKey === 'totalTtc' ? ' is-success' : ''
                    }`}
                    type="button"
                    title="Copier le total TTC"
                    aria-label="Copier le total TTC"
                    onClick={() => void handleCopyDashboardAmount('totalTtc', dashboardGrandTotalTtc)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="11" height="11" rx="2" />
                      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="dashboard-calculator__result-value">
                <span className="dashboard-calculator__result-sub-label">HT</span>
                <div className="dashboard-calculator__result-value-main">
                  <strong>{formatEuroAmount(dashboardGrandTotalHt)}</strong>
                  <button
                    className={`icon-btn-sm dashboard-copy-icon${
                      dashboardCalculatorCopiedKey === 'totalHt' ? ' is-success' : ''
                    }`}
                    type="button"
                    title="Copier le total HT"
                    aria-label="Copier le total HT"
                    onClick={() => void handleCopyDashboardAmount('totalHt', dashboardGrandTotalHt)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="11" height="11" rx="2" />
                      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  )

  const renderDashboardCatalogPanel = (title: string, searchPlaceholder: string, emptyTitle: string) => (
    <article className="workspace-dashboard__panel workspace-dashboard__panel--catalog">
      <div className="workspace-dashboard__panel-title">{title}</div>
      <div className="dashboard-versions-tools">
        <div className="dashboard-version-search">
          <input
            className="input"
            value={dashboardProductQuery}
            onChange={(event) => setDashboardProductQuery(event.target.value)}
            placeholder={searchPlaceholder}
          />
        </div>

        <button
          className="ghost dashboard-support-btn"
          type="button"
          onClick={handlePullSupportSite}
          disabled={!activeDashboardProduct}
        >
          Ouvrir support
        </button>
      </div>

      <div className="dashboard-version-browser">
        <div className="dashboard-version-browser__list">
          {versionProductsByCategory.some((group) => group.items.length) ? (
            versionProductsByCategory.map((group) =>
              group.items.length ? (
                <section className="dashboard-version-group" key={group.category}>
                  <div className="dashboard-version-group__title">{group.label}</div>
                  <div className="dashboard-version-group__list">
                    {group.items.map((product) => (
                      <button
                        key={product.id}
                        className={`dashboard-version-item${
                          activeDashboardProductId === product.id ? ' is-active' : ''
                        }`}
                        type="button"
                        onClick={() => setActiveDashboardProductId(product.id)}
                      >
                        <span className="dashboard-version-item__name">{product.name}</span>
                        <span className="dashboard-version-item__meta">
                          {product.latestVersion.trim() || 'Version non renseignée'}
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null,
            )
          ) : (
            <div className="dashboard-empty">Aucun élément configuré dans Paramètres.</div>
          )}
        </div>

        <div className="dashboard-version-detail">
          {activeDashboardProduct ? (
            <>
              <div className="dashboard-version-detail__header">
                <div>
                  <div className="dashboard-version-detail__title">{activeDashboardProduct.name}</div>
                  <div className="dashboard-version-detail__badges">
                    <span className="dashboard-version-detail__badge">
                      {dashboardProductCategoryLabels[activeDashboardProduct.category]}
                    </span>
                    <span className="dashboard-version-detail__badge dashboard-version-detail__badge--accent">
                      {activeDashboardProduct.latestVersion.trim() || 'Version non renseignée'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="dashboard-version-detail__section">
                <div className="dashboard-version-detail__label">Produits compatibles</div>
                {activeDashboardVersionCompatibleProducts.length ? (
                  <div className="dashboard-compatible-products">
                    {activeDashboardVersionCompatibleProducts.map((product) => (
                      <span className="dashboard-compatible-products__item" key={product.id}>
                        {product.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="dashboard-empty">Aucun produit compatible renseigné.</div>
                )}
              </div>

              <div className="dashboard-version-detail__section">
                <div className="dashboard-version-detail__label">Notes</div>
                <div className="dashboard-product-sheet" onClick={handleProcedureLinkClick}>
                  <div
                    className="dashboard-product-sheet__content"
                    dangerouslySetInnerHTML={{
                      __html: formatProcedureText(
                        activeDashboardProduct.sheet || 'Aucune note renseignée.',
                      ),
                    }}
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="dashboard-wip">
              <strong>{emptyTitle}</strong>
              <span>Sélectionnez un élément pour afficher ses détails.</span>
            </div>
          )}
        </div>
      </div>
    </article>
  )

  const renderWorkspaceDashboardSparePartsPanel = (title: string) => (
    <article className="workspace-dashboard__panel workspace-dashboard__panel--catalog">
      <div className="workspace-dashboard__panel-title">{title}</div>
      <div className="dashboard-versions-tools">
        <div className="dashboard-version-search">
          <input
            className="input"
            value={dashboardSparePartQuery}
            onChange={(event) => setDashboardSparePartQuery(event.target.value)}
            placeholder="Rechercher un produit, un nom de spare part ou un SKU..."
          />
        </div>
      </div>
      <div className="dashboard-spare-parts">
        {filteredProductsWithSpareParts.length ? (
          filteredProductsWithSpareParts.map((product) => (
            <section className="dashboard-spare-parts__group" key={product.id}>
              <div className="dashboard-spare-parts__header">
                <div className="dashboard-spare-parts__title">{product.name}</div>
                <div className="dashboard-spare-parts__count">
                  {product.spareParts.length} spare part{product.spareParts.length > 1 ? 's' : ''}
                </div>
              </div>
              <div className="dashboard-spare-parts__list">
                {product.spareParts.length ? (
                  product.spareParts.map((sparePart) => (
                    <article className="dashboard-spare-parts__item" key={sparePart.id}>
                      <div>
                        <div className="dashboard-spare-parts__name">{sparePart.name || 'Sans nom'}</div>
                        <div className="dashboard-spare-parts__sku">
                          SKU: {sparePart.sku || 'Non renseigné'}
                        </div>
                      </div>
                      <span
                        className={`dashboard-spare-parts__badge${
                          sparePart.guideAvailable ? ' is-available' : ''
                        }`}
                      >
                        {sparePart.guideAvailable ? 'Guide disponible' : 'Guide indisponible'}
                      </span>
                    </article>
                  ))
                ) : (
                  <div className="dashboard-empty">Aucune spare part pour ce produit.</div>
                )}
              </div>
            </section>
          ))
        ) : (
          <div className="dashboard-wip">
            <strong>Spare parts</strong>
            <span>Aucune spare part configurée.</span>
          </div>
        )}
      </div>
    </article>
  )

  const renderWorkspaceDashboardPortalPanel = (title: string) => (
    <article className="workspace-dashboard__panel workspace-dashboard__panel--portal">
      <div className="workspace-dashboard__panel-title">{title}</div>
      <PortalCodeList
        items={customerPortalCodes}
        copiedId={portalCopiedId}
        onCopy={(id, code) => void handleCopyPortalCode(id, code)}
        onToggle={togglePortalDashboardItem}
        title="Portal Procédure"
        expandedIds={portalDashboardOpenIds}
        onInfoEnter={showPortalInfoTooltip}
        onInfoLeave={hidePortalInfoTooltip}
      />
    </article>
  )

  const renderWorkspaceDashboardTroubleshootingPanel = (title: string) => (
    <article className="workspace-dashboard__panel workspace-dashboard__panel--troubleshooting">
      <div className="workspace-dashboard__panel-title">{title}</div>
      <div className="dashboard-wip">
        <strong>Troubleshotgun</strong>
        <span>WIP</span>
      </div>
    </article>
  )

  const renderWorkspaceDashboardNewsPanel = (title: string) => (
    <article className="workspace-dashboard__panel workspace-dashboard__panel--recent">
      <div className="workspace-dashboard__panel-title">{title}</div>
      <div className="dashboard-news-list">
        {dashboardNewsSorted.length ? (
          dashboardNewsSorted.map((item) => (
            <article className="dashboard-news-item" key={item.id}>
              <div className="dashboard-news-item__date">{formatDashboardNewsDate(item.date)}</div>
              <div className="dashboard-news-item__title">{item.title || 'Sans titre'}</div>
              <div
                className="dashboard-news-item__content"
                onClick={handleProcedureLinkClick}
                dangerouslySetInnerHTML={{
                  __html: formatProcedureText(item.content.trim() || 'Aucun contenu.'),
                }}
              />
            </article>
          ))
        ) : (
          <div className="dashboard-wip">
            <strong>News</strong>
            <span>Aucune news configurée.</span>
          </div>
        )}
      </div>
    </article>
  )

  const renderWorkspaceDashboardContent = () => {
    if (workspaceDashboardPage === 'tools') {
      return (
        <div className="workspace-dashboard__single workspace-dashboard__single--tools">
          <div className="workspace-dashboard__left">
            {renderWorkspaceDashboardNameFormatter('Name format')}
            {renderWorkspaceDashboardToolsFiller()}
          </div>
          {renderWorkspaceDashboardVatPanel('Price calculator')}
        </div>
      )
    }

    if (workspaceDashboardPage === 'portal') {
      return (
        <div className="workspace-dashboard__single">
          {renderWorkspaceDashboardPortalPanel('Portal procédures')}
        </div>
      )
    }

    if (workspaceDashboardPage === 'versions') {
      return (
        <div className="workspace-dashboard__single">
          {renderDashboardCatalogPanel(
            'Versions (soft / firm / driver)',
            'Rechercher un soft, un firmware ou un driver...',
            'Catalogue de versions',
          )}
        </div>
      )
    }

    if (workspaceDashboardPage === 'parts') {
      return (
        <div className="workspace-dashboard__single">
          {renderWorkspaceDashboardSparePartsPanel('Spare parts')}
        </div>
      )
    }

    if (workspaceDashboardPage === 'troubleshooting') {
      return (
        <div className="workspace-dashboard__single">
          {renderWorkspaceDashboardTroubleshootingPanel('Troubleshotgun (by product)')}
        </div>
      )
    }

    return (
      <div className="workspace-dashboard__single">
        {renderWorkspaceDashboardNewsPanel('News')}
      </div>
    )
  }

  const renderDashboardPageNavigation = () => (
    <div className="dashboard-shell__nav">
      {workspaceDashboardPageOptions.map((page) => (
        <button
          key={page.id}
          type="button"
          className={`dashboard-page-btn${
            workspaceDashboardPage === page.id ? ' is-active' : ''
          }`}
          title={page.title}
          aria-label={page.title}
          onClick={() => handleSelectWorkspaceDashboardPage(page.id)}
        >
          {page.label}
        </button>
      ))}
    </div>
  )

  if (!loaded) {
    return (
      <div className={`app-loading${isProcedureWindow ? ' app-loading--procedure' : ''}`}>
        <div className="app-loading__card">
          <div className="app-loading__title">Chargement des données…</div>
        </div>
      </div>
    )
  }

  if (isProcedureWindow) {
    return (
      <>
        <div className="dashboard-shell">
          <div className="dashboard-main">
            <header className="dashboard-header">
              <div>
                <div className="dashboard-header__title">Dashboard</div>
                <div className="dashboard-header__subtitle">
                  Navigation Typemail réorganisée sur 6 pages.
                </div>
              </div>
              <button className="ghost" type="button" onClick={() => window.close()}>
                Fermer
              </button>
            </header>

            {renderDashboardPageNavigation()}

            <div className="dashboard-browser">{renderWorkspaceDashboardContent()}</div>
          </div>
        </div>
        {showLegacyProcedureUI ? (
      <div className="procedure-shell">
        <aside className="procedure-sidebar">
          <div className="procedure-sidebar__header">
            <div className="procedure-title">Procédures</div>
            <div className="procedure-search-wrap">
              <input
                value={procedureQuery}
                onChange={(event) => setProcedureQuery(event.target.value)}
                placeholder="Rechercher une procédure..."
              />
            </div>
            <div className="procedure-toolbar">
              <div className="procedure-filters">
                <div className="procedure-filter-group procedure-filter-group--brand">
                  <button
                    type="button"
                    className={`procedure-filter-btn${
                      procedureBrand === 'hercules' ? ' is-active' : ''
                    }`}
                    onClick={() => setProcedureBrand('hercules')}
                    title="Hercules"
                    aria-pressed={procedureBrand === 'hercules'}
                  >
                    <img src={herculesLogo} alt="Hercules" />
                    <span>Hercules</span>
                  </button>
                  <button
                    type="button"
                    className={`procedure-filter-btn${
                      procedureBrand === 'thrustmaster' ? ' is-active' : ''
                    }`}
                    onClick={() => setProcedureBrand('thrustmaster')}
                    title="Thrustmaster"
                    aria-pressed={procedureBrand === 'thrustmaster'}
                  >
                    <img src={thrustmasterLogo} alt="Thrustmaster" />
                    <span>Thrustmaster</span>
                  </button>
                </div>
                <div className="procedure-filter-group procedure-filter-group--coverage">
                  <button
                    type="button"
                    className={`procedure-filter-btn${
                      procedureCoverage === 'oow' ? ' is-active' : ''
                    }`}
                    onClick={() => setProcedureCoverage('oow')}
                    title="OOW"
                    aria-pressed={procedureCoverage === 'oow'}
                  >
                    <span>OOW</span>
                  </button>
                  <button
                    type="button"
                    className={`procedure-filter-btn${
                      procedureCoverage === 'uw' ? ' is-active' : ''
                    }`}
                    onClick={() => setProcedureCoverage('uw')}
                    title="UW"
                    aria-pressed={procedureCoverage === 'uw'}
                  >
                    <span>UW</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="procedure-list">
            {procedureList.length ? (
              <div className="procedure-list__items">
                {procedureList.map((procedure) => (
                  <button
                    key={procedure.id}
                    type="button"
                    className={`procedure-item${
                      activeProcedureId === procedure.id ? ' is-active' : ''
                    }`}
                    onClick={() => setActiveProcedureId(procedure.id)}
                  >
                    <div className="procedure-item__row">
                      <img
                        className="procedure-item__logo"
                        src={procedure.brand === 'hercules' ? herculesLogo : thrustmasterLogo}
                        alt={procedure.brand === 'hercules' ? 'Hercules' : 'Thrustmaster'}
                      />
                      <span className="procedure-item__title">{procedure.name}</span>
                      <span className="procedure-item__coverage">
                        {procedure.coverage.toUpperCase()}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state">Aucune procédure pour ces filtres.</div>
            )}
          </div>
        </aside>
        <main className="procedure-main">
          {activeProcedure ? (
            <>
              <header className="procedure-header">
                <div className="procedure-header__title">{activeProcedure.name}</div>
                <div className="procedure-header__actions">
                  <button
                    className="primary"
                    onClick={() => {
                      if (!procedureTaskText.trim()) return
                      const channel = new BroadcastChannel('speedmail-procedure')
                      channel.postMessage({
                        type: 'procedure:import-task',
                        taskText: procedureTaskText,
                      })
                      channel.close()
                    }}
                    disabled={!procedureTaskText.trim()}
                  >
                    Exporter la task
                  </button>
                  <button
                    className="ghost"
                    onClick={() => {
                      setActiveProcedureId(null)
                      if (isProcedureWindow) {
                        window.close()
                      }
                    }}
                  >
                    Terminer
                  </button>
                </div>
              </header>
              <div className="procedure-body" onClick={handleProcedureLinkClick}>
                <section className="procedure-panel procedure-panel--steps">
                  <div className="procedure-panel__title">Étapes</div>
                  <div className="procedure-steps-scroll">
                    {procedureSteps.length ? (
                      <div className="procedure-steps">
                        {procedureSteps.map((step, index) => {
                          const checked = step.isCheckable && (procedureChecks[index] ?? false)
                          return step.isCheckable ? (
                            <label
                              className={`procedure-step procedure-step--check${
                                checked ? ' is-checked' : ''
                              }`}
                              key={`${activeProcedure.id}-${index}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setProcedureChecks((prev) => ({
                                    ...prev,
                                    [index]: !prev[index],
                                  }))
                                }
                              />
                              <span
                                className="procedure-step__text"
                                dangerouslySetInnerHTML={{
                                  __html: formatProcedureText(step.text),
                                }}
                              />
                            </label>
                          ) : (
                            <div
                              className="procedure-step"
                              key={`${activeProcedure.id}-${index}`}
                            >
                              <span
                                className="procedure-step__text"
                                dangerouslySetInnerHTML={{
                                  __html: formatProcedureText(step.text),
                                }}
                              />
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="muted">Aucune étape définie.</div>
                    )}
                  </div>
                </section>
                <aside className="procedure-side">
                  <div className="procedure-panel procedure-panel--notes">
                    <div className="procedure-panel__title">Notes</div>
                    <div
                      className="procedure-notes-content"
                      dangerouslySetInnerHTML={{
                        __html: formatProcedureText(procedureNotesValue),
                      }}
                    />
                  </div>
                  <div className="procedure-panel procedure-panel--info">
                    <div className="procedure-panel__title">Données nécessaires</div>
                    <TextEditor
                      value={procedureInfoText}
                      onChange={(value) => setProcedureInfoDraft(value)}
                      placeholder="Renseignez les infos utiles ici..."
                      className="editor--procedure-info"
                      minHeight={200}
                    />
                  </div>
                </aside>
              </div>
            </>
          ) : (
            <div className="empty-state">Sélectionnez une procédure pour commencer.</div>
          )}
        </main>
      </div>
        ) : null}
      </>
    )
  }

  return (
    <>
      <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <img
              className="logo-mark"
              src={assetUrl('/speedmail/icon.png')}
              alt="SpeedMail"
            />
            <p className="brand-name">SpeedMail</p>
            <span className="version-pill">v{APP_VERSION_LABEL}</span>
          </div>
          <div className="sidebar-top-actions">
            <div className="sidebar-icon-btn-wrap">
              <button
                className="sidebar-icon-btn"
                onClick={() => setEditOpen(true)}
                title={editButtonLabel}
                aria-label={editButtonLabel}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
              {showUpdateIndicator ? (
                <span
                  className="update-notification-dot"
                  aria-hidden="true"
                />
              ) : null}
            </div>
          </div>
        </div>

        <div className="filter-block">
          <p className="section-label">Catégories</p>
          {snippetCategoryDisplay === 'buttons' ? (
            <div className="category-tabs">
              <button
                type="button"
                className={`category-tab${activeCategoryId === 'all' ? ' is-active' : ''}`}
                onClick={() => setActiveCategoryId('all')}
                aria-pressed={activeCategoryId === 'all'}
                title="Toutes les catégories"
              >
                <span className="category-tab__dot category-tab__dot--all" />
                <span className="category-tab__label">Toutes</span>
              </button>
              {data.categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`category-tab${activeCategoryId === category.id ? ' is-active' : ''}`}
                  onClick={() => setActiveCategoryId(category.id)}
                  aria-pressed={activeCategoryId === category.id}
                  title={category.name}
                >
                  <span
                    className="category-tab__dot"
                    style={{
                      background: categoryColorMap.get(category.color) ?? '#8b6fc9',
                    }}
                  />
                  <span className="category-tab__label">{category.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="select-wrap">
              <select
                className="select select--roomy"
                value={activeCategoryId}
                onChange={(event) => setActiveCategoryId(event.target.value)}
              >
                <option value="all">Toutes les catégories</option>
                {data.categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <span className="chevron">▾</span>
            </div>
          )}
        </div>

        <p className="section-label">Snippets</p>
        <div className="bullet-panel">
          <ul className="bullet-list">
            {visibleSnippets.map((snippet) => (
              <li
                key={snippet.id}
                className="bullet-item"
                onClick={() => insertSnippet(snippet)}
                onMouseEnter={(event) => showSnippetTooltip(snippet, event)}
                onMouseLeave={hideSnippetTooltip}
              >
                <span
                  className="bullet-color-indicator"
                  style={{
                    background: categoryColorById.get(snippet.categoryId) ?? '#8b6fc9',
                  }}
                />
                <div className="bullet-meta">
                  <div className="bullet-title">{snippet.title}</div>
                  <div className="bullet-sub">{snippet.content.split('\n')[0]}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="workspace">
        <header className="workspace-head">
          <p className="workspace-title">Compose</p>
          <div className="workspace-head__actions">
            <div className="template-controls">
              <div className="template-search-wrap" ref={templateSearchRef}>
                <input
                  value={templateQuery}
                  onChange={(event) => setTemplateQuery(event.target.value)}
                  placeholder="Rechercher un template..."
                  onFocus={() => {
                    setTemplateFocused(true)
                    setTemplateListKey((prev) => prev + 1)
                  }}
                  onBlur={() => {
                    closeTemplateSearch()
                  }}
                />
                {templateResults.length ? (
                  <div
                    className="search-results visible"
                    key={templateListKey}
                    onMouseDown={(event) => event.preventDefault()}
                  >
                    {templateResults.map((template) => (
                      <div
                        key={template.id}
                        className="search-result-item"
                        onClick={() => {
                          applyTemplate(template)
                          closeTemplateSearch()
                        }}
                      >
                        <div className="result-name">
                          <span className="result-name__text">{template.name}</span>
                          <img
                            className="result-flag"
                            src={
                              template.language === 'fr'
                                ? assetUrl('/speedmail/fr.svg')
                                : assetUrl('/speedmail/gb.svg')
                            }
                            alt={template.language === 'fr' ? 'FR' : 'EN'}
                          />
                        </div>
                        <div
                          className="result-preview"
                          dangerouslySetInnerHTML={{
                            __html: highlightTextPreview(template.content.split('\n')[0] ?? ''),
                          }}
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
            <button
              className="primary call-trigger-btn"
              type="button"
              title="Appel téléphonique"
              aria-label="Appel téléphonique"
              onClick={openCallModal}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.15"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.78.62 2.63a2 2 0 0 1-.45 2.11L8 9.99a16 16 0 0 0 6 6l1.53-1.28a2 2 0 0 1 2.11-.45c.85.29 1.73.5 2.63.62A2 2 0 0 1 22 16.92z" />
                <path d="M15 4.5a4.5 4.5 0 0 1 4.5 4.5" />
                <path d="M15 1.5A7.5 7.5 0 0 1 22.5 9" />
              </svg>
            </button>
            <div className="quick-links-inline">
              {quickLinks.map((link) => (
                <button
                  key={link.id}
                  className="quick-link"
                  title={link.label}
                  aria-label={link.label}
                  onClick={() => openLink(link.url)}
                >
                  <img src={link.icon} alt={link.label} width={22} height={22} />
                  <span className="quick-link-label">{link.label}</span>
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="workspace-content">
          <section className="composer">
            <TextEditor
              ref={emailEditorRef}
              value={data.emailDraft}
              onChange={(value) => updateEmailDraft(value)}
              placeholder="Rédigez votre email..."
              className={`editor--email editor--email--${mailInsertMode}`}
            />
            <div className="composer-actions">
              <div className="composer-actions__left">
                <div className={`dashboard-toggle-cluster${dashboardSectionOpen ? ' is-open' : ''}`}>
                  <button
                    type="button"
                    className={`ghost dashboard-toggle-btn${dashboardSectionOpen ? ' is-open' : ''}`}
                    onClick={toggleDashboardSection}
                    title={dashboardSectionOpen ? 'Masquer le dashboard' : 'Afficher le dashboard'}
                    aria-label={dashboardSectionOpen ? 'Masquer le dashboard' : 'Afficher le dashboard'}
                    aria-expanded={dashboardSectionOpen}
                    aria-controls="workspace-dashboard"
                  >
                    {dashboardSectionOpen ? '▾' : '▴'}
                  </button>
                  <div
                    className={`dashboard-page-strip${dashboardSectionOpen ? ' is-open' : ''}`}
                    aria-hidden={!dashboardSectionOpen}
                  >
                    {workspaceDashboardPageOptions.map((page) => (
                      <button
                        key={page.id}
                        type="button"
                        className={`dashboard-page-btn${
                          workspaceDashboardPage === page.id ? ' is-active' : ''
                        }`}
                        title={page.title}
                        aria-label={page.title}
                        tabIndex={dashboardSectionOpen ? 0 : -1}
                        onClick={() => handleSelectWorkspaceDashboardPage(page.id)}
                      >
                        {page.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="actions">
                {emailTags ? <span className="tag-warning">⚠️</span> : null}
                <span
                  className={`composer-insert-mode composer-insert-mode--${mailInsertMode}`}
                  title="Clic droit dans l’éditeur mail pour changer le mode d’insertion"
                >
                  {mailInsertModeLabel}
                </span>
                <button
                  className={`primary copy-btn${emailCopied ? ' is-success' : ''}${
                    emailCopyPulse ? ' btn-pulse' : ''
                  }`}
                  onClick={() => {
                    triggerPulse(setEmailCopyPulse)
                    void handleCopyEmail()
                  }}
                  onAnimationEnd={() => setEmailCopyPulse(false)}
                >
                  {emailCopied ? 'Copié !' : 'Copy Email'}
                </button>
                <button
                  className={`ghost clear-btn${clearArmed ? ' confirm' : ''}${
                    emailClearPulse ? ' btn-pulse' : ''
                  }`}
                  type="button"
                  onClick={() => {
                    triggerPulse(setEmailClearPulse)
                    handleClearEmail()
                  }}
                  onAnimationEnd={() => setEmailClearPulse(false)}
                  title={clearArmed ? 'Confirmer' : 'Clear'}
                  aria-label={clearArmed ? 'Confirmer' : 'Clear'}
                >
                  {clearArmed ? '?' : 'Clear'}
                </button>
              </div>
            </div>
          </section>
          {dashboardSectionMounted ? (
            <section
              className={`workspace-dashboard${dashboardSectionOpen ? ' is-open' : ''}`}
              id="workspace-dashboard"
              aria-hidden={!dashboardSectionOpen}
              onTransitionEnd={handleDashboardTransitionEnd}
            >
              {renderWorkspaceDashboardContent()}
            </section>
          ) : null}
        </div>
      </main>

      <aside className="right-sidebar">
        <div className="note-panel-workspace">
          <div className="note-panel-workspace__header">
            <p className="section-label section-label--tight">Notes</p>
            <div className="note-panel-workspace__actions">
              <button
                className={`note-import-btn${noteImportFeedbackVisible ? ' is-success' : ''}`}
                type="button"
                onClick={handleNoteImportClick}
                title="Importer (WIP)"
                aria-label="Importer (WIP)"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3v12" />
                  <path d="M7 10l5 5 5-5" />
                  <path d="M5 21h14" />
                </svg>
              </button>
            </div>
          </div>
          <div className="note-editor-wrapper">
            <textarea
              value={data.notes}
              onChange={(event) => setData((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Notes persistantes..."
            />
            <button
              className="note-clear-btn"
              type="button"
              onClick={() => setData((prev) => ({ ...prev, notes: '' }))}
              title="Effacer la note"
              aria-label="Effacer la note"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        <section className="task-builder">
          <p className="section-label section-label--tight">Task</p>
          <div className="task-template-search">
            <div className="task-search-wrap" ref={taskSearchRef}>
              <input
                value={taskQuery}
                onChange={(event) => setTaskQuery(event.target.value)}
                placeholder="Rechercher un template de tâche..."
                onFocus={() => {
                  setTaskFocused(true)
                  setTaskListKey((prev) => prev + 1)
                }}
                onBlur={() => {
                  closeTaskSearch()
                }}
              />
              {taskTemplateResults.length ? (
                <div
                  className="search-results visible"
                  key={taskListKey}
                  onMouseDown={(event) => event.preventDefault()}
                >
                  {taskTemplateResults.map((task) => (
                    <div
                      key={task.id}
                      className="search-result-item"
                      onClick={() => {
                        applyTaskTemplate(task)
                        closeTaskSearch()
                      }}
                    >
                      <div className="result-name">{task.name}</div>
                      <div
                        className="result-preview"
                        dangerouslySetInnerHTML={{
                          __html: highlightTextPreview(task.content.split('\n')[0] ?? ''),
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className="task-editor-wrapper">
            <TextEditor
              ref={taskEditorRef}
              value={data.taskDraft}
              onChange={(value) => updateTaskDraft(value)}
              placeholder="Écrivez vos tâches..."
              className="task-editor"
            />
          </div>
          <div className="task-actions">
            <div className="task-actions-buttons">
              {taskTags ? <span className="tag-warning">⚠️</span> : null}
              <button
                className={`primary task-copy-btn copy-btn${taskCopied ? ' is-success' : ''}${
                  taskCopyPulse ? ' btn-pulse' : ''
                }`}
                onClick={() => {
                  triggerPulse(setTaskCopyPulse)
                  void handleCopyTask()
                }}
                onAnimationEnd={() => setTaskCopyPulse(false)}
              >
                {taskCopied ? 'Copié !' : 'Copy'}
              </button>
              <button
                className={`ghost task-clear-btn${taskClearArmed ? ' confirm' : ''}${
                  taskClearPulse ? ' btn-pulse' : ''
                }`}
                type="button"
                onClick={() => {
                  triggerPulse(setTaskClearPulse)
                  handleClearTask()
                }}
                onAnimationEnd={() => setTaskClearPulse(false)}
                title={taskClearArmed ? 'Confirmer' : 'Clear'}
                aria-label={taskClearArmed ? 'Confirmer' : 'Clear'}
              >
                {taskClearArmed ? '?' : 'Clear'}
              </button>
            </div>
          </div>
        </section>
      </aside>
    </div>

    {toast ? <div className="toast">{toast}</div> : null}
    {typeof document !== 'undefined' && snippetTooltip
      ? createPortal(
          <div
            className="bullet-tooltip visible"
            style={{ top: snippetTooltip.y, left: snippetTooltip.x }}
            dangerouslySetInnerHTML={{ __html: highlightTextPreview(snippetTooltip.text) }}
          />,
          document.body,
        )
      : null}
    {typeof document !== 'undefined' && portalInfoTooltip
      ? createPortal(
          <div
            className="bullet-tooltip bullet-tooltip--portal visible"
            style={{ top: portalInfoTooltip.y, left: portalInfoTooltip.x }}
          >
            {portalInfoTooltip.text}
          </div>,
          document.body,
        )
      : null}

    {callModalOpen ? (
        <div
          className="modal-backdrop"
          onPointerDown={(event) => {
            callModalBackdropPointerDownRef.current = event.target === event.currentTarget
          }}
          onClick={(event) => {
            if (!callModalBackdropPointerDownRef.current) return
            if (event.target !== event.currentTarget) return
            closeCallModal()
          }}
        >
          <div className="modal call-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <div className="brand__title">Appel téléphonique</div>
              <button className="close-modal" type="button" onClick={closeCallModal}>
                ×
              </button>
            </div>
            <div className="call-modal__body">
              <div className="call-modal__label">Appel téléphonique</div>
              <TextEditor
                ref={callEditorRef}
                value={callDraft}
                onChange={(value) => updateCallDraft(value)}
                placeholder="Appel téléphonique"
                className="call-modal__editor"
              />
              <div className="call-modal__footer">
                <button
                  className={`primary copy-btn${callCopied ? ' is-success' : ''}`}
                  type="button"
                  onClick={() => void handleCopyCall()}
                >
                  {callCopied ? 'Copié !' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

    {editOpen ? (
        <div className="modal-backdrop" onClick={() => setEditOpen(false)}>
          <div className="modal modal--settings" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <div className="modal__title-group">
                <div className="brand__title">Settings</div>
                <div className="modal__subtitle">
                  Navigation organisée par catégories avec sous-catégories.
                </div>
              </div>
              <div className="modal-actions modal-actions--settings">
                <button
                  className="btn btn--ghost btn--small btn--with-icon"
                  type="button"
                  onClick={handleExportJson}
                  title="Exporter les données"
                >
                  <span className="btn__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 21V9" />
                      <path d="M17 14l-5-5-5 5" />
                      <path d="M5 3h14" />
                    </svg>
                  </span>
                  Exporter
                </button>
                <button
                  className="btn btn--ghost btn--small btn--with-icon"
                  type="button"
                  onClick={handleImportClick}
                  title="Importer les données (Shift = remplacer)"
                >
                  <span className="btn__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 3v12" />
                      <path d="M7 10l5 5 5-5" />
                      <path d="M5 21h14" />
                    </svg>
                  </span>
                  Importer
                </button>
                <button
                  className="btn btn--ghost btn--small btn--with-icon"
                  type="button"
                  onClick={handleExportHistory}
                  title="Exporter l’historique (.txt)"
                  disabled={!data.history.length}
                >
                  <span className="btn__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M8 6h8" />
                      <path d="M8 12h8" />
                      <path d="M8 18h5" />
                      <path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                    </svg>
                  </span>
                  Exporter emails
                  {data.history.length ? ` (${data.history.length})` : ''}
                </button>
                <button
                  className={`btn btn--small btn--danger btn--with-icon${
                    clearAllArmed ? ' is-armed' : ''
                  }`}
                  type="button"
                  onClick={handleClearData}
                  title={clearAllArmed ? 'Confirmer suppression des données' : 'Delete all data'}
                  aria-label="Delete all data"
                >
                  <span className="btn__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                    </svg>
                  </span>
                  {clearAllArmed ? 'Confirmer suppression' : 'Delete all data'}
                </button>
                <button
                  className="btn btn--ghost btn--small btn--with-icon"
                  type="button"
                  onClick={() => setEditOpen(false)}
                >
                  <span className="btn__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18" />
                      <path d="M6 6l12 12" />
                    </svg>
                  </span>
                  Fermer
                </button>
              </div>
            </div>

            <div className="settings-layout edit-layout">
              <aside className="settings-layout__nav">
                {settingsNavigation.map((section) => (
                  <div className="settings-layout__nav-section" key={section.id}>
                    <div className="settings-layout__nav-title">{section.label}</div>
                    <div className="settings-layout__nav-items">
                      {section.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`settings-layout__nav-btn${
                            editTab === item.id ? ' is-active' : ''
                          }`}
                          onClick={() => setEditTab(item.id)}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </aside>

              <div className="settings-layout__content">
                <div className="settings-layout__content-header">
                  <div className="settings-layout__content-title-group">
                    <div className="settings-layout__eyebrow">{activeSettingsTab.sectionLabel}</div>
                    <div className="settings-layout__content-title">{activeSettingsTab.label}</div>
                    <div className="settings-layout__content-subtitle">
                      {activeSettingsTab.description}
                    </div>
                  </div>
                  {editTab === 'tags' ? (
                    <div className="tag-examples-inline tag-examples-inline--header">
                      {tokenReferenceItems.map((item) => (
                        <article className="tag-example-chip" key={item.token}>
                          <span className="tag-example-chip__label">{item.title}</span>
                          <span
                            className="tag-example-chip__token settings-token-preview"
                            dangerouslySetInnerHTML={{ __html: highlightText(item.token) }}
                          />
                        </article>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="settings-layout__content-body">
            {editTab === 'categories' ? (
              <div className="modal__grid">
                <div className="list-card">
                  <div className="list-card__header list-card__header--wrap">
                    <div className="list-card__title">Catégories</div>
                  </div>
                  <div className="list-card__body">
                    <SortableList
                      items={data.categories}
                      getId={(item) => item.id}
                      onReorder={(next) => setData((prev) => ({ ...prev, categories: next }))}
                      renderItem={(category, handleProps) => (
                        <div
                          className={`list-item list-item--compact${
                            selectedCategoryId === category.id ? ' is-selected' : ''
                          }`}
                          onClick={() => {
                            setCategoryDraft(category)
                            setSelectedCategoryId(category.id)
                          }}
                        >
                          <button
                            className="drag-handle"
                            type="button"
                            {...handleProps.attributes}
                            {...handleProps.listeners}
                            onClick={(event) => event.stopPropagation()}
                          >
                            ↕
                          </button>
                          <div className="list-item__content">
                            <div className="list-item__title">{category.name}</div>
                          </div>
                          <span
                            className="list-item__color"
                            style={{
                              background:
                                categoryColorMap.get(category.color) ??
                                categoryColorMap.get('violet'),
                            }}
                          />
                          <div className="list-item__actions">
                            <button
                              className="icon-btn-sm danger"
                              onClick={(event) => {
                                event.stopPropagation()
                                deleteCategory(category)
                                setSelectedCategoryId((prev) =>
                                  prev === category.id ? null : prev,
                                )
                                if (selectedCategoryId === category.id) {
                                  setCategoryDraft(getEmptyCategoryDraft())
                                }
                              }}
                              title="Supprimer"
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    />
                  </div>
                </div>
                <div className="list-card list-card--form">
                  <div className="list-card__header">
                    <div className="list-card__title">Détails</div>
                    <div className="list-card__tools">
                      <button
                        className="btn btn--ghost btn--small"
                        onClick={() => {
                          setCategoryDraft(getEmptyCategoryDraft())
                          setSelectedCategoryId('new')
                        }}
                      >
                        Nouveau
                      </button>
                      <button className="btn btn--primary btn--small" onClick={handleCategorySave}>
                        Sauver
                      </button>
                    </div>
                  </div>
                  <div className="list-card__body">
                    {isCategorySelectionEmpty ? (
                      <div className="empty-state">
                        Sélectionnez une catégorie pour éditer ou appuyez sur Nouveau pour créer une
                        catégorie.
                      </div>
                    ) : (
                      <div className="form">
                        <input
                          className="input"
                          placeholder="Nom de catégorie"
                          value={categoryDraft.name}
                          onChange={(event) =>
                            setCategoryDraft((prev) => ({ ...prev, name: event.target.value }))
                          }
                        />
                        <div className="color-grid">
                          {categoryColors.map((color) => (
                            <button
                              key={color.id}
                              type="button"
                              className={`color-swatch${
                                categoryDraft.color === color.id ? ' active' : ''
                              }`}
                              style={{ background: color.hex }}
                              title={color.label}
                              onClick={() =>
                                setCategoryDraft((prev) => ({ ...prev, color: color.id }))
                              }
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'snippets' ? (
              <div className="modal__grid">
                <div className="list-card">
                  <div className="list-card__header list-card__header--wrap">
                    <div className="list-card__title">Snippets</div>
                    <div className="list-card__tools">
                      <select
                        className="select select--roomy"
                        value={editSnippetCategoryId}
                        onChange={(event) => setEditSnippetCategoryId(event.target.value)}
                      >
                        <option value="all">Toutes les catégories</option>
                        {data.categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="list-card__body">
                    <SortableList
                      items={editSnippets}
                      getId={(item) => item.id}
                      onReorder={handleSnippetReorder}
                      renderItem={(snippet, handleProps) => (
                        <div
                          className={`list-item list-item--compact${
                            selectedSnippetId === snippet.id ? ' is-selected' : ''
                          }`}
                          onClick={() => {
                            setSnippetDraft(snippet)
                            setSelectedSnippetId(snippet.id)
                          }}
                        >
                          <button
                            className="drag-handle"
                            type="button"
                            {...handleProps.attributes}
                            {...handleProps.listeners}
                            onClick={(event) => event.stopPropagation()}
                          >
                            ↕
                          </button>
                          <div className="list-item__content">
                            <div className="list-item__title">{snippet.title}</div>
                            <div className="list-item__meta">{snippet.content.split('\n')[0]}</div>
                          </div>
                          <div className="list-item__actions">
                            <button
                              className="icon-btn-sm danger"
                              onClick={(event) => {
                                event.stopPropagation()
                                const deleted = deleteSnippet(snippet)
                                if (!deleted) return
                                setSelectedSnippetId((prev) =>
                                  prev === snippet.id ? null : prev,
                                )
                                if (selectedSnippetId === snippet.id) {
                                  setSnippetDraft(getEmptySnippetDraft())
                                }
                              }}
                              title="Supprimer"
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    />
                  </div>
                </div>
                <div className="list-card list-card--form">
                  <div className="list-card__header">
                    <div className="list-card__title">Détails</div>
                    <div className="list-card__tools">
                      <div className="token-buttons">
                        <button
                          type="button"
                          className="token-btn token-btn--tag"
                          title="Insérer un tag"
                          onClick={() => insertSnippetToken(TAG_TOKEN)}
                        >
                          T
                        </button>
                        <button
                          type="button"
                          className="token-btn token-btn--selector"
                          title="Insérer un sélecteur"
                          onClick={() => insertSnippetToken(SELECTOR_TOKEN)}
                        >
                          S
                        </button>
                        <button
                          type="button"
                          className="token-btn token-btn--addition"
                          title="Insérer un ajout"
                          onClick={() => insertSnippetToken(ADDITION_TOKEN)}
                        >
                          A
                        </button>
                      </div>
                      <button
                        className="btn btn--ghost btn--small"
                        onClick={() => {
                          setSnippetDraft(getEmptySnippetDraft())
                          setSelectedSnippetId('new')
                        }}
                      >
                        Nouveau
                      </button>
                      <button className="btn btn--primary btn--small" onClick={handleSnippetSave}>
                        Sauver
                      </button>
                    </div>
                  </div>
                  <div className="list-card__body">
                    {isSnippetSelectionEmpty ? (
                      <div className="empty-state">
                        Sélectionnez un snippet pour éditer ou appuyez sur Nouveau pour créer un
                        snippet.
                      </div>
                    ) : (
                      <div className="form">
                        <input
                          className="input"
                          placeholder="Titre"
                          value={snippetDraft.title}
                          ref={snippetTitleRef}
                          data-tag-autocomplete-field="true"
                          onFocus={(event) => {
                            setSnippetActiveField('title')
                            updateTagSuggestionFromTarget(
                              'snippet-title',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }}
                          onClick={(event) =>
                            updateTagSuggestionFromTarget(
                              'snippet-title',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }
                          onKeyUp={(event) =>
                            updateTagSuggestionFromTarget(
                              'snippet-title',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }
                          onChange={(event) => {
                            const nextValue = event.target.value
                            setSnippetDraft((prev) => ({ ...prev, title: nextValue }))
                            updateTagSuggestionFromTarget(
                              'snippet-title',
                              event.currentTarget,
                              nextValue,
                            )
                          }}
                        />
                        {renderTagSuggestions('snippet-title', (tag) =>
                          applySuggestedTag(
                            'snippet-title',
                            snippetTitleRef,
                            snippetDraft.title,
                            (next) => setSnippetDraft((prev) => ({ ...prev, title: next })),
                            tag,
                          ),
                        )}
                        <textarea
                          className="textarea textarea--tall"
                          placeholder="Contenu"
                          value={snippetDraft.content}
                          ref={snippetContentRef}
                          data-tag-autocomplete-field="true"
                          onFocus={(event) => {
                            setSnippetActiveField('content')
                            updateTagSuggestionFromTarget(
                              'snippet-content',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }}
                          onClick={(event) =>
                            updateTagSuggestionFromTarget(
                              'snippet-content',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }
                          onKeyUp={(event) =>
                            updateTagSuggestionFromTarget(
                              'snippet-content',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }
                          onChange={(event) => {
                            const nextValue = event.target.value
                            setSnippetDraft((prev) => ({ ...prev, content: nextValue }))
                            updateTagSuggestionFromTarget(
                              'snippet-content',
                              event.currentTarget,
                              nextValue,
                            )
                          }}
                        />
                        {renderTagSuggestions('snippet-content', (tag) =>
                          applySuggestedTag(
                            'snippet-content',
                            snippetContentRef,
                            snippetDraft.content,
                            (next) => setSnippetDraft((prev) => ({ ...prev, content: next })),
                            tag,
                          ),
                        )}
                        <div className="form__row">
                          <select
                            className="select select--roomy"
                            value={snippetDraft.categoryId}
                            onChange={(event) =>
                              setSnippetDraft((prev) => ({
                                ...prev,
                                categoryId: event.target.value,
                              }))
                            }
                          >
                            {data.categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <textarea
                          className={`textarea${
                            snippetDraft.taskOptional ? ' textarea--disabled' : ''
                          }`}
                          placeholder="Texte de tâche associé (optionnel)"
                          value={snippetDraft.taskText ?? ''}
                          ref={snippetTaskRef}
                          data-tag-autocomplete-field="true"
                          onFocus={(event) => {
                            setSnippetActiveField('task')
                            updateTagSuggestionFromTarget(
                              'snippet-task',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }}
                          onClick={(event) =>
                            updateTagSuggestionFromTarget(
                              'snippet-task',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }
                          onKeyUp={(event) =>
                            updateTagSuggestionFromTarget(
                              'snippet-task',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }
                          onChange={(event) => {
                            const nextValue = event.target.value
                            setSnippetDraft((prev) => ({ ...prev, taskText: nextValue }))
                            updateTagSuggestionFromTarget(
                              'snippet-task',
                              event.currentTarget,
                              nextValue,
                            )
                          }}
                          readOnly={snippetDraft.taskOptional ?? false}
                        />
                        {renderTagSuggestions('snippet-task', (tag) =>
                          applySuggestedTag(
                            'snippet-task',
                            snippetTaskRef,
                            snippetDraft.taskText ?? '',
                            (next) => setSnippetDraft((prev) => ({ ...prev, taskText: next })),
                            tag,
                          ),
                        )}
                        <label className="list-item__meta">
                          <input
                            type="checkbox"
                            checked={snippetDraft.taskOptional ?? false}
                            onChange={(event) =>
                              setSnippetDraft((prev) => ({
                                ...prev,
                                taskOptional: event.target.checked,
                              }))
                            }
                          />{' '}
                          Tâche optionnelle
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'templates' ? (
              <div className="modal__grid">
                <div className="list-card">
                  <div className="list-card__header list-card__header--wrap">
                    <div className="list-card__title">Templates mail</div>
                  </div>
                  <div className="list-card__body">
                    <SortableList
                      items={data.templates}
                      getId={(item) => item.id}
                      onReorder={(next) => setData((prev) => ({ ...prev, templates: next }))}
                      renderItem={(template, handleProps) => (
                        <div
                          className={`list-item list-item--compact${
                            selectedTemplateId === template.id ? ' is-selected' : ''
                          }`}
                          onClick={() => {
                            setTemplateDraft(template)
                            setSelectedTemplateId(template.id)
                          }}
                        >
                          <button
                            className="drag-handle"
                            type="button"
                            {...handleProps.attributes}
                            {...handleProps.listeners}
                            onClick={(event) => event.stopPropagation()}
                          >
                            ↕
                          </button>
                          <div className="list-item__content">
                            <div className="list-item__title">{template.name}</div>
                            <div className="list-item__meta">{template.content.split('\n')[0]}</div>
                          </div>
                          <div className="list-item__actions">
                            <img
                              className="list-item__flag"
                              src={
                                template.language === 'fr'
                                  ? assetUrl('/speedmail/fr.svg')
                                  : assetUrl('/speedmail/gb.svg')
                              }
                              alt={template.language === 'fr' ? 'FR' : 'EN'}
                            />
                            <button
                              className="icon-btn-sm danger"
                              onClick={(event) => {
                                event.stopPropagation()
                                deleteTemplate(template)
                                setSelectedTemplateId((prev) =>
                                  prev === template.id ? null : prev,
                                )
                                if (selectedTemplateId === template.id) {
                                  setTemplateDraft(getEmptyTemplateDraft())
                                }
                              }}
                              title="Supprimer"
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    />
                  </div>
                </div>
                <div className="list-card list-card--form">
                  <div className="list-card__header">
                    <div className="list-card__title">Détails</div>
                    <div className="list-card__tools">
                      <div className="token-buttons">
                        <button
                          type="button"
                          className="token-btn token-btn--tag"
                          title="Insérer un tag"
                          onClick={() => insertTemplateToken(TAG_TOKEN)}
                        >
                          T
                        </button>
                        <button
                          type="button"
                          className="token-btn token-btn--selector"
                          title="Insérer un sélecteur"
                          onClick={() => insertTemplateToken(SELECTOR_TOKEN)}
                        >
                          S
                        </button>
                        <button
                          type="button"
                          className="token-btn token-btn--addition"
                          title="Insérer un ajout"
                          onClick={() => insertTemplateToken(ADDITION_TOKEN)}
                        >
                          A
                        </button>
                      </div>
                      <button
                        className="btn btn--ghost btn--small"
                        onClick={() => {
                          setTemplateDraft(getEmptyTemplateDraft())
                          setSelectedTemplateId('new')
                        }}
                      >
                        Nouveau
                      </button>
                      <button className="btn btn--primary btn--small" onClick={handleTemplateSave}>
                        Sauver
                      </button>
                    </div>
                  </div>
                  <div className="list-card__body">
                    {isTemplateSelectionEmpty ? (
                      <div className="empty-state">
                        Sélectionnez un template mail pour éditer ou appuyez sur Nouveau pour créer
                        un template mail.
                      </div>
                    ) : (
                      <div className="form">
                        <input
                          className="input"
                          placeholder="Nom du template mail"
                          value={templateDraft.name}
                          ref={templateNameRef}
                          data-tag-autocomplete-field="true"
                          onFocus={(event) => {
                            setTemplateActiveField('name')
                            updateTagSuggestionFromTarget(
                              'template-name',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }}
                          onClick={(event) =>
                            updateTagSuggestionFromTarget(
                              'template-name',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }
                          onKeyUp={(event) =>
                            updateTagSuggestionFromTarget(
                              'template-name',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }
                          onChange={(event) => {
                            const nextValue = event.target.value
                            setTemplateDraft((prev) => ({ ...prev, name: nextValue }))
                            updateTagSuggestionFromTarget(
                              'template-name',
                              event.currentTarget,
                              nextValue,
                            )
                          }}
                        />
                        {renderTagSuggestions('template-name', (tag) =>
                          applySuggestedTag(
                            'template-name',
                            templateNameRef,
                            templateDraft.name,
                            (next) => setTemplateDraft((prev) => ({ ...prev, name: next })),
                            tag,
                          ),
                        )}
                        <select
                          className="select"
                          value={templateDraft.language}
                          onChange={(event) =>
                            setTemplateDraft((prev) => ({
                              ...prev,
                              language: event.target.value as Language,
                            }))
                          }
                        >
                          <option value="fr">Français</option>
                          <option value="en">Anglais</option>
                        </select>
                        <textarea
                          className="textarea textarea--tall"
                          placeholder="Contenu complet"
                          value={templateDraft.content}
                          ref={templateContentRef}
                          data-tag-autocomplete-field="true"
                          onFocus={(event) => {
                            setTemplateActiveField('content')
                            updateTagSuggestionFromTarget(
                              'template-content',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }}
                          onClick={(event) =>
                            updateTagSuggestionFromTarget(
                              'template-content',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }
                          onKeyUp={(event) =>
                            updateTagSuggestionFromTarget(
                              'template-content',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }
                          onChange={(event) => {
                            const nextValue = event.target.value
                            setTemplateDraft((prev) => ({ ...prev, content: nextValue }))
                            updateTagSuggestionFromTarget(
                              'template-content',
                              event.currentTarget,
                              nextValue,
                            )
                          }}
                        />
                        {renderTagSuggestions('template-content', (tag) =>
                          applySuggestedTag(
                            'template-content',
                            templateContentRef,
                            templateDraft.content,
                            (next) => setTemplateDraft((prev) => ({ ...prev, content: next })),
                            tag,
                          ),
                        )}
                        {templateUsesCustomTask ? (
                          <textarea
                            className={`textarea${
                              templateDraft.taskOptional ? ' textarea--disabled' : ''
                            }`}
                            placeholder="Tâche custom"
                            value={templateDraft.taskText ?? ''}
                            ref={templateTaskRef}
                            data-tag-autocomplete-field="true"
                            onFocus={(event) => {
                              setTemplateActiveField('task')
                              updateTagSuggestionFromTarget(
                                'template-task',
                                event.currentTarget,
                                event.currentTarget.value,
                              )
                            }}
                            onClick={(event) =>
                              updateTagSuggestionFromTarget(
                                'template-task',
                                event.currentTarget,
                                event.currentTarget.value,
                              )
                            }
                            onKeyUp={(event) =>
                              updateTagSuggestionFromTarget(
                                'template-task',
                                event.currentTarget,
                                event.currentTarget.value,
                              )
                            }
                            onChange={(event) => {
                              const nextValue = event.target.value
                              setTemplateDraft((prev) => ({
                                ...prev,
                                taskText: nextValue,
                              }))
                              updateTagSuggestionFromTarget(
                                'template-task',
                                event.currentTarget,
                                nextValue,
                              )
                            }}
                            readOnly={templateDraft.taskOptional ?? false}
                          />
                        ) : (
                          <select
                            className="select select--roomy"
                            value={templateDraft.taskTemplateId ?? ''}
                            onChange={(event) =>
                              setTemplateDraft((prev) => ({
                                ...prev,
                                taskTemplateId: event.target.value,
                              }))
                            }
                            disabled={templateDraft.taskOptional ?? false}
                          >
                            <option value="">Choisir une tâche...</option>
                            {data.taskTemplates.map((task) => (
                              <option key={task.id} value={task.id}>
                                {task.name}
                              </option>
                            ))}
                          </select>
                        )}
                        {templateUsesCustomTask
                          ? renderTagSuggestions('template-task', (tag) =>
                              applySuggestedTag(
                                'template-task',
                                templateTaskRef,
                                templateDraft.taskText ?? '',
                                (next) =>
                                  setTemplateDraft((prev) => ({ ...prev, taskText: next })),
                                tag,
                              ),
                            )
                          : null}
                        <div className="form__row form__row--inline">
                          <label className="list-item__meta">
                            <input
                              type="checkbox"
                              checked={templateDraft.taskOptional ?? false}
                              onChange={(event) =>
                                setTemplateDraft((prev) => ({
                                  ...prev,
                                  taskOptional: event.target.checked,
                                }))
                              }
                            />{' '}
                            Tâche optionnelle
                          </label>
                          <label className="list-item__meta">
                            <input
                              type="checkbox"
                              checked={templateUsesCustomTask}
                              onChange={(event) =>
                                setTemplateDraft((prev) => ({
                                  ...prev,
                                  taskCustom: event.target.checked,
                                }))
                              }
                              disabled={templateDraft.taskOptional ?? false}
                            />{' '}
                            Tâche custom
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'tasks' ? (
              <div className="modal__grid">
                <div className="list-card">
                  <div className="list-card__header list-card__header--wrap">
                    <div className="list-card__title">Templates de tâche</div>
                  </div>
                  <div className="list-card__body">
                    <SortableList
                      items={data.taskTemplates}
                      getId={(item) => item.id}
                      onReorder={(next) => setData((prev) => ({ ...prev, taskTemplates: next }))}
                      renderItem={(task, handleProps) => (
                        <div
                          className={`list-item list-item--compact${
                            selectedTaskId === task.id ? ' is-selected' : ''
                          }`}
                          onClick={() => {
                            setTaskDraft(task)
                            setSelectedTaskId(task.id)
                          }}
                        >
                          <button
                            className="drag-handle"
                            type="button"
                            {...handleProps.attributes}
                            {...handleProps.listeners}
                            onClick={(event) => event.stopPropagation()}
                          >
                            ↕
                          </button>
                          <div className="list-item__content">
                            <div className="list-item__title">{task.name}</div>
                            <div className="list-item__meta">{task.content.split('\n')[0]}</div>
                          </div>
                          <div className="list-item__actions">
                            <button
                              className="icon-btn-sm danger"
                              onClick={(event) => {
                                event.stopPropagation()
                                deleteTaskTemplate(task)
                                setSelectedTaskId((prev) => (prev === task.id ? null : prev))
                                if (selectedTaskId === task.id) {
                                  setTaskDraft(getEmptyTaskDraft())
                                }
                              }}
                              title="Supprimer"
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    />
                  </div>
                </div>
                <div className="list-card list-card--form">
                  <div className="list-card__header">
                    <div className="list-card__title">Détails</div>
                    <div className="list-card__tools">
                      <div className="token-buttons">
                        <button
                          type="button"
                          className="token-btn token-btn--tag"
                          title="Insérer un tag"
                          onClick={() => insertTaskTemplateToken(TAG_TOKEN)}
                        >
                          T
                        </button>
                        <button
                          type="button"
                          className="token-btn token-btn--selector"
                          title="Insérer un sélecteur"
                          onClick={() => insertTaskTemplateToken(SELECTOR_TOKEN)}
                        >
                          S
                        </button>
                        <button
                          type="button"
                          className="token-btn token-btn--addition"
                          title="Insérer un ajout"
                          onClick={() => insertTaskTemplateToken(ADDITION_TOKEN)}
                        >
                          A
                        </button>
                      </div>
                      <button
                        className="btn btn--ghost btn--small"
                        onClick={() => {
                          setTaskDraft(getEmptyTaskDraft())
                          setSelectedTaskId('new')
                        }}
                      >
                        Nouveau
                      </button>
                      <button className="btn btn--primary btn--small" onClick={handleTaskTemplateSave}>
                        Sauver
                      </button>
                    </div>
                  </div>
                  <div className="list-card__body">
                    {isTaskSelectionEmpty ? (
                      <div className="empty-state">
                        Sélectionnez un template de tâche pour éditer ou appuyez sur Nouveau pour
                        créer un template de tâche.
                      </div>
                    ) : (
                      <div className="form">
                        <input
                          className="input"
                          placeholder="Nom du template tâche"
                          value={taskDraft.name}
                          ref={taskTemplateNameRef}
                          data-tag-autocomplete-field="true"
                          onFocus={(event) => {
                            setTaskTemplateActiveField('name')
                            updateTagSuggestionFromTarget(
                              'task-name',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }}
                          onClick={(event) =>
                            updateTagSuggestionFromTarget(
                              'task-name',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }
                          onKeyUp={(event) =>
                            updateTagSuggestionFromTarget(
                              'task-name',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }
                          onChange={(event) => {
                            const nextValue = event.target.value
                            setTaskDraft((prev) => ({ ...prev, name: nextValue }))
                            updateTagSuggestionFromTarget(
                              'task-name',
                              event.currentTarget,
                              nextValue,
                            )
                          }}
                        />
                        {renderTagSuggestions('task-name', (tag) =>
                          applySuggestedTag(
                            'task-name',
                            taskTemplateNameRef,
                            taskDraft.name,
                            (next) => setTaskDraft((prev) => ({ ...prev, name: next })),
                            tag,
                          ),
                        )}
                        <textarea
                          className="textarea textarea--tall"
                          placeholder="Contenu"
                          value={taskDraft.content}
                          ref={taskTemplateContentRef}
                          data-tag-autocomplete-field="true"
                          onFocus={(event) => {
                            setTaskTemplateActiveField('content')
                            updateTagSuggestionFromTarget(
                              'task-content',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }}
                          onClick={(event) =>
                            updateTagSuggestionFromTarget(
                              'task-content',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }
                          onKeyUp={(event) =>
                            updateTagSuggestionFromTarget(
                              'task-content',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }
                          onChange={(event) => {
                            const nextValue = event.target.value
                            setTaskDraft((prev) => ({ ...prev, content: nextValue }))
                            updateTagSuggestionFromTarget(
                              'task-content',
                              event.currentTarget,
                              nextValue,
                            )
                          }}
                        />
                        {renderTagSuggestions('task-content', (tag) =>
                          applySuggestedTag(
                            'task-content',
                            taskTemplateContentRef,
                            taskDraft.content,
                            (next) => setTaskDraft((prev) => ({ ...prev, content: next })),
                            tag,
                          ),
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'tags' ? (
              <div className="modal__grid modal__grid--single">
                <div className="list-card list-card--form">
                  <div className="list-card__header">
                    <div className="list-card__title">Tags prédéfinis</div>
                  </div>
                  <div className="list-card__body">
                    <div className="tag-settings">
                      <div className="tag-settings__composer">
                        <input
                          className="input"
                          placeholder="Ex: CLIENT ou <CLIENT>"
                          value={predefinedTagDraft}
                          onChange={(event) => setPredefinedTagDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter') return
                            event.preventDefault()
                            handleAddPredefinedTag()
                          }}
                        />
                        <button
                          className="btn btn--primary btn--small"
                          type="button"
                          onClick={handleAddPredefinedTag}
                        >
                          Ajouter
                        </button>
                      </div>
                      <div className="tag-settings__list">
                        {predefinedTags.length ? (
                          predefinedTags.map((tag) => (
                            <div className="tag-settings__item" key={tag}>
                              <div
                                className="tag-settings__token settings-token-preview"
                                dangerouslySetInnerHTML={{ __html: highlightText(tag) }}
                              />
                              <button
                                className="icon-btn-sm danger"
                                type="button"
                                title="Supprimer"
                                onClick={() => handleRemovePredefinedTag(tag)}
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <line x1="18" y1="6" x2="6" y2="18" />
                                  <line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="empty-state">Aucun tag prédéfini enregistré.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'products' ? (
              <div className="modal__grid">
                <div className="list-card">
                  <div className="list-card__header list-card__header--wrap">
                    <div className="list-card__title">Produits</div>
                    <div className="list-card__subtitle">
                      Produits utilisés pour les compatibilités versions et les spare parts.
                    </div>
                  </div>
                  <div className="list-card__body">
                    {productsSorted.length ? (
                      productsSorted.map((product) => (
                        <div
                          key={product.id}
                          className={`list-item list-item--compact${
                            selectedProductCatalogId === product.id ? ' is-selected' : ''
                          }`}
                          onClick={() => {
                            setProductDraft({
                              ...product,
                              spareParts: product.spareParts.map((sparePart) => ({ ...sparePart })),
                            })
                            setSelectedProductCatalogId(product.id)
                          }}
                        >
                          <div className="list-item__content">
                            <div className="list-item__title">{product.name}</div>
                            <div className="list-item__meta">
                              {product.spareParts.length} spare part
                              {product.spareParts.length > 1 ? 's' : ''}
                            </div>
                          </div>
                          <div className="list-item__actions">
                            <button
                              className="icon-btn-sm danger"
                              type="button"
                              title="Supprimer"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleDeleteProductCatalogItem(product)
                              }}
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">Aucun produit configuré.</div>
                    )}
                  </div>
                </div>

                <div className="list-card list-card--form">
                  <div className="list-card__header">
                    <div className="list-card__title-group">
                      <div className="list-card__title">Détails produit</div>
                      <div className="list-card__subtitle">
                        Un produit sert de référence commune pour le catalogue versions et spare
                        parts.
                      </div>
                    </div>
                    <div className="list-card__tools">
                      <button
                        className="btn btn--ghost btn--small"
                        type="button"
                        onClick={() => {
                          setProductDraft(getEmptyProductDraft())
                          setSelectedProductCatalogId('new')
                        }}
                      >
                        Nouveau
                      </button>
                      <button
                        className="btn btn--primary btn--small"
                        type="button"
                        onClick={handleSaveProductCatalogItem}
                      >
                        Sauver
                      </button>
                    </div>
                  </div>
                  <div className="list-card__body">
                    {isProductCatalogSelectionEmpty ? (
                      <div className="empty-state">
                        Sélectionnez un produit pour l’éditer ou appuyez sur Nouveau.
                      </div>
                    ) : (
                      <div className="form">
                        <input
                          className="input"
                          placeholder="Nom du produit"
                          value={productDraft.name}
                          onChange={(event) =>
                            setProductDraft((prev) => ({ ...prev, name: event.target.value }))
                          }
                        />
                        <div className="settings-note">
                          Les spare parts liées à ce produit se configurent dans le sous-menu Spare
                          Parts.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'procedure' ? (
              <div className="modal__grid modal__grid--single">
                <div className="list-card list-card--form">
                  <div className="list-card__header">
                    <div className="list-card__title-group">
                      <div className="list-card__title">Troubleshotgun</div>
                      <div className="list-card__subtitle">Section en cours de rework.</div>
                    </div>
                  </div>
                  <div className="list-card__body">
                    <div className="dashboard-wip">
                      <strong>Troubleshotgun</strong>
                      <span>WIP</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : legacyProcedureEditorEnabled ? (
              <div className="modal__grid">
                <div className="list-card">
                  <div className="list-card__header list-card__header--wrap">
                    <div className="list-card__title">Troubleshotgun</div>
                    <div className="list-card__tools">
                      <button className="btn btn--ghost btn--small" onClick={handleOpenProcedure}>
                        Ouvrir
                      </button>
                    </div>
                  </div>
                  <div className="list-card__body">
                    <SortableList
                      items={data.procedures}
                      getId={(item) => item.id}
                      onReorder={handleProcedureReorder}
                      renderItem={(procedure, handleProps) => (
                        <div
                          className={`list-item list-item--compact${
                            selectedProcedureId === procedure.id ? ' is-selected' : ''
                          }`}
                          onClick={() => {
                            setProcedureDraft(
                              sanitizeProcedureDraft(procedure as Procedure & { categoryId?: string }),
                            )
                            setSelectedProcedureId(procedure.id)
                          }}
                        >
                          <button
                            className="drag-handle"
                            type="button"
                            {...handleProps.attributes}
                            {...handleProps.listeners}
                            onClick={(event) => event.stopPropagation()}
                          >
                            ↕
                          </button>
                          <div className="list-item__content">
                            <div className="list-item__title">{procedure.name}</div>
                            <div className="list-item__meta list-item__meta--brand">
                              <img
                                className="list-item__brand-icon"
                                src={procedure.brand === 'hercules' ? herculesLogo : thrustmasterLogo}
                                alt={procedure.brand === 'hercules' ? 'Hercules' : 'Thrustmaster'}
                              />
                              <span>
                                {procedure.language.toUpperCase()} ·{' '}
                                {procedure.brand === 'hercules' ? 'Hercules' : 'Thrustmaster'} ·{' '}
                                {procedure.coverage.toUpperCase()}
                              </span>
                            </div>
                            <div className="list-item__meta">
                              {procedure.productName?.trim() || 'Produit non renseigné'}
                            </div>
                          </div>
                          <div className="list-item__actions">
                            <button
                              className="icon-btn-sm danger"
                              onClick={(event) => {
                                event.stopPropagation()
                                deleteProcedure(procedure)
                                setSelectedProcedureId((prev) =>
                                  prev === procedure.id ? null : prev,
                                )
                                if (selectedProcedureId === procedure.id) {
                                  setProcedureDraft(getEmptyProcedureDraft())
                                }
                              }}
                              title="Supprimer"
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    />
                  </div>
                </div>
                <div className="list-card list-card--form">
                  <div className="list-card__header">
                    <div className="list-card__title">Détails</div>
                    <div className="list-card__tools">
                      <div className="token-buttons">
                        <button
                          type="button"
                          className="token-btn token-btn--tag"
                          title="Insérer un tag"
                          onClick={() => insertProcedureToken(TAG_TOKEN)}
                        >
                          T
                        </button>
                        <button
                          type="button"
                          className="token-btn token-btn--selector"
                          title="Insérer un sélecteur"
                          onClick={() => insertProcedureToken(SELECTOR_TOKEN)}
                        >
                          S
                        </button>
                        <button
                          type="button"
                          className="token-btn token-btn--addition"
                          title="Insérer un ajout"
                          onClick={() => insertProcedureToken(ADDITION_TOKEN)}
                        >
                          A
                        </button>
                      </div>
                      <button
                        className="btn btn--ghost btn--small"
                        onClick={() => {
                          setProcedureDraft(getEmptyProcedureDraft())
                          setSelectedProcedureId('new')
                        }}
                      >
                        Nouveau
                      </button>
                      <button className="btn btn--primary btn--small" onClick={handleProcedureSave}>
                        Sauver
                      </button>
                    </div>
                  </div>
                  <div className="list-card__body">
                    {isProcedureSelectionEmpty ? (
                      <div className="empty-state">
                        Sélectionnez une procédure pour éditer ou appuyez sur Nouveau pour créer
                        une procédure.
                      </div>
                    ) : (
                      <div className="form">
                        <input
                          className="input"
                          placeholder="Nom de procédure"
                          value={procedureDraft.name}
                          ref={procedureNameRef}
                          data-tag-autocomplete-field="true"
                          onFocus={(event) =>
                            updateTagSuggestionFromTarget(
                              'procedure-name',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }
                          onClick={(event) =>
                            updateTagSuggestionFromTarget(
                              'procedure-name',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }
                          onKeyUp={(event) =>
                            updateTagSuggestionFromTarget(
                              'procedure-name',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }
                          onChange={(event) => {
                            const nextValue = event.target.value
                            setProcedureDraft((prev) => ({ ...prev, name: nextValue }))
                            updateTagSuggestionFromTarget(
                              'procedure-name',
                              event.currentTarget,
                              nextValue,
                            )
                          }}
                        />
                        {renderTagSuggestions('procedure-name', (tag) =>
                          applySuggestedTag(
                            'procedure-name',
                            procedureNameRef,
                            procedureDraft.name,
                            (next) => setProcedureDraft((prev) => ({ ...prev, name: next })),
                            tag,
                          ),
                        )}
                        <input
                          className="input"
                          placeholder="Produit / famille"
                          value={procedureDraft.productName ?? ''}
                          ref={procedureProductNameRef}
                          data-tag-autocomplete-field="true"
                          onFocus={(event) =>
                            updateTagSuggestionFromTarget(
                              'procedure-product',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }
                          onClick={(event) =>
                            updateTagSuggestionFromTarget(
                              'procedure-product',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }
                          onKeyUp={(event) =>
                            updateTagSuggestionFromTarget(
                              'procedure-product',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }
                          onChange={(event) => {
                            const nextValue = event.target.value
                            setProcedureDraft((prev) => ({
                              ...prev,
                              productName: nextValue,
                            }))
                            updateTagSuggestionFromTarget(
                              'procedure-product',
                              event.currentTarget,
                              nextValue,
                            )
                          }}
                        />
                        {renderTagSuggestions('procedure-product', (tag) =>
                          applySuggestedTag(
                            'procedure-product',
                            procedureProductNameRef,
                            procedureDraft.productName ?? '',
                            (next) =>
                              setProcedureDraft((prev) => ({ ...prev, productName: next })),
                            tag,
                          ),
                        )}
                        <div className="form__row two">
                          <select
                            className="select select--roomy"
                            value={procedureDraft.brand}
                            onChange={(event) =>
                              setProcedureDraft((prev) => ({
                                ...prev,
                                brand: event.target.value as ProcedureBrand,
                              }))
                            }
                          >
                            <option value="hercules">Hercules</option>
                            <option value="thrustmaster">Thrustmaster</option>
                          </select>
                          <select
                            className="select select--roomy"
                            value={procedureDraft.coverage}
                            onChange={(event) =>
                              setProcedureDraft((prev) => ({
                                ...prev,
                                coverage: event.target.value as ProcedureCoverage,
                              }))
                            }
                          >
                            <option value="oow">OOW</option>
                            <option value="uw">UW</option>
                          </select>
                        </div>
                        <textarea
                          className="textarea textarea--tall"
                          placeholder="Info nécessaire"
                          value={procedureDraft.infoText}
                          ref={procedureInfoRef}
                          data-tag-autocomplete-field="true"
                          onFocus={(event) => {
                            setProcedureActiveField('info')
                            updateTagSuggestionFromTarget(
                              'procedure-info',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }}
                          onClick={(event) =>
                            updateTagSuggestionFromTarget(
                              'procedure-info',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }
                          onKeyUp={(event) =>
                            updateTagSuggestionFromTarget(
                              'procedure-info',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }
                          onChange={(event) => {
                            const nextValue = event.target.value
                            setProcedureDraft((prev) => ({
                              ...prev,
                              infoText: nextValue,
                            }))
                            updateTagSuggestionFromTarget(
                              'procedure-info',
                              event.currentTarget,
                              nextValue,
                            )
                          }}
                        />
                        {renderTagSuggestions('procedure-info', (tag) =>
                          applySuggestedTag(
                            'procedure-info',
                            procedureInfoRef,
                            procedureDraft.infoText,
                            (next) => setProcedureDraft((prev) => ({ ...prev, infoText: next })),
                            tag,
                          ),
                        )}
                        <textarea
                          className="textarea textarea--tall"
                          placeholder="Notes optionnelles"
                          value={procedureDraft.optionalNotes ?? ''}
                          ref={procedureNotesRef}
                          data-tag-autocomplete-field="true"
                          onFocus={(event) => {
                            setProcedureActiveField('notes')
                            updateTagSuggestionFromTarget(
                              'procedure-notes',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }}
                          onClick={(event) =>
                            updateTagSuggestionFromTarget(
                              'procedure-notes',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }
                          onKeyUp={(event) =>
                            updateTagSuggestionFromTarget(
                              'procedure-notes',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }
                          onChange={(event) => {
                            const nextValue = event.target.value
                            setProcedureDraft((prev) => ({
                              ...prev,
                              optionalNotes: nextValue,
                            }))
                            updateTagSuggestionFromTarget(
                              'procedure-notes',
                              event.currentTarget,
                              nextValue,
                            )
                          }}
                        />
                        {renderTagSuggestions('procedure-notes', (tag) =>
                          applySuggestedTag(
                            'procedure-notes',
                            procedureNotesRef,
                            procedureDraft.optionalNotes ?? '',
                            (next) =>
                              setProcedureDraft((prev) => ({ ...prev, optionalNotes: next })),
                            tag,
                          ),
                        )}
                        <div className="format-toolbar">
                          <div className="format-buttons">
                            <button
                              type="button"
                              className="token-btn token-btn--color"
                              title="Insérer une couleur"
                              onClick={() =>
                                insertProcedureStepsWrap('[color=#ff6b6b]', '[/color]', 'texte')
                              }
                            >
                              C
                            </button>
                            <button
                              type="button"
                              className="token-btn token-btn--link"
                              title="Insérer un lien"
                              onClick={insertProcedureStepsLink}
                            >
                              L
                            </button>
                            <button
                              type="button"
                              className="token-btn token-btn--bold"
                              title="Insérer du gras"
                              onClick={() => insertProcedureStepsWrap('[b]', '[/b]', 'texte')}
                            >
                              G
                            </button>
                            <button
                              type="button"
                              className="token-btn token-btn--italic"
                              title="Insérer de l’italique"
                              onClick={() => insertProcedureStepsWrap('[i]', '[/i]', 'texte')}
                            >
                              I
                            </button>
                            <button
                              type="button"
                              className="token-btn token-btn--check"
                              title="Insérer une case à cocher"
                              onClick={insertProcedureCheckMarker}
                            >
                              ✓
                            </button>
                          </div>
                          <div className="format-help">
                            <button
                              type="button"
                              className="token-btn token-btn--help"
                              title="Aide format"
                              onClick={() => setProcedureFormatHelpOpen((prev) => !prev)}
                            >
                              ?
                            </button>
                            {procedureFormatHelpOpen ? (
                              <div className="format-help__panel">
                                <div className="format-help__item">Surlignage: ==texte==</div>
                                <div className="format-help__item">
                                  Couleur: [color=#ff6b6b]texte[/color]
                                </div>
                                <div className="format-help__item">
                                  Lien: [texte](https://...)
                                </div>
                                <div className="format-help__item">Gras: [b]texte[/b]</div>
                                <div className="format-help__item">Italique: [i]texte[/i]</div>
                                <div className="format-help__item">
                                  Taille: [size=1.2]texte[/size]
                                </div>
                                <div className="format-help__item">
                                  Case à cocher: commencez la ligne par [ ]
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                        <textarea
                          className="textarea textarea--tall"
                          placeholder="Étapes (1 par ligne)"
                          value={procedureDraft.steps}
                          ref={procedureStepsRef}
                          data-tag-autocomplete-field="true"
                          onFocus={(event) => {
                            setProcedureActiveField('steps')
                            updateTagSuggestionFromTarget(
                              'procedure-steps',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }}
                          onClick={(event) =>
                            updateTagSuggestionFromTarget(
                              'procedure-steps',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }
                          onKeyUp={(event) =>
                            updateTagSuggestionFromTarget(
                              'procedure-steps',
                              event.currentTarget,
                              event.currentTarget.value,
                            )
                          }
                          onChange={(event) => {
                            const nextValue = event.target.value
                            setProcedureDraft((prev) => ({
                              ...prev,
                              steps: nextValue,
                            }))
                            updateTagSuggestionFromTarget(
                              'procedure-steps',
                              event.currentTarget,
                              nextValue,
                            )
                          }}
                        />
                        {renderTagSuggestions('procedure-steps', (tag) =>
                          applySuggestedTag(
                            'procedure-steps',
                            procedureStepsRef,
                            procedureDraft.steps,
                            (next) => setProcedureDraft((prev) => ({ ...prev, steps: next })),
                            tag,
                          ),
                        )}
                        {procedureUsesCustomTask ? (
                          <textarea
                            className="textarea"
                            placeholder="Tâche custom"
                            value={procedureDraft.taskText ?? ''}
                            ref={procedureTaskRef}
                            data-tag-autocomplete-field="true"
                            onFocus={(event) =>
                              updateTagSuggestionFromTarget(
                                'procedure-task',
                                event.currentTarget,
                                event.currentTarget.value,
                              )
                            }
                            onClick={(event) =>
                              updateTagSuggestionFromTarget(
                                'procedure-task',
                                event.currentTarget,
                                event.currentTarget.value,
                              )
                            }
                            onKeyUp={(event) =>
                              updateTagSuggestionFromTarget(
                                'procedure-task',
                                event.currentTarget,
                                event.currentTarget.value,
                              )
                            }
                            onChange={(event) => {
                              const nextValue = event.target.value
                              setProcedureDraft((prev) => ({
                                ...prev,
                                taskText: nextValue,
                              }))
                              updateTagSuggestionFromTarget(
                                'procedure-task',
                                event.currentTarget,
                                nextValue,
                              )
                            }}
                          />
                        ) : (
                          <select
                            className="select select--roomy"
                            value={procedureDraft.taskTemplateId ?? ''}
                            onChange={(event) =>
                              setProcedureDraft((prev) => ({
                                ...prev,
                                taskTemplateId: event.target.value,
                              }))
                            }
                          >
                            <option value="">Choisir une tâche...</option>
                            {data.taskTemplates.map((task) => (
                              <option key={task.id} value={task.id}>
                                {task.name}
                              </option>
                            ))}
                          </select>
                        )}
                        {procedureUsesCustomTask
                          ? renderTagSuggestions('procedure-task', (tag) =>
                              applySuggestedTag(
                                'procedure-task',
                                procedureTaskRef,
                                procedureDraft.taskText ?? '',
                                (next) =>
                                  setProcedureDraft((prev) => ({ ...prev, taskText: next })),
                                tag,
                              ),
                            )
                          : null}
                        <label className="list-item__meta">
                          <input
                            type="checkbox"
                            checked={procedureUsesCustomTask}
                            onChange={(event) =>
                              setProcedureDraft((prev) => ({
                                ...prev,
                                taskCustom: event.target.checked,
                              }))
                            }
                          />{' '}
                          Tâche custom
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'callHistory' ? (
              <div className="modal__grid modal__grid--single">
                <div className="list-card list-card--form">
                  <div className="list-card__header">
                    <div className="list-card__title-group">
                      <div className="list-card__title">Historique des appels</div>
                      <div className="list-card__subtitle">
                        Les {CALL_HISTORY_LIMIT} derniers appels enregistrés depuis le bouton
                        téléphone.
                      </div>
                    </div>
                  </div>
                  <div className="list-card__body">
                    <div className="settings-history-section">
                      <div className="settings-row">
                        <div className="settings-label">Appels sauvegardés</div>
                        <div className="settings-value">
                          {recentCallHistory.length} entrée{recentCallHistory.length > 1 ? 's' : ''}
                        </div>
                      </div>
                      {recentCallHistory.length ? (
                        <div className="settings-history-list">
                          {recentCallHistory.map((item) => (
                            <article className="settings-history-item" key={item.id}>
                              <div className="settings-history-item__header">
                                <div className="settings-history-item__meta">
                                  {formatHistoryTimestamp(item.createdAt)}
                                </div>
                                <button
                                  className={`ghost dashboard-copy-btn settings-history-item__copy${
                                    callHistoryCopiedId === item.id ? ' is-success' : ''
                                  }`}
                                  type="button"
                                  onClick={() => void handleCopyHistoryCall(item.id, item.content)}
                                >
                                  {callHistoryCopiedId === item.id ? 'Copié !' : 'Copier'}
                                </button>
                              </div>
                              <div className="settings-history-item__content">{item.content}</div>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <div className="empty-state">Aucun appel enregistré pour le moment.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'callTemplate' ? (
              <div className="modal__grid modal__grid--single">
                <div className="list-card list-card--form">
                  <div className="list-card__header">
                    <div className="list-card__title-group">
                      <div className="list-card__title">Template d’appel</div>
                      <div className="list-card__subtitle">
                        Utilisé comme base à l’ouverture d’un nouvel appel téléphonique.
                      </div>
                    </div>
                    <div className="list-card__tools">
                      <button
                        className="btn btn--ghost btn--small"
                        type="button"
                        onClick={() => updateCallTemplate(PHONE_CALL_TEMPLATE)}
                      >
                        Réinitialiser
                      </button>
                    </div>
                  </div>
                  <div className="list-card__body">
                    <div className="settings-block">
                      <div className="token-buttons">
                        <button
                          type="button"
                          className="token-btn token-btn--tag"
                          title="Insérer un tag"
                          onClick={() => insertCallTemplateToken(TAG_TOKEN)}
                        >
                          T
                        </button>
                        <button
                          type="button"
                          className="token-btn token-btn--selector"
                          title="Insérer un sélecteur"
                          onClick={() => insertCallTemplateToken(SELECTOR_TOKEN)}
                        >
                          S
                        </button>
                        <button
                          type="button"
                          className="token-btn token-btn--addition"
                          title="Insérer un ajout"
                          onClick={() => insertCallTemplateToken(ADDITION_TOKEN)}
                        >
                          A
                        </button>
                      </div>
                      <textarea
                        className="textarea textarea--tall"
                        ref={callTemplateRef}
                        value={callTemplate}
                        placeholder="Template d’appel"
                        data-tag-autocomplete-field="true"
                        onFocus={(event) =>
                          updateTagSuggestionFromTarget(
                            'call-template',
                            event.currentTarget,
                            event.currentTarget.value,
                          )
                        }
                        onClick={(event) =>
                          updateTagSuggestionFromTarget(
                            'call-template',
                            event.currentTarget,
                            event.currentTarget.value,
                          )
                        }
                        onKeyUp={(event) =>
                          updateTagSuggestionFromTarget(
                            'call-template',
                            event.currentTarget,
                            event.currentTarget.value,
                          )
                        }
                        onChange={(event) => {
                          const nextValue = event.target.value
                          updateCallTemplate(nextValue)
                          updateTagSuggestionFromTarget(
                            'call-template',
                            event.currentTarget,
                            nextValue,
                          )
                        }}
                      />
                      {renderTagSuggestions('call-template', (tag) =>
                        applySuggestedTag(
                          'call-template',
                          callTemplateRef,
                          callTemplate,
                          updateCallTemplate,
                          tag,
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'display' ? (
              <div className="list-card list-card--form">
                <div className="list-card__header">
                  <div className="list-card__title-group">
                    <div className="list-card__title">Affichage</div>
                    <div className="list-card__subtitle">Confort visuel et densité.</div>
                  </div>
                </div>
                <div className="list-card__body">
                  <div className="settings-block">
                    {renderSettingsSlider(
                      'Taille du texte',
                      `${Math.round(textScale * 100)}%`,
                      '85%',
                      '140%',
                      textScale,
                      0.85,
                      1.4,
                      0.05,
                      (nextScale) => {
                        const textScale = Math.min(1.4, Math.max(0.85, nextScale))
                        updateSettings({ textScale })
                      },
                      {
                        description: 'Ajuste la densité globale de lecture dans toute l’application.',
                      },
                    )}
                    {renderSettingsSlider(
                      'Niveau de zoom',
                      `${Math.round(zoomValue * 100)}%`,
                      '80%',
                      '130%',
                      zoomValue,
                      0.8,
                      1.3,
                      0.05,
                      (nextZoom) => {
                        const zoom = Math.min(1.3, Math.max(0.8, nextZoom))
                        updateSettings({ zoom })
                      },
                      {
                        description: 'Modifie l’échelle générale des panneaux et des cartes.',
                      },
                    )}
                    {renderSettingsSlider(
                      'Interligne éditeur',
                      `${editorLineHeight.toFixed(2)}x`,
                      '1.30x',
                      '2.00x',
                      editorLineHeight,
                      1.3,
                      2,
                      0.05,
                      (nextHeight) => {
                        const editorLineHeight = Math.min(2, Math.max(1.3, nextHeight))
                        updateSettings({ editorLineHeight })
                      },
                      {
                        description: 'Laisse plus ou moins d’air entre les lignes de l’éditeur.',
                      },
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'export' ? (
              <div className="list-card list-card--form">
                <div className="list-card__header">
                  <div className="list-card__title-group">
                    <div className="list-card__title">Texte exporté</div>
                    <div className="list-card__subtitle">Police et taille lors de la copie.</div>
                  </div>
                </div>
                <div className="list-card__body">
                  <div className="settings-block">
                    <div>
                      <div className="settings-row">
                        <div className="settings-label">Police</div>
                      </div>
                      <select
                        className="select select--roomy"
                        value={exportFont}
                        onChange={(event) => updateSettings({ exportFont: event.target.value })}
                      >
                        {exportFontOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {renderSettingsSlider(
                      'Taille',
                      `${exportFontSize}px`,
                      `${EXPORT_FONT_SIZE_MIN}px`,
                      `${EXPORT_FONT_SIZE_MAX}px`,
                      exportFontSize,
                      EXPORT_FONT_SIZE_MIN,
                      EXPORT_FONT_SIZE_MAX,
                      1,
                      (nextSize) => {
                        const exportFontSize = Math.min(
                          EXPORT_FONT_SIZE_MAX,
                          Math.max(EXPORT_FONT_SIZE_MIN, nextSize),
                        )
                        updateSettings({ exportFontSize })
                      },
                      {
                        description: 'Définit la taille du texte lors de la copie/export.',
                      },
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'general' ? (
              <div className="list-card list-card--form">
                <div className="list-card__header">
                  <div className="list-card__title-group">
                    <div className="list-card__title">Général</div>
                    <div className="list-card__subtitle">Comportements et langue.</div>
                  </div>
                </div>
                <div className="list-card__body">
                  <div className="settings-block">
                    <div className="settings-option">
                      <div className="settings-option__info">
                        <div className="settings-option__title">Focus auto sur l'éditeur</div>
                        <div className="settings-option__desc">
                          Revient dans l'email après fermeture de l'édition.
                        </div>
                      </div>
                      <label className="settings-toggle">
                        <input
                          type="checkbox"
                          checked={autoFocusEditor}
                          onChange={(event) =>
                            updateSettings({ autoFocusEditor: event.target.checked })
                          }
                        />
                        <span className="settings-toggle__track">
                          <span className="settings-toggle__thumb" />
                        </span>
                      </label>
                    </div>
                    <div className="settings-option">
                      <div className="settings-option__info">
                        <div className="settings-option__title">Langue des templates</div>
                        <div className="settings-option__desc">
                          Filtre par défaut des templates mail.
                        </div>
                      </div>
                      <div className="settings-segment">
                        {(['fr', 'en'] as Language[]).map((lang) => (
                          <button
                            key={lang}
                            type="button"
                            className={`settings-pill${
                              data.settings.language === lang ? ' is-active' : ''
                            }`}
                            onClick={() => updateSettings({ language: lang })}
                          >
                            {lang.toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'snippetSettings' ? (
              <div className="list-card list-card--form">
                <div className="list-card__header">
                  <div className="list-card__title-group">
                    <div className="list-card__title">Réglages snippets</div>
                    <div className="list-card__subtitle">Règles de création rapide.</div>
                  </div>
                </div>
                <div className="list-card__body">
                    <div className="settings-block">
                      <div className="settings-option">
                        <div className="settings-option__info">
                          <div className="settings-option__title">Affichage des catégories</div>
                        <div className="settings-option__desc">
                          Affiche les catégories des snippets en 7 boutons ou en liste déroulante.
                        </div>
                      </div>
                      <div className="settings-segment">
                        <button
                          type="button"
                          className={`settings-pill${
                            snippetCategoryDisplay === 'buttons' ? ' is-active' : ''
                          }`}
                          onClick={() => updateSettings({ snippetCategoryDisplay: 'buttons' })}
                        >
                          7 boutons
                        </button>
                        <button
                          type="button"
                          className={`settings-pill${
                            snippetCategoryDisplay === 'dropdown' ? ' is-active' : ''
                          }`}
                          onClick={() => updateSettings({ snippetCategoryDisplay: 'dropdown' })}
                        >
                          Liste déroulante
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'history' ? (
              <div className="list-card list-card--form">
                <div className="list-card__header">
                  <div className="list-card__title-group">
                    <div className="list-card__title">Historique</div>
                    <div className="list-card__subtitle">Mémoire de copie.</div>
                  </div>
                </div>
                <div className="list-card__body">
                  <div className="settings-block">
                    <div className="settings-option">
                      <div className="settings-option__info">
                        <div className="settings-option__title">
                          Sauvegarder les copies email
                        </div>
                        <div className="settings-option__desc">
                          Ajoute l'email copié dans l'historique.
                        </div>
                      </div>
                      <label className="settings-toggle">
                        <input
                          type="checkbox"
                          checked={historyOnCopy}
                          onChange={(event) =>
                            updateSettings({ historyOnCopy: event.target.checked })
                          }
                        />
                        <span className="settings-toggle__track">
                          <span className="settings-toggle__thumb" />
                        </span>
                      </label>
                    </div>
                    {renderSettingsSlider(
                      'Taille max',
                      `${historyLimit} entrées`,
                      '50',
                      '400',
                      historyLimit,
                      50,
                      400,
                      10,
                      (nextLimit) => {
                        const historyLimit = Math.min(400, Math.max(50, nextLimit))
                        updateSettings({ historyLimit })
                      },
                      {
                        description: 'Détermine combien de copies email sont conservées.',
                        disabled: !historyOnCopy,
                      },
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'preferences' ? (
              <div className="modal__grid modal__grid--single">
                <div className="list-card list-card--form">
                  <div className="list-card__header">
                    <div className="list-card__title-group">
                      <div className="list-card__title">Préférences</div>
                      <div className="list-card__subtitle">
                        Réglages globaux, snippets et format d’export regroupés au même endroit.
                      </div>
                    </div>
                  </div>
                  <div className="list-card__body">
                    <div className="settings-stack">
                      <section className="settings-group">
                        <div className="settings-group__title">Général</div>
                        <div className="settings-block">
                          <div className="settings-option">
                            <div className="settings-option__info">
                              <div className="settings-option__title">
                                Focus auto sur l'éditeur
                              </div>
                              <div className="settings-option__desc">
                                Revient dans l'email après fermeture des settings.
                              </div>
                            </div>
                            <label className="settings-toggle">
                              <input
                                type="checkbox"
                                checked={autoFocusEditor}
                                onChange={(event) =>
                                  updateSettings({ autoFocusEditor: event.target.checked })
                                }
                              />
                              <span className="settings-toggle__track">
                                <span className="settings-toggle__thumb" />
                              </span>
                            </label>
                          </div>
                          <div className="settings-option">
                            <div className="settings-option__info">
                              <div className="settings-option__title">Langue des templates</div>
                              <div className="settings-option__desc">
                                Filtre par défaut des templates mail.
                              </div>
                            </div>
                            <div className="settings-segment">
                              {(['fr', 'en'] as Language[]).map((lang) => (
                                <button
                                  key={lang}
                                  type="button"
                                  className={`settings-pill${
                                    data.settings.language === lang ? ' is-active' : ''
                                  }`}
                                  onClick={() => updateSettings({ language: lang })}
                                >
                                  {lang.toUpperCase()}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </section>

                      <section className="settings-group">
                        <div className="settings-group__title">Snippets</div>
                        <div className="settings-block">
                          <div className="settings-option">
                            <div className="settings-option__info">
                              <div className="settings-option__title">
                                Affichage des catégories
                              </div>
                              <div className="settings-option__desc">
                                Choix entre boutons rapides et liste déroulante.
                              </div>
                            </div>
                            <div className="settings-segment">
                              <button
                                type="button"
                                className={`settings-pill${
                                  snippetCategoryDisplay === 'buttons' ? ' is-active' : ''
                                }`}
                                onClick={() => updateSettings({ snippetCategoryDisplay: 'buttons' })}
                              >
                                7 boutons
                              </button>
                              <button
                                type="button"
                                className={`settings-pill${
                                  snippetCategoryDisplay === 'dropdown' ? ' is-active' : ''
                                }`}
                                onClick={() =>
                                  updateSettings({ snippetCategoryDisplay: 'dropdown' })
                                }
                              >
                                Liste déroulante
                              </button>
                            </div>
                          </div>
                        </div>
                      </section>

                      <section className="settings-group">
                        <div className="settings-group__title">Texte exporté</div>
                        <div className="settings-block">
                          <div>
                            <div className="settings-row">
                              <div className="settings-label">Police</div>
                            </div>
                            <select
                              className="select select--roomy"
                              value={exportFont}
                              onChange={(event) =>
                                updateSettings({ exportFont: event.target.value })
                              }
                            >
                              {exportFontOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                                ))}
                            </select>
                          </div>
                          {renderSettingsSlider(
                            'Taille',
                            `${exportFontSize}px`,
                            `${EXPORT_FONT_SIZE_MIN}px`,
                            `${EXPORT_FONT_SIZE_MAX}px`,
                            exportFontSize,
                            EXPORT_FONT_SIZE_MIN,
                            EXPORT_FONT_SIZE_MAX,
                            1,
                            (nextSize) => {
                              const nextExportFontSize = Math.min(
                                EXPORT_FONT_SIZE_MAX,
                                Math.max(EXPORT_FONT_SIZE_MIN, nextSize),
                              )
                              updateSettings({ exportFontSize: nextExportFontSize })
                            },
                            {
                              description: 'Définit la taille du texte lors de la copie/export.',
                            },
                          )}
                        </div>
                      </section>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'dashboardPortal' ? (
              <div className="modal__grid modal__grid--single">
                <div className="list-card list-card--form">
                  <div className="list-card__header">
                    <div className="list-card__title-group">
                      <div className="list-card__title">Procédure Portal</div>
                      <div className="list-card__subtitle">
                        Une procédure peut contenir un ou deux codes, chacun avec ses attributs.
                      </div>
                    </div>
                    <div className="list-card__tools">
                      <button
                        className="btn btn--ghost btn--small"
                        type="button"
                        onClick={handleAddPortalProcedure}
                      >
                        Ajouter
                      </button>
                    </div>
                  </div>
                  <div className="list-card__body">
                    {renderPortalCodeEditorSettings()}
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'dashboardVersions'
              ? renderDashboardCatalogEditor({
                  title: 'Catalogue de versions',
                  subtitle:
                    'Catalogue structuré en logiciels, drivers et firmwares avec produits compatibles.',
                  items: dashboardVersionProducts,
                  defaultCategory: 'software',
                  categoryOptions: ['software', 'driver', 'firmware'],
                  emptyListMessage: 'Aucun logiciel, firmware ou driver configuré.',
                  emptySelectionMessage:
                    'Sélectionnez un élément pour l’éditer ou appuyez sur Nouveau.',
                  latestVersionPlaceholder: 'Dernière version disponible',
                  fixedCategoryLabel: '',
                })
              : null}

            {editTab === 'dashboardSpareParts' ? (
              <div className="modal__grid">
                <div className="list-card">
                  <div className="list-card__header list-card__header--wrap">
                    <div className="list-card__title-group">
                      <div className="list-card__title">Produits</div>
                      <div className="list-card__subtitle">
                        Chaque produit possède sa propre liste de spare parts.
                      </div>
                    </div>
                  </div>
                  <div className="list-card__body">
                    {productsSorted.length ? (
                      productsSorted.map((product) => (
                        <div
                          key={product.id}
                          className={`list-item list-item--compact${
                            selectedProductCatalogId === product.id ? ' is-selected' : ''
                          }`}
                          onClick={() => {
                            setProductDraft({
                              ...product,
                              spareParts: product.spareParts.map((sparePart) => ({ ...sparePart })),
                            })
                            setSelectedProductCatalogId(product.id)
                          }}
                        >
                          <div className="list-item__content">
                            <div className="list-item__title">{product.name}</div>
                            <div className="list-item__meta">
                              {product.spareParts.length} spare part
                              {product.spareParts.length > 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">
                        Aucun produit configuré. Ajoutez d’abord un produit dans le sous-menu
                        Produits.
                      </div>
                    )}
                  </div>
                </div>

                <div className="list-card list-card--form">
                  <div className="list-card__header">
                    <div className="list-card__title-group">
                      <div className="list-card__title">Spare Parts</div>
                      <div className="list-card__subtitle">
                        Nom, SKU et disponibilité du guide pour chaque pièce.
                      </div>
                    </div>
                    <div className="list-card__tools">
                      <button
                        className="btn btn--ghost btn--small"
                        type="button"
                        onClick={addProductDraftSparePart}
                        disabled={isProductCatalogSelectionEmpty}
                      >
                        Ajouter une spare part
                      </button>
                      <button
                        className="btn btn--primary btn--small"
                        type="button"
                        onClick={handleSaveProductCatalogItem}
                        disabled={isProductCatalogSelectionEmpty}
                      >
                        Sauver
                      </button>
                    </div>
                  </div>
                  <div className="list-card__body">
                    {isProductCatalogSelectionEmpty ? (
                      <div className="empty-state">
                        Sélectionnez un produit pour éditer ses spare parts.
                      </div>
                    ) : (
                      <div className="spare-parts-editor">
                        {productDraft.spareParts.length ? (
                          productDraft.spareParts.map((sparePart) => (
                            <article className="spare-parts-editor__item" key={sparePart.id}>
                              <div className="form__row two">
                                <input
                                  className="input"
                                  placeholder="Nom"
                                  value={sparePart.name}
                                  onChange={(event) =>
                                    updateProductDraftSparePart(sparePart.id, {
                                      name: event.target.value,
                                    })
                                  }
                                />
                                <input
                                  className="input"
                                  placeholder="SKU"
                                  value={sparePart.sku}
                                  onChange={(event) =>
                                    updateProductDraftSparePart(sparePart.id, {
                                      sku: event.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="spare-parts-editor__footer">
                                <label className="portal-code-editor__check">
                                  <input
                                    type="checkbox"
                                    checked={sparePart.guideAvailable}
                                    onChange={(event) =>
                                      updateProductDraftSparePart(sparePart.id, {
                                        guideAvailable: event.target.checked,
                                      })
                                    }
                                  />
                                  <span>Guide disponible</span>
                                </label>
                                <button
                                  className="icon-btn-sm danger"
                                  type="button"
                                  title="Supprimer"
                                  onClick={() => removeProductDraftSparePart(sparePart.id)}
                                >
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                </button>
                              </div>
                            </article>
                          ))
                        ) : (
                          <div className="empty-state">
                            Aucune spare part pour ce produit. Utilisez le bouton Ajouter une spare
                            part.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'dashboardNews' ? (
              <div className="modal__grid">
                <div className="list-card">
                  <div className="list-card__header list-card__header--wrap">
                    <div className="list-card__title-group">
                      <div className="list-card__title">News</div>
                      <div className="list-card__subtitle">
                        Liste affichée dans la page 6 du dashboard.
                      </div>
                    </div>
                  </div>
                  <div className="list-card__body">
                    {dashboardNewsSorted.length ? (
                      dashboardNewsSorted.map((item) => (
                        <div
                          key={item.id}
                          className={`list-item list-item--compact${
                            selectedDashboardNewsId === item.id ? ' is-selected' : ''
                          }`}
                          onClick={() => {
                            setDashboardNewsDraft({ ...item })
                            setSelectedDashboardNewsId(item.id)
                          }}
                        >
                          <div className="list-item__content">
                            <div className="list-item__title">{item.title || 'Sans titre'}</div>
                            <div className="list-item__meta">
                              {formatDashboardNewsDate(item.date)}
                            </div>
                          </div>
                          <div className="list-item__actions">
                            <button
                              className="icon-btn-sm danger"
                              type="button"
                              title="Supprimer"
                              onClick={(event) => {
                                event.stopPropagation()
                                handleDeleteDashboardNews(item)
                              }}
                            >
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">Aucune news configurée.</div>
                    )}
                  </div>
                </div>

                <div className="list-card list-card--form">
                  <div className="list-card__header">
                    <div className="list-card__title-group">
                      <div className="list-card__title">Détails news</div>
                      <div className="list-card__subtitle">
                        Date, titre et contenu affichés dans le dashboard.
                      </div>
                    </div>
                    <div className="list-card__tools">
                      <button
                        className="btn btn--ghost btn--small"
                        type="button"
                        onClick={() => {
                          setDashboardNewsDraft(getEmptyDashboardNewsDraft())
                          setSelectedDashboardNewsId('new')
                        }}
                      >
                        Nouveau
                      </button>
                      <button
                        className="btn btn--primary btn--small"
                        type="button"
                        onClick={handleSaveDashboardNews}
                      >
                        Sauver
                      </button>
                    </div>
                  </div>
                  <div className="list-card__body">
                    {isDashboardNewsSelectionEmpty ? (
                      <div className="empty-state">
                        Sélectionnez une news pour l’éditer ou appuyez sur Nouveau.
                      </div>
                    ) : (
                      <div className="form">
                        <input
                          className="input"
                          type="date"
                          value={dashboardNewsDraft.date}
                          onChange={(event) =>
                            setDashboardNewsDraft((prev) => ({
                              ...prev,
                              date: event.target.value,
                            }))
                          }
                        />
                        <input
                          className="input"
                          placeholder="Titre"
                          value={dashboardNewsDraft.title}
                          onChange={(event) =>
                            setDashboardNewsDraft((prev) => ({
                              ...prev,
                              title: event.target.value,
                            }))
                          }
                        />
                        <textarea
                          className="textarea textarea--tall"
                          placeholder="Contenu"
                          value={dashboardNewsDraft.content}
                          onChange={(event) =>
                            setDashboardNewsDraft((prev) => ({
                              ...prev,
                              content: event.target.value,
                            }))
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'dashboard' ? (
              <div className="modal__grid modal__grid--settings">
                <div className="list-card list-card--form">
                  <div className="list-card__header">
                    <div className="list-card__title-group">
                      <div className="list-card__title">Portal Procédure</div>
                      <div className="list-card__subtitle">
                        Une procédure peut contenir un ou deux codes, chacun avec ses attributs.
                      </div>
                    </div>
                    <div className="list-card__tools">
                      <button
                        className="btn btn--ghost btn--small"
                        type="button"
                        onClick={handleAddPortalProcedure}
                      >
                        Ajouter
                      </button>
                    </div>
                  </div>
                  <div className="list-card__body">
                    {renderPortalCodeEditorSettings()}
                  </div>
                </div>

                <div className="list-card list-card--form">
                  <div className="list-card__header">
                    <div className="list-card__title-group">
                      <div className="list-card__title">Catalogue versions</div>
                      <div className="list-card__subtitle">
                        Logiciels, drivers et produits affichés dans le dashboard versions.
                      </div>
                    </div>
                    <div className="list-card__tools">
                      <button
                        className="btn btn--ghost btn--small"
                        type="button"
                        onClick={() => {
                          setDashboardProductDraft(getEmptyDashboardProductDraft())
                          setSelectedDashboardProductId('new')
                        }}
                      >
                        Nouveau
                      </button>
                      <button
                        className="btn btn--primary btn--small"
                        type="button"
                        onClick={handleSaveDashboardProduct}
                      >
                        Sauver
                      </button>
                    </div>
                  </div>
                  <div className="list-card__body">
                    <div className="dashboard-product-editor">
                      <div className="dashboard-product-editor__list">
                        {dashboardProducts.length ? (
                          dashboardProducts.map((product) => (
                            <div
                              key={product.id}
                              className={`list-item list-item--compact${
                                selectedDashboardProductId === product.id ? ' is-selected' : ''
                              }`}
                              onClick={() => {
                                setDashboardProductDraft({
                                  ...product,
                                  softwareIds: [...(product.softwareIds ?? [])],
                                  driverIds: [...(product.driverIds ?? [])],
                                })
                                setSelectedDashboardProductId(product.id)
                              }}
                            >
                              <div className="list-item__content">
                                <div className="list-item__title">{product.name}</div>
                                <div className="list-item__meta">
                                  {dashboardProductCategoryLabels[product.category]} •{' '}
                                  {product.latestVersion.trim() || 'Version non renseignée'}
                                </div>
                              </div>
                              <div className="list-item__actions">
                                <button
                                  className="icon-btn-sm danger"
                                  type="button"
                                  title="Supprimer"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    handleDeleteDashboardProduct(product)
                                  }}
                                >
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <line x1="18" y1="6" x2="6" y2="18" />
                                    <line x1="6" y1="6" x2="18" y2="18" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="empty-state">Aucun élément configuré.</div>
                        )}
                      </div>

                      <div className="dashboard-product-editor__form">
                        {isDashboardProductSelectionEmpty ? (
                          <div className="empty-state">
                            Sélectionnez un élément pour l’éditer ou appuyez sur Nouveau.
                          </div>
                        ) : (
                          <div className="form">
                            <input
                              className="input"
                              placeholder="Nom"
                              value={dashboardProductDraft.name}
                              onChange={(event) =>
                                setDashboardProductDraft((prev) => ({
                                  ...prev,
                                  name: event.target.value,
                                }))
                              }
                            />

                            <select
                              className="select select--roomy"
                              value={dashboardProductDraft.category}
                              onChange={(event) =>
                                setDashboardProductDraft((prev) => {
                                  const category = event.target.value as DashboardProductCategory
                                  return {
                                    ...prev,
                                    category,
                                    softwareIds:
                                      category === 'driver' || category === 'product'
                                        ? prev.softwareIds ?? []
                                        : [],
                                    driverIds: category === 'product' ? prev.driverIds ?? [] : [],
                                  }
                                })
                              }
                            >
                              {dashboardProductCategoryOrder.map((category) => (
                                <option key={category} value={category}>
                                  {dashboardProductCategoryLabels[category]}
                                </option>
                              ))}
                            </select>

                            <input
                              className="input"
                              placeholder="Dernière version disponible"
                              value={dashboardProductDraft.latestVersion}
                              onChange={(event) =>
                                setDashboardProductDraft((prev) => ({
                                  ...prev,
                                  latestVersion: event.target.value,
                                }))
                              }
                            />

                            <input
                              className="input"
                              placeholder="URL support (optionnel)"
                              value={dashboardProductDraft.supportUrl ?? ''}
                              onChange={(event) =>
                                setDashboardProductDraft((prev) => ({
                                  ...prev,
                                  supportUrl: event.target.value,
                                }))
                              }
                            />

                            {dashboardProductDraft.category !== 'software' ? (
                              <div className="dashboard-product-editor__relations">
                                <div className="settings-label">Logiciels compatibles</div>
                                {dashboardSoftwareProducts.filter(
                                  (product) => product.id !== dashboardProductDraft.id,
                                ).length ? (
                                  <div className="dashboard-product-editor__relation-list">
                                    {dashboardSoftwareProducts
                                      .filter((product) => product.id !== dashboardProductDraft.id)
                                      .map((product) => {
                                        const checked = (
                                          dashboardProductDraft.softwareIds ?? []
                                        ).includes(product.id)
                                        return (
                                          <label
                                            className="dashboard-product-editor__relation-item"
                                            key={product.id}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={checked}
                                              onChange={(event) =>
                                                setDashboardProductDraft((prev) => ({
                                                  ...prev,
                                                  softwareIds: event.target.checked
                                                    ? [...(prev.softwareIds ?? []), product.id]
                                                    : (prev.softwareIds ?? []).filter(
                                                        (id) => id !== product.id,
                                                      ),
                                                }))
                                              }
                                            />
                                            <span>
                                              {product.name}
                                              {product.latestVersion.trim()
                                                ? ` (${product.latestVersion.trim()})`
                                                : ''}
                                            </span>
                                          </label>
                                        )
                                      })}
                                  </div>
                                ) : (
                                  <div className="list-item__meta">
                                    Aucun logiciel configuré pour le moment.
                                  </div>
                                )}
                              </div>
                            ) : null}

                            {dashboardProductDraft.category === 'product' ? (
                              <div className="dashboard-product-editor__relations">
                                <div className="settings-label">Drivers utilisés</div>
                                {dashboardDriverProducts.filter(
                                  (product) => product.id !== dashboardProductDraft.id,
                                ).length ? (
                                  <div className="dashboard-product-editor__relation-list">
                                    {dashboardDriverProducts
                                      .filter((product) => product.id !== dashboardProductDraft.id)
                                      .map((product) => {
                                        const checked = (
                                          dashboardProductDraft.driverIds ?? []
                                        ).includes(product.id)
                                        return (
                                          <label
                                            className="dashboard-product-editor__relation-item"
                                            key={product.id}
                                          >
                                            <input
                                              type="checkbox"
                                              checked={checked}
                                              onChange={(event) =>
                                                setDashboardProductDraft((prev) => ({
                                                  ...prev,
                                                  driverIds: event.target.checked
                                                    ? [...(prev.driverIds ?? []), product.id]
                                                    : (prev.driverIds ?? []).filter(
                                                        (id) => id !== product.id,
                                                      ),
                                                }))
                                              }
                                            />
                                            <span>
                                              {product.name}
                                              {product.latestVersion.trim()
                                                ? ` (${product.latestVersion.trim()})`
                                                : ''}
                                            </span>
                                          </label>
                                        )
                                      })}
                                  </div>
                                ) : (
                                  <div className="list-item__meta">
                                    Aucun driver configuré pour le moment.
                                  </div>
                                )}
                              </div>
                            ) : null}

                            <div className="token-buttons">
                              <button
                                type="button"
                                className="token-btn token-btn--bold"
                                title="Gras"
                                onClick={() => insertDashboardProductSheetWrap('[b]', '[/b]', 'texte')}
                              >
                                B
                              </button>
                              <button
                                type="button"
                                className="token-btn token-btn--italic"
                                title="Italique"
                                onClick={() => insertDashboardProductSheetWrap('[i]', '[/i]', 'texte')}
                              >
                                I
                              </button>
                              <button
                                type="button"
                                className="token-btn token-btn--link"
                                title="Lien"
                                onClick={insertDashboardProductSheetLink}
                              >
                                L
                              </button>
                            </div>

                            <textarea
                              className="textarea textarea--tall"
                              ref={dashboardProductSheetRef}
                              placeholder="Notes, firmware, compatibilité, liens..."
                              value={dashboardProductDraft.sheet}
                              onChange={(event) =>
                                setDashboardProductDraft((prev) => ({
                                  ...prev,
                                  sheet: event.target.value,
                                }))
                              }
                            />

                            <div className="list-item__meta">
                              Mise en forme supportée : [b][/b], [i][/i], [texte](https://...)
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'updates' ? (
              <div className="modal__grid modal__grid--single">
                <div className="list-card list-card--form">
                  <div className="list-card__header">
                    <div className="list-card__title-group">
                      <div className="list-card__title">Mise à jour</div>
                      <div className="list-card__subtitle">
                        Vérification et statut de l’application.
                      </div>
                    </div>
                  </div>
                  <div className="list-card__body">
                    <div className="settings-update">
                      <section className="settings-update__hero">
                        <div
                          className={`settings-update__badge is-${getUpdatePhaseTone(updateStatus)}`}
                        >
                          {getUpdatePhaseTitle(updateStatus)}
                        </div>
                        <div className="settings-update__hero-title">Mise à jour SpeedMail</div>
                        <div className="settings-update__hero-text">{updateSettingsLabel}</div>
                      </section>

                      <div className="settings-update__grid">
                        <article className="settings-update__card settings-update__card--current">
                          <div className="settings-update__card-label">Version actuelle</div>
                          <div className="settings-update__card-value settings-update__card-value--version">
                            {APP_VERSION_LABEL}
                          </div>
                          <div className="settings-update__card-meta">
                            Build installé sur cette application.
                          </div>
                        </article>
                        <article className="settings-update__card settings-update__card--available">
                          <div className="settings-update__card-label">Version disponible</div>
                          <div className="settings-update__card-value settings-update__card-value--version">
                            {availableUpdateVersionLabel}
                          </div>
                          <div className="settings-update__card-meta">{availableUpdateVersionMeta}</div>
                        </article>
                      </div>

                      <div className="settings-update__details">
                        <div className="settings-update__detail">
                          <span>Dernière vérification</span>
                          <strong>{formatUpdateCheckedAt(updateStatus?.checkedAt)}</strong>
                        </div>
                        <div className="settings-update__detail">
                          <span>Statut</span>
                          <strong>{getUpdatePhaseTitle(updateStatus)}</strong>
                        </div>
                      </div>

                      {showUpdateProgress ? (
                        <div className="settings-update__progress">
                          <div className="settings-update__progress-head">
                            <span>
                              {updateStatus?.phase === 'downloaded'
                                ? 'Téléchargement terminé'
                                : updateStatus?.phase === 'downloading'
                                  ? 'Téléchargement en cours'
                                  : 'Préparation du téléchargement'}
                            </span>
                            <strong>
                              {typeof updateDownloadProgress === 'number'
                                ? `${updateDownloadProgress}%`
                                : 'En attente'}
                            </strong>
                          </div>
                          <div
                            className={`settings-update__progress-bar${
                              typeof updateDownloadProgress === 'number'
                                ? ''
                                : ' is-indeterminate'
                            }`}
                          >
                            <span
                              style={{
                                width: `${
                                  typeof updateDownloadProgress === 'number'
                                    ? updateDownloadProgress
                                    : 100
                                }%`,
                              }}
                            />
                          </div>
                          <div className="settings-update__progress-meta">
                            {updateStatus?.phase === 'downloaded'
                              ? 'Le téléchargement est terminé. Tu peux lancer l’installation.'
                              : updateStatus?.phase === 'downloading'
                                ? 'La barre se met à jour en direct pendant le téléchargement.'
                                : 'La mise à jour a été trouvée, le téléchargement se prépare.'}
                          </div>
                        </div>
                      ) : null}

                      <div className="settings-update__actions">
                        <button
                          type="button"
                          className="btn btn--ghost btn--small"
                          onClick={handleCheckUpdatesNow}
                          disabled={checkingUpdateManually || isUpdateCheckRunning}
                        >
                          {checkingUpdateManually || isUpdateCheckRunning
                            ? 'Recherche en cours...'
                            : 'Rechercher une mise à jour'}
                        </button>
                        {isUpdateReadyToInstall ? (
                          <button
                            type="button"
                            className="btn btn--small"
                            onClick={() => void handleInstallDownloadedUpdate()}
                            disabled={installingDownloadedUpdate}
                          >
                            {installingDownloadedUpdate
                              ? 'Installation...'
                              : 'Appliquer la mise à jour'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
              </div>
            </div>

          </div>
        </div>
      </div>
      ) : null}

    </>
  )
}

export default App
