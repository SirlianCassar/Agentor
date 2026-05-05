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
  DashboardProcessLine,
  DashboardProduct,
  DashboardProductCategory,
  InsertMode,
  Language,
  MailTemplate,
  ProductEdition,
  ProductEditionPlatform,
  ProductCatalogItem,
  Procedure,
  ProcedureBrand,
  ProcedureCoverage,
  PortalQuickLinkId,
  SparePart,
  Snippet,
  TaskTemplate,
} from './lib/types'
import {
  categoryColors,
  countTokens,
  createId,
  escapeHtml,
  formatDashboardNewsText,
  highlightText,
  highlightTextPreview,
  formatProcedureText,
  normalizeDashboardNewsColorTags,
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
const PROCEDURE_CHANNEL = 'agentor-procedure'
const showLegacyProcedureUI = false
const APP_VERSION = (import.meta.env.VITE_APP_VERSION || '2.0.0').trim()
const APP_VERSION_LABEL = APP_VERSION.replace(/\.0$/, '')
const VAT_DIVISOR = 1.2
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
const productEditionPlatformOptions: Array<{
  value: ProductEditionPlatform
  label: string
}> = [
  { value: 'pc', label: 'PC' },
  { value: 'xbox', label: 'Xbox' },
  { value: 'playstation', label: 'PlayStation' },
  { value: 'custom', label: 'Autre' },
]
const productEditionPlatformLabels: Record<ProductEditionPlatform, string> = {
  pc: 'PC',
  xbox: 'Xbox',
  playstation: 'PlayStation',
  custom: 'Autre',
}
type DashboardCalculatorItem = {
  id: string
  productPrice: string
  shippingPrice: string
  importFee: string
}
type DashboardCalculatorCopyKey =
  | 'productsTtc'
  | 'productsHt'
  | 'shippingTtc'
  | 'shippingHt'
  | 'totalTtc'
  | 'totalHt'

type DraftBoxSlot = {
  email: string
  task: string
  savedAt: string
}

type DraftBoxTooltipState = {
  index: number
  x: number
  y: number
  previewHtml: string
}

const createDashboardCalculatorItem = (): DashboardCalculatorItem => ({
  id: createId('dashboard-calculator'),
  productPrice: '',
  shippingPrice: '',
  importFee: '',
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

type AppIconName =
  | 'archive'
  | 'box'
  | 'call'
  | 'channels'
  | 'dashboard'
  | 'display'
  | 'download'
  | 'grid'
  | 'history'
  | 'inbox'
  | 'info'
  | 'list'
  | 'mail'
  | 'money'
  | 'news'
  | 'notes'
  | 'palette'
  | 'phone'
  | 'portal'
  | 'preferences'
  | 'search'
  | 'settings'
  | 'shield'
  | 'tag'
  | 'template'
  | 'tool'
  | 'version'

const UiIcon = ({ name, className }: { name: AppIconName; className?: string }) => {
  const common = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }

  switch (name) {
    case 'archive':
      return (
        <svg {...common}>
          <path d="M3 7h18" />
          <path d="M5 7v12h14V7" />
          <path d="M8 4h8l2 3H6z" />
          <path d="M10 12h4" />
        </svg>
      )
    case 'box':
      return (
        <svg {...common}>
          <path d="M21 8l-9-5-9 5 9 5z" />
          <path d="M3 8v8l9 5 9-5V8" />
          <path d="M12 13v8" />
        </svg>
      )
    case 'call':
      return (
        <svg {...common}>
          <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.6-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" />
        </svg>
      )
    case 'channels':
      return (
        <svg {...common}>
          <path d="M5 7h14" />
          <path d="M5 12h14" />
          <path d="M5 17h14" />
          <path d="M8 4L6 20" />
          <path d="M18 4l-2 16" />
        </svg>
      )
    case 'dashboard':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      )
    case 'display':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8" />
          <path d="M12 16v4" />
        </svg>
      )
    case 'download':
      return (
        <svg {...common}>
          <path d="M12 3v12" />
          <path d="M7 10l5 5 5-5" />
          <path d="M5 21h14" />
        </svg>
      )
    case 'grid':
      return (
        <svg {...common}>
          <path d="M4 4h6v6H4z" />
          <path d="M14 4h6v6h-6z" />
          <path d="M4 14h6v6H4z" />
          <path d="M14 14h6v6h-6z" />
        </svg>
      )
    case 'history':
      return (
        <svg {...common}>
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v6h6" />
          <path d="M12 7v6l4 2" />
        </svg>
      )
    case 'inbox':
      return (
        <svg {...common}>
          <path d="M4 4h16v16H4z" />
          <path d="M4 13h5l2 3h2l2-3h5" />
        </svg>
      )
    case 'info':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v6" />
          <path d="M12 7h.01" />
        </svg>
      )
    case 'list':
      return (
        <svg {...common}>
          <path d="M8 6h13" />
          <path d="M8 12h13" />
          <path d="M8 18h13" />
          <path d="M3 6h.01" />
          <path d="M3 12h.01" />
          <path d="M3 18h.01" />
        </svg>
      )
    case 'mail':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>
      )
    case 'money':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M15 8.5h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9" />
          <path d="M12 6.5v11" />
        </svg>
      )
    case 'news':
      return (
        <svg {...common}>
          <path d="M4 5h14a2 2 0 0 1 2 2v12H6a2 2 0 0 1-2-2z" />
          <path d="M8 9h8" />
          <path d="M8 13h8" />
          <path d="M8 17h5" />
        </svg>
      )
    case 'notes':
      return (
        <svg {...common}>
          <path d="M5 4h14v11l-5 5H5z" />
          <path d="M14 20v-5h5" />
          <path d="M8 9h8" />
          <path d="M8 13h5" />
        </svg>
      )
    case 'palette':
      return (
        <svg {...common}>
          <path d="M12 3a9 9 0 0 0 0 18h1.2a1.8 1.8 0 0 0 1.3-3l-.2-.2a1.8 1.8 0 0 1 1.3-3H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z" />
          <path d="M7.5 10h.01" />
          <path d="M10 7.5h.01" />
          <path d="M14 7.5h.01" />
        </svg>
      )
    case 'phone':
      return (
        <svg {...common}>
          <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.6-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z" />
          <path d="M15 5a4 4 0 0 1 4 4" />
        </svg>
      )
    case 'portal':
      return (
        <svg {...common}>
          <path d="M4 5h16v14H4z" />
          <path d="M8 9h8" />
          <path d="M8 13h5" />
          <path d="M16 16l4-4-4-4" />
        </svg>
      )
    case 'preferences':
      return (
        <svg {...common}>
          <path d="M4 7h10" />
          <path d="M18 7h2" />
          <path d="M4 17h2" />
          <path d="M10 17h10" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="8" cy="17" r="2" />
        </svg>
      )
    case 'search':
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
      )
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.2.6.8 1 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      )
    case 'shield':
      return (
        <svg {...common}>
          <path d="M12 3l8 4v5c0 5-3.4 8-8 9-4.6-1-8-4-8-9V7z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      )
    case 'tag':
      return (
        <svg {...common}>
          <path d="M20 13l-7 7L4 11V4h7z" />
          <path d="M8.5 8.5h.01" />
        </svg>
      )
    case 'template':
      return (
        <svg {...common}>
          <path d="M5 4h14v16H5z" />
          <path d="M8 8h8" />
          <path d="M8 12h8" />
          <path d="M8 16h5" />
        </svg>
      )
    case 'tool':
      return (
        <svg {...common}>
          <path d="M14.7 6.3a4 4 0 0 0-5 5L4 17l3 3 5.7-5.7a4 4 0 0 0 5-5l-2.9 2.9-3-3z" />
        </svg>
      )
    case 'version':
      return (
        <svg {...common}>
          <path d="M4 6h16" />
          <path d="M4 12h16" />
          <path d="M4 18h16" />
          <path d="M8 3v6" />
          <path d="M16 9v6" />
          <path d="M10 15v6" />
        </svg>
      )
    default:
      return null
  }
}

const PHONE_CALL_TEMPLATE = defaultData.settings.callTemplate
const CALL_HISTORY_LIMIT = 5
type WorkspaceDashboardPage =
  | 'tools'
  | 'calculator'
  | 'portal'
  | 'catalog'
  | 'parts'
  | 'news'

const workspaceDashboardPageOptions: Array<{
  id: WorkspaceDashboardPage
  title: string
  icon: AppIconName
}> = [
  { id: 'tools', title: 'Tools', icon: 'tool' },
  { id: 'calculator', title: 'Price calculator', icon: 'money' },
  { id: 'portal', title: 'Procédures', icon: 'notes' },
  { id: 'catalog', title: 'Catalogue de produits', icon: 'preferences' },
  { id: 'parts', title: 'SKU & spare parts', icon: 'box' },
  { id: 'news', title: 'News & info', icon: 'info' },
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
  | 'dashboardProcess'
  | 'dashboardPortal'
  | 'dashboardVersions'
  | 'dashboardSoftwares'
  | 'dashboardDriverPacks'
  | 'dashboardSpareParts'
  | 'dashboardNews'
  | 'updates'
  | 'display'
  | 'export'
  | 'general'
  | 'snippetSettings'
  | 'history'
  | 'quickLinks'
  | 'preferences'

type SettingsNavSection = {
  id: 'emails' | 'calls' | 'dashboard' | 'general'
  label: string
  icon: AppIconName
  items: Array<{
    id: SettingsTab
    label: string
    description: string
    icon: AppIconName
  }>
}

const settingsNavigation: SettingsNavSection[] = [
  {
    id: 'emails',
    label: 'Emails',
    icon: 'mail',
    items: [
      {
        id: 'categories',
        label: 'Catégories',
        description: 'Organisation des familles utilisées pour les snippets email.',
        icon: 'channels',
      },
      {
        id: 'snippets',
        label: 'Snippets',
        description: 'Bibliothèque de snippets et comportements d’insertion.',
        icon: 'list',
      },
      {
        id: 'templates',
        label: 'Templates de mails',
        description: 'Gestion des modèles email et de leurs tâches associées.',
        icon: 'template',
      },
      {
        id: 'tasks',
        label: 'Templates de task',
        description: 'Modèles de tâches réutilisés dans l’application.',
        icon: 'tool',
      },
      {
        id: 'tags',
        label: 'Tags',
        description: 'Rappel des syntaxes de tags et variables supportées.',
        icon: 'tag',
      },
    ],
  },
  {
    id: 'calls',
    label: 'Appels',
    icon: 'phone',
    items: [
      {
        id: 'callHistory',
        label: 'Historique des 5 derniers appels',
        description: 'Consultation et copie rapide des derniers appels sauvegardés.',
        icon: 'history',
      },
      {
        id: 'callTemplate',
        label: 'Template d’appel',
        description: 'Template injecté automatiquement à l’ouverture d’un nouvel appel.',
        icon: 'call',
      },
    ],
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'dashboard',
    items: [
      {
        id: 'products',
        label: 'Produits & relations',
        description:
          'Produits, types, tags, éditions, firmwares, logiciels, drivers et spare parts.',
        icon: 'box',
      },
      {
        id: 'dashboardPortal',
        label: 'Procédures Portal',
        description: 'Configuration des codes Portal et de leurs variantes.',
        icon: 'portal',
      },
      {
        id: 'dashboardProcess',
        label: 'Process',
        description: 'Activation des indicateurs RMA et liaison aux procédures.',
        icon: 'settings',
      },
      {
        id: 'dashboardVersions',
        label: 'Firmwares',
        description: 'Catalogue des firmwares utilisés dans les éditions produit.',
        icon: 'version',
      },
      {
        id: 'dashboardSoftwares',
        label: 'Logiciels',
        description: 'Catalogue des logiciels et des versions produit compatibles.',
        icon: 'template',
      },
      {
        id: 'dashboardDriverPacks',
        label: 'Packs drivers',
        description: 'Catalogue des packs drivers et des produits qu’ils contiennent.',
        icon: 'version',
      },
      {
        id: 'dashboardSpareParts',
        label: 'Catalogue des Spare Parts',
        description: 'Liste des spare parts organisées par produit.',
        icon: 'archive',
      },
      {
        id: 'dashboardNews',
        label: 'News',
        description: 'Liste des news affichées dans la page 6 du dashboard.',
        icon: 'news',
      },
    ],
  },
  {
    id: 'general',
    label: 'Générale',
    icon: 'settings',
    items: [
      {
        id: 'updates',
        label: 'Mise à jour',
        description: 'Statut de l’application et recherche de nouvelles versions.',
        icon: 'download',
      },
      {
        id: 'display',
        label: 'Affichage',
        description: 'Zoom global, densité et confort de lecture.',
        icon: 'display',
      },
      {
        id: 'history',
        label: 'Paramètres d’historique',
        description: 'Comportement de sauvegarde des emails copiés.',
        icon: 'history',
      },
      {
        id: 'quickLinks',
        label: 'Liens rapides',
        description: 'URLs ouvertes par les boutons d’accès rapides.',
        icon: 'grid',
      },
      {
        id: 'preferences',
        label: 'Préférences',
        description: 'Préférences globales, snippets et format d’export.',
        icon: 'preferences',
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
    icon: assetUrl('/agentor/assets/crm.ico'),
    defaultUrl: defaultData.settings.quickLinkUrls.crm,
  },
  {
    id: 'share',
    label: 'ShareConseiller',
    icon: assetUrl('/agentor/assets/share.ico'),
    defaultUrl: defaultData.settings.quickLinkUrls.share,
  },
  {
    id: 'global',
    label: 'Global Action',
    icon: assetUrl('/agentor/assets/global.ico'),
    defaultUrl: defaultData.settings.quickLinkUrls.global,
  },
  {
    id: 'portal',
    label: 'Portal',
    icon: assetUrl('/agentor/assets/portal.png'),
    defaultUrl: defaultData.settings.quickLinkUrls.portal,
  },
  {
    id: 'assist',
    label: 'AssistBot',
    icon: assetUrl('/agentor/assets/Bot.png'),
    defaultUrl: defaultData.settings.quickLinkUrls.assist,
  },
]

const dashboardProcessLineDefinitions = [
  { id: 'rma-14', label: 'RMA 14 jours', shortLabel: '14 jours' },
  { id: 'rma-30', label: 'RMA 30 jours', shortLabel: '30 jours' },
] as const

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

type ProcedureStepItem = {
  id: string
  text: string
  isCheckable: boolean
}

function parseProcedureStepItems(steps: string): ProcedureStepItem[] {
  return steps
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== '')
    .map((line, index) => {
      const trimmed = line.trimStart()
      const isCheckable = trimmed.startsWith(PROCEDURE_CHECK_MARKER)
      const text = isCheckable
        ? trimmed.slice(PROCEDURE_CHECK_MARKER.length).trimStart()
        : trimmed
      return { id: `${index}-${text}`, text, isCheckable }
    })
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
      showForward: unknown
      forwardTarget: unknown
      codes: unknown
    }
>
type LegacyCustomerPortalCodeLine = Partial<CustomerPortalCodeLine> & {
  quickLinkId?: unknown
  quickLinkUrl?: unknown
}
type LegacyDashboardProcessLine = Partial<
  DashboardProcessLine & {
    procedureId: unknown
    completeProcedureId: unknown
    reducedProcedureId: unknown
    mode: unknown
    enabled: unknown
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
type LegacyProductEdition = Partial<
  ProductEdition & {
    platform: unknown
    firmwareIds: unknown
    compatibleProductIds: unknown
    supportUrl: unknown
    shareUrl: unknown
    portalUrl: unknown
    note: unknown
  }
>
type LegacyProductCatalogItem = Partial<
  ProductCatalogItem & {
    note: unknown
    tags: unknown
    packingGuideAvailable: unknown
    compatibleProductIds: unknown
    softwareIds: unknown
    driverIds: unknown
    firmwareIds: unknown
    editions: unknown
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
  quickLinkUrl: '',
  quickCopyText: '',
  infoNote: '',
})

const isPortalQuickLinkId = (value: unknown): value is PortalQuickLinkId =>
  value === 'crm' || value === 'share' || value === 'global' || value === 'portal' || value === 'assist'

const normalizePortalCodeLine = (raw: unknown, fallbackId: string): CustomerPortalCodeLine => {
  const item =
    raw && typeof raw === 'object'
      ? (raw as LegacyCustomerPortalCodeLine)
      : createEmptyPortalCodeLine(fallbackId)
  const legacyItem = item as LegacyCustomerPortalCodeLine
  const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : fallbackId
  const legacyQuickLinkUrl =
    typeof legacyItem.quickLinkId === 'string' && isPortalQuickLinkId(legacyItem.quickLinkId)
      ? quickLinks.find((link) => link.id === legacyItem.quickLinkId)?.defaultUrl ?? ''
      : ''
  return {
    id,
    title: typeof item.title === 'string' ? item.title : '',
    code: typeof item.code === 'string' ? item.code : '',
    showDraft: Boolean(item.showDraft),
    quickLinkUrl:
      typeof item.quickLinkUrl === 'string'
        ? item.quickLinkUrl.trim()
        : legacyQuickLinkUrl,
    quickCopyText: typeof item.quickCopyText === 'string' ? item.quickCopyText : '',
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
  const legacyForwardSource = rawCodes.find(
    (entry) =>
      Boolean(entry && typeof entry === 'object' && (entry as LegacyCustomerPortalCode).showForward),
  ) as LegacyCustomerPortalCode | undefined
  const legacyForwardTarget =
    legacyForwardSource && typeof legacyForwardSource.forwardTarget === 'string'
      ? legacyForwardSource.forwardTarget.trim()
      : ''
  const forwardTargetCandidate =
    typeof item.forwardTarget === 'string' && item.forwardTarget.trim()
      ? item.forwardTarget.trim()
      : legacyForwardTarget
  const hasForward = Boolean(item.showForward) || Boolean(forwardTargetCandidate)
  const codes = rawCodes.length
    ? rawCodes.map((entry, codeIndex) =>
        normalizePortalCodeLine(entry, `${id}-code-${codeIndex + 1}`),
      )
    : [normalizePortalCodeLine(item, `${id}-code-1`)]

  return {
    id,
    procedureName: typeof item.procedureName === 'string' ? item.procedureName : '',
    showForward: hasForward,
    forwardTarget: hasForward ? forwardTargetCandidate : '',
    codes,
  }
}

const normalizePortalProcedures = (raw: unknown): CustomerPortalCode[] => {
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => normalizePortalProcedure(item, index))
}

const formatPortalForwardLabel = (
  procedure: CustomerPortalCode,
  inactiveLabel = 'Forward',
) => {
  if (!procedure.showForward) return inactiveLabel
  const target = procedure.forwardTarget?.trim()
  return target ? `Forward vers ${target}` : 'Forward vers cible non renseignée'
}

const shouldShowPortalForwardIndicator = (procedure: CustomerPortalCode) => {
  if (!procedure.showForward) return false
  const target = procedure.forwardTarget?.trim()
  if (!target) return false
  const normalized = target
    .toLowerCase()
    .replace(/[àâä]/g, 'a')
    .replace(/\s+/g, ' ')
    .trim()
  if (!normalized) return false
  return !['personne', 'a personne', 'vers personne', 'fwrd a personne', 'fwd a personne'].includes(
    normalized,
  )
}

const normalizeDashboardProcessLine = (
  raw: unknown,
  fallback: DashboardProcessLine,
): DashboardProcessLine => {
  if (!raw || typeof raw !== 'object') {
    return fallback
  }
  const item = raw as LegacyDashboardProcessLine
  const id = item.id === 'rma-14' || item.id === 'rma-30' ? item.id : fallback.id
  const enabled = Boolean(item.enabled)
  const legacyProcedureId =
    typeof item.procedureId === 'string' ? item.procedureId.trim() : ''
  const completeProcedureId =
    typeof item.completeProcedureId === 'string' && item.completeProcedureId.trim()
      ? item.completeProcedureId.trim()
      : legacyProcedureId || fallback.completeProcedureId
  const reducedProcedureId =
    typeof item.reducedProcedureId === 'string' && item.reducedProcedureId.trim()
      ? item.reducedProcedureId.trim()
      : legacyProcedureId || fallback.reducedProcedureId
  return {
    id,
    enabled,
    completeProcedureId,
    reducedProcedureId,
    mode: enabled ? 'complete' : 'reduced',
  }
}

const normalizeDashboardProcessSettings = (raw: unknown): DashboardProcessLine[] => {
  const defaultItems = defaultData.settings.dashboardProcessSettings
  if (Array.isArray(raw)) {
    const isLegacyStringArray = raw.every((item) => typeof item === 'string')
    if (isLegacyStringArray) {
      return defaultItems.map((fallback) => ({
        ...fallback,
        enabled: raw.includes(fallback.id),
      }))
    }

    return defaultItems.map((fallback) => {
      const entry = raw.find((candidate) => {
        if (!candidate || typeof candidate !== 'object') return false
        return (candidate as Partial<DashboardProcessLine>).id === fallback.id
      })
      return normalizeDashboardProcessLine(entry, fallback)
    })
  }

  return defaultItems
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

const normalizeTextList = (value: unknown): string[] => {
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

const parseProductTags = (value: string) => normalizeTextList(value.split(/[,;\n]/))

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

const normalizeDashboardProcessSettingsInData = (payload: AppData): AppData => ({
  ...payload,
  settings: {
    ...payload.settings,
    dashboardProcessSettings: normalizeDashboardProcessSettings(
      payload.settings.dashboardProcessSettings ??
        (payload.settings as AppSettings & { dashboardProcessLines?: unknown }).dashboardProcessLines,
    ),
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

const normalizeProductEditionPlatform = (value: unknown): ProductEditionPlatform => {
  if (value === 'pc' || value === 'xbox' || value === 'playstation' || value === 'custom') {
    return value
  }
  if (typeof value !== 'string') return 'custom'
  const normalized = value.trim().toLowerCase()
  if (normalized === 'ps' || normalized === 'playstation' || normalized === 'playstation 5') {
    return 'playstation'
  }
  if (normalized === 'windows' || normalized === 'mac' || normalized === 'pc') return 'pc'
  if (normalized === 'xbox') return 'xbox'
  return 'custom'
}

const normalizeProductEdition = (raw: unknown, fallbackId: string): ProductEdition => {
  const item =
    raw && typeof raw === 'object'
      ? (raw as LegacyProductEdition)
      : ({} as LegacyProductEdition)
  const id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : fallbackId
  const platform = normalizeProductEditionPlatform(item.platform)
  return {
    id,
    platform,
    name:
      typeof item.name === 'string' && item.name.trim()
        ? item.name
        : productEditionPlatformLabels[platform],
    firmwareIds: normalizeIdList(item.firmwareIds),
    compatibleProductIds: normalizeIdList(item.compatibleProductIds),
    supportUrl: typeof item.supportUrl === 'string' ? item.supportUrl.trim() : '',
    shareUrl: typeof item.shareUrl === 'string' ? item.shareUrl.trim() : '',
    portalUrl: typeof item.portalUrl === 'string' ? item.portalUrl.trim() : '',
    note: typeof item.note === 'string' ? item.note : '',
  }
}

const createProductEditionDraft = (
  platform: ProductEditionPlatform = 'pc',
): ProductEdition => ({
  id: createId('edition'),
  platform,
  name: productEditionPlatformLabels[platform],
  firmwareIds: [],
  compatibleProductIds: [],
  supportUrl: '',
  shareUrl: '',
  portalUrl: '',
  note: '',
})

const getProductDashboardVersionIds = (
  product: ProductCatalogItem,
  category: DashboardProductCategory,
) => {
  if (category === 'software') return product.softwareIds ?? []
  if (category === 'driver') return product.driverIds ?? []
  if (category === 'firmware') {
    return normalizeIdList([
      ...(product.firmwareIds ?? []),
      ...(product.editions ?? []).flatMap((edition) => edition.firmwareIds ?? []),
    ])
  }
  return []
}

const normalizeProductCatalogItem = (raw: unknown, index: number): ProductCatalogItem => {
  const item =
    raw && typeof raw === 'object'
      ? (raw as LegacyProductCatalogItem)
      : ({} as LegacyProductCatalogItem)
  const id =
    typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `catalog-product-${index + 1}`
  const rawSpareParts = Array.isArray(item.spareParts) ? item.spareParts : []
  const rawEditions = Array.isArray(item.editions) ? item.editions : []
  return {
    id,
    name: typeof item.name === 'string' ? item.name : '',
    productType: typeof item.productType === 'string' ? item.productType : '',
    note: typeof item.note === 'string' ? item.note : '',
    tags: normalizeTextList(item.tags),
    packingGuideAvailable: Boolean(item.packingGuideAvailable),
    compatibleProductIds: normalizeIdList(item.compatibleProductIds),
    softwareIds: normalizeIdList(item.softwareIds),
    driverIds: normalizeIdList(item.driverIds),
    firmwareIds: normalizeIdList(item.firmwareIds),
    editions: rawEditions.map((entry, editionIndex) =>
      normalizeProductEdition(entry, `${id}-edition-${editionIndex + 1}`),
    ),
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
    content: typeof item.content === 'string' ? normalizeDashboardNewsColorTags(item.content) : '',
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
      normalizeDashboardProcessSettingsInData(
        normalizeDashboardProductsInData(normalizePortalProceduresInData(payload)),
      ),
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
        productType: convertLegacyTokens(product.productType ?? ''),
        note: convertLegacyTokens(product.note ?? ''),
        tags: (product.tags ?? []).map((tag) => convertLegacyTokens(tag)),
        editions: (product.editions ?? []).map((edition) => ({
          ...edition,
          name: convertLegacyTokens(edition.name),
        })),
        spareParts: product.spareParts.map((sparePart) => ({
          ...sparePart,
          name: convertLegacyTokens(sparePart.name),
          sku: convertLegacyTokens(sparePart.sku),
        })),
      })),
      dashboardNews: normalizeDashboardNews(payload.settings.dashboardNews).map((item) => ({
        ...item,
        title: convertLegacyTokens(item.title),
        content: normalizeDashboardNewsColorTags(item.content),
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

function addMissingById<T extends { id: string }>(current: T[], seed: T[]) {
  const currentIds = new Set(current.map((item) => item.id))
  return [...current, ...seed.filter((item) => !currentIds.has(item.id))]
}

function mergeSeedIntoData(current: AppData, seed: AppData) {
  if ((current.version ?? 0) >= seed.version) return current

  return {
    ...current,
    version: seed.version,
    categories: addMissingById(current.categories, seed.categories),
    snippets: addMissingById(current.snippets, seed.snippets),
    templates: addMissingById(current.templates, seed.templates),
    taskTemplates: addMissingById(current.taskTemplates, seed.taskTemplates),
    procedures: addMissingById(current.procedures, seed.procedures),
    notes: current.notes.trim() ? current.notes : seed.notes,
    emailDraft: current.emailDraft.trim() ? current.emailDraft : seed.emailDraft,
    taskDraft: current.taskDraft.trim() ? current.taskDraft : seed.taskDraft,
    history: addMissingById(current.history, seed.history),
    callHistory: addMissingById(current.callHistory, seed.callHistory).slice(0, CALL_HISTORY_LIMIT),
    settings: {
      ...current.settings,
      quickLinkUrls: {
        ...seed.settings.quickLinkUrls,
        ...(current.settings.quickLinkUrls ?? {}),
      },
      predefinedTags: Array.from(
        new Set([...(current.settings.predefinedTags ?? []), ...seed.settings.predefinedTags]),
      ),
      customerPortalCodes: addMissingById(
        normalizePortalProcedures(current.settings.customerPortalCodes),
        normalizePortalProcedures(seed.settings.customerPortalCodes),
      ),
      dashboardProcessSettings: addMissingById(
        normalizeDashboardProcessSettings(current.settings.dashboardProcessSettings),
        normalizeDashboardProcessSettings(seed.settings.dashboardProcessSettings),
      ),
      dashboardProducts: addMissingById(
        normalizeDashboardProducts(current.settings.dashboardProducts),
        normalizeDashboardProducts(seed.settings.dashboardProducts),
      ),
      products: addMissingById(
        normalizeProducts(current.settings.products),
        normalizeProducts(seed.settings.products),
      ),
      dashboardNews: addMissingById(
        normalizeDashboardNews(current.settings.dashboardNews),
        normalizeDashboardNews(seed.settings.dashboardNews),
      ),
    },
  }
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
  const [portalQuickCopiedId, setPortalQuickCopiedId] = useState<string | null>(null)
  const [sparePartCopiedId, setSparePartCopiedId] = useState<string | null>(null)
  const [dashboardCalculatorCopiedKey, setDashboardCalculatorCopiedKey] =
    useState<DashboardCalculatorCopyKey | null>(null)
  const [draftBoxes, setDraftBoxes] = useState<DraftBoxSlot[]>(() =>
    Array.from({ length: 3 }, () => ({
      email: '',
      task: '',
      savedAt: '',
    })),
  )
  const [draftBoxTooltip, setDraftBoxTooltip] = useState<DraftBoxTooltipState | null>(null)
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
  const [activeDashboardCatalogProductId, setActiveDashboardCatalogProductId] = useState<
    string | null
  >(null)
  const [activeDashboardSpareProductId, setActiveDashboardSpareProductId] = useState<
    string | null
  >(null)
  const [activeDashboardPortalProcedureId, setActiveDashboardPortalProcedureId] =
    useState<string | null>(null)
  const [activeDashboardCatalogEditionId, setActiveDashboardCatalogEditionId] =
    useState<string | null>(null)
  const [procedureChecks, setProcedureChecks] = useState<Record<number, boolean>>({})
  const [procedureInfoDraft, setProcedureInfoDraft] = useState('')
  const [editTab, setEditTab] = useState<SettingsTab>('categories')
  const [editSnippetCategoryId, setEditSnippetCategoryId] = useState('all')
  const [snippetTooltip, setSnippetTooltip] = useState<{
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
  const [productTagsDraftText, setProductTagsDraftText] = useState('')
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
  const [selectedPortalProcedureId, setSelectedPortalProcedureId] = useState<string | null>(null)
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
  const dashboardReminders = data.settings.dashboardReminders ?? ''

  const emailEditorRef = useRef<TextEditorHandle>(null)
  const taskEditorRef = useRef<TextEditorHandle>(null)
  const callEditorRef = useRef<TextEditorHandle>(null)
  const callDraftLengthRef = useRef(callDraft.length)
  const emailCopyTimeoutRef = useRef<number | null>(null)
  const taskCopyTimeoutRef = useRef<number | null>(null)
  const portalCopyTimeoutRef = useRef<number | null>(null)
  const portalQuickCopyTimeoutRef = useRef<number | null>(null)
  const sparePartCopyTimeoutRef = useRef<number | null>(null)
  const dashboardCalculatorCopyTimeoutRef = useRef<number | null>(null)
  const callCopyTimeoutRef = useRef<number | null>(null)
  const callHistoryCopyTimeoutRef = useRef<number | null>(null)
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
  const dashboardNewsContentRef = useRef<HTMLTextAreaElement>(null)
  const templateSearchRef = useRef<HTMLDivElement>(null)
  const taskSearchRef = useRef<HTMLDivElement>(null)
  const dashboardProductSheetRef = useRef<HTMLTextAreaElement>(null)
  const callModalBackdropPointerDownRef = useRef(false)

  callDraftLengthRef.current = callDraft.length
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
    productType: '',
    note: '',
    tags: [],
    packingGuideAvailable: false,
    compatibleProductIds: [],
    softwareIds: [],
    driverIds: [],
    firmwareIds: [],
    editions: [],
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
  const dashboardProcessSettings = useMemo(() => {
    return normalizeDashboardProcessSettings(data.settings.dashboardProcessSettings)
  }, [data.settings.dashboardProcessSettings])

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
  const beginNewSnippetDraft = useCallback(
    (focusField = true) => {
      setTagSuggestionState(null)
      setSnippetDraft(getEmptySnippetDraft())
      setSelectedSnippetId('new')
      if (focusField) {
        requestAnimationFrame(() => snippetTitleRef.current?.focus())
      }
    },
    [getEmptySnippetDraft],
  )
  const beginNewTemplateDraft = useCallback(
    (focusField = true) => {
      setTagSuggestionState(null)
      setTemplateDraft(getEmptyTemplateDraft())
      setSelectedTemplateId('new')
      if (focusField) {
        requestAnimationFrame(() => templateNameRef.current?.focus())
      }
    },
    [getEmptyTemplateDraft],
  )
  const beginNewTaskDraft = useCallback(
    (focusField = true) => {
      setTagSuggestionState(null)
      setTaskDraft(getEmptyTaskDraft())
      setSelectedTaskId('new')
      if (focusField) {
        requestAnimationFrame(() => taskTemplateNameRef.current?.focus())
      }
    },
    [getEmptyTaskDraft],
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
        productType: '',
        note: '',
        tags: [],
        packingGuideAvailable: false,
        compatibleProductIds: [],
        softwareIds: [],
        driverIds: [],
        firmwareIds: [],
        editions: [],
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
        setData(mergeSeedIntoData(normalizeDashboardData(loadedData), defaultData))
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
      if (portalQuickCopyTimeoutRef.current !== null) {
        window.clearTimeout(portalQuickCopyTimeoutRef.current)
      }
      if (sparePartCopyTimeoutRef.current !== null) {
        window.clearTimeout(sparePartCopyTimeoutRef.current)
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
      const cursor = callDraftLengthRef.current
      target.setSelection(cursor, cursor)
    })
    return () => window.cancelAnimationFrame(handle)
  }, [callModalOpen])

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
    setProductTagsDraftText('')
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
  const quickLinkUrls = data.settings.quickLinkUrls ?? defaultData.settings.quickLinkUrls
  const resolvedQuickLinks = useMemo(
    () =>
      quickLinks.map((link) => {
        const configuredUrl = quickLinkUrls?.[link.id]
        const url =
          typeof configuredUrl === 'string' && configuredUrl.trim()
            ? configuredUrl.trim()
            : link.defaultUrl
        return { ...link, url }
      }),
    [quickLinkUrls],
  )
  const exportFont =
    exportFontOptions.find((option) => option.value === data.settings.exportFont)?.value ??
    defaultData.settings.exportFont
  const exportFontSize = Number.isFinite(data.settings.exportFontSize)
    ? Math.min(EXPORT_FONT_SIZE_MAX, Math.max(EXPORT_FONT_SIZE_MIN, data.settings.exportFontSize))
    : defaultData.settings.exportFontSize
  const updateSettingsLabel = getUpdateSettingsLabel(updateStatus)
  const isUpdateReadyToInstall = updateStatus?.phase === 'downloaded'
  const availableUpdateVersionLabel = getUpdateAvailableVersionLabel(updateStatus, APP_VERSION_LABEL)
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
  const updateDashboardProcessSetting = useCallback(
    (id: DashboardProcessLine['id'], patch: Partial<DashboardProcessLine>) => {
      const current = normalizeDashboardProcessSettings(data.settings.dashboardProcessSettings)
      updateSettings({
        dashboardProcessSettings: current.map((entry) =>
          entry.id === id ? { ...entry, ...patch } : entry,
        ),
      })
    },
    [data.settings.dashboardProcessSettings, updateSettings],
  )
  const updateQuickLinkUrl = useCallback(
    (id: string, url: string) => {
      updateSettings({
        quickLinkUrls: {
          ...defaultData.settings.quickLinkUrls,
          ...(data.settings.quickLinkUrls ?? {}),
          [id]: url,
        },
      })
    },
    [data.settings.quickLinkUrls, updateSettings],
  )
  const resetQuickLinkUrl = useCallback(
    (id: string) => {
      const quickLink = quickLinks.find((link) => link.id === id)
      if (!quickLink) return
      updateSettings({
        quickLinkUrls: {
          ...defaultData.settings.quickLinkUrls,
          ...(data.settings.quickLinkUrls ?? {}),
          [id]: quickLink.defaultUrl,
        },
      })
    },
    [data.settings.quickLinkUrls, updateSettings],
  )
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
  const handleReorderPortalProcedures = useCallback(
    (next: CustomerPortalCode[]) => {
      updateCustomerPortalCodes(next)
    },
    [updateCustomerPortalCodes],
  )
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
              return { ...codeLine, ...patch }
            }),
          }
        }),
      )
    },
    [customerPortalCodes, updateCustomerPortalCodes],
  )
  const addCustomerPortalCodeLine = useCallback(
    (procedureId: string) => {
      const current = customerPortalCodes.find((entry) => entry.id === procedureId)
      if (!current || current.codes.length >= 4) return
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
    setSelectedPortalProcedureId(id)
  }, [customerPortalCodes, updateCustomerPortalCodes])
  const handleRemovePortalProcedure = useCallback(
    (procedureId: string) => {
      const next = customerPortalCodes.filter((entry) => entry.id !== procedureId)
      updateCustomerPortalCodes(next)
      if (selectedPortalProcedureId === procedureId) {
        setSelectedPortalProcedureId(next[0]?.id ?? null)
      }
    },
    [customerPortalCodes, selectedPortalProcedureId, updateCustomerPortalCodes],
  )
  const updateDashboardProducts = useCallback(
    (next: DashboardProduct[]) => {
      const normalizedNext = normalizeDashboardProducts(next)
      const nextIds = new Set(normalizedNext.map((product) => product.id))
      const legacyProductEntries = dashboardProducts.filter(
        (product) => product.category === 'product' && !nextIds.has(product.id),
      )
      updateSettings({ dashboardProducts: [...normalizedNext, ...legacyProductEntries] })
    },
    [dashboardProducts, updateSettings],
  )
  const updateProductCatalog = useCallback(
    (next: ProductCatalogItem[]) => {
      updateSettings({ products: normalizeProducts(next) })
    },
    [updateSettings],
  )
  const handleReorderProductCatalog = useCallback(
    (next: ProductCatalogItem[]) => {
      updateProductCatalog(next)
    },
    [updateProductCatalog],
  )
  const updateDashboardNews = useCallback(
    (next: DashboardNewsItem[]) => {
      updateSettings({ dashboardNews: normalizeDashboardNews(next) })
    },
    [updateSettings],
  )
  const handleReorderDashboardNews = useCallback(
    (next: DashboardNewsItem[]) => {
      updateDashboardNews(next)
    },
    [updateDashboardNews],
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
    setProductTagsDraftText('')
  }, [getEmptyProductDraft, productCatalog, selectedProductCatalogId])

  useEffect(() => {
    if (!selectedDashboardNewsId || selectedDashboardNewsId === 'new') return
    if (dashboardNews.some((item) => item.id === selectedDashboardNewsId)) return
    setSelectedDashboardNewsId(null)
    setDashboardNewsDraft(getEmptyDashboardNewsDraft())
  }, [dashboardNews, getEmptyDashboardNewsDraft, selectedDashboardNewsId])

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

  const productsWithDashboardRelations = useMemo(
    () =>
      productCatalog.map((product) => {
        const compatibleProductIds = new Set(product.compatibleProductIds ?? [])
        const softwareIds = new Set(product.softwareIds ?? [])
        const driverIds = new Set(product.driverIds ?? [])
        const firmwareIds = new Set(product.firmwareIds ?? [])

        productCatalog.forEach((otherProduct) => {
          if (otherProduct.id === product.id) return
          if ((otherProduct.compatibleProductIds ?? []).includes(product.id)) {
            compatibleProductIds.add(otherProduct.id)
          }
        })

        dashboardVersionProducts.forEach((versionItem) => {
          if (!(versionItem.compatibleProductIds ?? []).includes(product.id)) return
          if (versionItem.category === 'software') softwareIds.add(versionItem.id)
          if (versionItem.category === 'driver') driverIds.add(versionItem.id)
          if (versionItem.category === 'firmware') firmwareIds.add(versionItem.id)
        })

        return {
          ...product,
          compatibleProductIds: Array.from(compatibleProductIds),
          softwareIds: Array.from(softwareIds),
          driverIds: Array.from(driverIds),
          firmwareIds: Array.from(firmwareIds),
          note: product.note ?? '',
          packingGuideAvailable: Boolean(product.packingGuideAvailable),
          editions: (product.editions ?? []).map((edition) => ({ ...edition })),
          spareParts: product.spareParts.map((sparePart) => ({ ...sparePart })),
        }
      }),
    [dashboardVersionProducts, productCatalog],
  )

  const dashboardVersionProductById = useMemo(() => {
    const map = new Map<string, DashboardProduct>()
    dashboardVersionProducts.forEach((product) => {
      map.set(product.id, product)
    })
    return map
  }, [dashboardVersionProducts])

  const productCatalogWithRelationsById = useMemo(() => {
    const map = new Map<string, ProductCatalogItem>()
    productsWithDashboardRelations.forEach((product) => {
      map.set(product.id, product)
    })
    return map
  }, [productsWithDashboardRelations])

  const getProductCatalogDraft = useCallback(
    (product: ProductCatalogItem): ProductCatalogItem => {
      const hydratedProduct = productCatalogWithRelationsById.get(product.id) ?? product
      return {
        ...hydratedProduct,
        productType: hydratedProduct.productType ?? '',
        note: hydratedProduct.note ?? '',
        tags: [...(hydratedProduct.tags ?? [])],
        packingGuideAvailable: Boolean(hydratedProduct.packingGuideAvailable),
        compatibleProductIds: [...(hydratedProduct.compatibleProductIds ?? [])],
        softwareIds: [...(hydratedProduct.softwareIds ?? [])],
        driverIds: [...(hydratedProduct.driverIds ?? [])],
        firmwareIds: [...(hydratedProduct.firmwareIds ?? [])],
        editions: (hydratedProduct.editions ?? []).map((edition) => ({
          ...edition,
          firmwareIds: [...(edition.firmwareIds ?? [])],
          compatibleProductIds: [...(edition.compatibleProductIds ?? [])],
          supportUrl: edition.supportUrl ?? '',
          shareUrl: edition.shareUrl ?? '',
          portalUrl: edition.portalUrl ?? '',
          note: edition.note ?? '',
        })),
        spareParts: hydratedProduct.spareParts.map((sparePart) => ({ ...sparePart })),
      }
    },
    [productCatalogWithRelationsById],
  )

  const dashboardCatalogProductResults = useMemo(() => {
    const query = dashboardProductQuery.trim().toLowerCase()
    const base = productsWithDashboardRelations
    if (!query) return base

    return base.filter((product) => {
      const linkedVersionText = normalizeIdList([
        ...(product.softwareIds ?? []),
        ...(product.driverIds ?? []),
        ...(product.firmwareIds ?? []),
        ...(product.editions ?? []).flatMap((edition) => edition.firmwareIds ?? []),
      ])
        .map((id) => dashboardVersionProductById.get(id))
        .filter((item): item is DashboardProduct => Boolean(item))
        .flatMap((item) => [item.name, item.latestVersion, item.sheet])
        .join(' ')
      const compatibleProductText = (product.compatibleProductIds ?? [])
        .map((id) => productCatalogWithRelationsById.get(id)?.name ?? '')
        .join(' ')
      const sparePartText = product.spareParts
        .flatMap((sparePart) => [sparePart.name, sparePart.sku])
        .join(' ')
      const editionText = (product.editions ?? [])
        .flatMap((edition) => [
          edition.name,
          productEditionPlatformLabels[edition.platform],
          ...edition.compatibleProductIds.map(
            (id) => productCatalogWithRelationsById.get(id)?.name ?? '',
          ),
        ])
        .join(' ')

      return [
        product.name,
        product.productType ?? '',
        ...(product.tags ?? []),
        editionText,
        linkedVersionText,
        compatibleProductText,
        sparePartText,
      ]
        .map((value) => value.toLowerCase())
        .some((value) => value.includes(query))
    })
  }, [
    dashboardProductQuery,
    dashboardVersionProductById,
    productCatalogWithRelationsById,
    productsWithDashboardRelations,
  ])

  const filteredProductsWithSpareParts = useMemo(() => {
    const query = dashboardSparePartQuery.trim().toLowerCase()
    const base = productsWithDashboardRelations
      .map((product) => {
        const matchingSpareParts = query
          ? product.spareParts.filter((sparePart) =>
              [sparePart.name, sparePart.sku, sparePart.guideAvailable ? 'guide' : '']
                .join(' ')
                .toLowerCase()
                .includes(query),
            )
          : product.spareParts
        const productMatches = [
          product.name,
          product.productType ?? '',
          product.packingGuideAvailable ? 'packing guide disponible' : 'packing guide indisponible',
          ...(product.tags ?? []),
          ...(product.editions ?? []).map((edition) => edition.name),
        ]
          .join(' ')
          .toLowerCase()
          .includes(query)
        if (!query) return { ...product, spareParts: matchingSpareParts }
        if (productMatches) return product
        return { ...product, spareParts: matchingSpareParts }
      })
      .filter((product) => {
        if (!query) return product.spareParts.length > 0
        return (
          [
            product.name,
            product.productType ?? '',
            product.packingGuideAvailable ? 'packing guide disponible' : 'packing guide indisponible',
            ...(product.tags ?? []),
          ]
            .join(' ')
            .toLowerCase()
            .includes(query) ||
          product.spareParts.some((sparePart) =>
            [sparePart.name, sparePart.sku, sparePart.guideAvailable ? 'guide' : '']
              .join(' ')
              .toLowerCase()
              .includes(query),
          )
        )
      })
    return base
  }, [dashboardSparePartQuery, productsWithDashboardRelations])

  const activeDashboardSpareProduct = useMemo(
    () =>
      filteredProductsWithSpareParts.find(
        (product) => product.id === activeDashboardSpareProductId,
      ) ?? null,
    [activeDashboardSpareProductId, filteredProductsWithSpareParts],
  )

  const productsSorted = useMemo(
    () => [...productsWithDashboardRelations],
    [productsWithDashboardRelations],
  )
  const dashboardNewsSorted = useMemo(() => [...dashboardNews], [dashboardNews])

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
  const dashboardSoftwareProducts = useMemo(
    () => dashboardVersionProducts.filter((product) => product.category === 'software'),
    [dashboardVersionProducts],
  )
  const dashboardDriverProducts = useMemo(
    () => dashboardVersionProducts.filter((product) => product.category === 'driver'),
    [dashboardVersionProducts],
  )
  const dashboardFirmwareProducts = useMemo(
    () => dashboardVersionProducts.filter((product) => product.category === 'firmware'),
    [dashboardVersionProducts],
  )
  const activeDashboardCatalogProduct = useMemo(
    () =>
      dashboardCatalogProductResults.find(
        (product) => product.id === activeDashboardCatalogProductId,
      ) ?? null,
    [activeDashboardCatalogProductId, dashboardCatalogProductResults],
  )
  const activeDashboardCatalogEdition = useMemo(
    () =>
      activeDashboardCatalogProduct
        ? (activeDashboardCatalogProduct.editions ?? []).find(
            (edition) => edition.id === activeDashboardCatalogEditionId,
          ) ?? null
        : null,
    [activeDashboardCatalogEditionId, activeDashboardCatalogProduct],
  )
  const activeDashboardCatalogProductSoftwares = useMemo(
    () =>
      activeDashboardCatalogProduct
        ? normalizeIdList(activeDashboardCatalogProduct.softwareIds)
            .map((id) => dashboardVersionProductById.get(id))
            .filter((product): product is DashboardProduct => Boolean(product))
        : [],
    [activeDashboardCatalogProduct, dashboardVersionProductById],
  )
  const activeDashboardCatalogProductDrivers = useMemo(
    () =>
      activeDashboardCatalogProduct
        ? normalizeIdList(activeDashboardCatalogProduct.driverIds)
            .map((id) => dashboardVersionProductById.get(id))
            .filter((product): product is DashboardProduct => Boolean(product))
        : [],
    [activeDashboardCatalogProduct, dashboardVersionProductById],
  )
  const activeDashboardCatalogProductFirmwares = useMemo(
    () =>
      activeDashboardCatalogProduct && activeDashboardCatalogEdition
        ? normalizeIdList([
            ...(activeDashboardCatalogProduct.firmwareIds ?? []),
            ...(activeDashboardCatalogEdition.firmwareIds ?? []),
          ])
            .map((id) => dashboardVersionProductById.get(id))
            .filter((product): product is DashboardProduct => Boolean(product))
        : [],
    [activeDashboardCatalogEdition, activeDashboardCatalogProduct, dashboardVersionProductById],
  )
  const dashboardPortalProcedures = useMemo(() => customerPortalCodes, [customerPortalCodes])
  const activeDashboardPortalProcedure = useMemo(
    () =>
      dashboardPortalProcedures.find(
        (procedure) => procedure.id === activeDashboardPortalProcedureId,
      ) ?? null,
    [activeDashboardPortalProcedureId, dashboardPortalProcedures],
  )

  useEffect(() => {
    if (workspaceDashboardPage !== 'catalog') return
    const visibleDashboardProducts = dashboardCatalogProductResults
    if (!visibleDashboardProducts.length) {
      if (activeDashboardCatalogProductId !== null) {
        setActiveDashboardCatalogProductId(null)
      }
      return
    }
    const hasVisibleActive = visibleDashboardProducts.some(
      (product) => product.id === activeDashboardCatalogProductId,
    )
    if (hasVisibleActive) return
    setActiveDashboardCatalogProductId(visibleDashboardProducts[0].id)
    setActiveDashboardCatalogEditionId(null)
  }, [
    activeDashboardCatalogProductId,
    dashboardCatalogProductResults,
    workspaceDashboardPage,
  ])

  useEffect(() => {
    if (workspaceDashboardPage !== 'catalog') return
    if (!activeDashboardCatalogProduct) {
      if (activeDashboardCatalogEditionId !== null) {
        setActiveDashboardCatalogEditionId(null)
      }
      return
    }
    const hasEdition = (activeDashboardCatalogProduct.editions ?? []).some(
      (edition) => edition.id === activeDashboardCatalogEditionId,
    )
    if (!hasEdition && activeDashboardCatalogEditionId !== null) {
      setActiveDashboardCatalogEditionId(null)
    }
    // Auto-select if only one edition exists
    if (!hasEdition && (activeDashboardCatalogProduct.editions ?? []).length === 1) {
      const onlyEdition = activeDashboardCatalogProduct.editions?.[0]
      if (onlyEdition?.id) {
        setActiveDashboardCatalogEditionId(onlyEdition.id)
      }
    }
  }, [
    activeDashboardCatalogEditionId,
    activeDashboardCatalogProduct,
    workspaceDashboardPage,
  ])

  useEffect(() => {
    if (workspaceDashboardPage !== 'portal') return

    if (!dashboardPortalProcedures.length) {
      if (activeDashboardPortalProcedureId !== null) {
        setActiveDashboardPortalProcedureId(null)
      }
      return
    }

    const hasVisibleActive = dashboardPortalProcedures.some(
      (procedure) => procedure.id === activeDashboardPortalProcedureId,
    )
    if (hasVisibleActive) return
    setActiveDashboardPortalProcedureId(dashboardPortalProcedures[0].id)
  }, [activeDashboardPortalProcedureId, dashboardPortalProcedures, workspaceDashboardPage])

  useEffect(() => {
    if (workspaceDashboardPage !== 'parts') return

    if (!filteredProductsWithSpareParts.length) {
      if (activeDashboardSpareProductId !== null) {
        setActiveDashboardSpareProductId(null)
      }
      return
    }

    const hasVisibleActive = filteredProductsWithSpareParts.some(
      (product) => product.id === activeDashboardSpareProductId,
    )
    if (hasVisibleActive) return
    setActiveDashboardSpareProductId(filteredProductsWithSpareParts[0].id)
  }, [activeDashboardSpareProductId, filteredProductsWithSpareParts, workspaceDashboardPage])

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

  const buildDraftBoxPreviewHtml = useCallback((slot: DraftBoxSlot) => {
    const email = stripTokenSpacing(slot.email).trim()
    const task = stripTokenSpacing(slot.task).trim()

    if (!email && !task) {
      return '<div class="draft-box-tooltip__empty">Aucun contenu sauvegardé.</div>'
    }

    const sections: string[] = []
    if (email) {
      sections.push(`
        <div class="draft-box-tooltip__section">
          <div class="draft-box-tooltip__label">Mail</div>
          <div class="draft-box-tooltip__content">${highlightTextPreview(email)}</div>
        </div>
      `)
    }
    if (task) {
      sections.push(`
        <div class="draft-box-tooltip__section">
          <div class="draft-box-tooltip__label">Task</div>
          <div class="draft-box-tooltip__content">${highlightTextPreview(task)}</div>
        </div>
      `)
    }
    return sections.join('')
  }, [])

  const closeDraftBoxTooltip = useCallback(() => {
    setDraftBoxTooltip(null)
  }, [])

  const handleDraftBoxHover = useCallback(
    (index: number, event: MouseEvent<HTMLButtonElement>) => {
      const slot = draftBoxes[index]
      if (!slot || (!slot.email.trim() && !slot.task.trim())) {
        setDraftBoxTooltip(null)
        return
      }

      const rect = event.currentTarget.getBoundingClientRect()
      setDraftBoxTooltip({
        index,
        x: rect.left + rect.width / 2,
        y: rect.bottom + 10,
        previewHtml: buildDraftBoxPreviewHtml(slot),
      })
    },
    [buildDraftBoxPreviewHtml, draftBoxes],
  )

  const handleDraftBoxClick = useCallback(
    (index: number) => {
      const slot = draftBoxes[index]
      if (!slot) return

      const hasSavedContent = Boolean(slot.email.trim() || slot.task.trim())
      if (hasSavedContent) {
        updateEmailDraft(slot.email, slot.email.length)
        updateTaskDraft(slot.task, slot.task.length)
        requestAnimationFrame(() => {
          setDraftBoxes((prev) =>
            prev.map((item, slotIndex) =>
              slotIndex === index
                ? {
                    email: '',
                    task: '',
                    savedAt: '',
                  }
                : item,
            ),
          )
        })
        closeDraftBoxTooltip()
        return
      }

      const nextEmail = data.emailDraft
      const nextTask = data.taskDraft
      if (!nextEmail.trim() && !nextTask.trim()) {
        setToast('Ajoutez du texte avant de le stocker.')
        return
      }

      const savedAt = new Date().toISOString()
      setDraftBoxes((prev) =>
        prev.map((item, slotIndex) =>
          slotIndex === index
            ? {
                email: nextEmail,
                task: nextTask,
                savedAt,
              }
            : item,
        ),
      )
      updateEmailDraft('')
      updateTaskDraft('')
      closeDraftBoxTooltip()
    },
    [closeDraftBoxTooltip, data.emailDraft, data.taskDraft, draftBoxes, updateEmailDraft, updateTaskDraft],
  )

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
    const channel = new BroadcastChannel(PROCEDURE_CHANNEL)
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

  const handleCopyPortalQuickText = async (id: string, text: string) => {
    const value = text.trim()
    if (!value) return
    const didCopy = await copyText(value)
    if (!didCopy) {
      setToast('Copie impossible.')
      return
    }
    if (portalQuickCopyTimeoutRef.current) {
      window.clearTimeout(portalQuickCopyTimeoutRef.current)
    }
    setPortalQuickCopiedId(id)
    portalQuickCopyTimeoutRef.current = window.setTimeout(() => {
      setPortalQuickCopiedId((current) => (current === id ? null : current))
    }, 1600)
  }

  const handleCopySparePartSku = async (id: string, sku: string) => {
    const value = sku.trim()
    if (!value) return
    const didCopy = await copyText(value)
    if (!didCopy) {
      setToast('Copie impossible.')
      return
    }
    if (sparePartCopyTimeoutRef.current) {
      window.clearTimeout(sparePartCopyTimeoutRef.current)
    }
    setSparePartCopiedId(id)
    sparePartCopyTimeoutRef.current = window.setTimeout(() => {
      setSparePartCopiedId((current) => (current === id ? null : current))
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
    setDashboardCalculatorItems((prev) => prev.filter((item) => item.id !== id))
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
    const savedProduct = { ...payload, id }
    const next = exists
      ? dashboardProducts.map((product) => (product.id === id ? savedProduct : product))
      : [...dashboardProducts, savedProduct]
    updateDashboardProducts(next)
    updateProductCatalog(
      productCatalog.map((product) => {
        if (category === 'product') return product
        const field: 'softwareIds' | 'driverIds' | 'firmwareIds' =
          category === 'software' ? 'softwareIds' : category === 'driver' ? 'driverIds' : 'firmwareIds'
        const selectedProductIds = new Set(savedProduct.compatibleProductIds ?? [])
        const nextVersionIds = new Set(product[field] ?? [])
        if (selectedProductIds.has(product.id)) {
          nextVersionIds.add(savedProduct.id)
        } else {
          nextVersionIds.delete(savedProduct.id)
        }
        return {
          ...product,
          [field]: Array.from(nextVersionIds),
        }
      }),
    )
    setSelectedDashboardProductId(null)
    setDashboardProductDraft(getEmptyDashboardProductDraft())
  }

  const handleDeleteDashboardProduct = (product: DashboardProduct) => {
    if (!window.confirm(`Supprimer l’élément "${product.name}" ?`)) return
    const next = dashboardProducts.filter((entry) => entry.id !== product.id)
    updateDashboardProducts(next)
    updateProductCatalog(
      productCatalog.map((entry) => ({
        ...entry,
        softwareIds: (entry.softwareIds ?? []).filter((id) => id !== product.id),
        driverIds: (entry.driverIds ?? []).filter((id) => id !== product.id),
        firmwareIds: (entry.firmwareIds ?? []).filter((id) => id !== product.id),
        editions: (entry.editions ?? []).map((edition) => ({
          ...edition,
          firmwareIds: (edition.firmwareIds ?? []).filter((id) => id !== product.id),
        })),
      })),
    )
    if (selectedDashboardProductId === product.id) {
      setSelectedDashboardProductId(null)
      setDashboardProductDraft(getEmptyDashboardProductDraft())
    }
  }

  const syncDashboardProductsForCatalogProduct = (
    items: DashboardProduct[],
    catalogProduct: ProductCatalogItem,
  ) =>
    items.map((versionItem) => {
      if (versionItem.category === 'product') return versionItem
      const linkedVersionIds = new Set(
        getProductDashboardVersionIds(catalogProduct, versionItem.category),
      )
      const compatibleProductIds = new Set(versionItem.compatibleProductIds ?? [])
      if (linkedVersionIds.has(versionItem.id)) {
        compatibleProductIds.add(catalogProduct.id)
      } else {
        compatibleProductIds.delete(catalogProduct.id)
      }
      return {
        ...versionItem,
        compatibleProductIds: Array.from(compatibleProductIds),
      }
    })

  const syncProductCompatibility = (
    items: ProductCatalogItem[],
    catalogProduct: ProductCatalogItem,
  ) => {
    const compatibleProductIds = new Set(catalogProduct.compatibleProductIds ?? [])
    return items.map((product) => {
      if (product.id === catalogProduct.id) return catalogProduct
      const nextCompatibleIds = new Set(product.compatibleProductIds ?? [])
      if (compatibleProductIds.has(product.id)) {
        nextCompatibleIds.add(catalogProduct.id)
      } else {
        nextCompatibleIds.delete(catalogProduct.id)
      }
      return {
        ...product,
        compatibleProductIds: Array.from(nextCompatibleIds),
      }
    })
  }

  const handleSaveProductCatalogItem = () => {
    const name = productDraft.name.trim()
    if (!name) return

    const payload: ProductCatalogItem = {
      id: productDraft.id,
      name,
      productType: productDraft.productType?.trim() ?? '',
      note: productDraft.note ?? '',
      tags: parseProductTags(productTagsDraftText),
      packingGuideAvailable: Boolean(productDraft.packingGuideAvailable),
      compatibleProductIds: normalizeIdList(productDraft.compatibleProductIds).filter(
        (id) => id !== productDraft.id,
      ),
      softwareIds: normalizeIdList(productDraft.softwareIds),
      driverIds: normalizeIdList(productDraft.driverIds),
      firmwareIds: normalizeIdList(productDraft.firmwareIds),
      editions: (productDraft.editions ?? []).map((edition) => {
        const platform = normalizeProductEditionPlatform(edition.platform)
        return {
          id: edition.id || createId('edition'),
          platform,
          name: edition.name.trim() || productEditionPlatformLabels[platform],
          firmwareIds: normalizeIdList(edition.firmwareIds),
          compatibleProductIds: normalizeIdList(edition.compatibleProductIds).filter(
            (id) => id !== productDraft.id,
          ),
          supportUrl: edition.supportUrl?.trim() ?? '',
          shareUrl: edition.shareUrl?.trim() ?? '',
          portalUrl: edition.portalUrl?.trim() ?? '',
          note: edition.note ?? '',
        }
      }),
      spareParts: productDraft.spareParts.map((sparePart) => ({
        ...sparePart,
        name: sparePart.name.trim(),
        sku: sparePart.sku.trim(),
      })),
    }

    const exists = productCatalog.some((product) => product.id === payload.id)
    const id = exists ? payload.id : createId('catalog-product')
    const savedProduct = { ...payload, id }
    const next = exists
      ? productCatalog.map((product) => (product.id === id ? savedProduct : product))
      : [...productCatalog, savedProduct]

    updateProductCatalog(syncProductCompatibility(next, savedProduct))
    updateDashboardProducts(syncDashboardProductsForCatalogProduct(dashboardProducts, savedProduct))
    setSelectedProductCatalogId(null)
    setProductDraft(getEmptyProductDraft())
    setProductTagsDraftText('')
  }

  const handleDeleteProductCatalogItem = (product: ProductCatalogItem) => {
    if (!window.confirm(`Supprimer le produit "${product.name}" ?`)) return

    updateProductCatalog(
      productCatalog
        .filter((entry) => entry.id !== product.id)
        .map((entry) => ({
          ...entry,
          compatibleProductIds: (entry.compatibleProductIds ?? []).filter(
            (id) => id !== product.id,
          ),
          editions: (entry.editions ?? []).map((edition) => ({
            ...edition,
            compatibleProductIds: (edition.compatibleProductIds ?? []).filter(
              (id) => id !== product.id,
            ),
          })),
        })),
    )
    updateDashboardProducts(
      dashboardVersionProducts.map((entry) => ({
        ...entry,
        compatibleProductIds: (entry.compatibleProductIds ?? []).filter((id) => id !== product.id),
      })),
    )

    if (selectedProductCatalogId === product.id) {
      setSelectedProductCatalogId(null)
      setProductDraft(getEmptyProductDraft())
      setProductTagsDraftText('')
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

  const insertDashboardNewsColorTag = (colorId: '1' | '2' | '3') => {
    const target = dashboardNewsContentRef.current
    const value = dashboardNewsDraft.content
    const start = target?.selectionStart ?? value.length
    const end = target?.selectionEnd ?? value.length
    const selection = value.slice(start, end) || 'TEXTE'
    const before = `(${colorId}*`
    const after = `*${colorId})`
    const next = `${value.slice(0, start)}${before}${selection}${after}${value.slice(end)}`

    setDashboardNewsDraft((prev) => ({ ...prev, content: next }))
    requestAnimationFrame(() => {
      const selectionStart = start + before.length
      const selectionEnd = selectionStart + selection.length
      target?.setSelectionRange(selectionStart, selectionEnd)
      target?.focus()
    })
  }

  const updateProductDraftSpareParts = (next: SparePart[]) => {
    setProductDraft((prev) => ({
      ...prev,
      spareParts: next,
    }))
  }
  const handleReorderProductDraftSpareParts = (next: SparePart[]) => {
    updateProductDraftSpareParts(next)
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

  const updateProductDraftRelation = (
    field: 'compatibleProductIds' | 'softwareIds' | 'driverIds' | 'firmwareIds',
    id: string,
    checked: boolean,
  ) => {
    setProductDraft((prev) => ({
      ...prev,
      [field]: checked
        ? normalizeIdList([...(prev[field] ?? []), id])
        : (prev[field] ?? []).filter((entryId) => entryId !== id),
    }))
  }

  const updateProductDraftEditions = (next: ProductEdition[]) => {
    setProductDraft((prev) => ({ ...prev, editions: next }))
  }

  const addProductDraftEdition = (platform: ProductEditionPlatform) => {
    updateProductDraftEditions([...(productDraft.editions ?? []), createProductEditionDraft(platform)])
  }

  const updateProductDraftEdition = (editionId: string, patch: Partial<ProductEdition>) => {
    updateProductDraftEditions(
      (productDraft.editions ?? []).map((edition) =>
        edition.id === editionId ? { ...edition, ...patch } : edition,
      ),
    )
  }

  const updateProductDraftEditionRelation = (
    editionId: string,
    field: 'firmwareIds' | 'compatibleProductIds',
    id: string,
    checked: boolean,
  ) => {
    updateProductDraftEditions(
      (productDraft.editions ?? []).map((edition) =>
        edition.id === editionId
          ? {
              ...edition,
              [field]: checked
                ? normalizeIdList([...(edition[field] ?? []), id])
                : (edition[field] ?? []).filter((entryId) => entryId !== id),
            }
          : edition,
      ),
    )
  }

  const removeProductDraftEdition = (editionId: string) => {
    updateProductDraftEditions(
      (productDraft.editions ?? []).filter((edition) => edition.id !== editionId),
    )
  }

  const renderPortalCodeEditorSettings = () => {
    const selectedPortalProcedure =
      customerPortalCodes.find((entry) => entry.id === selectedPortalProcedureId) ??
      customerPortalCodes[0] ??
      null
    const resolvedSelectedPortalProcedureId = selectedPortalProcedure?.id ?? null

    return (
      <div className="portal-code-editor">
        {customerPortalCodes.length ? (
          <div className="dashboard-product-editor portal-code-editor__layout">
            <div className="dashboard-product-editor__list">
              <SortableList
                items={customerPortalCodes}
                getId={(item) => item.id}
                onReorder={handleReorderPortalProcedures}
                renderItem={(item, handleProps) => {
                  const procedureHasDraft = item.codes.some((entry) => Boolean(entry.showDraft))
                  return (
                    <div
                      className={`list-item list-item--compact${
                        resolvedSelectedPortalProcedureId === item.id ? ' is-selected' : ''
                      }`}
                      key={item.id}
                      onClick={() => setSelectedPortalProcedureId(item.id)}
                    >
                      <button
                        className="drag-handle"
                        type="button"
                        {...handleProps.attributes}
                        {...handleProps.listeners}
                        onClick={(event) => event.stopPropagation()}
                      >
                        ⇅
                      </button>
                      <div className="list-item__content">
                        <div className="list-item__title">
                          {item.procedureName.trim() || 'Procédure sans nom'}
                        </div>
                        <div className="list-item__meta">
                          {item.codes.length}/4 étape{item.codes.length > 1 ? 's' : ''} • Draft{' '}
                          {procedureHasDraft ? 'oui' : 'non'} • Forward{' '}
                          {item.showForward ? 'oui' : 'non'}
                        </div>
                      </div>
                      <div className="list-item__actions">
                        <button
                          className="icon-btn-sm danger"
                          type="button"
                          title="Supprimer"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleRemovePortalProcedure(item.id)
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
                  )
                }}
              />
            </div>

            <div className="dashboard-product-editor__form">
              {selectedPortalProcedure ? (
                <div className="form portal-code-editor__form">
                  <section className="portal-code-editor__section">
                    <div className="portal-code-editor__section-head">
                      <div className="portal-code-editor__section-title">Procédure</div>
                      <div className="portal-code-editor__section-meta">
                        {selectedPortalProcedure.codes.length}/4 étapes
                      </div>
                    </div>
                    <input
                      className="input"
                      value={selectedPortalProcedure.procedureName}
                      placeholder="Nom de procédure"
                      onChange={(event) =>
                        updateCustomerPortalProcedure(selectedPortalProcedure.id, {
                          procedureName: event.target.value,
                        })
                      }
                    />
                    <div className="portal-code-editor__forward">
                      <label className="portal-code-editor__check portal-code-editor__check--subtle">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedPortalProcedure.showForward)}
                          onChange={(event) =>
                            updateCustomerPortalProcedure(selectedPortalProcedure.id, {
                              showForward: event.target.checked,
                              forwardTarget: event.target.checked
                                ? selectedPortalProcedure.forwardTarget ?? ''
                                : '',
                            })
                          }
                        />
                        <span>Forward en tête de procédure</span>
                      </label>
                      {selectedPortalProcedure.showForward ? (
                        <input
                          className="input"
                          value={selectedPortalProcedure.forwardTarget ?? ''}
                          placeholder="Nom à afficher après Forward to"
                          onChange={(event) =>
                            updateCustomerPortalProcedure(selectedPortalProcedure.id, {
                              forwardTarget: event.target.value,
                            })
                          }
                        />
                      ) : null}
                    </div>
                  </section>

                  <section className="portal-code-editor__section">
                    <div className="portal-code-editor__section-head">
                      <div className="portal-code-editor__section-title">Étapes</div>
                      <button
                        className="btn btn--ghost btn--small"
                        type="button"
                        onClick={() => addCustomerPortalCodeLine(selectedPortalProcedure.id)}
                        disabled={selectedPortalProcedure.codes.length >= 4}
                      >
                        Ajouter une étape
                      </button>
                    </div>
                    <div className="portal-code-editor__codes">
                      {selectedPortalProcedure.codes.map((codeLine, index) => (
                        <div className="portal-code-editor__code-card" key={codeLine.id}>
                          <div className="portal-code-editor__row">
                            <span className="portal-code-editor__index">{index + 1}</span>
                            <span className="list-item__meta">Étape {index + 1}</span>
                            {selectedPortalProcedure.codes.length > 1 ? (
                              <button
                                className="icon-btn-sm danger"
                                type="button"
                                title="Supprimer cette étape"
                                onClick={() =>
                                  removeCustomerPortalCodeLine(
                                    selectedPortalProcedure.id,
                                    codeLine.id,
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
                            ) : null}
                          </div>

                          <input
                            className="input"
                            value={codeLine.title ?? ''}
                            placeholder={`Titre de l'étape ${index + 1}`}
                            onChange={(event) =>
                              updateCustomerPortalCodeLineItem(
                                selectedPortalProcedure.id,
                                codeLine.id,
                                {
                                  title: event.target.value,
                                },
                              )
                            }
                          />

                          <div className="portal-code-editor__options">
                            <label className="portal-code-editor__check portal-code-editor__check--subtle">
                              <input
                                type="checkbox"
                                checked={Boolean(codeLine.showDraft)}
                                onChange={(event) =>
                                  updateCustomerPortalCodeLineItem(
                                    selectedPortalProcedure.id,
                                    codeLine.id,
                                    {
                                      showDraft: event.target.checked,
                                    },
                                  )
                                }
                              />
                              <span>Draft étape</span>
                            </label>

                            <label className="portal-code-editor__check portal-code-editor__check--subtle portal-code-editor__check--stacked">
                              <span>Lien d'accès rapide</span>
                              <input
                                className="input"
                                value={codeLine.quickLinkUrl ?? ''}
                                placeholder="https://..."
                                onChange={(event) =>
                                  updateCustomerPortalCodeLineItem(
                                    selectedPortalProcedure.id,
                                    codeLine.id,
                                    {
                                      quickLinkUrl: event.target.value,
                                    },
                                  )
                                }
                              />
                            </label>
                          </div>

                          <input
                            className="input"
                            value={codeLine.quickCopyText ?? ''}
                            placeholder="Template de texte"
                            onChange={(event) =>
                              updateCustomerPortalCodeLineItem(
                                selectedPortalProcedure.id,
                                codeLine.id,
                                {
                                  quickCopyText: event.target.value,
                                },
                              )
                            }
                          />

                          <textarea
                            className="textarea portal-code-editor__note"
                            value={codeLine.infoNote ?? ''}
                            placeholder="Texte affiché au milieu de l'étape"
                            onChange={(event) =>
                              updateCustomerPortalCodeLineItem(
                                selectedPortalProcedure.id,
                                codeLine.id,
                                {
                                  infoNote: event.target.value,
                                },
                              )
                            }
                          />

                          <input
                            className="input"
                            value={codeLine.code}
                            placeholder={`Code portal ${index + 1}`}
                            onChange={(event) =>
                              updateCustomerPortalCodeLineItem(
                                selectedPortalProcedure.id,
                                codeLine.id,
                                {
                                  code: event.target.value,
                                },
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              ) : (
                <div className="empty-state">Sélectionnez une procédure Portal pour l'éditer.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="empty-state">Aucune procédure configurée.</div>
        )}
      </div>
    )
  }

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
                        {dashboardProductCategoryLabels[product.category]}
                        {product.latestVersion.trim() ? ` • ${product.latestVersion.trim()}` : ''}
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

                  {categoryOptions.length > 1 ? (
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
                  ) : null}

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

                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
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
    setDraftBoxes([
      { email: '', task: '', savedAt: '' },
      { email: '', task: '', savedAt: '' },
      { email: '', task: '', savedAt: '' },
    ])
    closeDraftBoxTooltip()
    setDashboardProductDraft(getEmptyDashboardProductDraft())
    setProductDraft(getEmptyProductDraft())
    setProductTagsDraftText('')
    setDashboardNewsDraft(getEmptyDashboardNewsDraft())
    if (dashboardCalculatorCopyTimeoutRef.current !== null) {
      window.clearTimeout(dashboardCalculatorCopyTimeoutRef.current)
      dashboardCalculatorCopyTimeoutRef.current = null
    }
    setDashboardCalculatorItems([createDashboardCalculatorItem()])
    setDashboardCalculatorCopiedKey(null)
    setSparePartCopiedId(null)
    setProcedureChecks({})
    setActiveProcedureId(null)
    setActiveDashboardCatalogProductId(null)
    setActiveDashboardCatalogEditionId(null)
    setActiveDashboardSpareProductId(null)
    setActiveDashboardPortalProcedureId(null)
    setDashboardProductQuery('')
    setDashboardSparePartQuery('')
    setSnippetTooltip(null)
    setMailInsertMode('line')
    setSelectedPortalProcedureId(null)
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

  const readImportedData = async () => {
    const result = await importJson()
    if (result.canceled) return null
    if (result.error || !result.data) {
      setToast('Import impossible : fichier JSON invalide.')
      return null
    }
    try {
      const normalized = normalizeData(result.data as Partial<AppData>, defaultData)
      return convertLegacyTokensInData(normalized)
    } catch {
      setToast('Import impossible : données incompatibles.')
      return null
    }
  }

  const handleImportReplace = async () => {
    const importedData = await readImportedData()
    if (!importedData) return
    setData(importedData)
    setToast('Import remplacé.')
  }

  const handleImportMerge = async () => {
    const importedData = await readImportedData()
    if (!importedData) return
    setData((prev) => mergeData(prev, importedData))
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
    if (!window.confirm(`Supprimer le template "${template.name}" ?`)) return false
    setData((prev) => ({
      ...prev,
      templates: prev.templates.filter((item) => item.id !== template.id),
    }))
    return true
  }

  const deleteTaskTemplate = (task: TaskTemplate) => {
    if (!window.confirm(`Supprimer le template "${task.name}" ?`)) return false
    setData((prev) => ({
      ...prev,
      taskTemplates: prev.taskTemplates.filter((item) => item.id !== task.id),
    }))
    return true
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

  const openLink = (url: string) => {
    const normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http')) return
    openExternal(normalizedUrl)
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
    ? parseProcedureStepItems(activeProcedure.steps)
    : []
  const procedureTaskText = activeProcedure ? getProcedureTaskText(activeProcedure) : ''
  const dashboardCalculatorEntries = dashboardCalculatorItems.map((item) => ({
    ...item,
    productAmount: parseDashboardAmount(item.productPrice) ?? 0,
    shippingAmount: parseDashboardAmount(item.shippingPrice) ?? 0,
    importFeeAmount: parseDashboardAmount(item.importFee) ?? 0,
  }))
  const dashboardProductsTotalTtc = dashboardCalculatorEntries.reduce(
    (sum, item) => sum + item.productAmount,
    0,
  )
  const dashboardShippingValues = dashboardCalculatorEntries
    .map((item) => item.shippingAmount + item.importFeeAmount)
    .filter((value) => value > 0)
    .sort((left, right) => right - left)
  const dashboardBaseShippingTotalTtc =
    dashboardShippingValues.length > 0
      ? dashboardShippingValues[0] +
        dashboardShippingValues.slice(1).reduce((sum, value) => sum + value / 2, 0)
      : 0
  const dashboardShippingTotalTtc = dashboardBaseShippingTotalTtc
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
    const sliderBackground = `linear-gradient(90deg, rgba(88, 101, 242, 0.78) 0%, rgba(88, 101, 242, 0.78) ${progress}, rgba(255, 255, 255, 0.12) ${progress}, rgba(255, 255, 255, 0.12) 100%)`

    return (
      <div className={`settings-slider${options?.disabled ? ' is-disabled' : ''}`}>
        <div className="settings-slider__head">
          <div className="settings-slider__meta">
            <div className="settings-slider__label">{label}</div>
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
        <button
          className="btn btn--primary btn--small dashboard-formatter__action"
          type="button"
          onClick={() => void handleFormatName()}
          disabled={!nameFormatterValue.trim()}
        >
          Formater & copier
        </button>
        <div className="dashboard-formatter__input-wrap">
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
      </div>
    </article>
  )

  const renderWorkspaceDashboardRemindersPanel = (title: string) => (
    <article className="workspace-dashboard__panel workspace-dashboard__panel--calculator">
      <div className="workspace-dashboard__panel-title">{title}</div>
      <div className="dashboard-calculator">
        <textarea
          className="textarea dashboard-tools-reminders"
          value={dashboardReminders}
          placeholder="Ajoutez vos rappels libres..."
          onChange={(event) => updateSettings({ dashboardReminders: event.target.value })}
        />
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
                    <span className="dashboard-calculator__label">Produit</span>
                    <input
                      className="input"
                      value={item.productPrice}
                      onChange={(event) =>
                        updateDashboardCalculatorItem(item.id, 'productPrice', event.target.value)
                      }
                      placeholder="119,99"
                      inputMode="decimal"
                      aria-label={`Produit ligne ${index + 1}`}
                    />
                  </label>
                  <label className="dashboard-calculator__field dashboard-calculator__field--inline">
                    <span className="dashboard-calculator__label">Livraison</span>
                    <input
                      className="input"
                      value={item.shippingPrice}
                      onChange={(event) =>
                        updateDashboardCalculatorItem(item.id, 'shippingPrice', event.target.value)
                      }
                      placeholder="14,99"
                      inputMode="decimal"
                      aria-label={`Livraison ligne ${index + 1}`}
                    />
                  </label>
                  <label className="dashboard-calculator__field dashboard-calculator__field--inline">
                    <span className="dashboard-calculator__label">Import</span>
                    <input
                      className="input"
                      value={item.importFee}
                      onChange={(event) =>
                        updateDashboardCalculatorItem(item.id, 'importFee', event.target.value)
                      }
                      placeholder="0,00"
                      inputMode="decimal"
                      aria-label={`Frais d'import ligne ${index + 1}`}
                    />
                  </label>
                  <button
                    className="icon-btn-sm danger dashboard-calculator__remove"
                    type="button"
                    title="Supprimer cette ligne"
                    onClick={() => removeDashboardCalculatorItem(item.id)}
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
            </div>
          </div>

          <div className="dashboard-calculator__result">
            <div className="dashboard-calculator__result-head">
              <span className="dashboard-calculator__result-label">Livraison</span>
            </div>
            <div className="dashboard-calculator__result-values">
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
            </div>
          </div>

          <div className="dashboard-calculator__result dashboard-calculator__result--total">
            <div className="dashboard-calculator__result-head">
              <span className="dashboard-calculator__result-label">Total</span>
            </div>
            <div className="dashboard-calculator__result-values">
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
            </div>
          </div>
        </div>
      </div>
    </article>
  )

  const renderDashboardCatalogPanel = (
    title: string,
    searchPlaceholder: string,
    emptyTitle: string,
  ) => {
    const dashboardCatalogRelations = [
      {
        id: 'firmware',
        label: 'Firmware',
        items: activeDashboardCatalogProductFirmwares,
      },
      {
        id: 'driver',
        label: 'Driver',
        items: activeDashboardCatalogProductDrivers,
      },
      {
        id: 'software',
        label: 'Logiciels',
        items: activeDashboardCatalogProductSoftwares,
      },
    ] as const
    const formatDashboardRelationItems = (items: readonly DashboardProduct[]) => {
      if (!items.length) return ''
      return items
        .map((item) => {
          const version = item.latestVersion.trim()
          return version ? `${item.name} (${version})` : item.name
        })
        .join(' • ')
    }

    return (
    <article className="workspace-dashboard__panel workspace-dashboard__panel--catalog">
      <div className="workspace-dashboard__panel-title">{title}</div>

      <div className="dashboard-version-browser dashboard-product-browser">
        <div className="dashboard-version-browser__list">
          <div className="dashboard-portal-search dashboard-sticky-search">
            <input
              className="input"
              value={dashboardProductQuery}
              onChange={(event) => setDashboardProductQuery(event.target.value)}
              placeholder={searchPlaceholder}
            />
          </div>
          {dashboardCatalogProductResults.length ? (
            <section className="dashboard-version-group">
              <div className="dashboard-version-group__title">Produits</div>
              <div className="dashboard-version-group__list">
                {dashboardCatalogProductResults.map((product) => {
                  const linkedCount = normalizeIdList([
                    ...(product.softwareIds ?? []),
                    ...(product.driverIds ?? []),
                    ...(product.firmwareIds ?? []),
                    ...(product.editions ?? []).flatMap((edition) => edition.firmwareIds ?? []),
                  ]).length

                  return (
                    <button
                      key={product.id}
                      className={`dashboard-version-item${
                        activeDashboardCatalogProductId === product.id ? ' is-active' : ''
                      }`}
                      type="button"
                      onClick={() => {
                        setActiveDashboardCatalogProductId(product.id)
                        setActiveDashboardCatalogEditionId(null)
                      }}
                    >
                      <span className="dashboard-version-item__name">{product.name}</span>
                      <span className="dashboard-version-item__meta">
                        {product.productType?.trim() ? `${product.productType.trim()} • ` : ''}
                        {linkedCount} lien{linkedCount > 1 ? 's' : ''}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          ) : (
            <div className="dashboard-empty">Aucun produit configuré dans Paramètres.</div>
          )}
        </div>

        <div className="dashboard-version-detail dashboard-product-detail">
          {activeDashboardCatalogProduct ? (
            <>
              <div className="dashboard-product-header">
                <div className="dashboard-product-title">{activeDashboardCatalogProduct.name}</div>
              </div>

              <div className="dashboard-product-editions-section">
                <div className="dashboard-section-label">Tag</div>
                {(activeDashboardCatalogProduct.tags ?? []).length ? (
                  <div className="dashboard-product-tags">
                    {(activeDashboardCatalogProduct.tags ?? [])
                      .filter((tag) => tag.trim())
                      .map((tag) => (
                        <span className="dashboard-product-tag-item" key={tag}>
                          {tag}
                        </span>
                      ))}
                  </div>
                ) : null}
              </div>

              <div className="dashboard-product-editions-section">
                <div className="dashboard-section-label">Carré des éditions</div>
                {(activeDashboardCatalogProduct.editions ?? []).length ? (
                  <div className="dashboard-product-edition-tabs">
                    {(activeDashboardCatalogProduct.editions ?? []).map((edition) => (
                      <button
                        className={`dashboard-product-edition-tab${
                          activeDashboardCatalogEditionId === edition.id ? ' is-active' : ''
                        }`}
                        key={edition.id}
                        type="button"
                        onClick={() => setActiveDashboardCatalogEditionId(edition.id)}
                      >
                        <span>{edition.name}</span>
                        <small>{productEditionPlatformLabels[edition.platform]}</small>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="dashboard-empty">Aucune édition configurée.</div>
                )}
              </div>

              {activeDashboardCatalogEdition ? (
                <div className="dashboard-product-content">
                  <div className="dashboard-section-label">Plateforme</div>
                  <div className="dashboard-product-platform">
                    {productEditionPlatformLabels[activeDashboardCatalogEdition.platform]}
                  </div>

                  <div className="dashboard-product-relations__shortcuts">
                    <button
                      type="button"
                      className="dashboard-product-relations__shortcut-btn"
                      onClick={() => openLink(activeDashboardCatalogEdition.supportUrl ?? '')}
                      disabled={!activeDashboardCatalogEdition.supportUrl?.trim()}
                      title="Support"
                      aria-label="Support"
                    >
                      Support
                    </button>
                    <button
                      type="button"
                      className="dashboard-product-relations__shortcut-btn"
                      onClick={() => openLink(activeDashboardCatalogEdition.shareUrl ?? '')}
                      disabled={!activeDashboardCatalogEdition.shareUrl?.trim()}
                      title="SharePoint"
                      aria-label="SharePoint"
                    >
                      SharePoint
                    </button>
                    <button
                      type="button"
                      className="dashboard-product-relations__shortcut-btn"
                      onClick={() => openLink(activeDashboardCatalogEdition.portalUrl ?? '')}
                      disabled={!activeDashboardCatalogEdition.portalUrl?.trim()}
                      title="Portal"
                      aria-label="Portal"
                    >
                      Portal
                    </button>
                  </div>

                  <div className="dashboard-product-relations">
                    <div className="dashboard-product-relations__title">Tableau des version</div>
                    <div className="dashboard-product-relations__table">
                      <div className="dashboard-product-relations__row">
                        <div className="dashboard-product-relations__row-title">Firmware</div>
                        <div className="dashboard-product-relations__row-value">
                          {formatDashboardRelationItems(dashboardCatalogRelations[0].items)}
                        </div>
                      </div>
                      <div className="dashboard-product-relations__row">
                        <div className="dashboard-product-relations__row-title">Driver</div>
                        <div className="dashboard-product-relations__row-value">
                          {formatDashboardRelationItems(dashboardCatalogRelations[1].items)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-product-relations">
                    <div className="dashboard-product-relations__title">Logiciels compatibles</div>
                    <div className="dashboard-product-relations__table">
                      <div className="dashboard-product-relations__row">
                        <div className="dashboard-product-relations__row-title">Logiciel - version</div>
                        <div className="dashboard-product-relations__row-value">
                          {dashboardCatalogRelations[2].items.length ? (
                            <ul className="dashboard-product-relations__software-list">
                              {dashboardCatalogRelations[2].items.map((item) => (
                                <li key={item.id}>
                                  {item.name}
                                  {item.latestVersion.trim()
                                    ? ` (${item.latestVersion.trim()})`
                                    : ''}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-product-note-section">
                    <div className="dashboard-product-note-section__title">Note</div>
                    {activeDashboardCatalogEdition.note?.trim() ? (
                      <div className="dashboard-product-note__text">
                        {activeDashboardCatalogEdition.note}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="dashboard-version-empty dashboard-product-edition-empty">
                  Sélectionnez une édition pour afficher les informations techniques.
                </div>
              )}
            </>
          ) : (
            <div className="dashboard-wip">
              <strong>{emptyTitle}</strong>
              <span>Sélectionnez un produit pour afficher ses éditions.</span>
            </div>
          )}
        </div>
      </div>
    </article>
    )
  }

  const renderWorkspaceDashboardSparePartsPanel = (title: string) => (
    <article className="workspace-dashboard__panel workspace-dashboard__panel--catalog">
      <div className="workspace-dashboard__panel-title">{title}</div>
      <div className="dashboard-version-browser dashboard-spare-parts-browser">
        <div className="dashboard-version-browser__list">
          <div className="dashboard-portal-search dashboard-sticky-search">
            <input
              className="input"
              value={dashboardSparePartQuery}
              onChange={(event) => setDashboardSparePartQuery(event.target.value)}
              placeholder="Rechercher un produit, une spare part ou un SKU..."
            />
          </div>
          {filteredProductsWithSpareParts.length ? (
            filteredProductsWithSpareParts.map((product) => (
              <button
                key={product.id}
                className={`dashboard-version-item${
                  activeDashboardSpareProductId === product.id ? ' is-active' : ''
                }`}
                type="button"
                onClick={() => setActiveDashboardSpareProductId(product.id)}
              >
                <span className="dashboard-version-item__name">{product.name}</span>
                <span className="dashboard-version-item__meta">
                  {product.spareParts.length} spare part{product.spareParts.length > 1 ? 's' : ''}
                </span>
              </button>
            ))
          ) : (
            <div className="dashboard-empty">Aucune spare part configurée.</div>
          )}
        </div>

        <div className="dashboard-version-detail dashboard-spare-parts-detail">
          {activeDashboardSpareProduct ? (
            <>
              <div className="dashboard-version-detail__header">
                <div>
                  <div className="dashboard-version-detail__title">
                    {activeDashboardSpareProduct.name}
                  </div>
                  <div className="dashboard-version-detail__badges">
                    <span className="dashboard-version-detail__badge">
                      {activeDashboardSpareProduct.spareParts.length} spare part
                      {activeDashboardSpareProduct.spareParts.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <span
                  className={`dashboard-spare-parts__badge dashboard-spare-parts__badge--packing${
                    activeDashboardSpareProduct.packingGuideAvailable ? ' is-available' : ''
                  }`}
                >
                  <span
                    className={`dashboard-spare-parts__guide-dot${
                      activeDashboardSpareProduct.packingGuideAvailable ? ' is-available' : ''
                    }`}
                    aria-hidden="true"
                  />
                  {activeDashboardSpareProduct.packingGuideAvailable
                    ? 'Packing guide disponible'
                    : 'Packing guide indisponible'}
                </span>
              </div>
              <div className="dashboard-spare-parts__list">
                {activeDashboardSpareProduct.spareParts.length ? (
                  activeDashboardSpareProduct.spareParts.map((sparePart) => (
                    <article className="dashboard-spare-parts__item" key={sparePart.id}>
                      <div className="dashboard-spare-parts__main">
                        <div className="dashboard-spare-parts__name">
                          {sparePart.name || 'Sans nom'}
                        </div>
                        <div className="dashboard-spare-parts__sku-row">
                          <button
                            className={`dashboard-spare-parts__sku-bubble${
                              sparePartCopiedId === sparePart.id ? ' is-success' : ''
                            }`}
                            type="button"
                            onClick={() => void handleCopySparePartSku(sparePart.id, sparePart.sku)}
                            disabled={!sparePart.sku.trim()}
                            title="Cliquer pour copier"
                          >
                            {sparePart.sku || 'Non renseigné'}
                          </button>
                        </div>
                      </div>
                      <span
                        className={`dashboard-spare-parts__badge${
                          sparePart.guideAvailable ? ' is-available' : ''
                        }`}
                      >
                        <span
                          className={`dashboard-spare-parts__guide-dot${
                            sparePart.guideAvailable ? ' is-available' : ''
                          }`}
                          aria-hidden="true"
                        />
                        {sparePart.guideAvailable ? 'Guide disponible' : 'Guide indisponible'}
                      </span>
                    </article>
                  ))
                ) : (
                  <div className="dashboard-empty">Aucune spare part pour ce produit.</div>
                )}
              </div>
            </>
          ) : (
            <div className="dashboard-wip">
              <strong>Spare parts</strong>
              <span>Sélectionnez un produit pour afficher ses pièces.</span>
            </div>
          )}
        </div>
      </div>
    </article>
  )

  const renderWorkspaceDashboardPortalPanel = (title: string) => {
    const activePortalProcedureName =
      activeDashboardPortalProcedure?.procedureName.trim() || 'Procédure sans nom'
    const activePortalForwardLabel = activeDashboardPortalProcedure
      ? formatPortalForwardLabel(activeDashboardPortalProcedure)
      : 'Forward'
    const showPortalForwardIndicator = activeDashboardPortalProcedure
      ? shouldShowPortalForwardIndicator(activeDashboardPortalProcedure)
      : false
    const visiblePortalSteps = activeDashboardPortalProcedure?.codes ?? []

    return (
      <article className="workspace-dashboard__panel workspace-dashboard__panel--portal">
        <div className="workspace-dashboard__panel-title">{title}</div>

        <div className="dashboard-version-browser dashboard-portal-browser">
          <div className="dashboard-version-browser__list">
            {dashboardPortalProcedures.length ? (
              dashboardPortalProcedures.map((procedure) => {
                const procedureName = procedure.procedureName.trim() || 'Procédure sans nom'
                const procedureHasDraft = procedure.codes.some((entry) => Boolean(entry.showDraft))
                const procedureForwardLabel = formatPortalForwardLabel(procedure, 'Forward non')

                return (
                  <button
                    key={procedure.id}
                    className={`dashboard-version-item${
                      activeDashboardPortalProcedureId === procedure.id ? ' is-active' : ''
                    }`}
                    type="button"
                    onClick={() => setActiveDashboardPortalProcedureId(procedure.id)}
                  >
                    <span className="dashboard-version-item__name">{procedureName}</span>
                    <span className="dashboard-version-item__meta">
                      Draft {procedureHasDraft ? 'oui' : 'non'} - {procedureForwardLabel}
                    </span>
                  </button>
                )
              })
            ) : (
              <div className="dashboard-empty">Aucune procédure configurée dans Paramètres.</div>
            )}
          </div>

          <div className="dashboard-version-detail dashboard-portal-detail">
            {activeDashboardPortalProcedure ? (
              <>
                <div className="dashboard-portal-procedure-header">
                  <div className="dashboard-portal-procedure-title">
                    {activePortalProcedureName}
                  </div>
                  {showPortalForwardIndicator ? (
                    <div className="dashboard-portal-procedure-indicators">
                      <div
                        className={`dashboard-portal-indicator${
                          activeDashboardPortalProcedure.showForward ? ' is-active' : ''
                        }`}
                      >
                        <div className="dashboard-portal-indicator__label">
                          {activePortalForwardLabel}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="dashboard-version-detail__section">
                  <div className="dashboard-portal-steps">
                    {visiblePortalSteps.map((entry, index) => {
                      const lineTitle = entry.title?.trim() || `Étape ${index + 1}`
                      const code = entry.code.trim()
                      const stepText = entry.infoNote?.trim() ?? ''
                      const quickLinkUrl = entry.quickLinkUrl?.trim() ?? ''
                      const quickCopyText = entry.quickCopyText?.trim() ?? ''

                      return (
                        <article className="dashboard-portal-step" key={entry.id}>
                          <div className="dashboard-portal-step__main">
                            <div className="dashboard-portal-step__header">
                              <span className="dashboard-portal-step__index">{index + 1}</span>
                              <div className="dashboard-portal-step__heading">
                                <div className="dashboard-portal-step__title">{lineTitle}</div>
                                {entry.showDraft ? (
                                  <span className="dashboard-portal-step__draft">DRAFT</span>
                                ) : null}
                              </div>
                              <div className="dashboard-portal-step__actions-inline">
                                {quickLinkUrl ? (
                                  <button
                                    className="dashboard-portal-step__link-btn"
                                    type="button"
                                    onClick={() => void openExternal(quickLinkUrl)}
                                    aria-label={`Ouvrir l'accès rapide pour ${lineTitle}`}
                                    title="Accès rapide"
                                  >
                                    <svg
                                      className="dashboard-portal-step__link-icon"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      aria-hidden="true"
                                    >
                                      <path d="M14 4h6v6" />
                                      <path d="M20 4l-9 9" />
                                      <path d="M10 6H7a3 3 0 0 0-3 3v8a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-3" />
                                    </svg>
                                  </button>
                                ) : null}
                                {code ? (
                                  <>
                                    <span
                                      className={`dashboard-portal-step__code-inline${
                                        portalCopiedId === entry.id ? ' is-success' : ''
                                      }`}
                                    >
                                      {code}
                                    </span>
                                    <button
                                      className={`icon-btn-sm dashboard-copy-icon dashboard-copy-icon--portal${
                                        portalCopiedId === entry.id ? ' is-success' : ''
                                      }`}
                                      type="button"
                                      onClick={() => void handleCopyPortalCode(entry.id, entry.code)}
                                      title="Copier le code portal"
                                      aria-label={`Copier le code portal ${code}`}
                                    >
                                      <svg
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                      >
                                        <rect x="9" y="9" width="11" height="11" rx="2" />
                                        <path d="M5 15V6a2 2 0 0 1 2-2h9" />
                                      </svg>
                                    </button>
                                  </>
                                ) : null}
                              </div>
                            </div>

                            <div
                              className="dashboard-portal-step__content"
                              dangerouslySetInnerHTML={{
                                __html: formatProcedureText(stepText || 'Aucun texte renseigné.'),
                              }}
                            />
                          </div>
                          {quickCopyText ? (
                            <div className="dashboard-portal-step__template">
                              <div className="dashboard-portal-step__template-text">
                                {quickCopyText}
                              </div>
                              <button
                                className={`dashboard-portal-step__template-copy${
                                  portalQuickCopiedId === entry.id ? ' is-success' : ''
                                }`}
                                type="button"
                                onClick={() =>
                                  void handleCopyPortalQuickText(entry.id, quickCopyText)
                                }
                              >
                                {portalQuickCopiedId === entry.id ? 'Copié' : 'Copier'}
                              </button>
                            </div>
                          ) : null}
                        </article>
                      )
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="dashboard-wip">
                <strong>Portal procédures</strong>
                <span>Sélectionnez une procédure pour afficher ses étapes.</span>
              </div>
            )}
          </div>
        </div>
      </article>
    )
  }

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
                  __html: formatDashboardNewsText(item.content.trim() || 'Aucun contenu.'),
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
        <div className="workspace-dashboard__tools-grid">
          <div className="workspace-dashboard__tools-left">
            {renderWorkspaceDashboardNameFormatter('Name format')}
          </div>
          <div className="workspace-dashboard__tools-right">
            {renderWorkspaceDashboardRemindersPanel('Rappels')}
          </div>
        </div>
      )
    }

    if (workspaceDashboardPage === 'calculator') {
      return (
        <div className="workspace-dashboard__single">
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

    if (workspaceDashboardPage === 'catalog') {
      return (
        <div className="workspace-dashboard__single">
          {renderDashboardCatalogPanel(
            'Catalogue de produits',
            'Rechercher un produit, une édition, un firmware, un logiciel ou un driver...',
            'Catalogue produits',
          )}
        </div>
      )
    }

    if (workspaceDashboardPage === 'parts') {
      return (
        <div className="workspace-dashboard__single">
          {renderWorkspaceDashboardSparePartsPanel('SKU & spare parts')}
        </div>
      )
    }

    return (
      <div className="workspace-dashboard__single">
        {renderWorkspaceDashboardNewsPanel('News & info')}
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
          <UiIcon name={page.icon} className="dashboard-page-btn__icon" />
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
                <div className="dashboard-header__title">
                  <UiIcon name="dashboard" className="dashboard-header__icon" />
                  <span>Dashboard</span>
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
                      const channel = new BroadcastChannel(PROCEDURE_CHANNEL)
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
          <div className="brand" aria-label="Agentor">
            <img className="brand-logo" src={assetUrl('/agentor/icon.png')} alt="" />
            <p className="brand-name">Agentor</p>
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
                <UiIcon name="settings" className="sidebar-icon-btn__icon" />
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
          <p className="section-label">
            <UiIcon name="channels" className="section-label__icon" />
            <span>Catégories</span>
          </p>
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

        <p className="section-label">
          <UiIcon name="list" className="section-label__icon" />
          <span>Snippets</span>
        </p>
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
          <p className="workspace-title">
            <UiIcon name="mail" className="workspace-title__icon" />
            <span>Compose</span>
          </p>
          <div className="workspace-head__actions">
            <div className="template-controls">
              <div className="template-search-wrap" ref={templateSearchRef}>
                <UiIcon name="search" className="search-field-icon" />
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
                                ? assetUrl('/agentor/assets/fr.svg')
                                : assetUrl('/agentor/assets/gb.svg')
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
    <div className="workspace-head__action-group">
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
              <div className="draft-boxes-inline" aria-label="Boîtes de mémoire">
                {draftBoxes.map((slot, index) => {
                  const hasContent = Boolean(slot.email.trim() || slot.task.trim())
                  const isDisabled = !hasContent && !data.emailDraft.trim() && !data.taskDraft.trim()
                  return (
                    <button
                      key={`draft-box-${index + 1}`}
                      type="button"
                      className={`draft-box-btn${hasContent ? ' is-filled' : ''}`}
                      title={
                        hasContent
                          ? `Vider la boîte ${index + 1}`
                          : `Sauvegarder le mail et la task dans la boîte ${index + 1}`
                      }
                      aria-label={
                        hasContent
                          ? `Vider la boîte ${index + 1}`
                          : `Sauvegarder le mail et la task dans la boîte ${index + 1}`
                      }
                      aria-pressed={hasContent}
                      disabled={isDisabled}
                      onClick={() => handleDraftBoxClick(index)}
                      onMouseEnter={(event) => handleDraftBoxHover(index, event)}
                      onMouseLeave={closeDraftBoxTooltip}
                    >
                      <span className="draft-box-btn__icon" aria-hidden="true">
                        <UiIcon
                          name={hasContent ? 'archive' : 'box'}
                          className="draft-box-btn__icon-svg"
                        />
                        <span className="draft-box-btn__badge">{index + 1}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="quick-links-inline">
              {resolvedQuickLinks.map((link) => (
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
                    <span className="dashboard-toggle-btn__arrow">
                      {dashboardSectionOpen ? '▾' : '▴'}
                    </span>
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
                        <UiIcon name={page.icon} className="dashboard-page-btn__icon" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="actions">
                <span
                  className={`composer-insert-mode composer-insert-mode--${mailInsertMode}`}
                  title="Clic droit dans l’éditeur mail pour changer le mode d’insertion"
                >
                  {mailInsertModeLabel}
                </span>
                <button
                  className={`primary copy-btn${emailCopied ? ' is-success' : ''}${
                    emailCopyPulse ? ' btn-pulse' : ''
                  }${emailTags ? ' has-tag-warning' : ''}`}
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
            <p className="section-label section-label--tight">
              <UiIcon name="notes" className="section-label__icon" />
              <span>Notes</span>
            </p>
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
          <p className="section-label section-label--tight">
            <UiIcon name="inbox" className="section-label__icon" />
            <span>Task</span>
          </p>
          <div className="task-template-search">
            <div className="task-search-wrap" ref={taskSearchRef}>
              <UiIcon name="search" className="search-field-icon" />
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
              <button
                className={`primary task-copy-btn copy-btn${taskCopied ? ' is-success' : ''}${
                  taskCopyPulse ? ' btn-pulse' : ''
                }${taskTags ? ' has-tag-warning' : ''}`}
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
    {typeof document !== 'undefined' && draftBoxTooltip
      ? createPortal(
          <div
            className="draft-box-tooltip visible"
            style={{ top: draftBoxTooltip.y, left: draftBoxTooltip.x }}
            dangerouslySetInnerHTML={{ __html: draftBoxTooltip.previewHtml }}
          />,
          document.body,
        )
      : null}
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
              <div className="brand__title brand__title--with-icon">
                <UiIcon name="phone" className="brand__title-icon" />
                <span>Appel téléphonique</span>
              </div>
              <button className="close-modal" type="button" onClick={closeCallModal}>
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
                <div className="brand__title brand__title--with-icon">
                  <UiIcon name="settings" className="brand__title-icon" />
                  <span>Settings</span>
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
                    <div className="settings-layout__nav-title">
                      <UiIcon name={section.icon} className="settings-layout__nav-title-icon" />
                      <span>{section.label}</span>
                    </div>
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
                          <UiIcon name={item.icon} className="settings-layout__nav-btn-icon" />
                          <span>{item.label}</span>
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
                    <div className="settings-layout__content-title">
                      <UiIcon
                        name={activeSettingsTab.icon}
                        className="settings-layout__content-title-icon"
                      />
                      <span>{activeSettingsTab.label}</span>
                    </div>
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
                            ⇅
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
                            ⇅
                          </button>
                          <div className="list-item__content">
                            <div className="list-item__title">{snippet.title}</div>
                            <div className="list-item__meta">{snippet.content.split('\n')[0]}</div>
                          </div>
                          <div className="list-item__actions">
                            <button
                              className="icon-btn-sm danger"
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                const deleted = deleteSnippet(snippet)
                                if (!deleted) return
                                if (selectedSnippetId === snippet.id) {
                                  beginNewSnippetDraft()
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
                        type="button"
                        className="btn btn--ghost btn--small"
                        onClick={() => beginNewSnippetDraft()}
                      >
                        Nouveau
                      </button>
                      <button
                        type="button"
                        className="btn btn--primary btn--small"
                        onClick={handleSnippetSave}
                      >
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
                            ⇅
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
                                  ? assetUrl('/agentor/assets/fr.svg')
                                  : assetUrl('/agentor/assets/gb.svg')
                              }
                              alt={template.language === 'fr' ? 'FR' : 'EN'}
                            />
                            <button
                              className="icon-btn-sm danger"
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                const deleted = deleteTemplate(template)
                                if (!deleted) return
                                if (selectedTemplateId === template.id) {
                                  beginNewTemplateDraft()
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
                        type="button"
                        className="btn btn--ghost btn--small"
                        onClick={() => beginNewTemplateDraft()}
                      >
                        Nouveau
                      </button>
                      <button
                        type="button"
                        className="btn btn--primary btn--small"
                        onClick={handleTemplateSave}
                      >
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
                            ⇅
                          </button>
                          <div className="list-item__content">
                            <div className="list-item__title">{task.name}</div>
                            <div className="list-item__meta">{task.content.split('\n')[0]}</div>
                          </div>
                          <div className="list-item__actions">
                            <button
                              className="icon-btn-sm danger"
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                const deleted = deleteTaskTemplate(task)
                                if (!deleted) return
                                if (selectedTaskId === task.id) {
                                  beginNewTaskDraft()
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
                        type="button"
                        className="btn btn--ghost btn--small"
                        onClick={() => beginNewTaskDraft()}
                      >
                        Nouveau
                      </button>
                      <button
                        type="button"
                        className="btn btn--primary btn--small"
                        onClick={handleTaskTemplateSave}
                      >
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
                      Types, tags, éditions, compatibilités et spare parts.
                    </div>
                  </div>
                  <div className="list-card__body">
                    {productsSorted.length ? (
                      <SortableList
                        items={productsSorted}
                        getId={(item) => item.id}
                        onReorder={handleReorderProductCatalog}
                        renderItem={(product, handleProps) => (
                          <div
                            key={product.id}
                            className={`list-item list-item--compact${
                              selectedProductCatalogId === product.id ? ' is-selected' : ''
                            }`}
                            onClick={() => {
                              setProductDraft(getProductCatalogDraft(product))
                              setProductTagsDraftText((product.tags ?? []).join(', '))
                              setSelectedProductCatalogId(product.id)
                            }}
                          >
                            <button
                              className="drag-handle"
                              type="button"
                              {...handleProps.attributes}
                              {...handleProps.listeners}
                              onClick={(event) => event.stopPropagation()}
                            >
                              ⇅
                            </button>
                            <div className="list-item__content">
                              <div className="list-item__title">{product.name}</div>
                              <div className="list-item__meta">
                                {product.productType?.trim() || 'Type non renseigné'} •{' '}
                                {(product.editions ?? []).length} édition
                                {(product.editions ?? []).length > 1 ? 's' : ''} •{' '}
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
                        )}
                      />
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
                        Liaisons avec les produits, logiciels, drivers et firmwares.
                      </div>
                    </div>
                    <div className="list-card__tools">
                      <button
                        className="btn btn--ghost btn--small"
                        type="button"
                        onClick={() => {
                          setProductDraft(getEmptyProductDraft())
                          setProductTagsDraftText('')
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
                      <div className="form product-catalog-form">
                        <div className="form__row two">
                          <input
                            className="input"
                            placeholder="Nom du produit"
                            value={productDraft.name}
                            onChange={(event) =>
                              setProductDraft((prev) => ({ ...prev, name: event.target.value }))
                            }
                          />
                          <input
                            className="input"
                            placeholder="Type de produit (volant, pédalier, pack...)"
                            value={productDraft.productType ?? ''}
                            onChange={(event) =>
                              setProductDraft((prev) => ({
                                ...prev,
                                productType: event.target.value,
                              }))
                            }
                          />
                        </div>

                        <input
                          className="input"
                          placeholder="Tags séparés par des virgules (PC, Xbox, base, pack...)"
                          value={productTagsDraftText}
                          onChange={(event) => setProductTagsDraftText(event.target.value)}
                        />

                        <textarea
                          className="textarea"
                          placeholder="Note affichée en bas du dashboard Versions Produit"
                          value={productDraft.note ?? ''}
                          onChange={(event) =>
                            setProductDraft((prev) => ({ ...prev, note: event.target.value }))
                          }
                        />

                        <div className="product-relations-grid">
                          <div className="dashboard-product-editor__relations">
                            <div className="settings-label">Produits compatibles</div>
                            {productsSorted.filter((product) => product.id !== productDraft.id)
                              .length ? (
                              <div className="dashboard-product-editor__relation-list">
                                {productsSorted
                                  .filter((product) => product.id !== productDraft.id)
                                  .map((product) => {
                                    const checked = (productDraft.compatibleProductIds ?? []).includes(
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
                                            updateProductDraftRelation(
                                              'compatibleProductIds',
                                              product.id,
                                              event.target.checked,
                                            )
                                          }
                                        />
                                        <span>{product.name}</span>
                                      </label>
                                    )
                                  })}
                              </div>
                            ) : (
                              <div className="list-item__meta">Aucun autre produit configuré.</div>
                            )}
                          </div>

                          <div className="dashboard-product-editor__relations">
                            <div className="settings-label">Logiciels liés</div>
                            {dashboardSoftwareProducts.length ? (
                              <div className="dashboard-product-editor__relation-list">
                                {dashboardSoftwareProducts.map((product) => {
                                  const checked = (productDraft.softwareIds ?? []).includes(product.id)
                                  return (
                                    <label
                                      className="dashboard-product-editor__relation-item"
                                      key={product.id}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(event) =>
                                          updateProductDraftRelation(
                                            'softwareIds',
                                            product.id,
                                            event.target.checked,
                                          )
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
                              <div className="list-item__meta">Aucun logiciel configuré.</div>
                            )}
                          </div>

                          <div className="dashboard-product-editor__relations">
                            <div className="settings-label">Drivers liés</div>
                            {dashboardDriverProducts.length ? (
                              <div className="dashboard-product-editor__relation-list">
                                {dashboardDriverProducts.map((product) => {
                                  const checked = (productDraft.driverIds ?? []).includes(product.id)
                                  return (
                                    <label
                                      className="dashboard-product-editor__relation-item"
                                      key={product.id}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(event) =>
                                          updateProductDraftRelation(
                                            'driverIds',
                                            product.id,
                                            event.target.checked,
                                          )
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
                              <div className="list-item__meta">Aucun driver configuré.</div>
                            )}
                          </div>

                          <div className="dashboard-product-editor__relations">
                            <div className="settings-label">Firmwares communs</div>
                            {dashboardFirmwareProducts.length ? (
                              <div className="dashboard-product-editor__relation-list">
                                {dashboardFirmwareProducts.map((product) => {
                                  const checked = (productDraft.firmwareIds ?? []).includes(product.id)
                                  return (
                                    <label
                                      className="dashboard-product-editor__relation-item"
                                      key={product.id}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(event) =>
                                          updateProductDraftRelation(
                                            'firmwareIds',
                                            product.id,
                                            event.target.checked,
                                          )
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
                              <div className="list-item__meta">Aucun firmware configuré.</div>
                            )}
                          </div>
                        </div>

                        <div className="product-editions-editor">
                          <div className="product-editions-editor__header">
                            <div>
                              <div className="settings-label">Éditions</div>
                              <div className="list-item__meta">
                                Firmware et compatibilités par édition.
                              </div>
                            </div>
                            <div className="product-editions-editor__actions">
                              {productEditionPlatformOptions.slice(0, 3).map((option) => (
                                <button
                                  className="btn btn--ghost btn--small"
                                  type="button"
                                  key={option.value}
                                  onClick={() => addProductDraftEdition(option.value)}
                                >
                                  + {option.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {(productDraft.editions ?? []).length ? (
                            <div className="product-editions-editor__list">
                              {(productDraft.editions ?? []).map((edition) => (
                                <article className="product-edition-card" key={edition.id}>
                                  <div className="product-edition-card__head">
                                    <select
                                      className="select select--roomy"
                                      value={edition.platform}
                                      onChange={(event) => {
                                        const platform = event.target.value as ProductEditionPlatform
                                        updateProductDraftEdition(edition.id, {
                                          platform,
                                          name:
                                            edition.name.trim() ===
                                            productEditionPlatformLabels[edition.platform]
                                              ? productEditionPlatformLabels[platform]
                                              : edition.name,
                                        })
                                      }}
                                    >
                                      {productEditionPlatformOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                    <input
                                      className="input"
                                      placeholder="Nom de l'édition"
                                      value={edition.name}
                                      onChange={(event) =>
                                        updateProductDraftEdition(edition.id, {
                                          name: event.target.value,
                                        })
                                      }
                                    />
                                    <button
                                      className="icon-btn-sm danger"
                                      type="button"
                                      title="Supprimer l'édition"
                                      onClick={() => removeProductDraftEdition(edition.id)}
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

                                  <div className="form__row three">
                                    <input
                                      className="input"
                                      placeholder="URL support édition"
                                      value={edition.supportUrl ?? ''}
                                      onChange={(event) =>
                                        updateProductDraftEdition(edition.id, {
                                          supportUrl: event.target.value,
                                        })
                                      }
                                    />
                                    <input
                                      className="input"
                                      placeholder="URL share édition"
                                      value={edition.shareUrl ?? ''}
                                      onChange={(event) =>
                                        updateProductDraftEdition(edition.id, {
                                          shareUrl: event.target.value,
                                        })
                                      }
                                    />
                                    <input
                                      className="input"
                                      placeholder="URL portal édition"
                                      value={edition.portalUrl ?? ''}
                                      onChange={(event) =>
                                        updateProductDraftEdition(edition.id, {
                                          portalUrl: event.target.value,
                                        })
                                      }
                                    />
                                  </div>

                                  <div className="product-edition-card__relations">
                                    <div className="dashboard-product-editor__relations">
                                      <div className="settings-label">Firmware de l'édition</div>
                                      {dashboardFirmwareProducts.length ? (
                                        <div className="dashboard-product-editor__relation-list">
                                          {dashboardFirmwareProducts.map((product) => {
                                            const checked = (edition.firmwareIds ?? []).includes(
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
                                                    updateProductDraftEditionRelation(
                                                      edition.id,
                                                      'firmwareIds',
                                                      product.id,
                                                      event.target.checked,
                                                    )
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
                                          Aucun firmware configuré.
                                        </div>
                                      )}
                                    </div>

                                    <div className="dashboard-product-editor__relations">
                                      <div className="settings-label">
                                        Compatibilités de l'édition
                                      </div>
                                      {productsSorted.filter(
                                        (product) => product.id !== productDraft.id,
                                      ).length ? (
                                        <div className="dashboard-product-editor__relation-list">
                                          {productsSorted
                                            .filter((product) => product.id !== productDraft.id)
                                            .map((product) => {
                                              const checked = (
                                                edition.compatibleProductIds ?? []
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
                                                      updateProductDraftEditionRelation(
                                                        edition.id,
                                                        'compatibleProductIds',
                                                        product.id,
                                                        event.target.checked,
                                                      )
                                                    }
                                                  />
                                                  <span>{product.name}</span>
                                                </label>
                                              )
                                            })}
                                        </div>
                                      ) : (
                                        <div className="list-item__meta">
                                          Aucun autre produit configuré.
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </article>
                              ))}
                            </div>
                          ) : (
                            <div className="empty-state">
                              Aucune édition. Ajoutez PC, Xbox ou PlayStation.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {legacyProcedureEditorEnabled ? (
              <div className="modal__grid">
                <div className="list-card">
                  <div className="list-card__header list-card__header--wrap">
                    <div className="list-card__title">Procédures</div>
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
                            ⇅
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
                              Chk
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

            {editTab === 'quickLinks' ? (
              <div className="modal__grid modal__grid--single">
                <div className="list-card list-card--form">
                  <div className="list-card__header">
                    <div className="list-card__title-group">
                      <div className="list-card__title">Liens rapides</div>
                      <div className="list-card__subtitle">
                        URLs utilisées par les boutons d’accès rapides en haut de l’éditeur.
                      </div>
                    </div>
                  </div>
                  <div className="list-card__body">
                    <div className="settings-block quick-link-editor-list">
                      {quickLinks.map((link) => {
                        const configuredUrl =
                          typeof quickLinkUrls?.[link.id] === 'string'
                            ? quickLinkUrls[link.id]
                            : link.defaultUrl
                        const isDefault = configuredUrl.trim() === link.defaultUrl

                        return (
                          <section className="quick-link-editor" key={link.id}>
                            <div className="quick-link-editor__head">
                              <div className="quick-link-editor__identity">
                                <img src={link.icon} alt="" width={22} height={22} />
                                <div>
                                  <div className="quick-link-editor__title">{link.label}</div>
                                  <div className="quick-link-editor__meta">
                                    Bouton {link.label}
                                  </div>
                                </div>
                              </div>
                              <button
                                className="btn btn--ghost btn--small"
                                type="button"
                                disabled={isDefault}
                                onClick={() => resetQuickLinkUrl(link.id)}
                              >
                                Réinitialiser
                              </button>
                            </div>
                            <input
                              className="input"
                              value={configuredUrl}
                              placeholder={link.defaultUrl}
                              onChange={(event) =>
                                updateQuickLinkUrl(link.id, event.target.value)
                              }
                            />
                          </section>
                        )
                      })}
                    </div>
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
                      <div className="list-card__title">Procédures Portal</div>
                      <div className="list-card__subtitle">
                        Une procédure peut contenir jusqu’à quatre étapes, avec un forward global.
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
                  <div className="list-card__body list-card__body--portal-editor">
                    {renderPortalCodeEditorSettings()}
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'dashboardProcess' ? (
              <div className="modal__grid modal__grid--single">
                <div className="list-card list-card--form">
                  <div className="list-card__header">
                    <div className="list-card__title-group">
                      <div className="list-card__title">Process</div>
                      <div className="list-card__subtitle">
                        Associe la procédure courte et la procédure complète pour chaque ligne, puis
                        active le toggle Rush pour afficher la version complète.
                      </div>
                    </div>
                  </div>
                    <div className="list-card__body">
                      <div className="settings-stack settings-stack--tight">
                        {dashboardProcessLineDefinitions.map((line) => {
                          const lineSetting =
                            dashboardProcessSettings.find((entry) => entry.id === line.id) ??
                            defaultData.settings.dashboardProcessSettings.find(
                              (entry) => entry.id === line.id,
                            )
                          return (
                            <section className="dashboard-process-settings__item" key={line.id}>
                              <div className="dashboard-process-settings__head">
                                <div>
                                  <div className="dashboard-process-settings__title">{line.label}</div>
                                  <div className="dashboard-process-settings__meta">
                                    Choisis une procédure complète et une procédure réduite.
                                  </div>
                                </div>
                                <label className="portal-code-editor__check dashboard-process-settings__toggle">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(lineSetting?.enabled)}
                                  onChange={(event) =>
                                    updateDashboardProcessSetting(line.id, {
                                      enabled: event.target.checked,
                                      mode: event.target.checked ? 'complete' : 'reduced',
                                    })
                                  }
                                    />
                                    <span>Rush</span>
                                  </label>
                              </div>
                              <div className="form__row two">
                                <label className="settings-field">
                                  <span className="settings-label">Procédure complète</span>
                                  <select
                                    className="select"
                                    value={lineSetting?.completeProcedureId ?? ''}
                                    onChange={(event) =>
                                      updateDashboardProcessSetting(line.id, {
                                        completeProcedureId: event.target.value,
                                      })
                                    }
                                  >
                                    <option value="">Procédure non liée</option>
                                    {data.procedures.map((procedure) => (
                                      <option key={procedure.id} value={procedure.id}>
                                        {procedure.name.trim() || 'Procédure sans nom'}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label className="settings-field">
                                  <span className="settings-label">Procédure réduite</span>
                                  <select
                                    className="select"
                                    value={lineSetting?.reducedProcedureId ?? ''}
                                    onChange={(event) =>
                                      updateDashboardProcessSetting(line.id, {
                                        reducedProcedureId: event.target.value,
                                      })
                                    }
                                  >
                                    <option value="">Procédure non liée</option>
                                    {data.procedures.map((procedure) => (
                                      <option key={procedure.id} value={procedure.id}>
                                        {procedure.name.trim() || 'Procédure sans nom'}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </div>
                            </section>
                          )
                        })}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'dashboardVersions'
              ? renderDashboardCatalogEditor({
                  title: 'Firmwares',
                  subtitle: 'Versions firmware disponibles pour les éditions produit.',
                  items: dashboardFirmwareProducts,
                  defaultCategory: 'firmware',
                  categoryOptions: ['firmware'],
                  emptyListMessage: 'Aucun firmware configuré.',
                  emptySelectionMessage:
                    'Sélectionnez un firmware pour l’éditer ou appuyez sur Nouveau.',
                  latestVersionPlaceholder: 'Dernière version disponible',
                  fixedCategoryLabel: '',
                })
              : null}

            {editTab === 'dashboardSoftwares'
              ? renderDashboardCatalogEditor({
                  title: 'Logiciels',
                  subtitle: 'Déclarez les logiciels et les versions produit compatibles.',
                  items: dashboardSoftwareProducts,
                  defaultCategory: 'software',
                  categoryOptions: ['software'],
                  emptyListMessage: 'Aucun logiciel configuré.',
                  emptySelectionMessage:
                    'Sélectionnez un logiciel pour l’éditer ou appuyez sur Nouveau.',
                  latestVersionPlaceholder: 'Version du logiciel',
                  fixedCategoryLabel: '',
                })
              : null}

            {editTab === 'dashboardDriverPacks'
              ? renderDashboardCatalogEditor({
                  title: 'Packs drivers',
                  subtitle: 'Déclarez les packs drivers et les produits qu’ils contiennent.',
                  items: dashboardDriverProducts,
                  defaultCategory: 'driver',
                  categoryOptions: ['driver'],
                  emptyListMessage: 'Aucun pack driver configuré.',
                  emptySelectionMessage:
                    'Sélectionnez un pack driver pour l’éditer ou appuyez sur Nouveau.',
                  latestVersionPlaceholder: 'Version du pack driver',
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
                      <SortableList
                        items={productsSorted}
                        getId={(item) => item.id}
                        onReorder={handleReorderProductCatalog}
                        renderItem={(product, handleProps) => (
                          <div
                            key={product.id}
                            className={`list-item list-item--compact${
                              selectedProductCatalogId === product.id ? ' is-selected' : ''
                            }`}
                            onClick={() => {
                              setProductDraft(getProductCatalogDraft(product))
                              setProductTagsDraftText((product.tags ?? []).join(', '))
                              setSelectedProductCatalogId(product.id)
                            }}
                          >
                            <button
                              className="drag-handle"
                              type="button"
                              {...handleProps.attributes}
                              {...handleProps.listeners}
                              onClick={(event) => event.stopPropagation()}
                            >
                              ⇅
                            </button>
                            <div className="list-item__content">
                              <div className="list-item__title">{product.name}</div>
                              <div className="list-item__meta">
                                {product.spareParts.length} spare part
                                {product.spareParts.length > 1 ? 's' : ''} • Packing guide{' '}
                                {product.packingGuideAvailable ? 'disponible' : 'indisponible'}
                              </div>
                            </div>
                          </div>
                        )}
                      />
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
                        <label className="portal-code-editor__check spare-parts-editor__product-guide">
                          <input
                            type="checkbox"
                            checked={Boolean(productDraft.packingGuideAvailable)}
                            onChange={(event) =>
                              setProductDraft((prev) => ({
                                ...prev,
                                packingGuideAvailable: event.target.checked,
                              }))
                            }
                          />
                          <span>Packing guide disponible pour ce produit</span>
                        </label>
                        {productDraft.spareParts.length ? (
                          <SortableList
                            items={productDraft.spareParts}
                            getId={(item) => item.id}
                            onReorder={handleReorderProductDraftSpareParts}
                            renderItem={(sparePart, handleProps) => (
                              <article className="spare-parts-editor__item" key={sparePart.id}>
                                <div className="spare-parts-editor__head">
                                  <button
                                    className="drag-handle"
                                    type="button"
                                    {...handleProps.attributes}
                                    {...handleProps.listeners}
                                  >
                                    ⇅
                                  </button>
                                </div>
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
                            )}
                          />
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
                      <SortableList
                        items={dashboardNewsSorted}
                        getId={(item) => item.id}
                        onReorder={handleReorderDashboardNews}
                        renderItem={(item, handleProps) => (
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
                            <button
                              className="drag-handle"
                              type="button"
                              {...handleProps.attributes}
                              {...handleProps.listeners}
                              onClick={(event) => event.stopPropagation()}
                            >
                              ⇅
                            </button>
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
                        )}
                      />
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
                        <div className="news-color-toolbar" aria-label="Couleurs news">
                          {(['1', '2', '3'] as const).map((colorId) => (
                            <button
                              key={colorId}
                              className={`token-btn news-color-btn news-color-btn--${colorId}`}
                              type="button"
                              title={`Insérer couleur ${colorId}`}
                              onClick={() => insertDashboardNewsColorTag(colorId)}
                            >
                              {colorId}
                            </button>
                          ))}
                        </div>
                        <textarea
                          ref={dashboardNewsContentRef}
                          className="textarea textarea--tall"
                          placeholder="Contenu. Couleurs disponibles : (1*TEXTE*1), (2*TEXTE*2), (3*TEXTE*3)."
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
                      <div className="list-card__title">Procédures Portal</div>
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
                  <div className="list-card__body list-card__body--portal-editor">
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
                                {dashboardProductCategoryLabels[product.category]}
                                {product.latestVersion.trim() ? ` • ${product.latestVersion.trim()}` : ''}
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
                        <div className="settings-update__hero-title">Agentor {APP_VERSION_LABEL}</div>
                        <div className="settings-update__hero-text">
                          {updateSettingsLabel}
                          <br />
                          Disponible : {availableUpdateVersionLabel} · Dernière vérification :{' '}
                          {formatUpdateCheckedAt(updateStatus?.checkedAt)}
                        </div>
                      </section>

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
