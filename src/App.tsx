import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type MouseEvent,
  type RefObject,
  type TransitionEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { TextEditor, type TextEditorHandle } from './components/TextEditor'
import { SortableList } from './components/SortableList'
import { UiIcon } from './components/UiIcon'
import { defaultData } from './lib/defaults'
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
import type { AppIconName } from './lib/iconTypes'
import {
  settingsNavigation,
  settingsTabIndex,
  tokenReferenceItems,
  type SettingsTab,
} from './lib/settingsNavigation'
import {
  getCategoryIssues,
  getDashboardNewsIssues,
  getDashboardProductIssues,
  getMailTemplateIssues,
  getProcedureMailtoIssues,
  getProductCatalogItemIssues,
  getSnippetIssues,
  getTaskTemplateIssues,
  type SettingsValidationScope,
} from './lib/settingsValidation'
import type {
  AppData,
  AppSettings,
  Category,
  CustomerPortalCode,
  CustomerPortalCodeLine,
  DashboardDecorationItem,
  DashboardNewsItem,
  DashboardProduct,
  DashboardProductCategory,
  InsertMode,
  Language,
  MailTemplate,
  MailTemplateCategory,
  ProductEdition,
  ProductEditionPlatform,
  ProductCatalogItem,
  ProcedureMailtoLink,
  Procedure,
  ProcedureBrand,
  ProcedureCoverage,
  SparePart,
  Snippet,
  TaskSectionId,
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
  normalizeTokenSpacing,
  padEmptySelectors,
  stripTokenSpacing,
  normalizeData,
} from './lib/utils'
import {
  formatAmountForCopy,
  formatDashboardNewsDate,
  formatEuroAmount,
  formatHistoryTimestamp,
  formatUpdateCheckedAt,
  getSliderProgress,
  getTodayIsoDate,
  parseDashboardAmount,
} from './lib/formatting'
import {
  assetUrl,
  CALL_HISTORY_LIMIT,
  PHONE_CALL_TEMPLATE,
  productEditionPlatformLabels,
  productEditionPlatformOptions,
  quickLinks,
} from './lib/constants'
import {
  getUpdateAvailableVersionLabel,
  getUpdatePhaseTitle,
  getUpdatePhaseTone,
  getUpdateSettingsLabel,
} from './lib/updateStatusView'
import {
  getTagAutocompleteContext,
  normalizePredefinedTag,
  normalizePredefinedTags,
  type TagSuggestionFieldId,
  type TagSuggestionState,
} from './lib/tags'
import {
  buildProcedureMailtoHref,
  defaultProcedureMailtos,
  normalizeProcedureMailtoLink,
} from './lib/mailto'
import {
  createDashboardCalculatorItem,
  getDashboardCalculatorQuantity,
  VAT_DIVISOR,
  type DashboardCalculatorCopyKey,
  type DashboardCalculatorItem,
  type DashboardCalculatorPriceField,
} from './lib/calculator'
import { trimDoubleClickSelection } from './lib/dom'
import {
  AddIcon,
  ButtonIcon,
  CloseIcon,
  DeleteIcon,
  ExportDataIcon,
  ExportEmailsIcon,
  ImportDataIcon,
  MoveIcon,
} from './components/AppIcons'
import {
  annotateTaskFragment,
  buildCompactTaskPreviewText,
  buildStructuredTaskDraft,
  buildTaskDraftFromTemplate,
  buildTaskTemplateContent,
  createEmptyDraftBoxSlot,
  createEmptyTaskBoxSlot,
  ensureStructuredTaskDraft,
  formatPortalTimelineTitle,
  formatTaskCopyText,
  getHighestTaskMailNumber,
  getNextTaskMailNumber,
  getTaskHeadingProtectedRanges,
  getTaskSectionIndex,
  getTaskSectionLabel,
  getTaskTemplatePreviewText,
  getTemplateEmailLines,
  getTemplateTaskSections,
  hasMeaningfulTaskContent,
  hasRecognizedTaskHeadings,
  insertTaskTextInSection,
  normalizeStoredTaskSectionNames,
  normalizeTaskDraftNumbering,
  normalizeTaskSectionId,
  normalizeTaskSectionNames,
  normalizeTaskTemplateSections,
  parseStructuredTaskDraft,
  parseStructuredTaskDraftWithLeadingContent,
  TASK_FREE_BOX_INDEX,
  TASK_SECTION_IDS,
  TASK_SKELETON_BOX_INDEX,
  taskBoxUsesSkeleton,
  taskSectionHasFragment,
  taskSectionHasNumberedFragment,
  type DraftBoxSlot,
  type TaskBoxSlot,
} from './lib/taskDraft'
import {
  normalizeMailTemplateCategories,
  normalizeTaskTemplateCategories,
} from './lib/categories'
import {
  getMeaningfulCallDraft,
  normalizeCallDraft,
  normalizeCallDraftForCopy,
} from './lib/calls'
import {
  formatPortalForwardLabel,
  parseProcedureStepItems,
  PROCEDURE_CHECK_MARKER,
  sanitizeProcedureDraft,
  shouldShowPortalForwardIndicator,
} from './lib/procedure'
import {
  createEmptyPortalCodeLine,
  createProductEditionDraft,
  getProductDashboardVersionIds,
  normalizeDashboardData,
  normalizeDashboardNews,
  normalizeDashboardProducts,
  normalizeIdList,
  normalizePortalProcedures,
  normalizeProductEditionPlatform,
  normalizeProducts,
  parseProductTags,
  type PortalCodeLineSet,
  type PortalCodeOptionalModule,
} from './lib/dashboardData'
import {
  cloneAppData,
  convertLegacyTokensInData,
  mergeData,
  mergeSeedIntoData,
  normalizeTaskSectionsInData,
} from './lib/appData'
import './App.css'

const TAG_TOKEN = '<TAG>'
const SELECTOR_TOKEN = '[Option1/Option2]'
const ADDITION_TOKEN = '§texte§'
const PROCEDURE_CHANNEL = 'agentor-procedure'
const showLegacyProcedureUI = false
const APP_VERSION = (import.meta.env.VITE_APP_VERSION || '2.0.0').trim()
const APP_VERSION_LABEL = APP_VERSION.replace(/\.0$/, '')
const DATA_HISTORY_LIMIT = 160
const dashboardProductCategoryLabels: Record<DashboardProductCategory, string> = {
  software: 'Logiciel',
  driver: 'Driver',
  firmware: 'Firmware',
  product: 'Legacy',
}


type DraftBoxTooltipState = {
  index: number
  x: number
  y: number
  previewHtml: string
}

type TemplateBrowserView = 'categories' | 'templates'
type TaskBrowserView = 'categories' | 'templates'

type TemplatePreviewState = {
  templateId: string
  selectedEmailLines: boolean[]
  selectedTaskSections: boolean[]
  importTask: boolean
}


type WorkspaceDashboardPage =
  | 'tools'
  | 'calculator'
  | 'portal'
  | 'catalog'
  | 'parts'
  | 'decorations'

const workspaceDashboardPageOptions: Array<{
  id: WorkspaceDashboardPage
  title: string
  icon: AppIconName
}> = [
  { id: 'tools', title: 'Notes et actus', icon: 'news' },
  { id: 'calculator', title: 'Calculateur prix', icon: 'money' },
  { id: 'portal', title: 'Procédures', icon: 'list' },
  { id: 'catalog', title: 'Catalogue produits', icon: 'book' },
  { id: 'parts', title: 'SKU et pièces', icon: 'maintenance' },
  { id: 'decorations', title: 'Ascii Wall', icon: 'asciiWall' },
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




function App() {
  const [data, setData] = useState<AppData>(defaultData)
  const callTemplate = data.settings.callTemplate
  const isProcedureWindow =
    typeof window !== 'undefined' && window.location.hash === '#procedure'
  const [loaded, setLoaded] = useState(false)
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all')
  const [templateQuery, setTemplateQuery] = useState('')
  const [taskQuery, setTaskQuery] = useState('')
  const [templateBrowserView, setTemplateBrowserView] = useState<TemplateBrowserView>('categories')
  const [taskBrowserView, setTaskBrowserView] = useState<TaskBrowserView>('categories')
  const [activeTemplateCategoryId, setActiveTemplateCategoryId] = useState<string>('favorites')
  const [activeTaskCategoryId, setActiveTaskCategoryId] = useState<string>('favorites')
  const [templatePreview, setTemplatePreview] = useState<TemplatePreviewState | null>(null)
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
  const [dashboardDecorationCopiedId, setDashboardDecorationCopiedId] = useState<string | null>(null)
  const [dashboardDecorationComposerOpen, setDashboardDecorationComposerOpen] = useState(false)
  const [dashboardDecorationDraft, setDashboardDecorationDraft] = useState('')
  const dashboardDecorationDraftRef = useRef<HTMLTextAreaElement | null>(null)
  const [draftBoxes, setDraftBoxes] = useState<DraftBoxSlot[]>(() =>
    Array.from({ length: 3 }, createEmptyDraftBoxSlot),
  )
  const [taskDraftBoxes, setTaskDraftBoxes] = useState<TaskBoxSlot[]>(() =>
    Array.from({ length: 2 }, createEmptyTaskBoxSlot),
  )
  const [activeTaskBoxIndex, setActiveTaskBoxIndex] = useState(0)
  const [taskMailNumber, setTaskMailNumber] = useState(1)
  const [draftBoxTooltip, setDraftBoxTooltip] = useState<DraftBoxTooltipState | null>(null)
  const [callModalOpen, setCallModalOpen] = useState(false)
  const [callDraft, setCallDraft] = useState(PHONE_CALL_TEMPLATE)
  const [currentCallMemory, setCurrentCallMemory] = useState(PHONE_CALL_TEMPLATE)
  const [currentCallMemoryLocked, setCurrentCallMemoryLocked] = useState(false)
  const [selectedCallHistoryId, setSelectedCallHistoryId] = useState<string | null>(null)
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
  const [dashboardProcedureVariant, setDashboardProcedureVariant] = useState<'complete' | 'light'>(
    'complete',
  )
  const [procedureChecks, setProcedureChecks] = useState<Record<number, boolean>>({})
  const [procedureInfoDraft, setProcedureInfoDraft] = useState('')
  const [editTab, setEditTab] = useState<SettingsTab>('dashboard')
  const [settingsValidationTouched, setSettingsValidationTouched] = useState<
    Partial<Record<SettingsValidationScope, boolean>>
  >({})
  const [editSnippetCategoryId, setEditSnippetCategoryId] = useState('all')
  const [snippetTooltip, setSnippetTooltip] = useState<{
    text: string
    x: number
    y: number
    anchorTop: number
    anchorBottom: number
  } | null>(null)
  const snippetTooltipRef = useRef<HTMLDivElement | null>(null)

  // Once the tooltip is rendered its real height is known: center it on the
  // hovered row (clamped to the viewport) instead of guessing with max-height.
  useLayoutEffect(() => {
    const el = snippetTooltipRef.current
    if (!el || !snippetTooltip) return
    const gutter = 12
    const height = el.offsetHeight
    const centered = (snippetTooltip.anchorTop + snippetTooltip.anchorBottom - height) / 2
    const top = Math.max(gutter, Math.min(centered, window.innerHeight - height - gutter))
    el.style.top = `${top}px`
  }, [snippetTooltip])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedSnippetId, setSelectedSnippetId] = useState<string | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedProcedureId, setSelectedProcedureId] = useState<string | null>(null)
  const [selectedDashboardProductId, setSelectedDashboardProductId] = useState<string | null>(null)
  const [selectedProductCatalogId, setSelectedProductCatalogId] = useState<string | null>(null)
  const [selectedDashboardNewsId, setSelectedDashboardNewsId] = useState<string | null>(null)
  const [productTagsDraftText, setProductTagsDraftText] = useState('')
  const [procedureMailtoMenuOpen, setProcedureMailtoMenuOpen] = useState(false)
  const [snippetActiveField, setSnippetActiveField] = useState<'title' | 'content' | 'task'>(
    'content',
  )
  const [templateActiveField, setTemplateActiveField] = useState<'name' | 'content' | 'task'>(
    'content',
  )
  const [taskTemplateActiveField, setTaskTemplateActiveField] = useState<'name' | TaskSectionId>(
    'section-1',
  )
  const [taskDraftSkeletonEnabled, setTaskDraftSkeletonEnabled] = useState(true)
  const [procedureActiveField, setProcedureActiveField] = useState<'info' | 'notes' | 'steps'>(
    'info',
  )
  const [procedureFormatHelpOpen, setProcedureFormatHelpOpen] = useState(false)
  const [dashboardCalculatorItems, setDashboardCalculatorItems] = useState<DashboardCalculatorItem[]>(
    () => [createDashboardCalculatorItem()],
  )
  const [dashboardSectionOpen, setDashboardSectionOpen] = useState(true)
  const [dashboardSectionMounted, setDashboardSectionMounted] = useState(true)
  const [predefinedTagDraft, setPredefinedTagDraft] = useState('')
  const [tagSuggestionState, setTagSuggestionState] = useState<TagSuggestionState | null>(null)
  const [mailInsertMode, setMailInsertMode] = useState<InsertMode>('line')
  const [selectedPortalProcedureId, setSelectedPortalProcedureId] = useState<string | null>(null)
  const [portalProcedureEditorOpen, setPortalProcedureEditorOpen] = useState(false)
  const [portalProcedureVersionMode, setPortalProcedureVersionMode] = useState<'main' | 'variant'>(
    'main',
  )
  const [portalVisibleLineModules, setPortalVisibleLineModules] = useState<
    Record<string, Partial<Record<PortalCodeOptionalModule, boolean>>>
  >({})
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
  const dashboardDecorations = useMemo(
    () =>
      (Array.isArray(data.settings.dashboardDecorations)
        ? data.settings.dashboardDecorations
        : defaultData.settings.dashboardDecorations
      ).map((item, index) => ({
        id: item.id?.trim() || `decor-${index + 1}`,
        title: item.title?.trim() || `Décor ${index + 1}`,
        content: item.content ?? '',
      })),
    [data.settings.dashboardDecorations],
  )
  const normalizedProcedureMailtos = useMemo(
    () =>
      (data.settings.procedureMailtoLinks ?? defaultProcedureMailtos).map((link, index) =>
        normalizeProcedureMailtoLink(link, `procedure-mailto-${index + 1}`),
      ),
    [data.settings.procedureMailtoLinks],
  )

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
  const dashboardDecorationCopyTimeoutRef = useRef<number | null>(null)
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
  const taskTemplateSectionRefs = useRef<Record<TaskSectionId, HTMLTextAreaElement | null>>({
    'section-1': null,
    'section-2': null,
    'section-3': null,
    'section-4': null,
  })
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

  const persistCallDraft = useCallback((contentOverride?: string) => {
    const source = contentOverride ?? callDraft
    const content = getMeaningfulCallDraft(source, callTemplate)
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
    setTaskBrowserView('categories')
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
  const markSettingsValidationTouched = useCallback((scope: SettingsValidationScope) => {
    setSettingsValidationTouched((prev) => ({ ...prev, [scope]: true }))
  }, [])
  const clearSettingsValidationTouched = useCallback((scope: SettingsValidationScope) => {
    setSettingsValidationTouched((prev) => ({ ...prev, [scope]: false }))
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
    taskSectionId: 'section-3',
    taskOptional: false,
    categoryId: defaultData.categories[0]?.id ?? '',
  })
  const [templateDraft, setTemplateDraft] = useState<MailTemplate>({
    id: '',
    name: '',
    content: '',
    language: 'fr',
    categoryId: defaultData.settings.mailTemplateCategories[0]?.id ?? '',
    favorite: false,
    taskText: '',
    taskSectionId: 'section-3',
    taskOptional: false,
    taskTemplateId: '',
    taskCustom: false,
  })
  const [taskDraft, setTaskDraft] = useState<TaskTemplate>({
    id: '',
    name: '',
    content: '',
    taskSections: ['', '', '', ''],
    categoryId: defaultData.settings.taskTemplateCategories[0]?.id ?? '',
    favorite: false,
  })
  const [templateCategoryDraft, setTemplateCategoryDraft] = useState<MailTemplateCategory>({
    id: '',
    name: '',
  })
  const [taskTemplateCategoryDraft, setTaskTemplateCategoryDraft] = useState<MailTemplateCategory>({
    id: '',
    name: '',
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
  const mailTemplateCategories = useMemo(
    () => normalizeMailTemplateCategories(data.settings.mailTemplateCategories),
    [data.settings.mailTemplateCategories],
  )
  const taskTemplateCategories = useMemo(
    () => normalizeTaskTemplateCategories(data.settings.taskTemplateCategories),
    [data.settings.taskTemplateCategories],
  )
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
        taskSectionId: 'section-3',
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
        categoryId: mailTemplateCategories[0]?.id ?? '',
        favorite: false,
        taskText: '',
        taskSectionId: 'section-3',
        taskOptional: false,
        taskTemplateId: '',
        taskCustom: false,
      }) as MailTemplate,
    [mailTemplateCategories],
  )
  const getEmptyTaskDraft = useCallback(
    () =>
      ({
        id: '',
        name: '',
        content: '',
        taskSections: ['', '', '', ''],
        taskSectionId: 'section-3',
        categoryId: taskTemplateCategories[0]?.id ?? '',
        favorite: false,
      }) as TaskTemplate,
    [taskTemplateCategories],
  )
  const beginNewSnippetDraft = useCallback(
    (focusField = true) => {
      setTagSuggestionState(null)
      clearSettingsValidationTouched('snippet')
      setSnippetDraft(getEmptySnippetDraft())
      setSelectedSnippetId('new')
      if (focusField) {
        requestAnimationFrame(() => snippetTitleRef.current?.focus())
      }
    },
    [clearSettingsValidationTouched, getEmptySnippetDraft],
  )
  const beginNewTemplateDraft = useCallback(
    (focusField = true) => {
      setTagSuggestionState(null)
      clearSettingsValidationTouched('template')
      setTemplateDraft(getEmptyTemplateDraft())
      setSelectedTemplateId('new')
      if (focusField) {
        requestAnimationFrame(() => templateNameRef.current?.focus())
      }
    },
    [clearSettingsValidationTouched, getEmptyTemplateDraft],
  )
  const beginNewTaskDraft = useCallback(
    (focusField = true) => {
      setTagSuggestionState(null)
      clearSettingsValidationTouched('task')
      setTaskDraft(getEmptyTaskDraft())
      setSelectedTaskId('new')
      if (focusField) {
        requestAnimationFrame(() => taskTemplateNameRef.current?.focus())
      }
    },
    [clearSettingsValidationTouched, getEmptyTaskDraft],
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
        taskSectionId: 'section-3',
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
        setData(mergeSeedIntoData(normalizeTaskSectionsInData(normalizeDashboardData(loadedData)), defaultData))
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
    setTemplateCategoryDraft({ id: '', name: '' })
    setTemplateCategoryDraft({ id: '', name: '' })
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
  const taskSectionNames = useMemo(
    () => normalizeStoredTaskSectionNames(data.settings.taskSectionNames),
    [data.settings.taskSectionNames],
  )
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
  const activeSettingsTab =
    settingsTabIndex.find((tab) => tab.id === editTab) ?? settingsTabIndex[0]
  const callHistory = useMemo(
    () => [...data.callHistory].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [data.callHistory],
  )
  const recentCallHistory = useMemo(
    () => callHistory.slice(0, CALL_HISTORY_LIMIT),
    [callHistory],
  )
  const callModalHistoryItems = useMemo(
    () => recentCallHistory.filter((item) => item.id !== callEntryId).slice(0, 5),
    [callEntryId, recentCallHistory],
  )
  const currentCallPreview = useMemo(() => {
    const normalized = normalizeCallDraft(currentCallMemory)
    return normalized.split(/\r?\n/).find((line) => line.trim())?.trim() || 'Brouillon vide'
  }, [currentCallMemory])
  const editButtonLabel = 'Settings'
  const isUpdateCheckRunning =
    updateStatus?.phase === 'checking' ||
    updateStatus?.phase === 'available' ||
    updateStatus?.phase === 'downloading'
  const categoryIdSet = useMemo(
    () => new Set(data.categories.map((category) => category.id)),
    [data.categories],
  )
  const taskTemplateIdSet = useMemo(
    () => new Set(data.taskTemplates.map((task) => task.id)),
    [data.taskTemplates],
  )
  const categoryColorById = useMemo(() => {
    const map = new Map<string, string>()
    data.categories.forEach((category) => {
      map.set(category.id, categoryColorMap.get(category.color) ?? '#a392d5')
    })
    return map
  }, [data.categories])
  const predefinedTags = useMemo(
    () => normalizePredefinedTags(data.settings.predefinedTags ?? defaultData.settings.predefinedTags),
    [data.settings.predefinedTags],
  )
  const categoryDraftIssues = useMemo(() => getCategoryIssues(categoryDraft), [categoryDraft])
  const snippetDraftIssues = useMemo(
    () => getSnippetIssues(snippetDraft, categoryIdSet),
    [categoryIdSet, snippetDraft],
  )
  const templateDraftIssues = useMemo(
    () => getMailTemplateIssues(templateDraft, taskTemplateIdSet),
    [taskTemplateIdSet, templateDraft],
  )
  const taskDraftIssues = useMemo(() => getTaskTemplateIssues(taskDraft), [taskDraft])
  const dashboardProductDraftIssues = useMemo(
    () => getDashboardProductIssues(dashboardProductDraft),
    [dashboardProductDraft],
  )
  const productDraftIssues = useMemo(
    () => getProductCatalogItemIssues(productDraft),
    [productDraft],
  )
  const dashboardNewsDraftIssues = useMemo(
    () => getDashboardNewsIssues(dashboardNewsDraft),
    [dashboardNewsDraft],
  )
  const settingsIssueCounts = useMemo<Partial<Record<SettingsTab, number>>>(() => {
    const countDashboardProducts = (category: DashboardProductCategory) =>
      dashboardProducts.filter(
        (product) => product.category === category && getDashboardProductIssues(product).length,
      ).length

    return {
      categories: data.categories.filter((category) => getCategoryIssues(category).length).length,
      snippets: data.snippets.filter((snippet) => getSnippetIssues(snippet, categoryIdSet).length)
        .length,
      templates: data.templates.filter(
        (template) => getMailTemplateIssues(template, taskTemplateIdSet).length,
      ).length,
      tasks: data.taskTemplates.filter((task) => getTaskTemplateIssues(task).length).length,
      products: productCatalog.filter((product) => getProductCatalogItemIssues(product).length)
        .length,
      dashboardVersions: countDashboardProducts('firmware'),
      dashboardSoftwares: countDashboardProducts('software'),
      dashboardDriverPacks: countDashboardProducts('driver'),
      dashboardSpareParts: productCatalog.filter((product) =>
        product.spareParts.some((sparePart) => !sparePart.name.trim() || !sparePart.sku.trim()),
      ).length,
      procedureMailtos: normalizedProcedureMailtos.filter(
        (link) => getProcedureMailtoIssues(link).length,
      ).length,
      dashboardNews: dashboardNews.filter((item) => getDashboardNewsIssues(item).length).length,
    }
  }, [
    categoryIdSet,
    dashboardNews,
    dashboardProducts,
    data.categories,
    data.snippets,
    data.taskTemplates,
    data.templates,
    normalizedProcedureMailtos,
    productCatalog,
    taskTemplateIdSet,
  ])
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
  const updateTaskSectionName = useCallback((index: number, name: string) => {
    setData((prev) => {
      const currentNames = normalizeStoredTaskSectionNames(prev.settings.taskSectionNames)
      const nextNames = currentNames.map((currentName, sectionIndex) =>
        sectionIndex === index ? name : currentName,
      )
      const normalizedNextNames = normalizeTaskSectionNames(nextNames)
      const contents = parseStructuredTaskDraft(prev.taskDraft, currentNames)
      return {
        ...prev,
        taskDraft: buildStructuredTaskDraft(contents, normalizedNextNames),
        settings: {
          ...prev.settings,
          taskSectionNames: normalizedNextNames,
        },
      }
    })
  }, [])
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
  const saveTemplateCategory = useCallback(() => {
    const name = templateCategoryDraft.name.trim()
    if (!name) {
      setToast('Nom de catégorie obligatoire.')
      return
    }
    const exists = mailTemplateCategories.some((category) => category.id === templateCategoryDraft.id)
    const id = exists ? templateCategoryDraft.id : createId('template-cat')
    const savedCategory = { id, name }
    updateSettings({
      mailTemplateCategories: exists
        ? mailTemplateCategories.map((category) =>
            category.id === id ? savedCategory : category,
          )
        : [...mailTemplateCategories, savedCategory],
    })
    setTemplateCategoryDraft({ id: '', name: '' })
    setToast('Catégorie template enregistrée.')
  }, [mailTemplateCategories, templateCategoryDraft, updateSettings])
  const deleteTemplateCategory = useCallback(
    (categoryId: string) => {
      const fallbackId = mailTemplateCategories.find((category) => category.id !== categoryId)?.id ?? ''
      updateSettings({
        mailTemplateCategories: mailTemplateCategories.filter(
          (category) => category.id !== categoryId,
        ),
      })
      setData((prev) => ({
        ...prev,
        templates: prev.templates.map((template) =>
          template.categoryId === categoryId ? { ...template, categoryId: fallbackId } : template,
        ),
      }))
    },
    [mailTemplateCategories, updateSettings],
  )

  const deleteCategory = useCallback(
    (categoryId: string) => {
      const category = data.categories.find((item) => item.id === categoryId)
      if (!category) return
      if (!window.confirm(`Supprimer la catégorie "${category.name}" ?`)) return
      const fallbackId = data.categories.find((item) => item.id !== categoryId)?.id ?? ''
      setData((prev) => ({
        ...prev,
        categories: prev.categories.filter((item) => item.id !== categoryId),
        snippets: prev.snippets.map((snippet) =>
          snippet.categoryId === categoryId ? { ...snippet, categoryId: fallbackId } : snippet,
        ),
      }))
      if (selectedCategoryId === categoryId) {
        setSelectedCategoryId(null)
        setCategoryDraft(getEmptyCategoryDraft())
      }
    },
    [data.categories, getEmptyCategoryDraft, selectedCategoryId],
  )
  const openDashboardDecorationComposer = useCallback(() => {
    setDashboardDecorationComposerOpen(true)
    window.requestAnimationFrame(() => dashboardDecorationDraftRef.current?.focus())
  }, [])
  const closeDashboardDecorationComposer = useCallback(() => {
    setDashboardDecorationComposerOpen(false)
    setDashboardDecorationDraft('')
  }, [])
  const addDashboardDecoration = useCallback(() => {
    const content = dashboardDecorationDraft.trimEnd()
    if (!content.trim()) {
      setToast('Décoration vide.')
      window.requestAnimationFrame(() => dashboardDecorationDraftRef.current?.focus())
      return
    }
    updateSettings({
      dashboardDecorations: [
        ...dashboardDecorations,
        { id: createId('decor'), title: '', content },
      ],
    })
    setDashboardDecorationDraft('')
    setDashboardDecorationComposerOpen(false)
  }, [dashboardDecorationDraft, dashboardDecorations, updateSettings])
  const deleteDashboardDecoration = useCallback(
    (decorationId: string) => {
      updateSettings({
        dashboardDecorations: dashboardDecorations.filter((item) => item.id !== decorationId),
      })
      setDashboardDecorationCopiedId((current) => (current === decorationId ? null : current))
    },
    [dashboardDecorations, updateSettings],
  )
  const saveTaskTemplateCategory = useCallback(() => {
    const name = taskTemplateCategoryDraft.name.trim()
    if (!name) {
      setToast('Nom de catégorie obligatoire.')
      return
    }
    const exists = taskTemplateCategories.some(
      (category) => category.id === taskTemplateCategoryDraft.id,
    )
    const id = exists ? taskTemplateCategoryDraft.id : createId('task-template-cat')
    const savedCategory = { id, name }
    updateSettings({
      taskTemplateCategories: exists
        ? taskTemplateCategories.map((category) =>
            category.id === id ? savedCategory : category,
          )
        : [...taskTemplateCategories, savedCategory],
    })
    setTaskTemplateCategoryDraft({ id: '', name: '' })
    setToast('Catégorie task enregistrée.')
  }, [taskTemplateCategories, taskTemplateCategoryDraft, updateSettings])
  const deleteTaskTemplateCategory = useCallback(
    (categoryId: string) => {
      const fallbackId =
        taskTemplateCategories.find((category) => category.id !== categoryId)?.id ?? ''
      updateSettings({
        taskTemplateCategories: taskTemplateCategories.filter(
          (category) => category.id !== categoryId,
        ),
      })
      setData((prev) => ({
        ...prev,
        taskTemplates: prev.taskTemplates.map((task) =>
          task.categoryId === categoryId ? { ...task, categoryId: fallbackId } : task,
        ),
      }))
    },
    [taskTemplateCategories, updateSettings],
  )
  const updateProcedureMailtoLinks = useCallback(
    (next: ProcedureMailtoLink[]) => {
      updateSettings({ procedureMailtoLinks: next })
    },
    [updateSettings],
  )
  const addProcedureMailtoLink = useCallback(() => {
    const id = createId('procedure-mailto')
    updateProcedureMailtoLinks([
      ...normalizedProcedureMailtos,
      {
        id,
        label: 'Nouveau mailto',
        to: '',
        cc: '',
        subject: '',
        body: '',
      },
    ])
  }, [normalizedProcedureMailtos, updateProcedureMailtoLinks])
  const updateProcedureMailtoLink = useCallback(
    (id: string, patch: Partial<ProcedureMailtoLink>) => {
      updateProcedureMailtoLinks(
        normalizedProcedureMailtos.map((link) =>
          link.id === id ? normalizeProcedureMailtoLink({ ...link, ...patch }, link.id) : link,
        ),
      )
    },
    [normalizedProcedureMailtos, updateProcedureMailtoLinks],
  )
  const removeProcedureMailtoLink = useCallback(
    (id: string) => {
      updateProcedureMailtoLinks(normalizedProcedureMailtos.filter((link) => link.id !== id))
    },
    [normalizedProcedureMailtos, updateProcedureMailtoLinks],
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
    (
      procedureId: string,
      codeLineId: string,
      patch: Partial<CustomerPortalCodeLine>,
      lineSet: PortalCodeLineSet = 'codes',
    ) => {
      updateCustomerPortalCodes(
        customerPortalCodes.map((entry) => {
          if (entry.id !== procedureId) return entry
          const currentLines = lineSet === 'variantCodes' ? entry.variantCodes ?? [] : entry.codes
          return {
            ...entry,
            [lineSet]: currentLines.map((codeLine) => {
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
    (procedureId: string, lineSet: PortalCodeLineSet = 'codes') => {
      const current = customerPortalCodes.find((entry) => entry.id === procedureId)
      const currentLines = lineSet === 'variantCodes' ? current?.variantCodes ?? [] : current?.codes ?? []
      if (!current) return
      updateCustomerPortalCodes(
        customerPortalCodes.map((entry) =>
          entry.id === procedureId
            ? {
                ...entry,
                [lineSet]: [...currentLines, createEmptyPortalCodeLine()],
              }
            : entry,
        ),
      )
    },
    [customerPortalCodes, updateCustomerPortalCodes],
  )
  const removeCustomerPortalCodeLine = useCallback(
    (procedureId: string, codeLineId: string, lineSet: PortalCodeLineSet = 'codes') => {
      updateCustomerPortalCodes(
        customerPortalCodes.map((entry) => {
          if (entry.id !== procedureId) return entry
          const currentLines = lineSet === 'variantCodes' ? entry.variantCodes ?? [] : entry.codes
          return {
            ...entry,
            [lineSet]: currentLines.filter((codeLine) => codeLine.id !== codeLineId),
          }
        }),
      )
    },
    [customerPortalCodes, updateCustomerPortalCodes],
  )
  const showCustomerPortalCodeLineModule = useCallback(
    (codeLineId: string, module: PortalCodeOptionalModule) => {
      setPortalVisibleLineModules((prev) => ({
        ...prev,
        [codeLineId]: {
          ...prev[codeLineId],
          [module]: true,
        },
      }))
    },
    [],
  )
  const hideCustomerPortalCodeLineModule = useCallback(
    (
      procedureId: string,
      codeLineId: string,
      module: PortalCodeOptionalModule,
      lineSet: PortalCodeLineSet = 'codes',
    ) => {
      const patchByModule: Record<PortalCodeOptionalModule, Partial<CustomerPortalCodeLine>> = {
        code: { code: '' },
        quickLink: { quickLinkUrl: '' },
        quickCopy: { quickCopyText: '' },
        mailto: { quickMailtoTemplateId: '', quickMailtoHref: '', quickMailtoLabel: '' },
      }
      updateCustomerPortalCodeLineItem(procedureId, codeLineId, patchByModule[module], lineSet)
      setPortalVisibleLineModules((prev) => ({
        ...prev,
        [codeLineId]: {
          ...prev[codeLineId],
          [module]: false,
        },
      }))
    },
    [updateCustomerPortalCodeLineItem],
  )
  const updateCustomerPortalCodeLineMailto = useCallback(
    (
      procedureId: string,
      codeLineId: string,
      lineSet: PortalCodeLineSet,
      mailtoId: string,
    ) => {
      const mailtoLink = normalizedProcedureMailtos.find((link) => link.id === mailtoId)
      updateCustomerPortalCodeLineItem(
        procedureId,
        codeLineId,
        {
          quickMailtoTemplateId: mailtoLink?.id ?? '',
          quickMailtoHref: mailtoLink ? buildProcedureMailtoHref(mailtoLink) : '',
          quickMailtoLabel: mailtoLink?.label.trim() ?? '',
        },
        lineSet,
      )
    },
    [normalizedProcedureMailtos, updateCustomerPortalCodeLineItem],
  )
  const handleAddPortalProcedure = useCallback(() => {
    const id = createId('portal')
    updateCustomerPortalCodes([
      ...customerPortalCodes,
      {
        id,
        procedureName: '',
        codes: [createEmptyPortalCodeLine()],
        hasVariant: false,
        variantCodes: [],
      },
    ])
    setSelectedPortalProcedureId(id)
    setPortalProcedureVersionMode('main')
    setPortalProcedureEditorOpen(true)
  }, [customerPortalCodes, updateCustomerPortalCodes])
  const handleRemovePortalProcedure = useCallback(
    (procedureId: string) => {
      const next = customerPortalCodes.filter((entry) => entry.id !== procedureId)
      updateCustomerPortalCodes(next)
      if (selectedPortalProcedureId === procedureId) {
        setSelectedPortalProcedureId(next[0]?.id ?? null)
        setPortalProcedureVersionMode('main')
        setPortalProcedureEditorOpen(false)
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
    const handleDoubleClick = () => {
      window.requestAnimationFrame(trimDoubleClickSelection)
    }
    document.addEventListener('dblclick', handleDoubleClick, true)
    return () => document.removeEventListener('dblclick', handleDoubleClick, true)
  }, [])

  useEffect(() => {
    if (activeCategoryId === 'all') return
    if (categoryIdSet.has(activeCategoryId)) return
    setActiveCategoryId('all')
  }, [activeCategoryId, categoryIdSet])

  useEffect(() => {
    if (activeTemplateCategoryId === 'favorites' || activeTemplateCategoryId === 'all') return
    if (mailTemplateCategories.some((category) => category.id === activeTemplateCategoryId)) {
      return
    }
    setActiveTemplateCategoryId('all')
  }, [activeTemplateCategoryId, mailTemplateCategories])

  useEffect(() => {
    if (editSnippetCategoryId === 'all') return
    if (categoryIdSet.has(editSnippetCategoryId)) return
    setEditSnippetCategoryId('all')
  }, [editSnippetCategoryId, categoryIdSet])

  useEffect(() => {
    if (activeTaskCategoryId === 'favorites' || activeTaskCategoryId === 'all') return
    if (taskTemplateCategories.some((category) => category.id === activeTaskCategoryId)) return
    setActiveTaskCategoryId(taskTemplateCategories[0]?.id ?? 'favorites')
  }, [activeTaskCategoryId, taskTemplateCategories])

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

  const templateBrowserCategories = useMemo(
    () => [
      {
        id: 'favorites',
        name: 'Favoris',
        count: data.templates.filter((template) => template.favorite).length,
      },
      ...mailTemplateCategories.map((category) => ({
        ...category,
        count: data.templates.filter((template) => template.categoryId === category.id).length,
      })),
      {
        id: 'all',
        name: 'Tous',
        count: data.templates.length,
      },
    ],
    [data.templates, mailTemplateCategories],
  )
  const templateBrowserTemplates = useMemo(() => {
    const query = templateQuery.trim().toLowerCase()
    const base =
      activeTemplateCategoryId === 'favorites'
        ? data.templates.filter((template) => template.favorite)
        : activeTemplateCategoryId === 'all'
        ? data.templates
        : data.templates.filter((template) => template.categoryId === activeTemplateCategoryId)
    if (!query) return base
    return data.templates.filter(
      (template) =>
        template.name.toLowerCase().includes(query) ||
        template.content.toLowerCase().includes(query),
    )
  }, [activeTemplateCategoryId, data.templates, templateQuery])

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
  const categoryPreviewSnippets = useMemo(
    () => data.snippets.filter((snippet) => snippet.categoryId === categoryDraft.id),
    [categoryDraft.id, data.snippets],
  )

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
    if (snippetActiveField === 'task') {
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
    const sectionId = taskTemplateActiveField
    const sectionIndex = getTaskSectionIndex(sectionId)
    const sections = normalizeTaskTemplateSections(taskDraft)
    const value = sections[sectionIndex] ?? ''
    const target = { current: taskTemplateSectionRefs.current[sectionId] }
    insertTokenAtCursor(
      target,
      value,
      (next) =>
        setTaskDraft((prev) => {
          const nextSections = normalizeTaskTemplateSections(prev)
          nextSections[sectionIndex] = next
          return {
            ...prev,
            taskSections: nextSections,
            content: buildTaskTemplateContent({ ...prev, taskSections: nextSections }),
          }
        }),
      token,
    )
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

  const insertProcedureStepsLink = (mailtoLink: ProcedureMailtoLink | null) => {
    const target = procedureStepsRef.current
    const value = procedureDraft.steps
    const start = target?.selectionStart ?? value.length
    const end = target?.selectionEnd ?? value.length
    const selection = value.slice(start, end) || 'texte'
    const nextHref = mailtoLink ? buildProcedureMailtoHref(mailtoLink) : 'mailto:?subject=Objet&body=Message'
    const next = `${value.slice(0, start)}[${selection}](${nextHref})${value.slice(end)}`
    setProcedureDraft((prev) => ({ ...prev, steps: next }))
    setProcedureActiveField('steps')
    requestAnimationFrame(() => {
      const urlStart = start + selection.length + 3
      const urlEnd = urlStart + nextHref.length
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

  const taskBrowserCategories = useMemo(
    () =>
      [
        {
          id: 'favorites',
          name: 'Favoris',
          count: data.taskTemplates.filter((task) => task.favorite).length,
        },
        ...taskTemplateCategories.map((category) => ({
          ...category,
          count: data.taskTemplates.filter((task) => task.categoryId === category.id).length,
        })),
        {
          id: 'all',
          name: 'Tous',
          count: data.taskTemplates.length,
        },
      ],
    [data.taskTemplates, taskTemplateCategories],
  )
  const taskTemplateResults = useMemo(() => {
    const query = taskQuery.trim().toLowerCase()
    if (!taskFocused && !query) return []
    const base =
      activeTaskCategoryId === 'favorites'
        ? data.taskTemplates.filter((task) => task.favorite)
        : activeTaskCategoryId === 'all'
        ? data.taskTemplates
        : data.taskTemplates.filter((task) => task.categoryId === activeTaskCategoryId)
    if (!query) return base
    return data.taskTemplates.filter(
      (task) =>
        task.name.toLowerCase().includes(query) ||
        task.content.toLowerCase().includes(query),
    )
  }, [activeTaskCategoryId, taskFocused, taskQuery, data.taskTemplates])

  const taskHeadingProtectedRanges = useMemo(
    () =>
      taskDraftSkeletonEnabled
        ? getTaskHeadingProtectedRanges(data.taskDraft, taskSectionNames)
        : [],
    [data.taskDraft, taskDraftSkeletonEnabled, taskSectionNames],
  )

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

  const normalizeTaskDraftWithCursor = useCallback(
    (value: string, cursor: number, useSkeleton: boolean) => {
      const marker = '\uE000'
      const safeCursor = Math.max(0, Math.min(cursor, value.length))
      const markedValue = `${value.slice(0, safeCursor)}${marker}${value.slice(safeCursor)}`
      const structuredNext = useSkeleton ? ensureStructuredTaskDraft(markedValue, taskSectionNames) : markedValue
      const timelineNext = useSkeleton
        ? normalizeTaskDraftNumbering(structuredNext, taskMailNumber, taskSectionNames)
        : structuredNext
      const normalizedMarkedValue = normalizeTokenSpacing(timelineNext)
      const nextCursor = normalizedMarkedValue.indexOf(marker)
      return {
        value: normalizedMarkedValue.replace(marker, ''),
        cursor: nextCursor === -1 ? safeCursor : nextCursor,
      }
    },
    [taskMailNumber, taskSectionNames],
  )

  const updateTaskDraft = useCallback(
    (next: string, cursor?: number, useSkeleton = taskDraftSkeletonEnabled) => {
      const structuredNext = useSkeleton ? ensureStructuredTaskDraft(next, taskSectionNames) : next
      const timelineNext = useSkeleton
        ? normalizeTaskDraftNumbering(structuredNext, taskMailNumber, taskSectionNames)
        : structuredNext
      if (cursor !== undefined) {
        const normalized = normalizeTaskDraftWithCursor(next, cursor, useSkeleton)
        setData((prev) => ({ ...prev, taskDraft: normalized.value }))
        requestAnimationFrame(() =>
          taskEditorRef.current?.setSelection(normalized.cursor, normalized.cursor),
        )
        return
      }
      const normalized = normalizeTokenSpacing(timelineNext)
      setData((prev) => ({ ...prev, taskDraft: normalized }))
    },
    [
      normalizeTaskDraftWithCursor,
      taskDraftSkeletonEnabled,
      taskMailNumber,
      taskSectionNames,
    ],
  )

  useEffect(() => {
    if (!taskDraftSkeletonEnabled) return
    setData((prev) => {
      const nextTaskDraft = normalizeTaskDraftNumbering(
        ensureStructuredTaskDraft(prev.taskDraft, taskSectionNames),
        taskMailNumber,
        taskSectionNames,
      )
      if (nextTaskDraft === prev.taskDraft) return prev
      return { ...prev, taskDraft: nextTaskDraft }
    })
  }, [taskDraftSkeletonEnabled, taskMailNumber, taskSectionNames])

  const hasTaskBoxContent = useCallback(
    (task: string, index: number) => {
      const normalized = stripTokenSpacing(task)
      return taskBoxUsesSkeleton(index)
        ? hasMeaningfulTaskContent(normalized, taskSectionNames)
        : Boolean(normalized.trim())
    },
    [taskSectionNames],
  )

  const getTaskBoxStorageValue = useCallback(
    (value: string, index: number) => {
      const normalized = stripTokenSpacing(value)
      if (!hasTaskBoxContent(normalized, index)) return ''
      if (taskBoxUsesSkeleton(index)) {
        return ensureStructuredTaskDraft(normalized, taskSectionNames)
      }
      if (hasRecognizedTaskHeadings(normalized, taskSectionNames)) {
        return buildTaskTemplateContent({
          taskSections: parseStructuredTaskDraft(normalized, taskSectionNames),
        })
      }
      return normalized.trim()
    },
    [hasTaskBoxContent, taskSectionNames],
  )

  const getTaskBoxesSnapshot = useCallback(
    (currentTask: string = data.taskDraft) =>
      Array.from({ length: 2 }, (_, index) => {
        const source = index === activeTaskBoxIndex ? currentTask : taskDraftBoxes[index]?.task ?? ''
        return {
          task: getTaskBoxStorageValue(source, index),
          savedAt: taskDraftBoxes[index]?.savedAt ?? '',
        }
      }),
    [activeTaskBoxIndex, data.taskDraft, getTaskBoxStorageValue, taskDraftBoxes],
  )

  const insertTaskText = useCallback(
    (text: string, sectionId?: TaskSectionId) => {
      if (!text.trim()) return
      // Snippet task fragments always land in the skeleton task (box 0). If the
      // free box is open, switch back to the skeleton box before inserting.
      const skeletonIndex = TASK_SKELETON_BOX_INDEX
      const snapshot = getTaskBoxesSnapshot()
      const skeletonSource = ensureStructuredTaskDraft(
        snapshot[skeletonIndex]?.task ?? '',
        taskSectionNames,
      )
      const sectionIndex = getTaskSectionIndex(sectionId)
      const currentSection =
        parseStructuredTaskDraft(skeletonSource, taskSectionNames)[sectionIndex] ?? ''
      // Timeline steps carry the mail number (dedup per number); other sections
      // hold the plain fragment (dedup ignoring any number).
      const isTimeline = sectionIndex === 1
      const alreadyPresent = isTimeline
        ? taskSectionHasNumberedFragment(currentSection, text, taskMailNumber)
        : taskSectionHasFragment(currentSection, text)
      const fragment = isTimeline ? annotateTaskFragment(text, taskMailNumber) : text
      const next = alreadyPresent
        ? skeletonSource
        : insertTaskTextInSection(skeletonSource, fragment, sectionId, taskSectionNames)

      if (activeTaskBoxIndex !== skeletonIndex) {
        setTaskDraftBoxes(
          snapshot.map((slot, index) =>
            index === skeletonIndex
              ? { ...slot, task: getTaskBoxStorageValue(next, skeletonIndex) }
              : slot,
          ),
        )
        setActiveTaskBoxIndex(skeletonIndex)
      }
      setTaskDraftSkeletonEnabled(true)
      updateTaskDraft(next, next.length, true)
    },
    [
      activeTaskBoxIndex,
      getTaskBoxesSnapshot,
      getTaskBoxStorageValue,
      taskMailNumber,
      taskSectionNames,
      updateTaskDraft,
    ],
  )

  const handleTaskPaste = useCallback(
    (event: ClipboardEvent<HTMLTextAreaElement>) => {
      const text = event.clipboardData.getData('text/plain')
      if (!text.trim()) return

      const useSkeleton =
        taskBoxUsesSkeleton(activeTaskBoxIndex) && hasRecognizedTaskHeadings(text, taskSectionNames)
      if (!useSkeleton) return

      event.preventDefault()
      setTaskMailNumber(getNextTaskMailNumber(text))
      const { contents, leadingContent } = parseStructuredTaskDraftWithLeadingContent(
        text,
        taskSectionNames,
      )
      const next = `${leadingContent}${buildStructuredTaskDraft(
        contents,
        taskSectionNames,
      )}`
      setTaskDraftSkeletonEnabled(true)
      updateTaskDraft(next, next.length, true)
    },
    [activeTaskBoxIndex, taskSectionNames, updateTaskDraft],
  )

  const buildDraftBoxPreviewHtml = useCallback((slot: DraftBoxSlot) => {
    const email = stripTokenSpacing(slot.email).trim()
    const savedTaskBoxes = (slot.taskBoxes ?? []).map((box) => stripTokenSpacing(box.task).trim())
    const filledTaskBoxes = savedTaskBoxes
      .map((boxTask, index) => ({ task: boxTask, index }))
      .filter(({ task: boxTask, index }) => hasTaskBoxContent(boxTask, index))
    // Legacy slots stored only the active task — fall back to it when no box is filled.
    const fallbackIndex = slot.activeTaskBoxIndex ?? 0
    const fallbackTask = stripTokenSpacing(slot.task).trim()
    const hasFallbackTask =
      !filledTaskBoxes.length && hasTaskBoxContent(fallbackTask, fallbackIndex)

    if (!email && !filledTaskBoxes.length && !hasFallbackTask) {
      return '<div class="draft-box-tooltip__empty">Aucun contenu sauvegardé.</div>'
    }

    const sections: string[] = []
    const pushSection = (label: string, content: string) => {
      if (!content.trim()) return
      sections.push(`
        <div class="draft-box-tooltip__section">
          <div class="draft-box-tooltip__label">${label}</div>
          <div class="draft-box-tooltip__content">${highlightTextPreview(content)}</div>
        </div>
      `)
    }
    if (email) {
      pushSection('Mail', email)
    }
    filledTaskBoxes.forEach(({ task: boxTask, index }) => {
      pushSection(
        taskBoxUsesSkeleton(index) ? 'Task formatée' : 'Task libre',
        buildCompactTaskPreviewText(boxTask, index, taskSectionNames),
      )
    })
    if (hasFallbackTask) {
      pushSection(
        taskBoxUsesSkeleton(fallbackIndex) ? 'Task formatée' : 'Task libre',
        buildCompactTaskPreviewText(fallbackTask, fallbackIndex, taskSectionNames),
      )
    }
    return sections.join('')
  }, [hasTaskBoxContent, taskSectionNames])

  const buildTaskBoxPreviewHtml = useCallback(
    (slot: TaskBoxSlot, index: number) => {
      const task = stripTokenSpacing(slot.task).trim()
      if (!hasTaskBoxContent(task, index)) {
        return '<div class="draft-box-tooltip__empty">Aucune task sauvegardée.</div>'
      }
      return `
        <div class="draft-box-tooltip__section">
          <div class="draft-box-tooltip__label">Task ${
            taskBoxUsesSkeleton(index) ? 'formatée' : 'libre'
          }</div>
          <div class="draft-box-tooltip__content">${highlightTextPreview(
            buildCompactTaskPreviewText(task, index, taskSectionNames),
          )}</div>
        </div>
      `
    },
    [hasTaskBoxContent, taskSectionNames],
  )

  const closeDraftBoxTooltip = useCallback(() => {
    setDraftBoxTooltip(null)
  }, [])

  const openTaskBox = useCallback(
    (index: number) => {
      if (index === activeTaskBoxIndex) return
      const nextBoxes = getTaskBoxesSnapshot()
      const useSkeleton = taskBoxUsesSkeleton(index)
      const nextTask = nextBoxes[index]?.task ?? ''
      setTaskDraftBoxes(nextBoxes)
      setActiveTaskBoxIndex(index)
      setTaskDraftSkeletonEnabled(useSkeleton)
      updateTaskDraft(nextTask, nextTask.length, useSkeleton)
      // Switching task boxes must not change the mail counter (it would look
      // like a freshly pasted skeleton and bump the number).
      closeDraftBoxTooltip()
      requestAnimationFrame(() => taskEditorRef.current?.focus())
    },
    [activeTaskBoxIndex, closeDraftBoxTooltip, getTaskBoxesSnapshot, updateTaskDraft],
  )

  const handleDraftBoxHover = useCallback(
    (index: number, event: MouseEvent<HTMLButtonElement>) => {
      const slot = draftBoxes[index]
      if (
        !slot ||
        (!slot.email.trim() &&
          !hasTaskBoxContent(slot.task, slot.activeTaskBoxIndex ?? 0) &&
          !(slot.taskBoxes ?? []).some((box, boxIndex) =>
            hasTaskBoxContent(box.task, boxIndex),
          ))
      ) {
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
    [buildDraftBoxPreviewHtml, draftBoxes, hasTaskBoxContent],
  )

  const handleTaskBoxHover = useCallback(
    (index: number, event: MouseEvent<HTMLButtonElement>) => {
      const slot = taskDraftBoxes[index]
      const task = index === activeTaskBoxIndex ? data.taskDraft : slot?.task ?? ''
      if (!slot || !hasTaskBoxContent(task, index)) {
        setDraftBoxTooltip(null)
        return
      }

      const rect = event.currentTarget.getBoundingClientRect()
      setDraftBoxTooltip({
        index,
        x: rect.left + rect.width / 2,
        y: rect.bottom + 10,
        previewHtml: buildTaskBoxPreviewHtml({ ...slot, task }, index),
      })
    },
    [activeTaskBoxIndex, buildTaskBoxPreviewHtml, data.taskDraft, hasTaskBoxContent, taskDraftBoxes],
  )

  const handleDraftBoxClick = useCallback(
    (index: number) => {
      const slot = draftBoxes[index]
      if (!slot) return

      const savedActiveTaskIndex = Math.max(0, Math.min(1, slot.activeTaskBoxIndex ?? 0))
      const hasSavedTask = hasTaskBoxContent(slot.task, savedActiveTaskIndex)
      const hasSavedTaskBoxes = (slot.taskBoxes ?? []).some((box, boxIndex) =>
        hasTaskBoxContent(box.task, boxIndex),
      )
      const hasSavedContent = Boolean(slot.email.trim() || hasSavedTask || hasSavedTaskBoxes)
      if (hasSavedContent) {
        const restoredTaskBoxes = Array.from({ length: 2 }, (_, taskBoxIndex) => ({
          ...createEmptyTaskBoxSlot(),
          ...(slot.taskBoxes?.[taskBoxIndex] ?? {}),
        }))
        const activeTask = restoredTaskBoxes[savedActiveTaskIndex]?.task || slot.task || ''
        const useSkeleton = taskBoxUsesSkeleton(savedActiveTaskIndex)
        updateEmailDraft(slot.email, slot.email.length)
        setTaskDraftBoxes(restoredTaskBoxes)
        setActiveTaskBoxIndex(savedActiveTaskIndex)
        setTaskDraftSkeletonEnabled(useSkeleton)
        updateTaskDraft(activeTask, activeTask.length, useSkeleton)
        // Restoring a stored task keeps its existing number — it is the same
        // task coming back out of the box, not a freshly pasted one (which
        // would advance to the next number).
        setTaskMailNumber(Math.max(1, getHighestTaskMailNumber(activeTask)))
        requestAnimationFrame(() => {
          setDraftBoxes((prev) =>
            prev.map((item, slotIndex) =>
              slotIndex === index ? createEmptyDraftBoxSlot() : item,
            ),
          )
        })
        closeDraftBoxTooltip()
        return
      }

      const nextEmail = data.emailDraft
      const nextTaskBoxes = getTaskBoxesSnapshot()
      const activeTask = nextTaskBoxes[activeTaskBoxIndex]?.task ?? ''
      const hasNextTaskContent = hasTaskBoxContent(activeTask, activeTaskBoxIndex)
      const hasNextTaskBoxContent = nextTaskBoxes.some((slot, boxIndex) =>
        hasTaskBoxContent(slot.task, boxIndex),
      )
      if (!nextEmail.trim() && !hasNextTaskContent && !hasNextTaskBoxContent) {
        setToast('Ajoutez du texte avant de le stocker.')
        return
      }

      const savedAt = new Date().toISOString()
      setDraftBoxes((prev) =>
        prev.map((item, slotIndex) =>
          slotIndex === index
            ? {
                email: nextEmail,
                task: hasNextTaskContent ? activeTask : '',
                taskSkeletonEnabled: taskBoxUsesSkeleton(activeTaskBoxIndex),
                taskBoxes: nextTaskBoxes,
                activeTaskBoxIndex,
                savedAt,
              }
            : item,
        ),
      )
      updateEmailDraft('')
      const useActiveSkeleton = taskBoxUsesSkeleton(activeTaskBoxIndex)
      setTaskDraftSkeletonEnabled(useActiveSkeleton)
      updateTaskDraft('', undefined, useActiveSkeleton)
      setTaskMailNumber(1)
      setTaskDraftBoxes(Array.from({ length: 2 }, createEmptyTaskBoxSlot))
      closeDraftBoxTooltip()
    },
    [
      closeDraftBoxTooltip,
      activeTaskBoxIndex,
      data.emailDraft,
      draftBoxes,
      getTaskBoxesSnapshot,
      hasTaskBoxContent,
      updateEmailDraft,
      updateTaskDraft,
    ],
  )

  const updateCallDraft = useCallback((next: string, cursor?: number) => {
    if (cursor !== undefined) {
      const normalized = normalizeDraftWithCursor(next, cursor)
      setCallDraft(normalized.value)
      if (!currentCallMemoryLocked) {
        setCurrentCallMemory(normalized.value)
      }
      requestAnimationFrame(() =>
        callEditorRef.current?.setSelection(normalized.cursor, normalized.cursor),
      )
      return
    }
    const normalized = normalizeTokenSpacing(next)
    setCallDraft(normalized)
    if (!currentCallMemoryLocked) {
      setCurrentCallMemory(normalized)
    }
  }, [currentCallMemoryLocked, normalizeDraftWithCursor])

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
      const payload = event.data as { type?: string; taskText?: string; taskSectionId?: TaskSectionId } | null
      if (!payload || payload.type !== 'procedure:import-task') return
      if (!payload.taskText?.trim()) return
      const nextTaskDraft = insertTaskTextInSection(
        '',
        payload.taskText,
        payload.taskSectionId,
        taskSectionNames,
      )
      updateTaskDraft(nextTaskDraft, nextTaskDraft.length)
      setTaskQuery('')
      setTaskFocused(false)
      setTaskListKey((prev) => prev + 1)
    }
    return () => channel.close()
  }, [isProcedureWindow, taskSectionNames, updateTaskDraft])

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

  const updateTaskTemplateSectionDraft = (sectionId: TaskSectionId, value: string) => {
    const sectionIndex = getTaskSectionIndex(sectionId)
    setTaskDraft((prev) => {
      const nextSections = normalizeTaskTemplateSections(prev)
      nextSections[sectionIndex] = value
      return {
        ...prev,
        taskSections: nextSections,
        content: buildTaskTemplateContent({ ...prev, taskSections: nextSections }),
      }
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
      insertTaskText(snippet.taskText, snippet.taskSectionId)
    }
  }

  const applyTaskTemplate = (template: TaskTemplate) => {
    const nextTaskDraft = buildTaskTemplateContent(template)
    const snapshot = getTaskBoxesSnapshot()
    setTaskDraftBoxes(
      snapshot.map((slot, index) =>
        index === TASK_FREE_BOX_INDEX ? { ...slot, task: nextTaskDraft } : slot,
      ),
    )
    setActiveTaskBoxIndex(TASK_FREE_BOX_INDEX)
    setTaskDraftSkeletonEnabled(false)
    updateTaskDraft(nextTaskDraft, nextTaskDraft.length, false)
    requestAnimationFrame(() => taskEditorRef.current?.focus())
  }

  const openTemplatePreview = (template: MailTemplate) => {
    const taskSections = getTemplateTaskSections(template, data.taskTemplates)
    const hasTaskContent = taskSections.some((section) => section.trim())
    setTemplatePreview({
      templateId: template.id,
      selectedEmailLines: getTemplateEmailLines(template).map((line) => Boolean(line.trim())),
      selectedTaskSections: taskSections.map((section) => Boolean(section.trim())),
      importTask: hasTaskContent,
    })
  }

  const toggleTemplateFavorite = (templateId: string) => {
    setData((prev) => ({
      ...prev,
      templates: prev.templates.map((template) =>
        template.id === templateId ? { ...template, favorite: !template.favorite } : template,
      ),
    }))
  }

  const toggleTaskTemplateFavorite = (taskId: string) => {
    setData((prev) => ({
      ...prev,
      taskTemplates: prev.taskTemplates.map((task) =>
        task.id === taskId ? { ...task, favorite: !task.favorite } : task,
      ),
    }))
  }

  const importTemplatePreview = () => {
    if (!templatePreview) return
    const template = data.templates.find((item) => item.id === templatePreview.templateId)
    if (!template) return

    const emailLines = getTemplateEmailLines(template)
      .filter((_, index) => templatePreview.selectedEmailLines[index])
      .join('\n')
      .trim()

    if (emailLines) updateEmailDraft(padEmptySelectors(emailLines), emailLines.length)

    if (templatePreview.importTask) {
      const templateUsesCustomTask =
        template.taskCustom ?? (!!template.taskText && !template.taskTemplateId)
      const taskSections = getTemplateTaskSections(template, data.taskTemplates).map((section, index) =>
        templatePreview.selectedTaskSections[index] ? section : '',
      )
      if (templateUsesCustomTask) {
        const timelineText = taskSections.filter((section) => section.trim()).join('\n')
        insertTaskText(timelineText, 'section-2')
      } else {
        const nextTaskDraft = buildTaskTemplateContent({ taskSections })
        const snapshot = getTaskBoxesSnapshot()
        setTaskDraftBoxes(
          snapshot.map((slot, index) =>
            index === TASK_FREE_BOX_INDEX ? { ...slot, task: nextTaskDraft } : slot,
          ),
        )
        setActiveTaskBoxIndex(TASK_FREE_BOX_INDEX)
        setTaskDraftSkeletonEnabled(false)
        updateTaskDraft(nextTaskDraft, nextTaskDraft.length, false)
      }
    }

    setTemplatePreview(null)
    closeTemplateSearch()
    requestAnimationFrame(() => emailEditorRef.current?.focus())
  }

  const getProcedureTaskText = (procedure: Procedure) => {
    const usesCustom =
      procedure.taskCustom ?? (!!procedure.taskText && !procedure.taskTemplateId)
    if (usesCustom) return procedure.taskText ?? ''
    if (!procedure.taskTemplateId) return ''
    return data.taskTemplates.find((task) => task.id === procedure.taskTemplateId)?.content ?? ''
  }

  const getProcedureTaskSectionId = (procedure: Procedure) => {
    const usesCustom =
      procedure.taskCustom ?? (!!procedure.taskText && !procedure.taskTemplateId)
    if (usesCustom) return normalizeTaskSectionId(procedure.taskSectionId)
    if (!procedure.taskTemplateId) return 'section-1'
    return normalizeTaskSectionId(
      data.taskTemplates.find((task) => task.id === procedure.taskTemplateId)?.taskSectionId,
    )
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

    const useSkeleton = taskBoxUsesSkeleton(activeTaskBoxIndex)
    const hasContent = useSkeleton
      ? hasMeaningfulTaskContent(data.taskDraft, taskSectionNames)
      : Boolean(stripTokenSpacing(data.taskDraft).trim())
    if (!hasContent) return
    const cleaned = useSkeleton
      ? formatTaskCopyText(data.taskDraft, taskSectionNames, taskMailNumber)
      : stripTokenSpacing(data.taskDraft).trim()
    const didCopy = await copyText(cleaned, buildExportHtml(cleaned))
    if (!didCopy) {
      setToast('Copie impossible.')
      return
    }
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
    field: DashboardCalculatorPriceField,
    value: string,
  ) => {
    setDashboardCalculatorItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    )
  }

  const adjustDashboardCalculatorQuantity = (id: string, delta: number) => {
    setDashboardCalculatorItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: getDashboardCalculatorQuantity((item.quantity || 1) + delta),
            }
          : item,
      ),
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

  const handleCopyDashboardDecoration = async (item: DashboardDecorationItem) => {
    const value = item.content.trimEnd()
    if (!value.trim()) return
    const didCopy = await copyText(value)
    if (!didCopy) {
      setToast('Copie impossible.')
      return
    }
    if (dashboardDecorationCopyTimeoutRef.current) {
      window.clearTimeout(dashboardDecorationCopyTimeoutRef.current)
    }
    setDashboardDecorationCopiedId(item.id)
    dashboardDecorationCopyTimeoutRef.current = window.setTimeout(
      () => setDashboardDecorationCopiedId((current) => (current === item.id ? null : current)),
      1600,
    )
  }

  const openCallModal = () => {
    const initialCallDraft = normalizeTokenSpacing(callTemplate)
    callModalBackdropPointerDownRef.current = false
    setCallDraft(initialCallDraft)
    setCurrentCallMemory(initialCallDraft)
    setCurrentCallMemoryLocked(false)
    setSelectedCallHistoryId(null)
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
    persistCallDraft(currentCallMemoryLocked ? currentCallMemory : undefined)
    if (callCopyTimeoutRef.current !== null) {
      window.clearTimeout(callCopyTimeoutRef.current)
      callCopyTimeoutRef.current = null
    }
    setCallModalOpen(false)
    setCallCopied(false)
    setCurrentCallMemoryLocked(false)
    setSelectedCallHistoryId(null)
    setCallEntryId(null)
    setCallOpenedAt(null)
  }

  const handleCopyCall = async () => {
    const content = normalizeCallDraftForCopy(callDraft)
    if (!content.trim()) return
    if (callCopyTimeoutRef.current !== null) {
      window.clearTimeout(callCopyTimeoutRef.current)
    }

    persistCallDraft(currentCallMemoryLocked ? currentCallMemory : undefined)
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
    if (!name) {
      markSettingsValidationTouched('dashboardProduct')
      setToast('Nom obligatoire.')
      return
    }
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
    setSelectedDashboardProductId(id)
    setDashboardProductDraft(savedProduct)
    clearSettingsValidationTouched('dashboardProduct')
    setToast('Élément catalogue enregistré.')
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
    if (!name) {
      markSettingsValidationTouched('product')
      setToast('Nom obligatoire.')
      return
    }

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
    setSelectedProductCatalogId(id)
    setProductDraft(savedProduct)
    setProductTagsDraftText((savedProduct.tags ?? []).join(', '))
    clearSettingsValidationTouched('product')
    setToast('Produit enregistré.')
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
    if (dashboardNewsDraftIssues.length) {
      markSettingsValidationTouched('dashboardNews')
      setToast(dashboardNewsDraftIssues[0])
      return
    }
    const title = dashboardNewsDraft.title.trim()

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
    clearSettingsValidationTouched('dashboardNews')
    setToast('News enregistrée.')
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

  const renderIssueBadge = (issues: string[]) =>
    issues.length ? (
      <span className="settings-issue-badge" title={issues.join('\n')}>
        Incomplet
      </span>
    ) : null

  const renderValidationIssues = (scope: SettingsValidationScope, issues: string[]) =>
    settingsValidationTouched[scope] && issues.length ? (
      <div className="settings-validation" role="alert">
        {issues.map((issue) => (
          <span key={issue}>{issue}</span>
        ))}
      </div>
    ) : null

  const renderPortalCodeEditorSettings = () => {
    const selectedPortalProcedure =
      customerPortalCodes.find((entry) => entry.id === selectedPortalProcedureId) ??
      customerPortalCodes[0] ??
      null
    const resolvedSelectedPortalProcedureId = selectedPortalProcedure?.id ?? null
    const portalEditorUsesVariant = Boolean(
      selectedPortalProcedure?.hasVariant && portalProcedureVersionMode === 'variant',
    )
    const portalEditorLineSet: PortalCodeLineSet = portalEditorUsesVariant
      ? 'variantCodes'
      : 'codes'
    const portalEditorLines = selectedPortalProcedure
      ? portalEditorUsesVariant
        ? selectedPortalProcedure.variantCodes ?? []
        : selectedPortalProcedure.codes
      : []
    const portalMainVersionName = selectedPortalProcedure?.mainVersionName?.trim() || 'Version 1'
    const portalVariantVersionName =
      selectedPortalProcedure?.variantVersionName?.trim() || 'Alternative'
    const portalEditorVersionLabel = portalEditorUsesVariant
      ? portalVariantVersionName
      : portalMainVersionName

    return (
      <div className={`portal-code-editor${portalProcedureEditorOpen ? ' is-editing' : ''}`}>
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
                      onClick={() => {
                        setSelectedPortalProcedureId(item.id)
                        setPortalProcedureVersionMode('main')
                      }}
                    >
                      <button
                        className="drag-handle"
                        type="button"
                        {...handleProps.attributes}
                        {...handleProps.listeners}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <MoveIcon />
                      </button>
                      <div className="list-item__content">
                        <div className="list-item__title">
                          {item.procedureName.trim() || 'Procédure sans nom'}
                        </div>
                        <div className="list-item__meta">
                          {item.codes.length} étape{item.codes.length > 1 ? 's' : ''} • Draft{' '}
                          {procedureHasDraft ? 'oui' : 'non'} • Forward{' '}
                          {item.showForward ? 'oui' : 'non'} • Toggle{' '}
                          {item.hasVariant ? 'oui' : 'non'}
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
                            <DeleteIcon />
                        </button>
                      </div>
                    </div>
                  )
                }}
              />
            </div>

            <div className="portal-code-editor__preview">
              {selectedPortalProcedure ? (
                <div className="portal-code-editor__preview-inner">
                  <div className="portal-code-editor__preview-head">
                    <div>
                      <div className="portal-code-editor__preview-title">
                        {selectedPortalProcedure.procedureName.trim() || 'Procédure sans nom'}
                      </div>
                      <div className="list-item__meta">
                        {selectedPortalProcedure.codes.length} étape
                        {selectedPortalProcedure.codes.length > 1 ? 's' : ''} •{' '}
                        {formatPortalForwardLabel(selectedPortalProcedure, 'Forward non')}
                      </div>
                    </div>
                    <button
                      className="btn btn--ghost btn--small btn--with-icon"
                      type="button"
                      onClick={() => setPortalProcedureEditorOpen(true)}
                    >
                      <ButtonIcon name="edit" />
                      Modifier
                    </button>
                  </div>
                  <div className="portal-code-editor__preview-steps">
                    {selectedPortalProcedure.codes.map((line, index) => (
                      <article className="portal-code-editor__preview-step" key={line.id}>
                        <div className="portal-code-editor__preview-step-title">
                          {formatPortalTimelineTitle(line.title ?? '') ||
                            `Étape ${index + 1}`}
                        </div>
                        <div className="list-item__meta">
                          {line.showDraft ? 'Draft • ' : ''}
                          {line.quickLinkUrl?.trim() ? 'Lien rapide • ' : ''}
                          {line.quickCopyText?.trim() ? 'Texte à copier • ' : ''}
                          {line.quickMailtoTemplateId?.trim() || line.quickMailtoHref?.trim() ? 'Mailto • ' : ''}
                          {line.code.trim() ? `Code ${line.code.trim()}` : 'Aucun code'}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="empty-state">Sélectionnez une procédure pour afficher l’aperçu.</div>
              )}
            </div>

            <div className="dashboard-product-editor__form">
              {selectedPortalProcedure ? (
                <div className="portal-code-editor__modal">
                  <header className="portal-code-editor__modal-head">
                    <div className="portal-code-editor__title-field">
                      <span className="settings-label">Définition d'une procédure</span>
                      <input
                        className="input"
                        value={selectedPortalProcedure.procedureName}
                        placeholder="Titre de la procédure"
                        onChange={(event) =>
                          updateCustomerPortalProcedure(selectedPortalProcedure.id, {
                            procedureName: event.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="portal-code-editor__variant-panel">
                      <div className="portal-code-editor__variant-head">
                        <div className="portal-code-editor__variant-copy">
                          <span>Variantes</span>
                          <small>
                            {selectedPortalProcedure.hasVariant
                              ? 'Deux jeux d’étapes peuvent être nommés et édités séparément.'
                              : 'Activez une variante pour gérer une seconde version de la procédure.'}
                          </small>
                        </div>
                        <button
                          type="button"
                          className={`portal-code-editor__switch${
                            selectedPortalProcedure.hasVariant ? ' is-on' : ''
                          }`}
                          onClick={() => {
                            const hasVariant = !selectedPortalProcedure.hasVariant
                            setPortalProcedureVersionMode(hasVariant ? 'variant' : 'main')
                            updateCustomerPortalProcedure(selectedPortalProcedure.id, {
                              hasVariant,
                              variantCodes: hasVariant
                                ? selectedPortalProcedure.variantCodes?.length
                                  ? selectedPortalProcedure.variantCodes
                                  : [createEmptyPortalCodeLine()]
                                : selectedPortalProcedure.variantCodes ?? [],
                            })
                          }}
                          aria-pressed={Boolean(selectedPortalProcedure.hasVariant)}
                        >
                          <span className="portal-code-editor__switch-label">
                            {selectedPortalProcedure.hasVariant ? 'Activé' : 'Inactif'}
                          </span>
                          <span className="portal-code-editor__switch-track">
                            <span className="portal-code-editor__switch-thumb" />
                          </span>
                        </button>
                      </div>

                      {selectedPortalProcedure.hasVariant ? (
                        <>
                          <div className="portal-code-editor__version-names">
                            <label className="portal-code-editor__version-name-field">
                              <span>Version principale</span>
                              <input
                                className="input"
                                value={selectedPortalProcedure.mainVersionName ?? ''}
                                placeholder="Ex. Windows"
                                onChange={(event) =>
                                  updateCustomerPortalProcedure(selectedPortalProcedure.id, {
                                    mainVersionName: event.target.value,
                                  })
                                }
                              />
                            </label>
                            <label className="portal-code-editor__version-name-field">
                              <span>Variante</span>
                              <input
                                className="input"
                                value={selectedPortalProcedure.variantVersionName ?? ''}
                                placeholder="Ex. macOS"
                                onChange={(event) =>
                                  updateCustomerPortalProcedure(selectedPortalProcedure.id, {
                                    variantVersionName: event.target.value,
                                  })
                                }
                              />
                            </label>
                          </div>
                          <div className="portal-code-editor__version-tabs" role="tablist">
                            <button
                              className={`portal-code-editor__version-tab${
                                portalProcedureVersionMode === 'main' ? ' is-active' : ''
                              }`}
                              type="button"
                              onClick={() => setPortalProcedureVersionMode('main')}
                            >
                              {portalMainVersionName}
                            </button>
                            <button
                              className={`portal-code-editor__version-tab${
                                portalProcedureVersionMode === 'variant' ? ' is-active' : ''
                              }`}
                              type="button"
                              onClick={() => setPortalProcedureVersionMode('variant')}
                            >
                              {portalVariantVersionName}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="portal-code-editor__variant-empty">
                          Une seule version est utilisée pour le moment.
                        </div>
                      )}
                    </div>

                    <button
                      className="btn btn--ghost btn--small"
                      type="button"
                      onClick={() => setPortalProcedureEditorOpen(false)}
                    >
                      Fermer
                    </button>
                  </header>

                  <section className="portal-code-editor__timeline-section">
                    <div className="portal-code-editor__section-head">
                      <div>
                        <div className="portal-code-editor__section-title">
                          {portalEditorVersionLabel}
                        </div>
                        <div className="list-item__meta">
                          {portalEditorUsesVariant
                            ? 'Étapes de la variante activée.'
                            : 'Étapes de la version par défaut.'}
                        </div>
                      </div>
                    </div>

                    <div className="portal-code-editor__timeline">
                      {portalEditorLines.map((codeLine, index) => {
                        const visibleModules = portalVisibleLineModules[codeLine.id] ?? {}
                        const codeVisible = Boolean(codeLine.code.trim()) || Boolean(visibleModules.code)
                        const quickLinkVisible =
                          Boolean(codeLine.quickLinkUrl?.trim()) || Boolean(visibleModules.quickLink)
                        const quickCopyVisible =
                          Boolean(codeLine.quickCopyText?.trim()) || Boolean(visibleModules.quickCopy)
                        const mailtoVisible =
                          Boolean(codeLine.quickMailtoTemplateId?.trim()) ||
                          Boolean(codeLine.quickMailtoHref?.trim()) || Boolean(visibleModules.mailto)
                        const selectedMailtoTemplate =
                          normalizedProcedureMailtos.find(
                            (link) => link.id === codeLine.quickMailtoTemplateId?.trim(),
                          ) ??
                          normalizedProcedureMailtos.find(
                            (link) =>
                              buildProcedureMailtoHref(link) ===
                              (codeLine.quickMailtoHref?.trim() ?? ''),
                          ) ??
                          null
                        const selectedMailtoId = selectedMailtoTemplate?.id ?? ''

                        return (
                          <article className="portal-code-editor__timeline-item" key={codeLine.id}>
                            <div className="portal-code-editor__timeline-marker">
                              <span>{index + 1}</span>
                            </div>
                            <div className="portal-code-editor__code-card">
                              <div className="portal-code-editor__step-head">
                                <div className="portal-code-editor__step-title-row">
                                  <span className="list-item__meta">
                                    {formatPortalTimelineTitle(codeLine.title ?? '') ||
                                      `Étape ${index + 1}`}
                                  </span>
                                  {codeLine.showDraft ? (
                                    <span className="portal-code-editor__draft-pill">Draft</span>
                                  ) : null}
                                </div>
                                {portalEditorLines.length > 1 ? (
                                  <button
                                    className="icon-btn-sm danger"
                                    type="button"
                                    title="Supprimer cette étape"
                                    onClick={() =>
                                      removeCustomerPortalCodeLine(
                                        selectedPortalProcedure.id,
                                        codeLine.id,
                                        portalEditorLineSet,
                                      )
                                    }
                                  >
                                    <DeleteIcon />
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
                                    portalEditorLineSet,
                                  )
                                }
                              />

                              <textarea
                                className="textarea portal-code-editor__note"
                                value={codeLine.infoNote ?? ''}
                                placeholder="Contenu de l'étape"
                                onChange={(event) =>
                                  updateCustomerPortalCodeLineItem(
                                    selectedPortalProcedure.id,
                                    codeLine.id,
                                    {
                                      infoNote: event.target.value,
                                    },
                                    portalEditorLineSet,
                                  )
                                }
                              />

                              <div className="portal-code-editor__step-tools">
                                <label className="portal-code-editor__draft-toggle">
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
                                        portalEditorLineSet,
                                      )
                                    }
                                  />
                                  <span>Draft</span>
                                </label>

                                <div className="portal-code-editor__add-modules" aria-label="Modules d'étape">
                                  {!codeVisible ? (
                                    <button
                                      className="portal-code-editor__add-module"
                                      type="button"
                                      onClick={() => showCustomerPortalCodeLineModule(codeLine.id, 'code')}
                                    >
                                      <AddIcon />
                                      <span>Code</span>
                                    </button>
                                  ) : null}
                                  {!quickLinkVisible ? (
                                    <button
                                      className="portal-code-editor__add-module"
                                      type="button"
                                      onClick={() =>
                                        showCustomerPortalCodeLineModule(codeLine.id, 'quickLink')
                                      }
                                    >
                                      <AddIcon />
                                      <span>Lien</span>
                                    </button>
                                  ) : null}
                                  {!quickCopyVisible ? (
                                    <button
                                      className="portal-code-editor__add-module"
                                      type="button"
                                      onClick={() =>
                                        showCustomerPortalCodeLineModule(codeLine.id, 'quickCopy')
                                      }
                                    >
                                      <AddIcon />
                                      <span>Copie</span>
                                    </button>
                                  ) : null}
                                  {!mailtoVisible ? (
                                    <button
                                      className="portal-code-editor__add-module"
                                      type="button"
                                      onClick={() => showCustomerPortalCodeLineModule(codeLine.id, 'mailto')}
                                    >
                                      <AddIcon />
                                      <span>Mailto</span>
                                    </button>
                                  ) : null}
                                </div>
                              </div>

                              <div className="portal-code-editor__modules">
                                {codeVisible ? (
                                  <div className="portal-code-editor__module">
                                    <div className="portal-code-editor__module-head">
                                      <span>Code à copier</span>
                                      <button
                                        className="icon-btn-sm"
                                        type="button"
                                        title="Retirer le code"
                                        onClick={() =>
                                          hideCustomerPortalCodeLineModule(
                                            selectedPortalProcedure.id,
                                            codeLine.id,
                                            'code',
                                            portalEditorLineSet,
                                          )
                                        }
                                      >
                                        <CloseIcon />
                                      </button>
                                    </div>
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
                                          portalEditorLineSet,
                                        )
                                      }
                                    />
                                  </div>
                                ) : null}

                                {quickLinkVisible ? (
                                  <div className="portal-code-editor__module">
                                    <div className="portal-code-editor__module-head">
                                      <span>Lien rapide</span>
                                      <button
                                        className="icon-btn-sm"
                                        type="button"
                                        title="Retirer le lien"
                                        onClick={() =>
                                          hideCustomerPortalCodeLineModule(
                                            selectedPortalProcedure.id,
                                            codeLine.id,
                                            'quickLink',
                                            portalEditorLineSet,
                                          )
                                        }
                                      >
                                        <CloseIcon />
                                      </button>
                                    </div>
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
                                          portalEditorLineSet,
                                        )
                                      }
                                    />
                                  </div>
                                ) : null}

                                {quickCopyVisible ? (
                                  <div className="portal-code-editor__module">
                                    <div className="portal-code-editor__module-head">
                                      <span>Texte de copie rapide</span>
                                      <button
                                        className="icon-btn-sm"
                                        type="button"
                                        title="Retirer le texte"
                                        onClick={() =>
                                          hideCustomerPortalCodeLineModule(
                                            selectedPortalProcedure.id,
                                            codeLine.id,
                                            'quickCopy',
                                            portalEditorLineSet,
                                          )
                                        }
                                      >
                                        <CloseIcon />
                                      </button>
                                    </div>
                                    <textarea
                                      className="textarea portal-code-editor__quick-copy"
                                      value={codeLine.quickCopyText ?? ''}
                                      placeholder="Texte à copier en un clic"
                                      onChange={(event) =>
                                        updateCustomerPortalCodeLineItem(
                                          selectedPortalProcedure.id,
                                          codeLine.id,
                                          {
                                            quickCopyText: event.target.value,
                                          },
                                          portalEditorLineSet,
                                        )
                                      }
                                    />
                                  </div>
                                ) : null}

                                {mailtoVisible ? (
                                  <div className="portal-code-editor__module">
                                    <div className="portal-code-editor__module-head">
                                      <span>Mailto rapide</span>
                                      <button
                                        className="icon-btn-sm"
                                        type="button"
                                        title="Retirer le mailto"
                                        onClick={() =>
                                          hideCustomerPortalCodeLineModule(
                                            selectedPortalProcedure.id,
                                            codeLine.id,
                                            'mailto',
                                            portalEditorLineSet,
                                          )
                                        }
                                      >
                                        <CloseIcon />
                                      </button>
                                    </div>
                                    <div className="portal-code-editor__mailto-grid">
                                      <select
                                        className="select select--compact"
                                        value={selectedMailtoId}
                                        onChange={(event) =>
                                          updateCustomerPortalCodeLineMailto(
                                            selectedPortalProcedure.id,
                                            codeLine.id,
                                            portalEditorLineSet,
                                            event.target.value,
                                          )
                                        }
                                      >
                                        <option value="">Choisir un template mailto...</option>
                                        {normalizedProcedureMailtos.map((link) => (
                                          <option key={link.id} value={link.id}>
                                            {link.label}
                                          </option>
                                        ))}
                                      </select>
                                      <div className="portal-code-editor__mailto-preview">
                                        {selectedMailtoTemplate ? (
                                          <>
                                            <span>{selectedMailtoTemplate.to || 'Destinataire non renseigné'}</span>
                                            <strong>{selectedMailtoTemplate.subject || 'Titre non renseigné'}</strong>
                                          </>
                                        ) : (
                                          <span>Template défini dans Paramètres &gt; Templates mailto.</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ) : null}
                              </div>

                            </div>
                          </article>
                        )
                      })}

                      <div className="portal-code-editor__timeline-add">
                        <button
                          className="portal-code-editor__add-step"
                          type="button"
                          onClick={() =>
                            addCustomerPortalCodeLine(
                              selectedPortalProcedure.id,
                              portalEditorLineSet,
                            )
                          }
                        >
                          <AddIcon />
                        </button>
                      </div>
                    </div>
                  </section>

                  <section className="portal-code-editor__forward-final">
                    <div className="portal-code-editor__switch-row">
                      <span>Forward final</span>
                      <button
                        type="button"
                        className={`portal-code-editor__switch${
                          selectedPortalProcedure.showForward ? ' is-on' : ''
                        }`}
                        onClick={() => {
                          const showForward = !selectedPortalProcedure.showForward
                          updateCustomerPortalProcedure(selectedPortalProcedure.id, {
                            showForward,
                            forwardTarget: showForward
                              ? selectedPortalProcedure.forwardTarget ?? ''
                              : '',
                          })
                        }}
                        aria-pressed={Boolean(selectedPortalProcedure.showForward)}
                      >
                        <span className="portal-code-editor__switch-track">
                          <span className="portal-code-editor__switch-thumb" />
                        </span>
                      </button>
                    </div>
                    {selectedPortalProcedure.showForward ? (
                      <input
                        className="input"
                        value={selectedPortalProcedure.forwardTarget ?? ''}
                        placeholder="Cible du forward"
                        onChange={(event) =>
                          updateCustomerPortalProcedure(selectedPortalProcedure.id, {
                            forwardTarget: event.target.value,
                          })
                        }
                      />
                    ) : null}
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
    items,
    defaultCategory,
    categoryOptions,
    emptyListMessage,
    emptySelectionMessage,
    latestVersionPlaceholder,
  }: {
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
            <div className="list-card__title">Réglages</div>
          </div>
          <div className="list-card__tools">
            <button
              className="btn btn--ghost btn--small btn--with-icon"
              type="button"
              onClick={() => {
                clearSettingsValidationTouched('dashboardProduct')
                setDashboardProductDraft(getEmptyDashboardProductDraft(defaultCategory))
                setSelectedDashboardProductId('new')
              }}
            >
              <ButtonIcon name="add" />
              Nouveau
            </button>
            <button
              className="btn btn--primary btn--small btn--with-icon"
              type="button"
              onClick={handleSaveDashboardProduct}
            >
              <ButtonIcon name="save" />
              Sauver
            </button>
          </div>
        </div>
        <div className="list-card__body">
          <div className="dashboard-product-editor">
            <div className="dashboard-product-editor__list">
              {items.length ? (
                items.map((product) => {
                  const issues = getDashboardProductIssues(product)
                  return (
                    <div
                      key={product.id}
                      className={`list-item list-item--compact${
                        selectedDashboardProductId === product.id ? ' is-selected' : ''
                      }${issues.length ? ' is-incomplete' : ''}`}
                      onClick={() => {
                        clearSettingsValidationTouched('dashboardProduct')
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
                        <div className="list-item__title">{product.name || 'Élément sans nom'}</div>
                        <div className="list-item__meta">
                          {dashboardProductCategoryLabels[product.category]}
                          {product.latestVersion.trim() ? ` • ${product.latestVersion.trim()}` : ''}
                        </div>
                        {renderIssueBadge(issues)}
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
                            <DeleteIcon />
                        </button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="empty-state">{emptyListMessage}</div>
              )}
            </div>

            <div className="dashboard-product-editor__form">
              {!selectionVisible || isDashboardProductSelectionEmpty ? (
                <div className="empty-state">{emptySelectionMessage}</div>
              ) : (
                <div className="form">
                  {renderValidationIssues('dashboardProduct', dashboardProductDraftIssues)}
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
    const useSkeleton = taskBoxUsesSkeleton(activeTaskBoxIndex)
    setTaskDraftSkeletonEnabled(useSkeleton)
    updateTaskDraft('', undefined, useSkeleton)
    setTaskDraftBoxes((prev) =>
      prev.map((slot, index) => (index === activeTaskBoxIndex ? createEmptyTaskBoxSlot() : slot)),
    )
    setTaskMailNumber(1)
    setTaskClearArmed(false)
  }

  const handleClearData = () => {
    if (!clearAllArmed) {
      setClearAllArmed(true)
      window.setTimeout(() => setClearAllArmed(false), 2400)
      return
    }
    const currentZoom = data.settings.zoom
    const nextData = JSON.parse(JSON.stringify(defaultData)) as AppData
    nextData.settings.zoom = currentZoom
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
      taskSectionId: 'section-3',
      taskOptional: false,
      categoryId: '',
    })
    setTemplateDraft({
      id: '',
      name: '',
      content: '',
      language: 'fr',
      categoryId: defaultData.settings.mailTemplateCategories[0]?.id ?? '',
      favorite: false,
      taskText: '',
      taskSectionId: 'section-3',
      taskOptional: false,
      taskTemplateId: '',
      taskCustom: false,
    })
    setTaskDraft({
      id: '',
      name: '',
      content: '',
      taskSections: ['', '', '', ''],
      taskSectionId: 'section-3',
      categoryId: defaultData.settings.taskTemplateCategories[0]?.id ?? '',
      favorite: false,
    })
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
      taskSectionId: 'section-3',
    })
    setProcedureInfoDraft('')
    setDraftBoxes(Array.from({ length: 3 }, createEmptyDraftBoxSlot))
    setTaskDraftBoxes(Array.from({ length: 2 }, createEmptyTaskBoxSlot))
    setActiveTaskBoxIndex(0)
    setTaskDraftSkeletonEnabled(true)
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
    setDashboardProcedureVariant('complete')
    setDashboardProductQuery('')
    setDashboardSparePartQuery('')
    setSnippetTooltip(null)
    setMailInsertMode('line')
    setSelectedPortalProcedureId(null)
    setPortalProcedureEditorOpen(false)
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
    if (categoryDraftIssues.length) {
      markSettingsValidationTouched('category')
      setToast(categoryDraftIssues[0])
      return
    }
    const exists = data.categories.some((category) => category.id === categoryDraft.id)
    const id = exists ? categoryDraft.id : createId('cat')
    const savedCategory = { ...categoryDraft, id, name: categoryDraft.name.trim() }
    setData((prev) => {
      const next = exists
        ? prev.categories.map((category) =>
            category.id === id ? savedCategory : category,
          )
        : [...prev.categories, savedCategory]
      return { ...prev, categories: next }
    })
    setCategoryDraft(savedCategory)
    setSelectedCategoryId(id)
    clearSettingsValidationTouched('category')
    setToast('Catégorie enregistrée.')
  }

  const handleSnippetSave = () => {
    if (snippetDraftIssues.length) {
      markSettingsValidationTouched('snippet')
      setToast(snippetDraftIssues[0])
      return
    }
    const categoryId = categoryIdSet.has(snippetDraft.categoryId)
      ? snippetDraft.categoryId
      : data.categories[0]?.id ?? ''
    if (!categoryId && categoryIdSet.size > 0) {
      markSettingsValidationTouched('snippet')
      setToast('Catégorie obligatoire.')
      return
    }
    const exists = data.snippets.some((snippet) => snippet.id === snippetDraft.id)
    const id = exists ? snippetDraft.id : createId('snip')
    const savedSnippet = {
      ...snippetDraft,
      id,
      title: snippetDraft.title.trim(),
      content: snippetDraft.content.trim(),
      taskText: snippetDraft.taskText?.trim() ?? '',
      taskSectionId: normalizeTaskSectionId(snippetDraft.taskSectionId),
      categoryId,
    }
    setData((prev) => {
      const next = exists
        ? prev.snippets.map((snippet) =>
            snippet.id === id ? savedSnippet : snippet,
          )
        : [...prev.snippets, savedSnippet]
      return { ...prev, snippets: next }
    })
    setSnippetDraft(savedSnippet)
    setSelectedSnippetId(id)
    clearSettingsValidationTouched('snippet')
    setToast('Snippet enregistré.')
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
    if (templateDraftIssues.length) {
      markSettingsValidationTouched('template')
      setToast(templateDraftIssues[0])
      return
    }
    const exists = data.templates.some((template) => template.id === templateDraft.id)
    const id = exists ? templateDraft.id : createId('tmpl')
    const savedTemplate = {
      ...templateDraft,
      id,
      name: templateDraft.name.trim(),
      content: templateDraft.content.trim(),
      categoryId: templateDraft.categoryId?.trim() || mailTemplateCategories[0]?.id || '',
      favorite: Boolean(templateDraft.favorite),
      taskText: templateDraft.taskText?.trim() ?? '',
      taskSectionId: normalizeTaskSectionId(templateDraft.taskSectionId),
    }
    setData((prev) => {
      const next = exists
        ? prev.templates.map((template) => (template.id === id ? savedTemplate : template))
        : [...prev.templates, savedTemplate]
      return { ...prev, templates: next }
    })
    setTemplateDraft(savedTemplate)
    setSelectedTemplateId(id)
    clearSettingsValidationTouched('template')
    setToast('Template mail enregistré.')
  }

  const handleTaskTemplateSave = () => {
    if (taskDraftIssues.length) {
      markSettingsValidationTouched('task')
      setToast(taskDraftIssues[0])
      return
    }
    const exists = data.taskTemplates.some((task) => task.id === taskDraft.id)
    const id = exists ? taskDraft.id : createId('task')
    const taskSections = normalizeTaskTemplateSections(taskDraft).map((section) => section.trim())
    const savedTask = {
      ...taskDraft,
      id,
      name: taskDraft.name.trim(),
      categoryId: taskDraft.categoryId?.trim() || taskTemplateCategories[0]?.id || '',
      taskSections,
      content: buildTaskTemplateContent({ ...taskDraft, taskSections }).trim(),
      taskSectionId: 'section-1' as TaskSectionId,
      favorite: Boolean(taskDraft.favorite),
    }
    setData((prev) => {
      const next = exists
        ? prev.taskTemplates.map((task) => (task.id === id ? savedTask : task))
        : [...prev.taskTemplates, savedTask]
      return { ...prev, taskTemplates: next }
    })
    setTaskDraft(savedTask)
    setSelectedTaskId(id)
    clearSettingsValidationTouched('task')
    setToast('Template task enregistré.')
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
    const tooltipWidth = 280
    const gutter = 12
    let x = rect.right + gutter
    if (x + tooltipWidth > window.innerWidth - gutter) {
      x = rect.left - tooltipWidth - gutter
    }
    setSnippetTooltip({
      text: snippet.content,
      x,
      y: rect.top,
      anchorTop: rect.top,
      anchorBottom: rect.bottom,
    })
  }

  const hideSnippetTooltip = () => setSnippetTooltip(null)

  const openLink = (url: string) => {
    const normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http') && !normalizedUrl.startsWith('mailto:')) return
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
  const procedureTaskSectionId = activeProcedure
    ? getProcedureTaskSectionId(activeProcedure)
    : 'section-1'
  const dashboardCalculatorEntries = dashboardCalculatorItems.map((item) => ({
    ...item,
    quantity: getDashboardCalculatorQuantity(item.quantity),
    productAmount:
      (parseDashboardAmount(item.productPrice) ?? 0) *
      getDashboardCalculatorQuantity(item.quantity),
    shippingAmount: parseDashboardAmount(item.shippingPrice) ?? 0,
    importFeeAmount: parseDashboardAmount(item.importFee) ?? 0,
  }))
  const dashboardProductsTotalTtc = dashboardCalculatorEntries.reduce(
    (sum, item) => sum + item.productAmount,
    0,
  )
  const dashboardShippingValues = dashboardCalculatorEntries
    .flatMap((item) => {
      const shippingValue = item.shippingAmount + item.importFeeAmount
      if (shippingValue <= 0) return []
      return Array(item.quantity).fill(shippingValue)
    })
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
  // The badge reflects the note on the news/notes dashboard page itself, and
  // only when it holds real text (invisible token chars don't count).
  const dashboardNotesHasContent = stripTokenSpacing(dashboardReminders).trim().length > 0

  const renderDashboardPageButton = (
    page: (typeof workspaceDashboardPageOptions)[number],
    tabIndex?: number,
  ) => (
    <button
      key={page.id}
      type="button"
      className={`dashboard-page-btn${workspaceDashboardPage === page.id ? ' is-active' : ''}`}
      title={page.title}
      aria-label={page.title}
      tabIndex={tabIndex}
      onClick={() => handleSelectWorkspaceDashboardPage(page.id)}
    >
      <UiIcon name={page.icon} className="dashboard-page-btn__icon" />
      {page.id === 'tools' && dashboardNotesHasContent ? (
        <span className="dashboard-page-btn__badge" aria-hidden="true" />
      ) : null}
    </button>
  )

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

  const renderWorkspaceDashboardNewsNotesPanel = (title: string) => (
    <article className="workspace-dashboard__panel workspace-dashboard__panel--news-notes">
      <div className="workspace-dashboard__panel-title">{title}</div>
      <div className="workspace-dashboard__news-notes-grid">
        <div className="dashboard-news-notes__panel dashboard-news-notes__panel--notes">
          <div className="dashboard-news-notes__editor">
            <textarea
              className="textarea dashboard-news-notes__textarea"
              value={dashboardReminders}
              placeholder="Ajoutez vos notes libres..."
              onChange={(event) => updateSettings({ dashboardReminders: event.target.value })}
              onBlur={(event) => {
                // A note made only of spaces or invisible characters is noise:
                // clear it so the badge doesn't light up for nothing.
                if (!stripTokenSpacing(event.target.value).trim()) {
                  updateSettings({ dashboardReminders: '' })
                }
              }}
            />
            <button
              type="button"
              className="note-clear-btn dashboard-news-notes__clear"
              onClick={() => updateSettings({ dashboardReminders: '' })}
              title="Effacer la note"
              aria-label="Effacer la note"
            >
              <CloseIcon />
            </button>
          </div>
        </div>
        <div className="dashboard-news-notes__panel dashboard-news-notes__panel--news">
          <div className="dashboard-news-list dashboard-news-list--stacked">
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
              <div className="dashboard-empty">Aucune news configurée.</div>
            )}
          </div>
        </div>
      </div>
    </article>
  )

  const renderWorkspaceDashboardDecorationsPanel = (title: string) => (
    <article className="workspace-dashboard__panel workspace-dashboard__panel--decorations">
      <div className="workspace-dashboard__panel-title">
        <span>{title}</span>
        <button
          type="button"
          className="btn btn--ghost btn--small btn--with-icon"
          onClick={openDashboardDecorationComposer}
        >
          <ButtonIcon name="add" />
          Ajouter
        </button>
      </div>
      {dashboardDecorationComposerOpen ? (
        <div className="dashboard-decoration-composer">
          <textarea
            ref={dashboardDecorationDraftRef}
            className="textarea dashboard-decoration-composer__input"
            value={dashboardDecorationDraft}
            onChange={(event) => setDashboardDecorationDraft(event.target.value)}
            placeholder="ASCII à copier rapidement"
            rows={2}
          />
          <div className="dashboard-decoration-composer__actions">
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={closeDashboardDecorationComposer}
            >
              Annuler
            </button>
            <button type="button" className="btn btn--small" onClick={addDashboardDecoration}>
              Ajouter
            </button>
          </div>
        </div>
      ) : null}
      <div className="dashboard-decorations">
        {dashboardDecorations.length ? (
          dashboardDecorations.map((item) => (
            <div className="dashboard-decoration-item" key={item.id}>
              <button
                type="button"
                className="icon-btn-sm danger dashboard-decoration-item__delete"
                title="Supprimer"
                onClick={() => deleteDashboardDecoration(item.id)}
              >
                <DeleteIcon />
              </button>
              <pre className="dashboard-decoration-item__preview">
                {item.content.trimEnd() || ' '}
              </pre>
              <button
                type="button"
                className={`btn btn--small dashboard-decoration-item__copy${
                  dashboardDecorationCopiedId === item.id ? ' is-success' : ''
                }`}
                onClick={() => void handleCopyDashboardDecoration(item)}
              >
                {dashboardDecorationCopiedId === item.id ? 'Copié' : 'Copier'}
              </button>
            </div>
          ))
        ) : (
          <div className="dashboard-empty">Aucun décor configuré.</div>
        )}
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
                  <div
                    className="dashboard-calculator__quantity"
                    aria-label={`Quantité ligne ${index + 1}`}
                  >
                    <button
                      className="dashboard-calculator__quantity-btn"
                      type="button"
                      title="Réduire la quantité"
                      aria-label={`Réduire la quantité ligne ${index + 1}`}
                      onClick={() => adjustDashboardCalculatorQuantity(item.id, -1)}
                      disabled={getDashboardCalculatorQuantity(item.quantity) <= 1}
                    >
                      -
                    </button>
                    <span className="dashboard-calculator__quantity-value">
                      x{getDashboardCalculatorQuantity(item.quantity)}
                    </span>
                    <button
                      className="dashboard-calculator__quantity-btn"
                      type="button"
                      title="Augmenter la quantité"
                      aria-label={`Augmenter la quantité ligne ${index + 1}`}
                      onClick={() => adjustDashboardCalculatorQuantity(item.id, 1)}
                      disabled={getDashboardCalculatorQuantity(item.quantity) >= 99}
                    >
                      +
                    </button>
                  </div>
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
                    <DeleteIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            className="btn btn--ghost btn--small btn--with-icon dashboard-calculator__add"
            type="button"
            onClick={addDashboardCalculatorItem}
          >
            <ButtonIcon name="add" />
            Ajouter une ligne
          </button>
        </div>

        <div className="dashboard-calculator__results">
          <div className="dashboard-calculator__result">
            <div className="dashboard-calculator__result-head">
              <span className="dashboard-calculator__result-label">Produits</span>
            </div>
            <div className="dashboard-calculator__result-values">
              <div className="dashboard-calculator__result-value dashboard-calculator__result-value--ht">
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
              <div className="dashboard-calculator__result-value dashboard-calculator__result-value--ttc">
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
              <div className="dashboard-calculator__result-value dashboard-calculator__result-value--ht">
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
              <div className="dashboard-calculator__result-value dashboard-calculator__result-value--ttc">
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
              <div className="dashboard-calculator__result-value dashboard-calculator__result-value--ht">
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
              <div className="dashboard-calculator__result-value dashboard-calculator__result-value--ttc">
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
                <div className="dashboard-product-title-section">
                  <div className="dashboard-product-title">
                    {activeDashboardCatalogProduct.name}
                  </div>
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
              </div>

              <div className="dashboard-product-editions-section">
                <div className="dashboard-section-label">Édition</div>
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
                  <div className="dashboard-product-platform">
                    <span>Plate-forme :</span>
                    <strong>{productEditionPlatformLabels[activeDashboardCatalogEdition.platform]}</strong>
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
    const hasPortalProcedureVariant = Boolean(
      activeDashboardPortalProcedure?.hasVariant &&
        (activeDashboardPortalProcedure.variantCodes ?? []).length,
    )
    const isLightProcedureVariant =
      hasPortalProcedureVariant && dashboardProcedureVariant === 'light'
    const activePortalMainVersionName =
      activeDashboardPortalProcedure?.mainVersionName?.trim() || 'Principal'
    const activePortalVariantVersionName =
      activeDashboardPortalProcedure?.variantVersionName?.trim() || 'Variante'
    const visiblePortalSteps = isLightProcedureVariant
      ? activeDashboardPortalProcedure?.variantCodes ?? []
      : activeDashboardPortalProcedure?.codes ?? []

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
                const procedureHasVariant = Boolean(
                  procedure.hasVariant && (procedure.variantCodes ?? []).length,
                )

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
                      Draft {procedureHasDraft ? 'oui' : 'non'} -{' '}
                      {procedureHasVariant ? 'Toggle oui' : 'Toggle non'} -{' '}
                      {procedureForwardLabel}
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
                  <div className="dashboard-portal-procedure-header__top">
                    <div className="dashboard-portal-procedure-title">
                      {activePortalProcedureName}
                    </div>
                    {hasPortalProcedureVariant ? (
                      <div className="dashboard-portal-procedure-header__tools">
                        <div className="dashboard-portal-procedure-variant">
                          <button
                            type="button"
                            className={`dashboard-portal-procedure-switch${
                              isLightProcedureVariant ? ' is-on' : ''
                            }`}
                            onClick={() =>
                              setDashboardProcedureVariant(
                                isLightProcedureVariant ? 'complete' : 'light',
                              )
                            }
                            aria-pressed={isLightProcedureVariant}
                            aria-label="Basculer la variante de procédure"
                          >
                            <span className="dashboard-portal-procedure-switch__track">
                              <span className="dashboard-portal-procedure-switch__thumb" />
                            </span>
                          </button>
                          <div className="dashboard-portal-procedure-variant__label">
                            Mode{' '}
                            {isLightProcedureVariant
                              ? activePortalVariantVersionName
                              : activePortalMainVersionName}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {showPortalForwardIndicator ? (
                    <div className="dashboard-portal-procedure-indicators dashboard-portal-procedure-indicators--full">
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
                      const quickMailtoTemplate =
                        normalizedProcedureMailtos.find(
                          (link) => link.id === entry.quickMailtoTemplateId?.trim(),
                        ) ??
                        normalizedProcedureMailtos.find(
                          (link) => buildProcedureMailtoHref(link) === (entry.quickMailtoHref?.trim() ?? ''),
                        ) ??
                        null
                      const quickMailtoHref = quickMailtoTemplate
                        ? buildProcedureMailtoHref(quickMailtoTemplate)
                        : entry.quickMailtoHref?.trim() ?? ''
                      const quickMailtoLabel =
                        quickMailtoTemplate?.label.trim() || entry.quickMailtoLabel?.trim() || 'Mailto'

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
                              </div>
                              <div className="dashboard-portal-step__actions-inline">
                                {quickMailtoHref ? (
                                  <button
                                    className="dashboard-portal-step__link-btn dashboard-portal-step__link-btn--mailto"
                                    type="button"
                                    onClick={() => void openExternal(quickMailtoHref)}
                                    aria-label={`Ouvrir le mailto ${quickMailtoLabel}`}
                                    title={quickMailtoLabel}
                                  >
                                    @
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
                          {quickCopyText && !isLightProcedureVariant ? (
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
                    {showPortalForwardIndicator ? (
                      <div className="dashboard-portal-forward-final">
                        <span>{activePortalForwardLabel}</span>
                      </div>
                    ) : null}
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

  const renderWorkspaceDashboardContent = () => {
    if (workspaceDashboardPage === 'tools') {
      return (
        <div className="workspace-dashboard__single workspace-dashboard__single--news-notes">
          {renderWorkspaceDashboardNewsNotesPanel('News et Notes')}
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

    if (workspaceDashboardPage === 'decorations') {
      return (
        <div className="workspace-dashboard__single">
          {renderWorkspaceDashboardDecorationsPanel('Ascii Wall')}
        </div>
      )
    }

    return (
      <div className="workspace-dashboard__single">
        {renderWorkspaceDashboardNewsNotesPanel('News et Notes')}
      </div>
    )
  }

  const renderDashboardPageNavigation = () => (
    <div className="dashboard-shell__nav">
      {workspaceDashboardPageOptions.map((page) => renderDashboardPageButton(page))}
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
                    <span className="procedure-filter-btn__mark" aria-hidden="true">H</span>
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
                    <span className="procedure-filter-btn__mark" aria-hidden="true">TM</span>
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
                      <span className="procedure-item__logo" aria-hidden="true">
                        {procedure.brand === 'hercules' ? 'H' : 'TM'}
                      </span>
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
                        taskSectionId: procedureTaskSectionId,
                      })
                      channel.close()
                    }}
                    disabled={!procedureTaskText.trim()}
                  >
                    Importer la task
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
            <p className="brand-name">AGENTOR</p>
          </div>
          <div className="sidebar-top-actions">
            <button
              className="sidebar-icon-btn"
              onClick={() => setEditOpen(true)}
              title={editButtonLabel}
              aria-label={editButtonLabel}
            >
              <UiIcon name="settings" className="sidebar-icon-btn__icon" />
            </button>
          </div>
        </div>

        <div className="filter-block">
          <p className="section-label section-label--centered">
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
                      background: categoryColorMap.get(category.color) ?? '#a392d5',
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

        <p className="section-label section-label--centered section-label--snippets">
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
                    background: categoryColorById.get(snippet.categoryId) ?? '#a392d5',
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
                  placeholder="Templates / Troubleshootgun..."
                  onFocus={() => {
                    setTemplateFocused(true)
                    setTemplateBrowserView('categories')
                    setTemplateListKey((prev) => prev + 1)
                  }}
                  onBlur={() => {
                    closeTemplateSearch()
                  }}
                />
                {templateFocused ? (
                  <div
                    className="search-results search-results--templates visible"
                    key={templateListKey}
                    onMouseDown={(event) => event.preventDefault()}
                  >
                    {templateQuery.trim() || templateBrowserView === 'templates' ? (
                      <>
                        {templateBrowserView === 'templates' && !templateQuery.trim() ? (
                          <button
                            className="search-result-item search-result-item--back"
                            type="button"
                            onClick={() => setTemplateBrowserView('categories')}
                            title="Retour aux catégories"
                          >
                            <span className="search-result-back__arrow" aria-hidden="true">←</span>
                            <span className="search-result-back__label">Catégories</span>
                          </button>
                        ) : null}
                        {templateBrowserTemplates.length ? (
                          templateBrowserTemplates.map((template) => (
                            <div key={template.id} className="search-result-item search-result-item--template">
                              <button
                                className="search-result-item__main"
                                type="button"
                                onClick={() => openTemplatePreview(template)}
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
                              </button>
                              <button
                                className={`template-favorite-btn${template.favorite ? ' is-active' : ''}`}
                                type="button"
                                title={template.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                                onClick={() => toggleTemplateFavorite(template.id)}
                              >
                                ★
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="search-result-empty">Aucun template.</div>
                        )}
                      </>
                    ) : (
                      templateBrowserCategories.map((category) => (
                        <button
                          key={category.id}
                          className="search-result-item search-result-item--category"
                          type="button"
                          onClick={() => {
                            setActiveTemplateCategoryId(category.id)
                            setTemplateBrowserView('templates')
                          }}
                        >
                          <div className="result-name">
                            {category.id === 'favorites' ? (
                              <span className="category-star">★</span>
                            ) : (
                              <span
                                className="category-star category-star--spacer"
                                aria-hidden="true"
                              >
                                ★
                              </span>
                            )}
                            <span className="result-name__text">{category.name}</span>
                            <span className="category-count">({category.count})</span>
                            <span className="category-arrow">›</span>
                          </div>
                        </button>
                      ))
                    )}
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
                <UiIcon name="phone" className="call-trigger-btn__icon" />
              </button>
              <div className="draft-boxes-inline" aria-label="Boîtes de mémoire">
                {draftBoxes.map((slot, index) => {
                  const hasContent = Boolean(
                    slot.email.trim() ||
                      hasTaskBoxContent(slot.task, slot.activeTaskBoxIndex ?? 0) ||
                      (slot.taskBoxes ?? []).some((box, boxIndex) =>
                        hasTaskBoxContent(box.task, boxIndex),
                      ),
                  )
                  const currentTaskBoxes = getTaskBoxesSnapshot()
                  const isDisabled =
                    !hasContent &&
                    !data.emailDraft.trim() &&
                    !currentTaskBoxes.some((box, boxIndex) =>
                      hasTaskBoxContent(box.task, boxIndex),
                    )
                  return (
                    <button
                      key={`draft-box-${index + 1}`}
                      type="button"
                      className={`draft-box-btn${hasContent ? ' is-filled' : ''}`}
                      title={
                        hasContent
                          ? `Vider la boîte ${index + 1}`
                          : `Sauvegarder le mail et les deux tasks dans la boîte ${index + 1}`
                      }
                      aria-label={
                        hasContent
                          ? `Vider la boîte ${index + 1}`
                          : `Sauvegarder le mail et les deux tasks dans la boîte ${index + 1}`
                      }
                      aria-pressed={hasContent}
                      disabled={isDisabled}
                      onClick={() => handleDraftBoxClick(index)}
                      onMouseEnter={(event) => handleDraftBoxHover(index, event)}
                      onMouseLeave={closeDraftBoxTooltip}
                    >
                      <span className="draft-box-btn__icon" aria-hidden="true">
                        <UiIcon
                          name={hasContent ? 'folder' : 'folderOpen'}
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
                    {workspaceDashboardPageOptions.map((page) =>
                      renderDashboardPageButton(page, dashboardSectionOpen ? 0 : -1),
                    )}
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
                  <DeleteIcon />
                  <span>{clearArmed ? 'Confirmer' : 'Clear'}</span>
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
          <div className="task-builder__header">
            <div className="task-builder__header-left">
              <p className="section-label section-label--tight">
                <UiIcon name="inbox" className="section-label__icon" />
                <span>Task</span>
              </p>
            </div>
            <div className="task-builder__header-right">
              <div className="task-mail-counter" aria-label="Compteur de mail">
                <button
                  className="task-mail-counter__btn"
                  type="button"
                  title="Mail précédent"
                  aria-label="Mail précédent"
                  onClick={() => setTaskMailNumber((current) => Math.max(1, current - 1))}
                >
                  −
                </button>
                <span className="task-mail-counter__value">{taskMailNumber}</span>
                <button
                  className="task-mail-counter__btn"
                  type="button"
                  title="Mail suivant"
                  aria-label="Mail suivant"
                  onClick={() => setTaskMailNumber((current) => current + 1)}
                >
                  +
                </button>
              </div>
            </div>
          </div>
          <div className="task-template-search">
            <div className="task-search-wrap" ref={taskSearchRef}>
              <UiIcon name="search" className="search-field-icon" />
              <input
                value={taskQuery}
                onChange={(event) => setTaskQuery(event.target.value)}
                placeholder="Rechercher un template de tâche..."
                onFocus={() => {
                  setTaskFocused(true)
                  setTaskBrowserView('categories')
                  setTaskListKey((prev) => prev + 1)
                }}
                onBlur={() => {
                  closeTaskSearch()
                }}
              />
              {taskFocused ? (
                <div
                  className="search-results search-results--templates visible"
                  key={taskListKey}
                  onMouseDown={(event) => event.preventDefault()}
                >
                  {taskQuery.trim() || taskBrowserView === 'templates' ? (
                    <>
                      {taskBrowserView === 'templates' && !taskQuery.trim() ? (
                        <button
                          className="search-result-item search-result-item--back"
                          type="button"
                          onClick={() => setTaskBrowserView('categories')}
                          title="Retour aux catégories"
                        >
                          <span className="search-result-back__arrow" aria-hidden="true">←</span>
                          <span className="search-result-back__label">Catégories</span>
                        </button>
                      ) : null}
                      {taskTemplateResults.length ? (
                        taskTemplateResults.map((task) => (
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
                        ))
                      ) : (
                        <div className="search-result-empty">Aucun template.</div>
                      )}
                    </>
                  ) : (
                    taskBrowserCategories.map((category) => (
                      <button
                        key={category.id}
                        className="search-result-item search-result-item--category"
                        type="button"
                        onClick={() => {
                          setActiveTaskCategoryId(category.id)
                          setTaskBrowserView('templates')
                        }}
                        >
                          <div className="result-name">
                          {category.id === 'favorites' ? (
                            <span className="category-star">★</span>
                          ) : (
                            <span className="category-star category-star--spacer" aria-hidden="true">
                              ★
                            </span>
                          )}
                          <span className="result-name__text">{category.name}</span>
                          <span className="category-count">({category.count})</span>
                          <span className="category-arrow">›</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </div>
          </div>
          <div className="task-editor-wrapper">
            <TextEditor
              ref={taskEditorRef}
              value={data.taskDraft}
              onChange={(value) => {
                const cursor = taskEditorRef.current?.getSelection().start
                updateTaskDraft(value, cursor)
              }}
              onPaste={handleTaskPaste}
              placeholder="Écrivez vos tâches..."
              className="task-editor"
              protectedRanges={taskHeadingProtectedRanges}
              decorateTaskSkeleton={taskDraftSkeletonEnabled}
            />
          </div>
          <div className="task-actions">
            <div className="task-actions__left">
              <div className="draft-boxes-inline task-draft-boxes-inline" aria-label="Tasks">
                {taskDraftBoxes.map((slot, index) => {
                  const taskValue = index === activeTaskBoxIndex ? data.taskDraft : slot.task
                  const hasContent = hasTaskBoxContent(taskValue, index)
                  const isActive = index === activeTaskBoxIndex
                  return (
                    <button
                      key={`task-draft-box-${index + 1}`}
                      type="button"
                      className={`draft-box-btn task-draft-box-btn${hasContent ? ' is-filled' : ''}${
                        isActive ? ' is-active' : ''
                      }`}
                      title={index === 0 ? 'Task 1 avec squelette' : 'Task 2 libre sans squelette'}
                      aria-label={
                        index === 0
                          ? 'Afficher la task 1 avec squelette'
                          : 'Afficher la task 2 libre sans squelette'
                      }
                      aria-pressed={isActive}
                      onClick={() => openTaskBox(index)}
                      onMouseEnter={(event) => handleTaskBoxHover(index, event)}
                      onMouseLeave={closeDraftBoxTooltip}
                    >
                      <span className="draft-box-btn__icon" aria-hidden="true">
                        <UiIcon
                          name={taskBoxUsesSkeleton(index) ? 'template' : 'edit'}
                          className="draft-box-btn__icon-svg"
                        />
                        {hasContent ? <span className="draft-box-btn__badge">T</span> : null}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="task-actions__right">
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
                <DeleteIcon />
                <span>{taskClearArmed ? 'Confirmer' : 'Clear'}</span>
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
            ref={snippetTooltipRef}
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
        >
          <div className="modal call-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <div className="brand__title brand__title--with-icon">
                <UiIcon name="phone" className="brand__title-icon" />
                <span>Appel téléphonique</span>
              </div>
              <button className="close-modal" type="button" onClick={closeCallModal}>
                <CloseIcon />
              </button>
            </div>
            <div className="call-modal__body">
              <div className="call-modal__main">
                <div className="call-modal__editor-pane">
                  <div className="call-modal__label">Appel téléphonique</div>
                  <TextEditor
                    ref={callEditorRef}
                    value={callDraft}
                    onChange={(value) => updateCallDraft(value)}
                    placeholder="Appel téléphonique"
                    className="call-modal__editor"
                  />
                </div>
                <aside className="call-modal__history" aria-label="Derniers appels">
                  <div className="call-modal__history-title">5 derniers appels</div>
                  <div className="call-modal__history-list">
                    <button
                      className={`call-modal__history-item call-modal__history-item--current${
                        selectedCallHistoryId === null ? ' is-active' : ''
                      }`}
                      type="button"
                      onClick={() => {
                        setCallDraft(normalizeTokenSpacing(currentCallMemory))
                        setSelectedCallHistoryId(null)
                        setCurrentCallMemoryLocked(false)
                        requestAnimationFrame(() => {
                          const cursor = currentCallMemory.length
                          callEditorRef.current?.focus()
                          callEditorRef.current?.setSelection(cursor, cursor)
                        })
                      }}
                    >
                      <span>Appel en cours</span>
                      <strong>{currentCallPreview}</strong>
                    </button>
                    {callModalHistoryItems.length ? (
                      callModalHistoryItems.map((item) => (
                        <button
                          className={`call-modal__history-item${
                            selectedCallHistoryId === item.id ? ' is-active' : ''
                          }`}
                          type="button"
                          key={item.id}
                          onClick={() => {
                            if (!currentCallMemoryLocked) {
                              setCurrentCallMemory(callDraft)
                              setCurrentCallMemoryLocked(true)
                            }
                            setCallDraft(normalizeTokenSpacing(item.content))
                            setSelectedCallHistoryId(item.id)
                            requestAnimationFrame(() => callEditorRef.current?.focus())
                          }}
                        >
                          <span>{formatHistoryTimestamp(item.createdAt)}</span>
                          <strong>{item.content.split(/\r?\n/)[0]?.trim() || 'Appel'}</strong>
                        </button>
                      ))
                    ) : (
                      <div className="call-modal__history-empty">Aucun appel enregistré.</div>
                    )}
                  </div>
                </aside>
              </div>
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


    {templatePreview ? (() => {
      const template = data.templates.find((item) => item.id === templatePreview.templateId)
      if (!template) return null
      const emailLines = getTemplateEmailLines(template)
      const taskSections = getTemplateTaskSections(template, data.taskTemplates)
      const templateUsesCustomTask =
        template.taskCustom ?? (!!template.taskText && !template.taskTemplateId)
      return (
        <div className="modal-backdrop">
          <div className="modal troubleshootgun-preview-modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <div className="modal__title-group">
                <div className="brand__title brand__title--with-icon">
                  <UiIcon name="template" className="brand__title-icon" />
                  <span>{template.name}</span>
                </div>
                <div className="modal__subtitle">
                  {templateUsesCustomTask
                    ? 'Le texte de task sera ajouté à la timeline du squelette.'
                    : 'La task complète sera placée dans la task libre.'}
                </div>
              </div>
              <button
                className="close-modal close-modal--subtle"
                type="button"
                onClick={() => setTemplatePreview(null)}
              >
                <CloseIcon />
              </button>
            </div>
            <div className="troubleshootgun-preview-modal__body">
              <div className="troubleshootgun-preview-modal__grid">
                <section className="troubleshootgun-preview-modal__section">
                  <div className="troubleshootgun-preview-modal__label">Mail</div>
                  <div className="troubleshootgun-preview-sections">
                    {emailLines.map((line, index) =>
                      !line.trim() ? null : (
                        <label className="troubleshootgun-preview-section" key={`${line}-${index}`}>
                          <input
                            type="checkbox"
                            checked={Boolean(templatePreview.selectedEmailLines[index])}
                            onChange={(event) =>
                              setTemplatePreview((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      selectedEmailLines: prev.selectedEmailLines.map((checked, lineIndex) =>
                                        lineIndex === index ? event.target.checked : checked,
                                      ),
                                    }
                                  : prev,
                              )
                            }
                          />
                          <span className="troubleshootgun-preview-section__body">
                            <span
                              className="troubleshootgun-preview-modal__content"
                              dangerouslySetInnerHTML={{
                                __html: highlightText(line.trim()),
                              }}
                            />
                          </span>
                        </label>
                      )
                    )}
                  </div>
                </section>
                <section
                  className={`troubleshootgun-preview-modal__section troubleshootgun-preview-modal__section--task${
                    templatePreview.importTask ? '' : ' is-disabled'
                  }`}
                >
                  <div className="troubleshootgun-preview-modal__label troubleshootgun-preview-modal__label--task">
                    <span>Task</span>
                    <label className="import-task-toggle">
                      <input
                        type="checkbox"
                        checked={templatePreview.importTask}
                        onChange={(event) =>
                          setTemplatePreview((prev) =>
                            prev ? { ...prev, importTask: event.target.checked } : prev,
                          )
                        }
                      />
                      <span>{templateUsesCustomTask ? 'Ajouter à la timeline' : 'Importer en libre'}</span>
                    </label>
                  </div>
                  <div className="troubleshootgun-preview-sections">
                    {TASK_SECTION_IDS.map((sectionId, index) => (
                      <label className="troubleshootgun-preview-section" key={sectionId}>
                        <input
                          type="checkbox"
                          checked={
                            templatePreview.importTask &&
                            Boolean(templatePreview.selectedTaskSections[index])
                          }
                          disabled={!templatePreview.importTask || !taskSections[index]?.trim()}
                          onChange={(event) =>
                            setTemplatePreview((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    selectedTaskSections: prev.selectedTaskSections.map((checked, sectionIndex) =>
                                      sectionIndex === index ? event.target.checked : checked,
                                    ),
                                  }
                                : prev,
                            )
                          }
                        />
                        <span className="troubleshootgun-preview-section__body">
                          <strong>
                            {templateUsesCustomTask
                              ? 'Timeline'
                              : getTaskSectionLabel(sectionId, taskSectionNames)}
                          </strong>
                          <span
                            className="troubleshootgun-preview-modal__content"
                            dangerouslySetInnerHTML={{
                              __html: highlightText(taskSections[index]?.trim() || 'Section vide'),
                            }}
                          />
                        </span>
                      </label>
                    ))}
                  </div>
                </section>
              </div>
              <div className="troubleshootgun-preview-modal__actions">
                <button className="ghost" type="button" onClick={() => setTemplatePreview(null)}>
                  Annuler
                </button>
                <button className="primary" type="button" onClick={importTemplatePreview}>
                  Importer
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    })() : null}

    {editOpen ? (
        <div className="modal-backdrop" onClick={() => setEditOpen(false)}>
          <div className="modal modal--settings" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <div className="modal__title-group">
                <div className="brand__title brand__title--with-icon">
                  <UiIcon name="settings" className="brand__title-icon" />
                  <span>Settings</span>
                  <span className="version-pill version-pill--settings">v{APP_VERSION_LABEL}</span>
                </div>
              </div>
            <div className="modal-actions modal-actions--settings">
                <button
                  className="btn btn--ghost btn--small btn--with-icon"
                  type="button"
                  onClick={() => setEditOpen(false)}
                >
                  <ButtonIcon name="close" />
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
                      {section.items.map((item) => {
                        const issueCount = settingsIssueCounts[item.id] ?? 0
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={`settings-layout__nav-btn${
                              editTab === item.id ? ' is-active' : ''
                            }${issueCount ? ' has-issues' : ''}`}
                            onClick={() => setEditTab(item.id)}
                          >
                            <span className="settings-layout__nav-btn-main">
                              <UiIcon name={item.icon} className="settings-layout__nav-btn-icon" />
                              <span>{item.label}</span>
                            </span>
                            {issueCount ? (
                              <span className="settings-layout__nav-badge">{issueCount}</span>
                            ) : null}
                          </button>
                        )
                      })}
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
                    <div className="list-card__title">Liste</div>
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
                              clearSettingsValidationTouched('category')
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
                              <MoveIcon />
                            </button>
                            <div className="list-item__content">
                              <div className="list-item__title">{category.name}</div>
                              <div className="list-item__meta">
                                {data.snippets.filter(
                                  (snippet) => snippet.categoryId === category.id,
                                ).length}{' '}
                                snippet(s)
                              </div>
                            </div>
                            <div className="list-item__actions">
                              <button
                                className="icon-btn-sm danger"
                                type="button"
                                title="Supprimer"
                                onClick={(event) => {
                                  event.stopPropagation()
                                  deleteCategory(category.id)
                                }}
                              >
                                <DeleteIcon />
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
                        className="btn btn--ghost btn--small btn--with-icon"
                        onClick={() => {
                          clearSettingsValidationTouched('category')
                          setCategoryDraft(getEmptyCategoryDraft())
                          setSelectedCategoryId('new')
                        }}
                      >
                        <ButtonIcon name="add" />
                        Nouveau
                      </button>
                      <button className="btn btn--primary btn--small btn--with-icon" onClick={handleCategorySave}>
                        <ButtonIcon name="save" />
                        Sauver
                      </button>
                    </div>
                  </div>
                  <div className="list-card__body">
                    {isCategorySelectionEmpty ? (
                      <div className="empty-state">
                        Sélectionnez une catégorie ou créez-en une avec Nouveau.
                      </div>
                    ) : (
                      <div className="form">
                        {renderValidationIssues('category', categoryDraftIssues)}
                        <div className="workflow-step-label">Nom</div>
                        <input
                          className="input"
                          placeholder="Nom de catégorie"
                          value={categoryDraft.name}
                          onChange={(event) =>
                            setCategoryDraft((prev) => ({ ...prev, name: event.target.value }))
                          }
                        />
                        <div className="workflow-step-label">Couleur</div>
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
                        <div className="category-snippet-preview">
                          <div className="category-snippet-preview__title">
                            Aperçu des snippets
                          </div>
                          {categoryPreviewSnippets.length ? (
                            <div className="category-snippet-preview__list">
                              {categoryPreviewSnippets.map((snippet) => (
                                <div className="category-snippet-preview__item" key={snippet.id}>
                                  <span>{snippet.title}</span>
                                  <small>{snippet.content.split('\n')[0]}</small>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="list-item__meta">
                              Aucun snippet dans cette catégorie.
                            </div>
                          )}
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
                    <div className="list-card__title">Liste</div>
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
                      renderItem={(snippet, handleProps) => {
                        const issues = getSnippetIssues(snippet, categoryIdSet)
                        return (
                          <div
                            className={`list-item list-item--compact${
                              selectedSnippetId === snippet.id ? ' is-selected' : ''
                            }${issues.length ? ' is-incomplete' : ''}`}
                            onClick={() => {
                              clearSettingsValidationTouched('snippet')
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
                              <MoveIcon />
                            </button>
                            <div className="list-item__content">
                              <div className="list-item__title">
                                {snippet.title || 'Snippet sans titre'}
                              </div>
                              <div className="list-item__meta">
                                {snippet.content.split('\n')[0] || 'Contenu manquant'}
                              </div>
                              {renderIssueBadge(issues)}
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
                                <DeleteIcon />
                              </button>
                            </div>
                          </div>
                        )
                      }}
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
                        className="btn btn--ghost btn--small btn--with-icon"
                        onClick={() => beginNewSnippetDraft()}
                      >
                        <ButtonIcon name="add" />
                        Nouveau
                      </button>
                      <button
                        type="button"
                        className="btn btn--primary btn--small btn--with-icon"
                        onClick={handleSnippetSave}
                      >
                        <ButtonIcon name="save" />
                        Sauver
                      </button>
                    </div>
                  </div>
                  <div className="list-card__body">
                    {isSnippetSelectionEmpty ? (
                      <div className="empty-state">
                        Sélectionnez un snippet ou créez-en un avec Nouveau.
                      </div>
                    ) : (
                      <div className="form">
                        {renderValidationIssues('snippet', snippetDraftIssues)}
                        <div className="workflow-step-label">Nom</div>
                        <input
                          className="input"
                          placeholder="Nom du snippet"
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
                        <div className="workflow-step-label">Contenu</div>
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
                        <div className="workflow-step-label">Catégorie</div>
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
                            {!data.categories.length ? <option value="">Aucune catégorie</option> : null}
                            {data.categories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="workflow-step-label">Texte ajouté à la task squelette</div>
                        <div className="form__row">
                          <select
                            className="select select--roomy"
                            value={normalizeTaskSectionId(snippetDraft.taskSectionId)}
                            onChange={(event) =>
                              setSnippetDraft((prev) => ({
                                ...prev,
                                taskSectionId: event.target.value as TaskSectionId,
                              }))
                            }
                          >
                            {TASK_SECTION_IDS.map((sectionId) => (
                              <option key={sectionId} value={sectionId}>
                                {getTaskSectionLabel(sectionId, taskSectionNames)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <textarea
                          className="textarea"
                          placeholder="Texte ajouté à la section choisie du squelette (optionnel)"
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
                        <div className="list-item__meta">
                          Si ce champ reste vide, le snippet ne modifie pas la task.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'templates' ? (
              <div className="modal__grid">
                <div className="list-card">
                  <div className="list-card__body">
                    <SortableList
                      items={data.templates}
                      getId={(item) => item.id}
                      onReorder={(next) => setData((prev) => ({ ...prev, templates: next }))}
                      renderItem={(template, handleProps) => {
                        const issues = getMailTemplateIssues(template, taskTemplateIdSet)
                        return (
                          <div
                            className={`list-item list-item--compact${
                              selectedTemplateId === template.id ? ' is-selected' : ''
                            }${issues.length ? ' is-incomplete' : ''}`}
                            onClick={() => {
                              clearSettingsValidationTouched('template')
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
                              <MoveIcon />
                            </button>
                            <div className="list-item__content">
                              <div className="list-item__title">
                                {template.name || 'Template sans titre'}
                              </div>
                              <div className="list-item__meta">
                                {template.content.split('\n')[0] || 'Contenu manquant'}
                              </div>
                              {renderIssueBadge(issues)}
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
                            <DeleteIcon />
                              </button>
                            </div>
                          </div>
                        )
                      }}
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
                        className="btn btn--ghost btn--small btn--with-icon"
                        onClick={() => beginNewTemplateDraft()}
                      >
                        <ButtonIcon name="add" />
                        Nouveau
                      </button>
                      <button
                        type="button"
                        className="btn btn--primary btn--small btn--with-icon"
                        onClick={handleTemplateSave}
                      >
                        <ButtonIcon name="save" />
                        Sauver
                      </button>
                    </div>
                  </div>
                  <div className="list-card__body">
                    {isTemplateSelectionEmpty ? (
                      <div className="empty-state">
                        Sélectionnez un template mail ou créez-en un avec Nouveau.
                      </div>
                    ) : (
                      <div className="form">
                        {renderValidationIssues('template', templateDraftIssues)}
                        <div className="workflow-step-label">Nom</div>
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
                        <div className="workflow-step-label">Langue</div>
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
                        <div className="workflow-step-label">Catégorie</div>
                        <div className="form__row two">
                          <select
                            className="select select--roomy"
                            value={templateDraft.categoryId ?? mailTemplateCategories[0]?.id ?? ''}
                            onChange={(event) =>
                              setTemplateDraft((prev) => ({
                                ...prev,
                                categoryId: event.target.value,
                              }))
                            }
                          >
                            {!mailTemplateCategories.length ? (
                              <option value="">Aucune catégorie</option>
                            ) : null}
                            {mailTemplateCategories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className={`template-favorite-toggle${
                              templateDraft.favorite ? ' is-active' : ''
                            }`}
                            title={
                              templateDraft.favorite
                                ? 'Retirer des favoris'
                                : 'Ajouter aux favoris'
                            }
                            aria-label={
                              templateDraft.favorite
                                ? 'Retirer des favoris'
                                : 'Ajouter aux favoris'
                            }
                            aria-pressed={Boolean(templateDraft.favorite)}
                            onClick={() =>
                              setTemplateDraft((prev) => ({
                                ...prev,
                                favorite: !prev.favorite,
                              }))
                            }
                          >
                            ★
                          </button>
                        </div>
                        <div className="workflow-step-label">Contenu</div>
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
                        <div className="workflow-step-label">
                          Task liée au mail
                        </div>
                        {templateUsesCustomTask ? (
                          <textarea
                            className={`textarea${
                              templateDraft.taskOptional ? ' textarea--disabled' : ''
                            }`}
                            placeholder="Texte ajouté à la timeline du squelette"
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
                            Ne rien importer dans la task
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
                            Texte timeline custom
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'templateCategories' ? (
              <div className="modal__grid">
                <div className="list-card">
                  <div className="list-card__header list-card__header--wrap">
                    <div className="list-card__title">Liste</div>
                  </div>
                  <div className="list-card__body">
                    <SortableList
                      items={mailTemplateCategories}
                      getId={(item) => item.id}
                      onReorder={(next) => updateSettings({ mailTemplateCategories: next })}
                      renderItem={(category, handleProps) => (
                        <div
                          className={`list-item list-item--compact${
                            templateCategoryDraft.id === category.id ? ' is-selected' : ''
                          }`}
                          onClick={() => setTemplateCategoryDraft(category)}
                        >
                          <button
                            className="drag-handle"
                            type="button"
                            {...handleProps.attributes}
                            {...handleProps.listeners}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <MoveIcon />
                          </button>
                          <div className="list-item__content">
                            <div className="list-item__title">{category.name}</div>
                            <div className="list-item__meta">
                              {data.templates.filter(
                                (template) => template.categoryId === category.id,
                              ).length}{' '}
                              template(s)
                            </div>
                          </div>
                          <div className="list-item__actions">
                            <button
                              className="icon-btn-sm danger"
                              type="button"
                              title="Supprimer"
                              onClick={(event) => {
                                event.stopPropagation()
                                deleteTemplateCategory(category.id)
                              }}
                            >
                              <DeleteIcon />
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
                        className="btn btn--ghost btn--small btn--with-icon"
                        type="button"
                        onClick={() => setTemplateCategoryDraft({ id: '', name: '' })}
                      >
                        <ButtonIcon name="add" />
                        Nouveau
                      </button>
                      <button
                        className="btn btn--primary btn--small btn--with-icon"
                        type="button"
                        onClick={saveTemplateCategory}
                      >
                        <ButtonIcon name="save" />
                        Sauver
                      </button>
                    </div>
                  </div>
                  <div className="list-card__body">
                    <div className="form">
                      <div className="workflow-step-label">Nom</div>
                      <input
                        className="input"
                        value={templateCategoryDraft.name}
                        placeholder="Nom de catégorie"
                        onChange={(event) =>
                          setTemplateCategoryDraft((prev) => ({
                            ...prev,
                            name: event.target.value,
                          }))
                        }
                      />
                      {templateCategoryDraft.id ? (
                        <div className="category-snippet-preview">
                          <div className="category-snippet-preview__title">Aperçu des templates</div>
                          {data.templates.filter(
                            (template) => template.categoryId === templateCategoryDraft.id,
                          ).length ? (
                            <div className="category-snippet-preview__list">
                              {data.templates
                                .filter((template) => template.categoryId === templateCategoryDraft.id)
                                .map((template) => (
                                  <div className="category-snippet-preview__item" key={template.id}>
                                    <span>{template.name}</span>
                                    <small>{template.content.split('\n')[0] || 'Contenu vide'}</small>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <div className="list-item__meta">Aucun template dans cette catégorie.</div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'taskCategories' ? (
              <div className="modal__grid">
                <div className="list-card">
                  <div className="list-card__header list-card__header--wrap">
                    <div className="list-card__title">Liste</div>
                  </div>
                  <div className="list-card__body">
                    <SortableList
                      items={taskTemplateCategories}
                      getId={(item) => item.id}
                      onReorder={(next) => updateSettings({ taskTemplateCategories: next })}
                      renderItem={(category, handleProps) => (
                        <div
                          className={`list-item list-item--compact${
                            taskTemplateCategoryDraft.id === category.id ? ' is-selected' : ''
                          }`}
                          onClick={() => setTaskTemplateCategoryDraft(category)}
                        >
                          <button
                            className="drag-handle"
                            type="button"
                            {...handleProps.attributes}
                            {...handleProps.listeners}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <MoveIcon />
                          </button>
                          <div className="list-item__content">
                            <div className="list-item__title">{category.name}</div>
                            <div className="list-item__meta">
                              {data.taskTemplates.filter(
                                (task) => task.categoryId === category.id,
                              ).length}{' '}
                              template(s)
                            </div>
                          </div>
                          <div className="list-item__actions">
                            <button
                              className="icon-btn-sm danger"
                              type="button"
                              title="Supprimer"
                              onClick={(event) => {
                                event.stopPropagation()
                                deleteTaskTemplateCategory(category.id)
                              }}
                            >
                              <DeleteIcon />
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
                        className="btn btn--ghost btn--small btn--with-icon"
                        type="button"
                        onClick={() => setTaskTemplateCategoryDraft({ id: '', name: '' })}
                      >
                        <ButtonIcon name="add" />
                        Nouveau
                      </button>
                      <button
                        className="btn btn--primary btn--small btn--with-icon"
                        type="button"
                        onClick={saveTaskTemplateCategory}
                      >
                        <ButtonIcon name="save" />
                        Sauver
                      </button>
                    </div>
                  </div>
                  <div className="list-card__body">
                    <div className="form">
                      <div className="workflow-step-label">Nom</div>
                      <input
                        className="input"
                        value={taskTemplateCategoryDraft.name}
                        placeholder="Nom de catégorie"
                        onChange={(event) =>
                          setTaskTemplateCategoryDraft((prev) => ({
                            ...prev,
                            name: event.target.value,
                          }))
                        }
                      />
                      {taskTemplateCategoryDraft.id ? (
                        <div className="category-snippet-preview">
                          <div className="category-snippet-preview__title">Aperçu des tasks</div>
                          {data.taskTemplates.filter(
                            (task) => task.categoryId === taskTemplateCategoryDraft.id,
                          ).length ? (
                            <div className="category-snippet-preview__list">
                              {data.taskTemplates
                                .filter((task) => task.categoryId === taskTemplateCategoryDraft.id)
                                .map((task) => (
                                  <div className="category-snippet-preview__item" key={task.id}>
                                    <span>{task.name}</span>
                                    <small>{getTaskTemplatePreviewText(task)}</small>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <div className="list-item__meta">Aucune task dans cette catégorie.</div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'tasks' ? (
              <div className="modal__grid">
                <div className="list-card">
                  <div className="list-card__header list-card__header--wrap">
                    <div className="list-card__title">Liste</div>
                  </div>
                  <div className="list-card__body">
                    <SortableList
                      items={data.taskTemplates}
                      getId={(item) => item.id}
                      onReorder={(next) => setData((prev) => ({ ...prev, taskTemplates: next }))}
                      renderItem={(task, handleProps) => {
                        const issues = getTaskTemplateIssues(task)
                        return (
                          <div
                            className={`list-item list-item--compact${
                              selectedTaskId === task.id ? ' is-selected' : ''
                            }${issues.length ? ' is-incomplete' : ''}`}
                            onClick={() => {
                              clearSettingsValidationTouched('task')
                              setTaskDraft({
                                ...task,
                                taskSections: normalizeTaskTemplateSections(task),
                                content: buildTaskTemplateContent(task),
                                categoryId: task.categoryId ?? taskTemplateCategories[0]?.id ?? '',
                              })
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
                              <MoveIcon />
                            </button>
                            <div className="list-item__content">
                              <div className="list-item__title">
                                {task.name || 'Task sans titre'}
                              </div>
                              <div className="list-item__meta">
                                {task.content.split('\n')[0] || 'Contenu manquant'}
                              </div>
                              {renderIssueBadge(issues)}
                            </div>
                            <div className="list-item__actions">
                              <button
                                className={`template-favorite-btn${
                                  task.favorite ? ' is-active' : ''
                                }`}
                                type="button"
                                title={
                                  task.favorite
                                    ? 'Retirer des favoris'
                                    : 'Ajouter aux favoris'
                                }
                                aria-label={
                                  task.favorite
                                    ? 'Retirer des favoris'
                                    : 'Ajouter aux favoris'
                                }
                                onClick={(event) => {
                                  event.stopPropagation()
                                  toggleTaskTemplateFavorite(task.id)
                                }}
                              >
                                ★
                              </button>
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
                                <DeleteIcon />
                              </button>
                            </div>
                          </div>
                        )
                      }}
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
                        className="btn btn--ghost btn--small btn--with-icon"
                        onClick={() => beginNewTaskDraft()}
                      >
                        <ButtonIcon name="add" />
                        Nouveau
                      </button>
                      <button
                        type="button"
                        className="btn btn--primary btn--small btn--with-icon"
                        onClick={handleTaskTemplateSave}
                      >
                        <ButtonIcon name="save" />
                        Sauver
                      </button>
                    </div>
                  </div>
                  <div className="list-card__body">
                    {isTaskSelectionEmpty ? (
                      <div className="empty-state">
                        Sélectionnez un template de task ou créez-en un avec Nouveau.
                      </div>
                    ) : (
                      <div className="form">
                        {renderValidationIssues('task', taskDraftIssues)}
                        <div className="workflow-step-label">Nom</div>
                        <input
                          className="input"
                          placeholder="Nom du template de task libre"
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
                        <div className="workflow-step-label">Catégorie</div>
                        <div className="form__row two">
                          <select
                            className="select select--roomy"
                            value={taskDraft.categoryId ?? taskTemplateCategories[0]?.id ?? ''}
                            onChange={(event) =>
                              setTaskDraft((prev) => ({
                                ...prev,
                                categoryId: event.target.value,
                              }))
                            }
                          >
                            {!taskTemplateCategories.length ? (
                              <option value="">Aucune catégorie</option>
                            ) : null}
                            {taskTemplateCategories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className={`template-favorite-toggle${
                              taskDraft.favorite ? ' is-active' : ''
                            }`}
                            title={
                              taskDraft.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'
                            }
                            aria-label={
                              taskDraft.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'
                            }
                            aria-pressed={Boolean(taskDraft.favorite)}
                            onClick={() =>
                              setTaskDraft((prev) => ({
                                ...prev,
                                favorite: !prev.favorite,
                              }))
                            }
                          >
                            ★
                          </button>
                        </div>
                        <div className="workflow-step-label">Sections</div>
                        <div className="task-template-sections">
                          {TASK_SECTION_IDS.map((sectionId, sectionIndex) => {
                            const sections = normalizeTaskTemplateSections(taskDraft)
                            return (
                              <label className="task-template-section" key={sectionId}>
                                <span className="task-template-section__title">
                                  {getTaskSectionLabel(sectionId, taskSectionNames)}
                                </span>
                                <textarea
                                  className="textarea textarea--task-template-section"
                                  placeholder="Texte de cette section"
                                  value={sections[sectionIndex] ?? ''}
                                  ref={(node) => {
                                    taskTemplateSectionRefs.current[sectionId] = node
                                  }}
                                  onFocus={() => setTaskTemplateActiveField(sectionId)}
                                  onChange={(event) =>
                                    updateTaskTemplateSectionDraft(sectionId, event.target.value)
                                  }
                                />
                              </label>
                            )
                          })}
                        </div>
                        <div className="task-template-preview-settings">
                          <div className="task-template-preview-settings__title">Aperçu</div>
                          <div
                            className="task-template-preview-settings__content settings-token-preview"
                            dangerouslySetInnerHTML={{
                              __html: highlightText(
                                buildTaskDraftFromTemplate(taskDraft, taskSectionNames).trim() ||
                                  'Le contenu du template apparaîtra ici.',
                              ),
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'taskFormat' ? (
              <div className="modal__grid modal__grid--single">
                <div className="list-card list-card--form">
                  <div className="list-card__header">
                    <div className="list-card__title-group">
                      <div className="list-card__title">Structure du squelette</div>
                    </div>
                  </div>
                  <div className="list-card__body">
                    <div className="settings-block">
                      {TASK_SECTION_IDS.map((sectionId, index) => (
                        <input
                          key={sectionId}
                          className="input"
                          value={taskSectionNames[index]}
                          onChange={(event) => updateTaskSectionName(index, event.target.value)}
                        />
                      ))}
                    </div>
                    <div className="task-template-preview-settings">
                      <div className="task-template-preview-settings__title">Squelette</div>
                      <div
                        className="task-template-preview-settings__content settings-token-preview"
                        dangerouslySetInnerHTML={{
                          __html: highlightText(
                            buildStructuredTaskDraft(['', '', '', ''], taskSectionNames).trim(),
                          ),
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'tags' ? (
              <div className="modal__grid modal__grid--single">
                <div className="list-card list-card--form">
                  <div className="list-card__header">
                    <div className="list-card__title">Gestion</div>
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
                          className="btn btn--primary btn--small btn--with-icon"
                          type="button"
                          onClick={handleAddPredefinedTag}
                        >
                          <ButtonIcon name="add" />
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
                            <DeleteIcon />
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
                    <div className="list-card__title">Liste</div>
                  </div>
                  <div className="list-card__body">
                    {productsSorted.length ? (
                      <SortableList
                        items={productsSorted}
                        getId={(item) => item.id}
                        onReorder={handleReorderProductCatalog}
                        renderItem={(product, handleProps) => {
                          const issues = getProductCatalogItemIssues(product)
                          return (
                            <div
                              key={product.id}
                              className={`list-item list-item--compact${
                                selectedProductCatalogId === product.id ? ' is-selected' : ''
                              }${issues.length ? ' is-incomplete' : ''}`}
                              onClick={() => {
                                clearSettingsValidationTouched('product')
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
                                <MoveIcon />
                              </button>
                              <div className="list-item__content">
                                <div className="list-item__title">
                                  {product.name || 'Produit sans nom'}
                                </div>
                                <div className="list-item__meta">
                                  {product.productType?.trim() || 'Type non renseigné'} •{' '}
                                  {(product.editions ?? []).length} édition
                                  {(product.editions ?? []).length > 1 ? 's' : ''} •{' '}
                                  {product.spareParts.length} spare part
                                  {product.spareParts.length > 1 ? 's' : ''}
                                </div>
                                {renderIssueBadge(issues)}
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
                            <DeleteIcon />
                                </button>
                              </div>
                            </div>
                          )
                        }}
                      />
                    ) : (
                      <div className="empty-state">Aucun produit configuré.</div>
                    )}
                  </div>
                </div>

                <div className="list-card list-card--form">
                  <div className="list-card__header">
                    <div className="list-card__title-group">
                      <div className="list-card__title">Détails</div>
                    </div>
                    <div className="list-card__tools">
                      <button
                        className="btn btn--ghost btn--small btn--with-icon"
                        type="button"
                        onClick={() => {
                          clearSettingsValidationTouched('product')
                          setProductDraft(getEmptyProductDraft())
                          setProductTagsDraftText('')
                          setSelectedProductCatalogId('new')
                        }}
                      >
                        <ButtonIcon name="add" />
                        Nouveau
                      </button>
                      <button
                        className="btn btn--primary btn--small btn--with-icon"
                        type="button"
                        onClick={handleSaveProductCatalogItem}
                      >
                        <ButtonIcon name="save" />
                        Sauver
                      </button>
                    </div>
                  </div>
                  <div className="list-card__body">
                    {isProductCatalogSelectionEmpty ? (
                      <div className="empty-state">
                        Sélectionnez un produit ou créez-en un avec Nouveau.
                      </div>
                    ) : (
                      <div className="form product-catalog-form">
                        {renderValidationIssues('product', productDraftIssues)}
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
                            <DeleteIcon />
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
                    <div className="list-card__title">Liste</div>
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
                            <MoveIcon />
                          </button>
                          <div className="list-item__content">
                            <div className="list-item__title">{procedure.name}</div>
                            <div className="list-item__meta list-item__meta--brand">
                              <span className="list-item__brand-icon" aria-hidden="true">
                                {procedure.brand === 'hercules' ? 'H' : 'TM'}
                              </span>
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
                            <DeleteIcon />
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
                        className="btn btn--ghost btn--small btn--with-icon"
                        onClick={() => {
                          setProcedureDraft(getEmptyProcedureDraft())
                          setSelectedProcedureId('new')
                        }}
                      >
                        <ButtonIcon name="add" />
                        Nouveau
                      </button>
                      <button className="btn btn--primary btn--small btn--with-icon" onClick={handleProcedureSave}>
                        <ButtonIcon name="save" />
                        Sauver
                      </button>
                    </div>
                  </div>
                  <div className="list-card__body">
                    {isProcedureSelectionEmpty ? (
                      <div className="empty-state">
                        Sélectionnez une procédure ou créez-en une avec Nouveau.
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
                              title="Insérer un mailto"
                              onClick={() =>
                                setProcedureMailtoMenuOpen((prev) => !prev)
                              }
                              disabled={!normalizedProcedureMailtos.length}
                            >
                              L
                            </button>
                            {procedureMailtoMenuOpen && normalizedProcedureMailtos.length ? (
                              <div className="format-help__panel format-help__panel--mailto">
                                {normalizedProcedureMailtos.map((link) => (
                                  <button
                                    key={link.id}
                                    type="button"
                                    className="format-help__item format-help__item--button"
                                    onMouseDown={(event) => event.preventDefault()}
                                    onClick={() => {
                                      insertProcedureStepsLink(link)
                                      setProcedureMailtoMenuOpen(false)
                                    }}
                                  >
                                    <strong>{link.label}</strong>
                                    <span>{link.to || 'Adresse non renseignée'}</span>
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  className="format-help__item format-help__item--button"
                                  onMouseDown={(event) => event.preventDefault()}
                                  onClick={() => {
                                    insertProcedureStepsLink(null)
                                    setProcedureMailtoMenuOpen(false)
                                  }}
                                >
                                  <strong>Mailto par défaut</strong>
                                  <span>Sans destinataire</span>
                                </button>
                              </div>
                            ) : null}
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
                                  Lien: [texte](mailto:...)
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
                          <select
                            className="select select--roomy"
                            value={normalizeTaskSectionId(procedureDraft.taskSectionId)}
                            onChange={(event) =>
                              setProcedureDraft((prev) => ({
                                ...prev,
                                taskSectionId: event.target.value as TaskSectionId,
                              }))
                            }
                          >
                            {TASK_SECTION_IDS.map((sectionId) => (
                              <option key={sectionId} value={sectionId}>
                                {getTaskSectionLabel(sectionId, taskSectionNames)}
                              </option>
                            ))}
                          </select>
                        ) : null}
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
                  <div className="list-card__body">
                    <div className="settings-block">
                      <button
                        className="btn btn--ghost btn--small btn--with-icon"
                        type="button"
                        onClick={() => updateCallTemplate(PHONE_CALL_TEMPLATE)}
                      >
                        Réinitialiser
                      </button>
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
                        className="textarea textarea--tall textarea--call-template"
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
                <div className="list-card__body">
                  <div className="settings-block">
                    <div className="settings-option settings-option--danger">
                      <div className="settings-option__info">
                        <div className="settings-option__title">Suppression des données</div>
                        <div className="settings-option__desc">
                          Efface l'ensemble du contenu et restaure les réglages par défaut.
                        </div>
                      </div>
                      <button
                        className={`btn btn--small btn--danger btn--with-icon${
                          clearAllArmed ? ' is-armed' : ''
                        }`}
                        type="button"
                        onClick={handleClearData}
                        title={clearAllArmed ? 'Confirmer suppression des données' : 'Delete all data'}
                        aria-label="Delete all data"
                      >
                        <ButtonIcon name="delete" />
                        {clearAllArmed ? 'Confirmer suppression' : 'Delete all data'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'snippetSettings' ? (
              <div className="list-card list-card--form">
                <div className="list-card__body">
                    <div className="settings-block">
                      <div className="settings-option">
                        <div className="settings-option__info">
                          <div className="settings-option__title">Réglages déplacés</div>
                          <div className="settings-option__desc">
                            Les options de comportement et d'affichage ont été regroupées dans
                            l'onglet Préférences.
                          </div>
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
                    <div className="list-card__title">Mémoire</div>
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
                      <div className="list-card__title">Configuration</div>
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
                                  <div className="quick-link-editor__meta">Accès rapide</div>
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

            {editTab === 'procedureMailtos' ? (
              <div className="modal__grid modal__grid--single">
                <div className="list-card list-card--form">
                  <div className="list-card__header">
                    <div className="list-card__title-group">
                      <div className="list-card__title">Configuration</div>
                    </div>
                    <div className="list-card__tools">
                      <button
                        className="btn btn--ghost btn--small btn--with-icon"
                        type="button"
                        onClick={addProcedureMailtoLink}
                      >
                        <ButtonIcon name="add" />
                        Ajouter
                      </button>
                    </div>
                  </div>
                  <div className="list-card__body">
                    <div className="settings-stack settings-stack--tight">
                      {normalizedProcedureMailtos.length ? (
                        normalizedProcedureMailtos.map((link) => (
                          <section className="quick-link-editor" key={link.id}>
                            <div className="quick-link-editor__head">
                              <div className="quick-link-editor__identity">
                                <div className="quick-link-editor__badge">M</div>
                                <div>
                                  <div className="quick-link-editor__title">{link.label}</div>
                                  <div className="quick-link-editor__meta">
                                    {[link.to, link.cc ? `CC ${link.cc}` : '']
                                      .filter(Boolean)
                                      .join(' - ') || 'Destinataires non renseignés'}
                                  </div>
                                </div>
                              </div>
                              <button
                                className="btn btn--ghost btn--small btn--with-icon"
                                type="button"
                                onClick={() => removeProcedureMailtoLink(link.id)}
                              >
                                <ButtonIcon name="delete" />
                                Supprimer
                              </button>
                            </div>
                            <div className="settings-grid settings-grid--mailto">
                              <input
                                className="input"
                                value={link.label}
                                placeholder="Nom du template"
                                onChange={(event) =>
                                  updateProcedureMailtoLink(link.id, {
                                    label: event.target.value,
                                  })
                                }
                              />
                              <input
                                className="input"
                                value={link.to}
                                placeholder="destinataire@exemple.com, autre@exemple.com"
                                onChange={(event) =>
                                  updateProcedureMailtoLink(link.id, {
                                    to: event.target.value,
                                  })
                                }
                              />
                              <input
                                className="input"
                                value={link.cc ?? ''}
                                placeholder="CC : copie@exemple.com"
                                onChange={(event) =>
                                  updateProcedureMailtoLink(link.id, {
                                    cc: event.target.value,
                                  })
                                }
                              />
                              <input
                                className="input"
                                value={link.subject ?? ''}
                                placeholder="Titre du mail"
                                onChange={(event) =>
                                  updateProcedureMailtoLink(link.id, {
                                    subject: event.target.value,
                                  })
                                }
                              />
                              <textarea
                                className="textarea textarea--tall"
                                value={link.body ?? ''}
                                placeholder="Corps du mail"
                                onChange={(event) =>
                                  updateProcedureMailtoLink(link.id, {
                                    body: event.target.value,
                                  })
                                }
                              />
                            </div>
                          </section>
                        ))
                      ) : (
                        <div className="empty-state">Aucun mailto configuré.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'preferences' ? (
              <div className="modal__grid modal__grid--single">
                <div className="list-card list-card--form">
                  <div className="list-card__body">
                    <div className="settings-stack">
                      <section className="settings-group">
                        <div className="settings-group__title">Affichage</div>
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
                              const nextTextScale = Math.min(1.4, Math.max(0.85, nextScale))
                              updateSettings({ textScale: nextTextScale })
                            },
                            {
                              description:
                                'Ajuste la densité globale de lecture dans toute l’application.',
                            },
                          )}
                          {renderSettingsSlider(
                            'Zoom',
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
                              const nextEditorLineHeight = Math.min(2, Math.max(1.3, nextHeight))
                              updateSettings({ editorLineHeight: nextEditorLineHeight })
                            },
                            {
                              description: 'Laisse plus ou moins d’air entre les lignes de l’éditeur.',
                            },
                          )}
                        </div>
                      </section>

                      <section className="settings-group">
                        <div className="settings-group__title">Général</div>
                        <div className="settings-block">
                          <div className="settings-option settings-option--danger">
                            <div className="settings-option__info">
                              <div className="settings-option__title">Suppression des données</div>
                              <div className="settings-option__desc">
                                Efface l'ensemble du contenu et restaure les réglages par défaut.
                              </div>
                            </div>
                            <button
                              className={`btn btn--small btn--danger btn--with-icon${
                                clearAllArmed ? ' is-armed' : ''
                              }`}
                              type="button"
                              onClick={handleClearData}
                              title={
                                clearAllArmed ? 'Confirmer suppression des données' : 'Delete all data'
                              }
                              aria-label="Delete all data"
                            >
                              <ButtonIcon name="delete" />
                              {clearAllArmed ? 'Confirmer suppression' : 'Delete all data'}
                            </button>
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
                      <div className="list-card__title">Configuration</div>
                    </div>
                    <div className="list-card__tools">
                      {selectedPortalProcedureId ? (
                        <button
                          className="btn btn--ghost btn--small btn--with-icon"
                          type="button"
                          onClick={() => setPortalProcedureEditorOpen(true)}
                        >
                          <ButtonIcon name="edit" />
                          Modifier
                        </button>
                      ) : null}
                      <button
                        className="btn btn--ghost btn--small btn--with-icon"
                        type="button"
                        onClick={handleAddPortalProcedure}
                      >
                        <ButtonIcon name="add" />
                        Nouveau
                      </button>
                    </div>
                  </div>
                  <div className="list-card__body list-card__body--portal-editor">
                    {renderPortalCodeEditorSettings()}
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'dashboardVersions'
              ? renderDashboardCatalogEditor({
                  items: dashboardFirmwareProducts,
                  defaultCategory: 'firmware',
                  categoryOptions: ['firmware'],
                  emptyListMessage: 'Aucun firmware configuré.',
                  emptySelectionMessage:
                    'Sélectionnez un firmware ou créez-en un avec Nouveau.',
                  latestVersionPlaceholder: 'Dernière version disponible',
                  fixedCategoryLabel: '',
                })
              : null}

            {editTab === 'dashboardSoftwares'
              ? renderDashboardCatalogEditor({
                  items: dashboardSoftwareProducts,
                  defaultCategory: 'software',
                  categoryOptions: ['software'],
                  emptyListMessage: 'Aucun logiciel configuré.',
                  emptySelectionMessage:
                    'Sélectionnez un logiciel ou créez-en un avec Nouveau.',
                  latestVersionPlaceholder: 'Version du logiciel',
                  fixedCategoryLabel: '',
                })
              : null}

            {editTab === 'dashboardDriverPacks'
              ? renderDashboardCatalogEditor({
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
                      <div className="list-card__title">Liste</div>
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
                              <MoveIcon />
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
                        Aucun produit. Créez-en un dans l’onglet Produits.
                      </div>
                    )}
                  </div>
                </div>

                <div className="list-card list-card--form">
                  <div className="list-card__header">
                    <div className="list-card__title-group">
                      <div className="list-card__title">Détails</div>
                    </div>
                    <div className="list-card__tools">
                      <button
                        className="btn btn--ghost btn--small"
                        type="button"
                        onClick={addProductDraftSparePart}
                        disabled={isProductCatalogSelectionEmpty}
                      >
                        <ButtonIcon name="add" />
                        Ajouter une spare part
                      </button>
                      <button
                        className="btn btn--primary btn--small btn--with-icon"
                        type="button"
                        onClick={handleSaveProductCatalogItem}
                        disabled={isProductCatalogSelectionEmpty}
                      >
                        <ButtonIcon name="save" />
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
                                    <MoveIcon />
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
                            <DeleteIcon />
                                  </button>
                                </div>
                              </article>
                            )}
                          />
                        ) : (
                          <div className="empty-state">
                            Aucune spare part pour ce produit.
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
                      <div className="list-card__title">Liste</div>
                    </div>
                  </div>
                  <div className="list-card__body">
                    {dashboardNewsSorted.length ? (
                      <SortableList
                        items={dashboardNewsSorted}
                        getId={(item) => item.id}
                        onReorder={handleReorderDashboardNews}
                        renderItem={(item, handleProps) => {
                          const issues = getDashboardNewsIssues(item)
                          return (
                            <div
                              key={item.id}
                              className={`list-item list-item--compact${
                                selectedDashboardNewsId === item.id ? ' is-selected' : ''
                              }${issues.length ? ' is-incomplete' : ''}`}
                              onClick={() => {
                                clearSettingsValidationTouched('dashboardNews')
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
                                <MoveIcon />
                              </button>
                              <div className="list-item__content">
                                <div className="list-item__title">{item.title || 'Sans titre'}</div>
                                <div className="list-item__meta">
                                  {formatDashboardNewsDate(item.date)}
                                </div>
                                {renderIssueBadge(issues)}
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
                            <DeleteIcon />
                                </button>
                              </div>
                            </div>
                          )
                        }}
                      />
                    ) : (
                      <div className="empty-state">Aucune news configurée.</div>
                    )}
                  </div>
                </div>

                <div className="list-card list-card--form">
                  <div className="list-card__header">
                    <div className="list-card__title-group">
                      <div className="list-card__title">Détails</div>
                    </div>
                    <div className="list-card__tools">
                      <button
                        className="btn btn--ghost btn--small btn--with-icon"
                        type="button"
                        onClick={() => {
                          clearSettingsValidationTouched('dashboardNews')
                          setDashboardNewsDraft(getEmptyDashboardNewsDraft())
                          setSelectedDashboardNewsId('new')
                        }}
                      >
                        <ButtonIcon name="add" />
                        Nouveau
                      </button>
                      <button
                        className="btn btn--primary btn--small btn--with-icon"
                        type="button"
                        onClick={handleSaveDashboardNews}
                      >
                        <ButtonIcon name="save" />
                        Sauver
                      </button>
                    </div>
                  </div>
                  <div className="list-card__body">
                    {isDashboardNewsSelectionEmpty ? (
                      <div className="empty-state">
                        Sélectionnez une news ou créez-en une avec Nouveau.
                      </div>
                    ) : (
                      <div className="form">
                        {renderValidationIssues('dashboardNews', dashboardNewsDraftIssues)}
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
                          placeholder="Titre de l'actualité"
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
                          className="textarea textarea--tall textarea--dashboard-news"
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
              <div className="modal__grid modal__grid--single settings-home">
                <div className="settings-home__hero">
                  <div className="settings-home__hero-main">
                    <div className="settings-home__title-row">
                      <div className="settings-home__title">Agentor</div>
                      <div className="version-pill version-pill--settings">v{APP_VERSION_LABEL}</div>
                    </div>
                  </div>
                </div>

                <div className="settings-home__grid">
                  <section className="list-card list-card--form">
                    <div className="list-card__header">
                      <div className="list-card__title-group">
                        <div className="list-card__title">Récapitulatif global</div>
                        <div className="list-card__subtitle">
                          Données présentes dans l’application.
                        </div>
                      </div>
                    </div>
                    <div className="list-card__body">
                      <div className="settings-home__metrics">
                        {[
                          ['Catégories', data.categories.length],
                          ['Snippets', data.snippets.length],
                          ['Templates mail', data.templates.length],
                          ['Templates task', data.taskTemplates.length],
                          ['Procédures', data.procedures.length],
                          ['News', dashboardNews.length],
                          ['Historique mail', data.history.length],
                          ['Appels', data.callHistory.length],
                        ].map(([label, value]) => (
                          <div className="settings-home__metric" key={label as string}>
                            <span>{label}</span>
                            <strong>{value as number}</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>

                  <section className="list-card list-card--form">
                    <div className="list-card__header">
                      <div className="list-card__title-group">
                        <div className="list-card__title">Export / Import</div>
                        <div className="list-card__subtitle">
                          Sauvegarde complète de l’application et restauration manuelle.
                        </div>
                      </div>
                    </div>
                    <div className="list-card__body">
                      <div className="settings-stack settings-stack--tight">
                        <button
                          className="btn btn--primary btn--small btn--with-icon settings-home__export-btn"
                          type="button"
                          onClick={handleExportJson}
                        >
                          <ExportDataIcon />
                          Exporter contenu + paramètres
                        </button>
                        <button
                          className="btn btn--ghost btn--small btn--with-icon settings-home__export-btn"
                          type="button"
                          onClick={handleImportClick}
                          title="Importer les données (Shift = remplacer)"
                        >
                          <ImportDataIcon />
                          Importer contenu + paramètres
                        </button>
                      </div>
                    </div>
                  </section>

                  <section className="list-card list-card--form">
                    <div className="list-card__header">
                      <div className="list-card__title-group">
                        <div className="list-card__title">Mémoire des emails</div>
                        <div className="list-card__subtitle">
                          Active ou désactive la mise en mémoire des mails copiés.
                        </div>
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
                              Ajoute l’email copié dans l’historique.
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
                            const nextHistoryLimit = Math.min(400, Math.max(50, nextLimit))
                            updateSettings({ historyLimit: nextHistoryLimit })
                          },
                          {
                            description: 'Détermine combien de copies email sont conservées.',
                            disabled: !historyOnCopy,
                          },
                        )}
                        <button
                          className="btn btn--ghost btn--small btn--with-icon settings-home__download-btn"
                          type="button"
                          onClick={handleExportHistory}
                          title="Exporter l’historique (.txt)"
                          disabled={!data.history.length}
                        >
                          <ExportEmailsIcon />
                          Télécharger les emails
                          {data.history.length ? ` (${data.history.length})` : ''}
                        </button>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            ) : null}

            {editTab === 'updates' ? (
              <div className="modal__grid modal__grid--single">
                <div className="list-card list-card--form">
                  <div className="list-card__header">
                    <div className="list-card__title-group">
                      <div className="list-card__title">Mise à jour</div>
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
