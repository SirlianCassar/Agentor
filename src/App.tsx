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
} from 'react'
import { createPortal } from 'react-dom'
import { type TextEditorHandle } from './components/TextEditor'
import { UiIcon } from './components/UiIcon'
import {
  emptyLibraryFilter,
  filterLibraryItems,
  mergeSubsetOrder,
  type LibraryFilter,
} from './lib/library'
import { useCaseContext } from './hooks/useCaseContext'
import { fillTemplateFromContext } from './context/templateFill'
import {
  getTemplateVersion,
  pickTemplateLanguage,
} from './lib/templateLanguages'
import { applyProductAliases, normalizeProductAliases, type ProductAlias } from './context/productAliases'
import { resolveCaseImport, withoutUnimported } from './context/caseContext'
import {
  resolveCaseTags,
} from './context/caseTags'
import {
  closeWindow,
  DASHBOARD_WINDOW_KINDS,
  emptyLayout,
  openWindow,
  fitLayout,
  toggleWindow,
  type DashboardWindowKind,
  type WindowLayout,
} from './windows/windowLayout'
import { defaultData } from './lib/defaults'
import {
  exportJson,
  exportHistory,
  importJson,
  loadData,
  onExternalDataChange,
  openExternal,
  saveData,
  copyText,
} from './lib/storage'
import {
  settingsNavigation,
  settingsRelatedTabs,
  settingsTabIndex,
  type SettingsCountKey,
  tokenReferenceItems,
  type SettingsTab,
} from './lib/settingsNavigation'
import {
  getCategoryIssues,
  getDashboardNewsIssues,
  getMailTemplateIssues,
  getProcedureMailtoIssues,
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
  InsertMode,
  MailTemplate,
  MailTemplateCategory,
  ProductCatalogItem,
  RqtReminder,
  ProcedureMailtoLink,
  SparePart,
  Snippet,
  TaskSectionId,
  TaskTemplate,
  TaskTemplateCategory,
  TaskTemplateKind,
} from './lib/types'
import {
  countTokens,
  createId,
  escapeHtml,
  highlightText,
  highlightTextPreview,
  normalizeTokenSpacing,
  padEmptySelectors,
  stripTokenSpacing,
  normalizeData,
} from './lib/utils'
import {
  formatAmountForCopy,
  getSliderProgress,
  getTodayIsoDate,
  parseDashboardAmount,
} from './lib/formatting'
import {
  CALL_HISTORY_LIMIT,
  PHONE_CALL_TEMPLATE,
  productEditionPlatformLabels,
  quickLinks,
} from './lib/constants'
import {
  getUpdateAvailableVersionLabel,
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
  computeDashboardCalculatorTotals,
  createDashboardCalculatorFee,
  createDashboardCalculatorItem,
  getDashboardCalculatorQuantity,
  type DashboardCalculatorCopyKey,
  type DashboardCalculatorFee,
  type DashboardCalculatorItem,
  type DashboardCalculatorPriceField,
} from './lib/calculator'
import { trimDoubleClickSelection } from './lib/dom'
import {
  ButtonIcon,
} from './components/AppIcons'
import {
  buildCompactTaskPreviewText,
  buildStructuredTaskDraft,
  buildTaskDraftFromTemplate,
  buildTaskTemplateContent,
  createEmptyTaskBoxSlot,
  ensureStructuredTaskDraft,
  formatTaskCopyText,
  getTaskHeadingProtectedRanges,
  getTaskSectionIndex,
  getTemplateTaskSections,
  hasMeaningfulTaskContent,
  hasRecognizedTaskHeadings,
  insertTaskTextInSection,
  normalizeStoredTaskSectionNames,
  normalizeTaskSectionId,
  normalizeTaskSectionNames,
  normalizeTaskTemplateKind,
  normalizeTaskTemplateSections,
  parseStructuredTaskDraft,
  parseStructuredTaskDraftWithLeadingContent,
  TASK_FREE_BOX_INDEX,
  TASK_BOX_COUNT,
  TASK_SECTION_IDS,
  TASK_SKELETON_BOX_INDEX,
  taskBoxUsesSkeleton,
  stripLegacyTaskNumbering,
  taskSectionEndsWithFragment,
  taskSectionHasFragment,
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
  createEmptyPortalCodeLine,
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
import { useAppUpdates } from './hooks/useAppUpdates'
import {
  activeCaseTab,
  addCaseTab,
  bindCaseTab,
  CASE_TABS_LIMIT,
  caseForTab,
  caseTabLabel,
  createCaseTab,
  planCaseReception,
  rememberCaseContext,
  removeCaseTab,
  saveTabWorkspace,
  setActiveCaseTab,
  toggleCaseTabLock,
  type CaseTabKey,
  type CaseTabsState,
} from './lib/caseTabs'
import { CaseBar } from './app/zones/CaseBar'
import { LibrarySidebar } from './app/zones/LibrarySidebar'
import { LibraryItemEditor, type LibraryEditTarget } from './app/zones/LibraryItemEditor'
import { ContentsScreen } from './app/contents/ContentsScreen'
import type { ContentType } from './lib/contents'
import { buildSearchEntries, matchesProduct, productSearchTerms, type SearchEntry } from './lib/unifiedSearch'
import { SectionSearch } from './components/SectionSearch'
import { MailWorkspace } from './app/zones/MailWorkspace'
import { TaskSidebar } from './app/zones/TaskSidebar'
import { WindowLayer } from './app/zones/WindowLayer'
import { CallModal } from './app/modals/CallModal'
import { ReminderModal } from './app/modals/ReminderModal'
import { ReminderWarning } from './app/modals/ReminderWarning'
import { TroubleshootgunPanel } from './app/modals/TroubleshootgunPanel'
import { ContextPanel, type ContextPanelEntry } from './app/zones/ContextPanel'
import {
  closePanelItem,
  currentPanelItem,
  PANEL_WIDE_MIN_WIDTH,
  referenceItem,
  referenceKind,
  showPanelItem,
  togglePanelReference,
  type PanelItem,
} from './lib/contextPanel'
import { TemplatePreviewModal } from './app/modals/TemplatePreviewModal'
import { UpdatesSettings } from './app/settings/UpdatesSettings'
import { OverviewSettings } from './app/settings/OverviewSettings'
import { NewsSettings } from './app/settings/NewsSettings'
import { SparePartsSettings } from './app/settings/SparePartsSettings'
import { ProceduresSettings } from './app/settings/ProceduresSettings'
import { PreferencesSettings } from './app/settings/PreferencesSettings'
import { MailtoSettings } from './app/settings/MailtoSettings'
import { QuickLinksSettings } from './app/settings/QuickLinksSettings'
import { CallTemplateSettings } from './app/settings/CallTemplateSettings'
import { CallHistorySettings } from './app/settings/CallHistorySettings'
import { SuggestedTagsSettings } from './app/settings/SuggestedTagsSettings'
import { CaseTagsSettings } from './app/settings/CaseTagsSettings'
import { CaseImportSettings } from './app/settings/CaseImportSettings'
import { ProductAliasesSettings } from './app/settings/ProductAliasesSettings'
import { ConnectionsSettings } from './app/settings/ConnectionsSettings'
import { TaskFormatSettings } from './app/settings/TaskFormatSettings'
import { TaskTemplatesSettings } from './app/settings/TaskTemplatesSettings'
import { TaskCategoriesSettings } from './app/settings/TaskCategoriesSettings'
import { TemplateCategoriesSettings } from './app/settings/TemplateCategoriesSettings'
import { TroubleshootgunSettings } from './app/settings/TroubleshootgunSettings'
import { MailTemplatesSettings } from './app/settings/MailTemplatesSettings'
import { SnippetsSettings } from './app/settings/SnippetsSettings'
import { SnippetCategoriesSettings } from './app/settings/SnippetCategoriesSettings'
import { PortalCodeEditor } from './app/settings/PortalCodeEditor'
import { RemindersBlock } from './app/dashboards/RemindersBlock'
import { NewsBlock } from './app/dashboards/NewsBlock'
import { DecorationsPanel } from './app/dashboards/DecorationsPanel'
import { CalculatorPanel } from './app/dashboards/CalculatorPanel'
import { SparePartsPanel } from './app/dashboards/SparePartsPanel'
import { PortalPanel } from './app/dashboards/PortalPanel'
import './App.css'
import './shell.css'
import './dashboard-windows.css'
import './settings.css'

import {
  readStoredCaseTabs,
  writeStoredCaseTabs,
  PROCEDURE_CHANNEL,
  APP_VERSION_LABEL,
  DATA_HISTORY_LIMIT,
  workspaceDashboardPageOptions,
  dashboardWindowOptions,
  WINDOW_LAYOUT_STORAGE_KEY,
  PORTAL_PROCEDURE_STORAGE_KEY,
  readStoredTemplateLanguage,
  readStoredWindowLayout,
  categoryColorMap,
  exportFontOptions,
  EXPORT_FONT_SIZE_MIN,
  EXPORT_FONT_SIZE_MAX,
  normalizeReminderDuration,
  type DraftBoxTooltipState,
  type TemplatePreviewState,
  type WorkspaceDashboardPage,
  type ReminderDuration,
} from './app/appShared'

// Ids given to the copies made from the Contents screen, as in Settings.
const contentIdPrefix: Record<ContentType, string> = { template: 'tmpl', snippet: 'snip', 's-task': 'task', 'f-task': 'task' }
const contentSettingsTab: Record<ContentType, SettingsTab> = { template: 'templates', snippet: 'snippets', 's-task': 'sTasks', 'f-task': 'fTasks' }

function App() {
  const [data, setData] = useState<AppData>(defaultData)
  const callTemplate = data.settings.callTemplate
  const isProcedureWindow =
    typeof window !== 'undefined' && window.location.hash === '#procedure'
  // A dashboard detached in its own system window (#dashboard=<kind>).
  const detachedKind = useMemo(() => {
    if (typeof window === 'undefined') return null
    const match = /^#dashboard=([a-z]+)$/.exec(window.location.hash)
    return match && DASHBOARD_WINDOW_KINDS.includes(match[1] as DashboardWindowKind)
      ? (match[1] as DashboardWindowKind)
      : null
  }, [])
  useEffect(() => {
    if (detachedKind) document.title = `${dashboardWindowOptions.find((item) => item.id === detachedKind)?.title ?? 'Dashboard'} · Agentor`
  }, [detachedKind])
  // Troubleshotgun or the call in its own popup window (#dashboard=<tool>).
  const popupTool = useMemo((): 'troubleshootgun' | 'call' | null => {
    if (typeof window === 'undefined') return null
    const match = /^#dashboard=(troubleshootgun|call)$/.exec(window.location.hash)
    return match ? (match[1] as 'troubleshootgun' | 'call') : null
  }, [])
  const isSecondaryWindow = isProcedureWindow || detachedKind !== null || popupTool !== null
  const canDetach = typeof window !== 'undefined' && Boolean(window.agentor?.detachDashboard)
  const [detachedKinds, setDetachedKinds] = useState<DashboardWindowKind[]>([])
  // Last data received from another window: it is shown, not saved back.
  const externalDataRef = useRef<AppData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [templatePreview, setTemplatePreview] = useState<TemplatePreviewState | null>(null)
  const currentTemplatePreview = templatePreview
  const [dashboardProductQuery, setDashboardProductQuery] = useState('')
  const [dashboardSparePartQuery, setDashboardSparePartQuery] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  // Contents screen of the new interface.
  const [toast, setToast] = useState<string | null>(null)
  const {
    updateStatus,
    checkingUpdateManually,
    installingDownloadedUpdate,
    handleCheckUpdatesNow,
    handleInstallDownloadedUpdate,
  } = useAppUpdates(setToast)
  const [clearArmed, setClearArmed] = useState(false)
  const [clearAllArmed, setClearAllArmed] = useState(false)
  const [taskClearArmed, setTaskClearArmed] = useState(false)
  const [emailCopyPulse, setEmailCopyPulse] = useState(false)
  const [emailClearPulse, setEmailClearPulse] = useState(false)
  const [taskCopyPulse, setTaskCopyPulse] = useState(false)
  const [taskClearPulse, setTaskClearPulse] = useState(false)
  const [troubleshootgunOpen, setTroubleshootgunOpen] = useState(false)
  const [selectedTroubleshootgunFolderId, setSelectedTroubleshootgunFolderId] = useState<string | null>(null)
  const [selectedTroubleshootgunTemplateId, setSelectedTroubleshootgunTemplateId] = useState<string | null>(null)
  const [troubleshootgunFolderNameDraft, setTroubleshootgunFolderNameDraft] = useState('')
  const [reminderModalOpen, setReminderModalOpen] = useState(false)
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null)
  const [reminderRqtDraft, setReminderRqtDraft] = useState('')
  const [reminderDurationDraft, setReminderDurationDraft] = useState<ReminderDuration>(24)
  const [expiredReminders, setExpiredReminders] = useState<RqtReminder[] | null>(null)
  const [reminderNow, setReminderNow] = useState(() => Date.now())
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
  const [taskDraftBoxes, setTaskDraftBoxes] = useState<TaskBoxSlot[]>(() =>
    Array.from({ length: TASK_BOX_COUNT }, createEmptyTaskBoxSlot),
  )
  const [activeTaskBoxIndex, setActiveTaskBoxIndex] = useState(0)
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
  const [editTab, setEditTab] = useState<SettingsTab>('dashboard')
  const [settingsSearch, setSettingsSearch] = useState('')
  const [settingsValidationTouched, setSettingsValidationTouched] = useState<
    Partial<Record<SettingsValidationScope, boolean>>
  >({})
  const [editSnippetCategoryId, setEditSnippetCategoryId] = useState('all')
  const [libraryFilters, setLibraryFilters] = useState<Record<string, LibraryFilter>>({})
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
  const [selectedProductCatalogId, setSelectedProductCatalogId] = useState<string | null>(null)
  const [selectedDashboardNewsId, setSelectedDashboardNewsId] = useState<string | null>(null)
  const [productTagsDraftText, setProductTagsDraftText] = useState('')
  const [snippetActiveField, setSnippetActiveField] = useState<'title' | 'content' | 'task'>(
    'content',
  )
  const [templateActiveField, setTemplateActiveField] = useState<'name' | 'content' | 'task'>(
    'content',
  )
  const [taskTemplateActiveField, setTaskTemplateActiveField] = useState<
    'name' | 'title' | 'content' | TaskSectionId
  >('content')
  const [taskDraftSkeletonEnabled, setTaskDraftSkeletonEnabled] = useState(true)
  const [dashboardCalculatorFees, setDashboardCalculatorFees] = useState<DashboardCalculatorFee[]>([])
  const [dashboardCalculatorItems, setDashboardCalculatorItems] = useState<DashboardCalculatorItem[]>(
    () => [createDashboardCalculatorItem()],
  )
  const [windowLayout, setWindowLayout] = useState<WindowLayout>(() =>
    isSecondaryWindow ? emptyLayout() : readStoredWindowLayout(),
  )
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
  const isProductCatalogSelectionEmpty = selectedProductCatalogId === null
  const isDashboardNewsSelectionEmpty = selectedDashboardNewsId === null
  const rqtReminders = useMemo(
    () => data.settings.rqtReminders ?? [],
    [data.settings.rqtReminders],
  )
  const editingReminder = editingReminderId
    ? rqtReminders.find((reminder) => reminder.id === editingReminderId)
    : undefined
  const editingReminderExpired = Boolean(
    editingReminder && new Date(editingReminder.dueAt).getTime() <= reminderNow,
  )
  const troubleshootgunFolders = useMemo(
    () => data.settings.troubleshootgunFolders ?? [],
    [data.settings.troubleshootgunFolders],
  )

  useEffect(() => {
    const timer = window.setInterval(() => setReminderNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

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
  const taskTemplateTitleRef = useRef<HTMLInputElement>(null)
  const taskTemplateContentRef = useRef<HTMLTextAreaElement>(null)
  const taskTemplateSectionRefs = useRef<Array<HTMLTextAreaElement | null>>([])
  const dashboardNewsContentRef = useRef<HTMLTextAreaElement>(null)
  const callModalBackdropPointerDownRef = useRef(false)

  callDraftLengthRef.current = callDraft.length
  const undoStackRef = useRef<AppData[]>([])
  const redoStackRef = useRef<AppData[]>([])
  const lastCommittedDataRef = useRef<AppData>(cloneAppData(defaultData))
  const historyReadyRef = useRef(false)
  const skipNextHistoryRef = useRef(false)
  const isApplyingHistoryRef = useRef(false)
  const previousLoadedRef = useRef(loaded)

  const persistCallDraft = useCallback((contentOverride?: string) => {
    const source = contentOverride ?? callDraft
    const content = getMeaningfulCallDraft(source, callTemplate)
    if (!content) return null

    const id = callEntryId ?? createId('call')
    const createdAt = callOpenedAt ?? new Date().toISOString()
    const entry = { id, content, createdAt }

    if (popupTool === 'call') {
      // The call window never saves the data itself: the main window does,
      // so the drafts it holds are never replaced by an older copy.
      void window.agentor?.sendToMain?.({ type: 'call-save', entry })
    } else {
      setData((prev) => ({
        ...prev,
        callHistory: [entry, ...prev.callHistory.filter((item) => item.id !== id)].slice(
          0,
          CALL_HISTORY_LIMIT,
        ),
      }))
    }

    if (!callEntryId) {
      setCallEntryId(id)
    }

    return content
  }, [callDraft, callEntryId, callOpenedAt, callTemplate, popupTool])

  const handleSelectWorkspaceDashboardPage = useCallback(
    (page: WorkspaceDashboardPage) => {
      setWorkspaceDashboardPage(page)
    },
    [],
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
    hiddenFromLists: false,
    content: '',
    kind: 'f-task',
    taskTitle: '',
    taskSections: ['', '', '', ''],
    categoryId:
      defaultData.settings.taskTemplateCategories.find(
        (category) => category.kind === 'f-task',
      )?.id ?? '',
    favorite: false,
  })
  const [templateCategoryDraft, setTemplateCategoryDraft] = useState<MailTemplateCategory>({
    id: '',
    name: '',
  })
  const [taskTemplateCategoryDraft, setTaskTemplateCategoryDraft] =
    useState<TaskTemplateCategory>({
      id: '',
      name: '',
      kind: 'f-task',
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
  const mailTemplateCategories = useMemo(
    () => normalizeMailTemplateCategories(data.settings.mailTemplateCategories),
    [data.settings.mailTemplateCategories],
  )
  const taskTemplateCategories = useMemo(
    () => normalizeTaskTemplateCategories(data.settings.taskTemplateCategories),
    [data.settings.taskTemplateCategories],
  )
  const sTaskTemplateCategories = useMemo(
    () => taskTemplateCategories.filter((category) => category.kind === 's-task'),
    [taskTemplateCategories],
  )
  const fTaskTemplateCategories = useMemo(
    () => taskTemplateCategories.filter((category) => category.kind === 'f-task'),
    [taskTemplateCategories],
  )
  const settingsTaskTemplateKind: TaskTemplateKind =
    editTab === 'sTasks' || editTab === 'sTaskCategories' ? 's-task' : 'f-task'
  const settingsTaskTemplateCategories =
    settingsTaskTemplateKind === 's-task'
      ? sTaskTemplateCategories
      : fTaskTemplateCategories
  const settingsTaskTemplates = useMemo(
    () =>
      data.taskTemplates.filter(
        (task) => normalizeTaskTemplateKind(task) === settingsTaskTemplateKind,
      ),
    [data.taskTemplates, settingsTaskTemplateKind],
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
    (kind: TaskTemplateKind = 'f-task') => {
      const categories =
        kind === 's-task' ? sTaskTemplateCategories : fTaskTemplateCategories
      return {
        id: '',
        name: '',
        content: '',
        kind,
        taskTitle: '',
        taskSections: ['', '', '', ''],
        taskSectionId: kind === 'f-task' ? 'section-3' : undefined,
        categoryId: categories[0]?.id ?? '',
        favorite: false,
        hiddenFromLists: false,
      } as TaskTemplate
    },
    [fTaskTemplateCategories, sTaskTemplateCategories],
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
    (
      focusField = true,
      kind: TaskTemplateKind = editTab === 'sTasks' ? 's-task' : 'f-task',
    ) => {
      setTagSuggestionState(null)
      clearSettingsValidationTouched('task')
      setTaskDraft(getEmptyTaskDraft(kind))
      setSelectedTaskId('new')
      if (focusField) {
        requestAnimationFrame(() => taskTemplateNameRef.current?.focus())
      }
    },
    [clearSettingsValidationTouched, editTab, getEmptyTaskDraft],
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
        const next = mergeSeedIntoData(normalizeTaskSectionsInData(normalizeDashboardData(loadedData)), defaultData)
        // A secondary window shows what it just read without saving it back:
        // a late save of that copy would undo what the main window typed since.
        if (isSecondaryWindow) externalDataRef.current = next
        setData(next)
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
  }, [isSecondaryWindow])

  useEffect(() => {
    // A popup (Troubleshotgun, call) only reads the data: the main window saves.
    if (!loaded || popupTool) return
    if (data === externalDataRef.current) return
    const handle = window.setTimeout(() => saveData(data), 600)
    return () => window.clearTimeout(handle)
  }, [data, loaded, popupTool])

  useEffect(
    () =>
      onExternalDataChange((incoming) => {
        const next = mergeSeedIntoData(
          normalizeTaskSectionsInData(normalizeDashboardData(incoming)),
          defaultData,
        )
        externalDataRef.current = next
        setData(next)
      }),
    [],
  )

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
    setSelectedProductCatalogId(null)
    setSelectedDashboardNewsId(null)
    setSelectedDashboardNewsId(null)
    setClearAllArmed(false)
    setCategoryDraft(getEmptyCategoryDraft())
    setSnippetDraft(getEmptySnippetDraft())
    setTemplateDraft(getEmptyTemplateDraft())
    setTaskDraft(getEmptyTaskDraft())
    setProductDraft(getEmptyProductDraft())
    setProductTagsDraftText('')
    setDashboardNewsDraft(getEmptyDashboardNewsDraft())
    setTemplateCategoryDraft({ id: '', name: '' })
    setTemplateCategoryDraft({ id: '', name: '' })
  }, [
    editOpen,
    editTab,
    getEmptyCategoryDraft,
    getEmptyDashboardNewsDraft,
    getEmptySnippetDraft,
    getEmptyProductDraft,
    getEmptyTemplateDraft,
    getEmptyTaskDraft,
  ])

  useEffect(() => {
    if (!editOpen) {
      setTagSuggestionState(null)
      return
    }
    setTagSuggestionState(null)
  }, [editOpen, editTab])

  useEffect(() => {
    if (editOpen || isSecondaryWindow || data.settings.autoFocusEditor === false) return
    const handle = window.requestAnimationFrame(() => {
      emailEditorRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(handle)
  }, [editOpen, isSecondaryWindow, data.settings.autoFocusEditor])

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
  const appZoom = zoomValue > 0 ? zoomValue : 1
  const getWindowViewport = useCallback(
    () => ({ width: window.innerWidth / appZoom, height: window.innerHeight / appZoom }),
    [appZoom],
  )
  const caseContextState = useCaseContext()
  const caseTags = useMemo(() => resolveCaseTags(data.settings.caseTags), [data.settings.caseTags])
  const caseAutoFill = data.settings.caseAutoFill !== false
  const productAliases = useMemo(
    () => normalizeProductAliases(data.settings.productAliases),
    [data.settings.productAliases],
  )
  // The case as Agentor uses it: product name shortened by the alias list.
  const activeCase = useMemo(
    () => applyProductAliases(caseContextState.context, productAliases),
    [caseContextState.context, productAliases],
  )
  // What the user keeps from Cairm+ (Paramètres › Données importées).
  const caseImport = useMemo(() => resolveCaseImport(data.settings.caseImport), [data.settings.caseImport])
  // Main window: a case bar and one tab per case (see lib/caseTabs.ts). The
  // detached and procedure windows show a single dashboard page.
  const mainWindow = !detachedKind && !isProcedureWindow && !popupTool
  // Dashboards, Troubleshotgun and the call each open in their own window.
  const separateWindows = mainWindow && canDetach && data.settings.separateWindows !== false
  const [caseTabs, setCaseTabs] = useState<CaseTabsState>(readStoredCaseTabs)
  // Contextual panel (new interface): what it shows, newest last.
  const [panelStack, setPanelStack] = useState<PanelItem[]>([])
  // On a narrow window the panel takes the library's place; Ctrl+K puts the
  // library back without closing what the panel holds.
  const [panelHidden, setPanelHidden] = useState(false)
  // Library item open in the panel's quick editor.
  const [editTarget, setEditTarget] = useState<LibraryEditTarget | null>(null)
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === 'undefined' ? 1920 : window.innerWidth))
  const referencesInPanel = mainWindow && data.settings.referencesInPanel !== false
  const panelItem = mainWindow && !panelHidden && currentPanelItem(panelStack) !== 'ref:case' ? currentPanelItem(panelStack) : null
  // Read at each render: the resize listener only makes sure there is one.
  const panelNarrow = (typeof window === 'undefined' ? viewportWidth : window.innerWidth) < PANEL_WIDE_MIN_WIDTH
  const showInPanel = useCallback((item: PanelItem) => {
    setPanelHidden(false)
    setPanelStack((prev) => showPanelItem(prev, item))
  }, [])
  const [caseTabCloseArmed, setCaseTabCloseArmed] = useState<string | null>(null)
  const activeTab = activeCaseTab(caseTabs)
  // The case the drafts are filled with: in the new interface, the active tab's case.
  const tabCase = mainWindow ? caseForTab(activeTab, activeCase) : activeCase
  const workingCase = useMemo(() => (tabCase ? withoutUnimported(tabCase, caseImport) : null), [caseImport, tabCase])
  // Product of the tab's case for the library: its name in the mails and in the CRM.
  const workingProductName = workingCase?.fields.productName?.value ?? ''
  const workingProductCrmName = workingCase?.fields.productName?.aliasOf ?? ''
  const workingProductNames = useMemo(
    () => [workingProductName, workingProductCrmName].filter(Boolean),
    [workingProductCrmName, workingProductName],
  )
  // Applied to anything loaded into the drafts (template, task, snippet): the
  // case tags with a known value are replaced, the others stay visible.
  const fillLoadedText = useCallback(
    (text: string) => {
      if (!caseAutoFill || !workingCase || !text) return text
      return fillTemplateFromContext(text, workingCase, caseTags).text
    },
    [workingCase, caseAutoFill, caseTags],
  )
  const previewOpen = templatePreview !== null
  useEffect(() => {
    if (!previewOpen) setPanelStack((prev) => closePanelItem(prev, 'preview'))
  }, [previewOpen])
  useEffect(() => {
    if (!troubleshootgunOpen) setPanelStack((prev) => closePanelItem(prev, 'troubleshootgun'))
  }, [troubleshootgunOpen])
  useEffect(() => {
    if (!callModalOpen) setPanelStack((prev) => closePanelItem(prev, 'call'))
  }, [callModalOpen])
  useEffect(() => {
    if (!editTarget) setPanelStack((prev) => closePanelItem(prev, 'edit'))
  }, [editTarget])
  useEffect(() => {
    const track = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', track)
    return () => window.removeEventListener('resize', track)
  }, [])
  // Ctrl+K on a narrow window: the library comes back over the panel, which
  // keeps its content for the next result opened.
  useEffect(() => {
    if (!panelItem || !panelNarrow) return
    const handleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') setPanelHidden(true)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [panelItem, panelNarrow])
  const isDashboardShown = (kind: WorkspaceDashboardPage) =>
    isProcedureWindow
      ? workspaceDashboardPage === kind
      : detachedKind
        ? detachedKind === kind
        : windowLayout.windows.some((item) => item.kind === kind && !item.minimized) ||
          panelItem === `ref:${kind}`
  const portalDashboardShown = isDashboardShown('portal')
  const partsDashboardShown = isDashboardShown('parts')
  const catalogDashboardShown = isDashboardShown('catalog')

  useEffect(() => {
    if (isSecondaryWindow) return
    try {
      window.localStorage.setItem(WINDOW_LAYOUT_STORAGE_KEY, JSON.stringify(windowLayout))
    } catch {
      // Layout is a convenience: losing it only reopens windows at their defaults.
    }
  }, [isSecondaryWindow, windowLayout])

  useEffect(() => {
    if (isSecondaryWindow) return
    const fit = () => setWindowLayout((prev) => fitLayout(prev, getWindowViewport()))
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [getWindowViewport, isSecondaryWindow])

  // Detached dashboards: the main window tracks them and takes one back when
  // it is re-attached from its own window.
  useEffect(() => {
    const api = window.agentor
    if (isSecondaryWindow || !api?.listDetachedDashboards) return
    const accept = (value: unknown) =>
      setDetachedKinds(
        Array.isArray(value)
          ? (value.filter((kind) => DASHBOARD_WINDOW_KINDS.includes(kind)) as DashboardWindowKind[])
          : [],
      )
    void api.listDetachedDashboards().then(accept)
    const offList = api.onDetachedDashboards?.(accept)
    const offAttach = api.onAttachRequest?.((kind) => {
      if (!DASHBOARD_WINDOW_KINDS.includes(kind as DashboardWindowKind)) return
      setWindowLayout((prev) => openWindow(prev, kind as DashboardWindowKind, getWindowViewport()))
    })
    return () => {
      offList?.()
      offAttach?.()
    }
  }, [getWindowViewport, isSecondaryWindow])

  const handleDetachDashboard = useCallback(
    (kind: DashboardWindowKind) => {
      setWindowLayout((prev) => closeWindow(prev, kind))
      void window.agentor?.detachDashboard?.(kind)
    },
    [],
  )

  const handleToggleDashboardWindow = useCallback(
    (kind: DashboardWindowKind) => {
      if (detachedKinds.includes(kind) || (separateWindows && !windowLayout.windows.some((item) => item.kind === kind))) {
        void window.agentor?.detachDashboard?.(kind)
        return
      }
      // References open in the panel unless they already float in a window.
      if (referencesInPanel && !windowLayout.windows.some((item) => item.kind === kind)) {
        setPanelHidden(false)
        setPanelStack((prev) => togglePanelReference(prev, kind))
        return
      }
      setWindowLayout((prev) => toggleWindow(prev, kind, getWindowViewport()))
    },
    [detachedKinds, getWindowViewport, referencesInPanel, separateWindows, windowLayout.windows],
  )
  // Brings a dashboard into view without closing it when it is already open.
  const showDashboardWindow = useCallback(
    (kind: DashboardWindowKind) => {
      if (detachedKinds.includes(kind) || (separateWindows && !windowLayout.windows.some((item) => item.kind === kind))) {
        void window.agentor?.detachDashboard?.(kind)
        return
      }
      if (referencesInPanel && !windowLayout.windows.some((item) => item.kind === kind)) {
        showInPanel(referenceItem(kind))
        return
      }
      setWindowLayout((prev) => openWindow(prev, kind, getWindowViewport()))
    },
    [detachedKinds, getWindowViewport, referencesInPanel, separateWindows, showInPanel, windowLayout.windows],
  )
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
  const openSettingsTab = useCallback(
    (tab: SettingsTab) => {
      setEditTab(tab)
      if (tab === 'sTasks' || tab === 'fTasks') {
        const kind: TaskTemplateKind = tab === 'sTasks' ? 's-task' : 'f-task'
        clearSettingsValidationTouched('task')
        setSelectedTaskId(null)
        setTaskDraft(getEmptyTaskDraft(kind))
      }
      if (tab === 'sTaskCategories' || tab === 'fTaskCategories') {
        setTaskTemplateCategoryDraft({
          id: '',
          name: '',
          kind: tab === 'sTaskCategories' ? 's-task' : 'f-task',
        })
      }
    },
    [clearSettingsValidationTouched, getEmptyTaskDraft],
  )
  const filteredSettingsNavigation = useMemo(() => {
    const query = settingsSearch.trim().toLocaleLowerCase('fr')
    if (!query) return settingsNavigation
    return settingsNavigation
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          `${item.label} ${item.description} ${section.label}`.toLocaleLowerCase('fr').includes(query),
        ),
      }))
      .filter((section) => section.items.length > 0)
  }, [settingsSearch])
  const settingsCounts: Record<SettingsCountKey, number> = {
    templates: data.templates.length,
    snippets: data.snippets.length,
    sTasks: data.taskTemplates.filter((task) => normalizeTaskTemplateKind(task) === 's-task').length,
    fTasks: data.taskTemplates.filter((task) => normalizeTaskTemplateKind(task) === 'f-task').length,
    troubleshootgun: troubleshootgunFolders.length,
    procedures: customerPortalCodes.length,
    products: productCatalog.length,
    news: dashboardNews.length,
  }
  const relatedSettingsTabs = (settingsRelatedTabs[editTab] ?? [])
    .map((tabId) => settingsTabIndex.find((tab) => tab.id === tabId))
    .filter((tab): tab is (typeof settingsTabIndex)[number] => Boolean(tab))
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
      map.set(category.id, categoryColorMap.get(category.color) ?? '#977EE1')
    })
    return map
  }, [data.categories])
  const predefinedTags = useMemo(
    () => normalizePredefinedTags(data.settings.predefinedTags ?? defaultData.settings.predefinedTags),
    [data.settings.predefinedTags],
  )
  const contentsKnownTags = useMemo(
    () => Array.from(new Set([...predefinedTags, ...Object.values(caseTags)])),
    [caseTags, predefinedTags],
  )
  const contentsCategories = useMemo<Record<ContentType, Array<{ id: string; name: string }>>>(
    () => ({
      template: mailTemplateCategories,
      snippet: data.categories,
      's-task': sTaskTemplateCategories,
      'f-task': fTaskTemplateCategories,
    }),
    [data.categories, fTaskTemplateCategories, mailTemplateCategories, sTaskTemplateCategories],
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
  const dashboardNewsDraftIssues = useMemo(
    () => getDashboardNewsIssues(dashboardNewsDraft),
    [dashboardNewsDraft],
  )
  const settingsIssueCounts = useMemo<Partial<Record<SettingsTab, number>>>(() => {
    return {
      categories: data.categories.filter((category) => getCategoryIssues(category).length).length,
      snippets: data.snippets.filter((snippet) => getSnippetIssues(snippet, categoryIdSet).length)
        .length,
      templates: data.templates.filter(
        (template) => getMailTemplateIssues(template, taskTemplateIdSet).length,
      ).length,
      sTasks: data.taskTemplates.filter(
        (task) =>
          normalizeTaskTemplateKind(task) === 's-task' &&
          getTaskTemplateIssues(task).length,
      ).length,
      fTasks: data.taskTemplates.filter(
        (task) =>
          normalizeTaskTemplateKind(task) === 'f-task' &&
          getTaskTemplateIssues(task).length,
      ).length,
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
    // Case tags are always offered, next to the user's own tags.
    const pool = Array.from(new Set([...predefinedTags, ...Object.values(caseTags)]))
    const matches = pool.filter((tag) => {
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
  }, [caseTags, predefinedTags, tagSuggestionState])
  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setData((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
  }, [])
  useEffect(() => {
    const newlyExpired = rqtReminders.filter(
      (reminder) => !reminder.notifiedAt && new Date(reminder.dueAt).getTime() <= reminderNow,
    )
    if (!newlyExpired.length) return
    const allExpired = rqtReminders.filter(
      (reminder) => new Date(reminder.dueAt).getTime() <= reminderNow,
    )
    setExpiredReminders(allExpired)
    const newlyExpiredIds = new Set(newlyExpired.map((reminder) => reminder.id))
    updateSettings({
      rqtReminders: rqtReminders.map((reminder) =>
        newlyExpiredIds.has(reminder.id)
          ? { ...reminder, notifiedAt: new Date().toISOString() }
          : reminder,
      ),
    })
  }, [reminderNow, rqtReminders, updateSettings])
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
    const kind: TaskTemplateKind =
      editTab === 'sTaskCategories' ? 's-task' : 'f-task'
    const exists = taskTemplateCategories.some(
      (category) =>
        category.id === taskTemplateCategoryDraft.id && category.kind === kind,
    )
    const id = exists ? taskTemplateCategoryDraft.id : createId('task-template-cat')
    const savedCategory: TaskTemplateCategory = { id, name, kind }
    updateSettings({
      taskTemplateCategories: exists
        ? taskTemplateCategories.map((category) =>
            category.id === id ? savedCategory : category,
          )
        : [...taskTemplateCategories, savedCategory],
    })
    setTaskTemplateCategoryDraft({ id: '', name: '', kind })
    setToast(`Catégorie ${kind === 's-task' ? 'S-Task' : 'F-Task'} enregistrée.`)
  }, [editTab, taskTemplateCategories, taskTemplateCategoryDraft, updateSettings])
  const deleteTaskTemplateCategory = useCallback(
    (categoryId: string) => {
      const deletedCategory = taskTemplateCategories.find(
        (category) => category.id === categoryId,
      )
      const kind = deletedCategory?.kind === 's-task' ? 's-task' : 'f-task'
      const fallbackId =
        taskTemplateCategories.find(
          (category) => category.id !== categoryId && category.kind === kind,
        )?.id ?? ''
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
              Aucun tag prédéfini correspondant.
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

  const activeDashboardCatalogProduct = useMemo(
    () =>
      dashboardCatalogProductResults.find(
        (product) => product.id === activeDashboardCatalogProductId,
      ) ?? null,
    [activeDashboardCatalogProductId, dashboardCatalogProductResults],
  )
  const dashboardPortalProcedures = useMemo(() => customerPortalCodes, [customerPortalCodes])
  // Search bars of the mail and task zones (the library has its own).
  const sectionSearchEntries = useMemo(
    () =>
      buildSearchEntries({
        snippets: [],
        templates: data.templates,
        troubleshootgunFolders,
        taskTemplates: data.taskTemplates,
        procedures: [],
        taskKind: normalizeTaskTemplateKind,
      }),
    [data.taskTemplates, data.templates, troubleshootgunFolders],
  )
  const mailSearchEntries = useMemo(
    (): SearchEntry[] => sectionSearchEntries.filter((entry) => entry.kind === 'template'),
    [sectionSearchEntries],
  )
  const taskSearchEntries = useMemo(
    (): SearchEntry[] => sectionSearchEntries.filter((entry) => entry.kind === 's-task' || entry.kind === 'f-task'),
    [sectionSearchEntries],
  )
  const workingProductTerms = useMemo(() => productSearchTerms(workingProductNames), [workingProductNames])
  const activeDashboardPortalProcedure = useMemo(
    () =>
      dashboardPortalProcedures.find(
        (procedure) => procedure.id === activeDashboardPortalProcedureId,
      ) ?? null,
    [activeDashboardPortalProcedureId, dashboardPortalProcedures],
  )

  useEffect(() => {
    if (!catalogDashboardShown) return
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
    catalogDashboardShown,
  ])

  useEffect(() => {
    if (!catalogDashboardShown) return
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
    catalogDashboardShown,
  ])

  useEffect(() => {
    if (!portalDashboardShown) return

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
  }, [activeDashboardPortalProcedureId, dashboardPortalProcedures, portalDashboardShown])

  // The Procédures window, when separate, opens on the procedure picked in
  // the main window, and follows the next picks while it stays open.
  useEffect(() => {
    // After loading, and declared after the effect above so that its
    // « first procedure » fallback does not win over the pick.
    if (detachedKind !== 'portal' || !loaded) return
    const pick = (raw: string | null, maxAge: number) => {
      try {
        const value = raw ? (JSON.parse(raw) as { id?: unknown; at?: unknown }) : null
        if (value && typeof value.id === 'string' && typeof value.at === 'number' && Date.now() - value.at < maxAge) {
          setActiveDashboardPortalProcedureId(value.id)
        }
      } catch {
        // Unreadable value: keep the current procedure.
      }
    }
    try {
      pick(window.localStorage.getItem(PORTAL_PROCEDURE_STORAGE_KEY), 15_000)
    } catch {
      // No storage: nothing was picked.
    }
    const onStorage = (event: StorageEvent) => {
      if (event.key === PORTAL_PROCEDURE_STORAGE_KEY) pick(event.newValue, 60_000)
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [detachedKind, loaded])

  useEffect(() => {
    if (!partsDashboardShown) return

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
  }, [activeDashboardSpareProductId, filteredProductsWithSpareParts, partsDashboardShown])

  const setLibraryFilter = (tab: string, patch: Partial<LibraryFilter>) =>
    setLibraryFilters((prev) => ({ ...prev, [tab]: { ...(prev[tab] ?? emptyLibraryFilter), ...patch } }))
  const snippetQuery = libraryFilters.snippets?.query ?? ''
  const templateFilter = libraryFilters.templates ?? emptyLibraryFilter
  const taskFilter = libraryFilters[settingsTaskTemplateKind] ?? emptyLibraryFilter
  const editSnippets = useMemo(
    () =>
      filterLibraryItems(
        data.snippets,
        { query: snippetQuery, category: editSnippetCategoryId },
        {
          text: (snippet) => `${snippet.title} ${snippet.content} ${snippet.taskText ?? ''}`,
          categoryId: (snippet) => snippet.categoryId,
        },
      ),
    [data.snippets, editSnippetCategoryId, snippetQuery],
  )
  const libraryTemplates = useMemo(
    () =>
      filterLibraryItems(data.templates, templateFilter, {
        text: (template) => `${template.name} ${template.description ?? ''} ${template.content}`,
        categoryId: (template) => template.categoryId,
        favorite: (template) => Boolean(template.favorite),
      }),
    [data.templates, templateFilter],
  )
  const libraryTaskTemplates = useMemo(
    () =>
      filterLibraryItems(settingsTaskTemplates, taskFilter, {
        text: (task) => `${task.name} ${task.content} ${(task.taskSections ?? []).join(' ')}`,
        categoryId: (task) => task.categoryId,
        favorite: (task) => Boolean(task.favorite),
      }),
    [settingsTaskTemplates, taskFilter],
  )
  const categoryPreviewSnippets = useMemo(
    () => data.snippets.filter((snippet) => snippet.categoryId === categoryDraft.id),
    [categoryDraft.id, data.snippets],
  )

  const templateUsesCustomTask =
    templateDraft.taskCustom ?? (!!templateDraft.taskText && !templateDraft.taskTemplateId)
  const templateTaskMode = templateDraft.taskImportMode ?? (
    templateDraft.taskOptional
      ? 'none'
      : templateUsesCustomTask
        ? 'custom'
        : templateDraft.taskTemplateId
          ? 'template'
          : 'none'
  )
  const taskTemplateKind = normalizeTaskTemplateKind(taskDraft)
  const taskTemplateSections = normalizeTaskTemplateSections(taskDraft)

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
    if (taskTemplateActiveField === 'title') {
      insertTokenAtCursor(taskTemplateTitleRef, taskDraft.taskTitle ?? '', (next) =>
        setTaskDraft((prev) => ({ ...prev, taskTitle: next })),
      token)
      return
    }
    if (taskTemplateActiveField !== 'content') {
      const sectionIndex = getTaskSectionIndex(taskTemplateActiveField)
      insertTokenAtCursor(
        { current: taskTemplateSectionRefs.current[sectionIndex] },
        taskTemplateSections[sectionIndex] ?? '',
        (next) =>
          setTaskDraft((prev) => {
            const nextSections = normalizeTaskTemplateSections(prev)
            nextSections[sectionIndex] = next
            return { ...prev, taskSections: nextSections }
          }),
        token,
      )
      return
    }
    insertTokenAtCursor(
      taskTemplateContentRef,
      taskDraft.content,
      (next) => setTaskDraft((prev) => ({ ...prev, content: next })),
      token,
    )
  }

  const insertCallTemplateToken = (token: string) => {
    insertTokenAtCursor(callTemplateRef, callTemplate, updateCallTemplate, token, true)
  }

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
        ? stripLegacyTaskNumbering(structuredNext, taskSectionNames)
        : structuredNext
      const normalizedMarkedValue = normalizeTokenSpacing(timelineNext)
      const nextCursor = normalizedMarkedValue.indexOf(marker)
      return {
        value: normalizedMarkedValue.replace(marker, ''),
        cursor: nextCursor === -1 ? safeCursor : nextCursor,
      }
    },
    [taskSectionNames],
  )

  const updateTaskDraft = useCallback(
    (next: string, cursor?: number, useSkeleton = taskDraftSkeletonEnabled) => {
      const structuredNext = useSkeleton ? ensureStructuredTaskDraft(next, taskSectionNames) : next
      const timelineNext = useSkeleton
        ? stripLegacyTaskNumbering(structuredNext, taskSectionNames)
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
      taskSectionNames,
    ],
  )

  useEffect(() => {
    if (!taskDraftSkeletonEnabled) return
    setData((prev) => {
      const nextTaskDraft = stripLegacyTaskNumbering(ensureStructuredTaskDraft(prev.taskDraft, taskSectionNames), taskSectionNames)
      if (nextTaskDraft === prev.taskDraft) return prev
      return { ...prev, taskDraft: nextTaskDraft }
    })
  }, [taskDraftSkeletonEnabled, taskSectionNames])

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
      Array.from({ length: TASK_BOX_COUNT }, (_, index) => {
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
      // The timeline is chronological: a step may come back later, so only an
      // immediate repeat is skipped. Other sections hold each fragment once.
      const isTimeline = sectionIndex === 1
      const alreadyPresent = isTimeline
        ? taskSectionEndsWithFragment(currentSection, text)
        : taskSectionHasFragment(currentSection, text)
      const next = alreadyPresent
        ? skeletonSource
        : insertTaskTextInSection(skeletonSource, text, sectionId, taskSectionNames)

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

  const buildTaskBoxPreviewHtml = useCallback(
    (slot: TaskBoxSlot, index: number) => {
      const task = stripTokenSpacing(slot.task).trim()
      if (!hasTaskBoxContent(task, index)) {
        return '<div class="draft-box-tooltip__empty">Aucune task sauvegardée.</div>'
      }
      return `
        <div class="draft-box-tooltip__section">
          <div class="draft-box-tooltip__label">${
            taskBoxUsesSkeleton(index) ? 'S-Task' : 'F-Task'
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
      const normalizedTask = useSkeleton
        ? normalizeTokenSpacing(
            stripLegacyTaskNumbering(ensureStructuredTaskDraft(nextTask, taskSectionNames), taskSectionNames),
          )
        : normalizeTokenSpacing(nextTask)
      setTaskDraftBoxes(nextBoxes)
      setActiveTaskBoxIndex(index)
      setTaskDraftSkeletonEnabled(useSkeleton)
      setData((prev) =>
        prev.taskDraft === normalizedTask ? prev : { ...prev, taskDraft: normalizedTask },
      )
      closeDraftBoxTooltip()
      requestAnimationFrame(() => {
        taskEditorRef.current?.setSelection(normalizedTask.length, normalizedTask.length)
        taskEditorRef.current?.focus()
      })
    },
    [
      activeTaskBoxIndex,
      closeDraftBoxTooltip,
      getTaskBoxesSnapshot,
      taskSectionNames,
    ],
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

  // Case tabs. The active tab's content is the live drafts; switching saves
  // them in the tab being left and restores the other tab, like a draft box.
  const isWorkspaceFilled = useCallback(
    (slot: DraftBoxSlot) =>
      Boolean(
        slot.email.trim() ||
          (slot.notes ?? '').trim() ||
          hasTaskBoxContent(slot.task, slot.activeTaskBoxIndex ?? 0) ||
          (slot.taskBoxes ?? []).some((box, boxIndex) => hasTaskBoxContent(box.task, boxIndex)),
      ),
    [hasTaskBoxContent],
  )

  const snapshotWorkspace = useCallback((): DraftBoxSlot => {
    const taskBoxes = getTaskBoxesSnapshot()
    const task = taskBoxes[activeTaskBoxIndex]?.task ?? ''
    return {
      email: data.emailDraft,
      notes: data.notes,
      task: hasTaskBoxContent(task, activeTaskBoxIndex) ? task : '',
      taskSkeletonEnabled: taskBoxUsesSkeleton(activeTaskBoxIndex),
      taskBoxes,
      activeTaskBoxIndex,
      savedAt: new Date().toISOString(),
    }
  }, [activeTaskBoxIndex, data.emailDraft, data.notes, getTaskBoxesSnapshot, hasTaskBoxContent])

  const restoreWorkspace = useCallback(
    (slot: DraftBoxSlot) => {
      const activeIndex = Math.max(0, Math.min(TASK_BOX_COUNT - 1, slot.activeTaskBoxIndex ?? 0))
      const restoredTaskBoxes = Array.from({ length: TASK_BOX_COUNT }, (_, taskBoxIndex) => ({
        ...createEmptyTaskBoxSlot(),
        ...(slot.taskBoxes?.[taskBoxIndex] ?? {}),
      }))
      const activeTask = restoredTaskBoxes[activeIndex]?.task || slot.task || ''
      const useSkeleton = taskBoxUsesSkeleton(activeIndex)
      updateEmailDraft(slot.email, slot.email.length)
      setData((prev) => ({ ...prev, notes: slot.notes ?? '' }))
      setTaskDraftBoxes(restoredTaskBoxes)
      setActiveTaskBoxIndex(activeIndex)
      setTaskDraftSkeletonEnabled(useSkeleton)
      updateTaskDraft(activeTask, activeTask.length, useSkeleton)
      closeDraftBoxTooltip()
    },
    [closeDraftBoxTooltip, updateEmailDraft, updateTaskDraft],
  )

  const switchCaseTab = useCallback(
    (tabId: string) => {
      if (tabId === caseTabs.activeId) return
      const target = caseTabs.tabs.find((tab) => tab.id === tabId)
      if (!target) return
      const current = snapshotWorkspace()
      setCaseTabs((prev) => setActiveCaseTab(saveTabWorkspace(prev, prev.activeId, current), tabId))
      setCaseTabCloseArmed(null)
      restoreWorkspace(target.workspace)
    },
    [caseTabs, restoreWorkspace, snapshotWorkspace],
  )

  const openCaseTab = useCallback(
    (caseKey: CaseTabKey | null) => {
      if (caseTabs.tabs.length >= CASE_TABS_LIMIT) {
        setToast(`${CASE_TABS_LIMIT} onglets au maximum : ferme un dossier terminé.`)
        return false
      }
      const current = snapshotWorkspace()
      const tab = createCaseTab(caseKey)
      setCaseTabs((prev) => addCaseTab(saveTabWorkspace(prev, prev.activeId, current), tab))
      setCaseTabCloseArmed(null)
      restoreWorkspace(tab.workspace)
      return true
    },
    [caseTabs.tabs.length, restoreWorkspace, snapshotWorkspace],
  )

  const closeCaseTab = useCallback(
    (tabId: string) => {
      const tab = caseTabs.tabs.find((item) => item.id === tabId)
      if (!tab) return
      if (tab.locked) {
        setToast('Onglet verrouillé : déverrouille-le avec le cadenas pour le fermer.')
        return
      }
      const isActive = tabId === caseTabs.activeId
      const filled = isWorkspaceFilled(isActive ? snapshotWorkspace() : tab.workspace)
      if (filled && caseTabCloseArmed !== tabId) {
        setCaseTabCloseArmed(tabId)
        window.setTimeout(() => setCaseTabCloseArmed((armed) => (armed === tabId ? null : armed)), 2500)
        setToast('Cet onglet contient un brouillon : clique encore sur la croix pour le fermer.')
        return
      }
      setCaseTabCloseArmed(null)
      const next = removeCaseTab(caseTabs, tabId)
      setCaseTabs(next)
      if (next.activeId !== caseTabs.activeId) restoreWorkspace(activeCaseTab(next).workspace)
    },
    [caseTabCloseArmed, caseTabs, isWorkspaceFilled, restoreWorkspace, snapshotWorkspace],
  )

  useEffect(() => {
    if (mainWindow) writeStoredCaseTabs(caseTabs)
  }, [caseTabs, mainWindow])

  // Case values that arrive after a template was loaded fill its tags too, so
  // there is no « Remplir » button. Only a change of the values triggers it
  // (not a new copy of the same case), and typing never refills.
  const workingCaseValues = workingCase
    ? JSON.stringify([workingCase.caseKey.id, workingCase.fields, workingCase.lastTask ?? null])
    : ''
  const workingCaseRef = useRef(workingCase)
  workingCaseRef.current = workingCase
  useEffect(() => {
    const context = workingCaseRef.current
    // Only the main window fills: it is the one that saves the drafts.
    if (!mainWindow || !caseAutoFill || !context || !workingCaseValues) return
    const fill = (text: string) => {
      const filled = fillTemplateFromContext(text, context, caseTags).text
      return filled === text ? text : normalizeTokenSpacing(filled)
    }
    setData((prev) => {
      const emailDraft = fill(prev.emailDraft)
      const taskDraft = fill(prev.taskDraft)
      return emailDraft === prev.emailDraft && taskDraft === prev.taskDraft ? prev : { ...prev, emailDraft, taskDraft }
    })
  }, [caseAutoFill, caseTags, mainWindow, workingCaseValues])

  // Keeps the last values seen for each case in its tab.
  useEffect(() => {
    if (mainWindow && activeCase) setCaseTabs((prev) => rememberCaseContext(prev, activeCase))
  }, [activeCase, mainWindow])

  // A case opened in the CRM goes to its own tab.
  const lastArrivedCaseIdRef = useRef<string | null>(null)
  useEffect(() => {
    if (!mainWindow || !loaded || !activeCase) return
    const caseId = activeCase.caseKey.id
    if (caseId === lastArrivedCaseIdRef.current) return
    const caseKey = { id: caseId, number: activeCase.caseKey.number }
    const plan = planCaseReception(caseTabs, caseId, !isWorkspaceFilled(snapshotWorkspace()), caseContextState.origin)
    // The case kept from the last session only takes an empty tab; it never moves away from the tab in use.
    if (plan.kind === 'defer' || plan.kind === 'full') {
      if (plan.kind === 'full') setToast(`${CASE_TABS_LIMIT} onglets ouverts : ferme un dossier terminé pour recevoir celui du CRM.`)
      return
    }
    lastArrivedCaseIdRef.current = caseId
    if (plan.kind === 'switch') switchCaseTab(plan.tabId)
    else if (plan.kind === 'bind') setCaseTabs((prev) => rememberCaseContext(bindCaseTab(prev, plan.tabId, caseKey), activeCase))
    else if (plan.kind === 'create') {
      if (openCaseTab(caseKey)) setCaseTabs((prev) => rememberCaseContext(prev, activeCase))
    }
  }, [activeCase, caseContextState.origin, caseTabs, isWorkspaceFilled, loaded, mainWindow, openCaseTab, snapshotWorkspace, switchCaseTab])

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
    if (editOpen || isSecondaryWindow) return

    const handleContextMenu = (event: PointerEvent) => {
      event.preventDefault()
      toggleMailInsertMode()
    }

    window.addEventListener('contextmenu', handleContextMenu, true)
    return () => window.removeEventListener('contextmenu', handleContextMenu, true)
  }, [editOpen, isSecondaryWindow, toggleMailInsertMode])

  useEffect(() => {
    if (isSecondaryWindow) return
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
    }
    return () => channel.close()
  }, [isSecondaryWindow, taskSectionNames, updateTaskDraft])

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

  // Puts text into the mail at the cursor: on its own line or inside the
  // current one, following the insert mode chosen in the mail header.
  const insertEmailContent = (insertContent: string) => {
    const selection = emailEditorRef.current?.getSelection() ?? {
      start: data.emailDraft.length,
      end: data.emailDraft.length,
    }
    const base = data.emailDraft
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
  }

  const insertSnippet = (snippet: Snippet) => {
    insertEmailContent(padEmptySelectors(fillLoadedText(snippet.content.trimEnd())))
    if (snippet.taskText) {
      insertTaskText(fillLoadedText(snippet.taskText), snippet.taskSectionId)
    }
  }

  const applyTaskTemplate = (template: TaskTemplate) => {
    const useSkeleton = normalizeTaskTemplateKind(template) === 's-task'
    const targetIndex = useSkeleton ? TASK_SKELETON_BOX_INDEX : TASK_FREE_BOX_INDEX
    const nextTaskDraft = fillLoadedText(
      useSkeleton
        ? stripLegacyTaskNumbering(buildTaskDraftFromTemplate(template, taskSectionNames), taskSectionNames)
        : buildTaskTemplateContent(template),
    )
    const snapshot = getTaskBoxesSnapshot()
    setTaskDraftBoxes(
      snapshot.map((slot, index) =>
        index === targetIndex ? { ...slot, task: nextTaskDraft } : slot,
      ),
    )
    setActiveTaskBoxIndex(targetIndex)
    setTaskDraftSkeletonEnabled(useSkeleton)
    updateTaskDraft(nextTaskDraft, nextTaskDraft.length, useSkeleton)
    requestAnimationFrame(() => taskEditorRef.current?.focus())
  }

  const openTemplatePreview = (template: MailTemplate, folderId?: string) => {
    const taskSections = getTemplateTaskSections(template, data.taskTemplates)
    const hasTaskContent = taskSections.some((section) => section.trim())
    const language = pickTemplateLanguage(template, {
      country: workingCase?.fields.country?.value,
      lastChosen: readStoredTemplateLanguage(),
    })
    setTemplatePreview({
      templateId: template.id,
      folderId,
      language,
      selectedEmailLines: getTemplateVersion(template, language)
        .content.split(/\r?\n/)
        .map((line) => Boolean(line.trim())),
      selectedTaskSections: taskSections.map((section) => Boolean(section.trim())),
      importTask: hasTaskContent,
    })
    if (mainWindow) showInPanel('preview')
  }

  const openTroubleshootgun = () => {
    if (separateWindows) {
      void window.agentor?.detachDashboard?.('troubleshootgun')
      return
    }
    if (mainWindow) {
      // In the panel: start on the folder of the case's product when there is one.
      if (!troubleshootgunOpen) {
        const terms = productSearchTerms(workingProductNames)
        const productFolder = troubleshootgunFolders.find((item) =>
          matchesProduct({ kind: 'troubleshootgun', id: item.id, title: item.name, body: '', preview: '' }, terms),
        )
        setSelectedTroubleshootgunFolderId(productFolder?.id ?? null)
        setSelectedTroubleshootgunTemplateId(null)
        setTroubleshootgunOpen(true)
      }
      showInPanel('troubleshootgun')
      return
    }
    const folder =
      troubleshootgunFolders.find((item) => item.id === selectedTroubleshootgunFolderId) ??
      troubleshootgunFolders[0]
    setSelectedTroubleshootgunFolderId(folder?.id ?? null)
    setSelectedTroubleshootgunTemplateId(folder?.templates[0]?.id ?? null)
    setTroubleshootgunOpen(true)
  }

  const toggleTaskTemplateFavorite = (taskId: string) => {
    setData((prev) => ({
      ...prev,
      taskTemplates: prev.taskTemplates.map((task) =>
        task.id === taskId ? { ...task, favorite: !task.favorite } : task,
      ),
    }))
  }

  // 'replace' empties the mail first; 'insert' puts the template at the cursor.
  const importTemplatePreview = (
    mode: 'replace' | 'insert' = 'replace',
    templatePreview: TemplatePreviewState | null = currentTemplatePreview,
  ) => {
    if (!templatePreview) return
    const template = templatePreview.folderId
      ? troubleshootgunFolders.find((folder) => folder.id === templatePreview.folderId)?.templates.find((item) => item.id === templatePreview.templateId)
      : data.templates.find((item) => item.id === templatePreview.templateId)
    if (!template) return

    const emailLines = fillLoadedText(
      getTemplateVersion(template, templatePreview.language)
        .content.split(/\r?\n/)
        .filter((_, index) => templatePreview.selectedEmailLines[index])
        .join('\n')
        .trim(),
    )

    if (emailLines) {
      if (mode === 'insert' && data.emailDraft.replace(/\u200b/g, '').trim()) insertEmailContent(padEmptySelectors(emailLines))
      else updateEmailDraft(padEmptySelectors(emailLines), emailLines.length)
    }

    if (templatePreview.importTask) {
      const templateMode = template.taskImportMode ?? (
        template.taskOptional
          ? 'none'
          : (template.taskCustom ?? (!!template.taskText && !template.taskTemplateId))
            ? 'custom'
            : 'template'
      )
      const taskSections = getTemplateTaskSections(template, data.taskTemplates).map((section, index) =>
        templatePreview.selectedTaskSections[index] ? fillLoadedText(section) : '',
      )
      const linkedTaskTemplate = template.taskTemplateId
        ? data.taskTemplates.find((task) => task.id === template.taskTemplateId)
        : undefined
      if (templateMode === 'custom' || templateMode === 'sections') {
        let nextTaskDraft = data.taskDraft
        taskSections.forEach((section, index) => {
          if (!section.trim()) return
          nextTaskDraft = insertTaskTextInSection(
            nextTaskDraft,
            section,
            TASK_SECTION_IDS[index],
            taskSectionNames,
          )
        })
        updateTaskDraft(nextTaskDraft, nextTaskDraft.length, true)
      } else {
        const useSkeleton =
          linkedTaskTemplate !== undefined &&
          normalizeTaskTemplateKind(linkedTaskTemplate) === 's-task'
        const targetIndex = useSkeleton ? TASK_SKELETON_BOX_INDEX : TASK_FREE_BOX_INDEX
        const nextTaskDraft = useSkeleton
          ? stripLegacyTaskNumbering(buildStructuredTaskDraft(taskSections, taskSectionNames), taskSectionNames)
          : buildTaskTemplateContent({ taskSections })
        const snapshot = getTaskBoxesSnapshot()
        setTaskDraftBoxes(
          snapshot.map((slot, index) =>
            index === targetIndex ? { ...slot, task: nextTaskDraft } : slot,
          ),
        )
        setActiveTaskBoxIndex(targetIndex)
        setTaskDraftSkeletonEnabled(useSkeleton)
        updateTaskDraft(nextTaskDraft, nextTaskDraft.length, useSkeleton)
      }
    }

    setTemplatePreview(null)
    requestAnimationFrame(() => emailEditorRef.current?.focus())
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
      ? formatTaskCopyText(data.taskDraft, taskSectionNames)
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

  const addDashboardCalculatorFee = (label = '') =>
    setDashboardCalculatorFees((prev) => [...prev, createDashboardCalculatorFee(label)])
  const updateDashboardCalculatorFee = (id: string, field: 'label' | 'amount', value: string) =>
    setDashboardCalculatorFees((prev) => prev.map((fee) => (fee.id === id ? { ...fee, [field]: value } : fee)))
  const removeDashboardCalculatorFee = (id: string) =>
    setDashboardCalculatorFees((prev) => prev.filter((fee) => fee.id !== id))

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
    if (separateWindows) {
      void window.agentor?.detachDashboard?.('call')
      return
    }
    // A call already open in the panel is shown again, not restarted.
    if (mainWindow && callModalOpen) {
      showInPanel('call')
      return
    }
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
    if (mainWindow) showInPanel('call')
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
    setToast('Groupe SKU enregistré.')
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

  const renderPortalCodeEditorSettings = () => (
    <PortalCodeEditor
      addCustomerPortalCodeLine={addCustomerPortalCodeLine} customerPortalCodes={customerPortalCodes}
      handleRemovePortalProcedure={handleRemovePortalProcedure}
      handleReorderPortalProcedures={handleReorderPortalProcedures}
      hideCustomerPortalCodeLineModule={hideCustomerPortalCodeLineModule}
      normalizedProcedureMailtos={normalizedProcedureMailtos}
      portalProcedureEditorOpen={portalProcedureEditorOpen}
      portalProcedureVersionMode={portalProcedureVersionMode}
      portalVisibleLineModules={portalVisibleLineModules}
      removeCustomerPortalCodeLine={removeCustomerPortalCodeLine}
      selectedPortalProcedureId={selectedPortalProcedureId}
      setPortalProcedureEditorOpen={setPortalProcedureEditorOpen}
      setPortalProcedureVersionMode={setPortalProcedureVersionMode}
      setSelectedPortalProcedureId={setSelectedPortalProcedureId}
      showCustomerPortalCodeLineModule={showCustomerPortalCodeLineModule}
      updateCustomerPortalCodeLineItem={updateCustomerPortalCodeLineItem}
      updateCustomerPortalCodeLineMailto={updateCustomerPortalCodeLineMailto}
      updateCustomerPortalProcedure={updateCustomerPortalProcedure}
    />
  )

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
    setEditSnippetCategoryId('all')
    setSelectedCategoryId(null)
    setSelectedSnippetId(null)
    setSelectedTemplateId(null)
    setSelectedTaskId(null)
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
      kind: 'f-task',
      taskSections: ['', '', '', ''],
      taskSectionId: 'section-3',
      categoryId:
        defaultData.settings.taskTemplateCategories.find(
          (category) => category.kind === 'f-task',
        )?.id ?? '',
      favorite: false,
    })
    setTaskDraftBoxes(Array.from({ length: TASK_BOX_COUNT }, createEmptyTaskBoxSlot))
    setActiveTaskBoxIndex(0)
    setTaskDraftSkeletonEnabled(true)
    closeDraftBoxTooltip()
    setProductDraft(getEmptyProductDraft())
    setProductTagsDraftText('')
    setDashboardNewsDraft(getEmptyDashboardNewsDraft())
    if (dashboardCalculatorCopyTimeoutRef.current !== null) {
      window.clearTimeout(dashboardCalculatorCopyTimeoutRef.current)
      dashboardCalculatorCopyTimeoutRef.current = null
    }
    setDashboardCalculatorItems([createDashboardCalculatorItem()])
    setDashboardCalculatorFees([])
    setDashboardCalculatorCopiedKey(null)
    setSparePartCopiedId(null)
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
    setData((prev) => ({ ...prev, snippets: mergeSubsetOrder(prev.snippets, next) }))
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
    const kind = normalizeTaskTemplateKind(taskDraft)
    const sections = normalizeTaskTemplateSections(taskDraft).map((section) => section.trim())
    const categories = kind === 's-task' ? sTaskTemplateCategories : fTaskTemplateCategories
    const savedTask = {
      ...taskDraft,
      id,
      kind,
      name: taskDraft.name.trim(),
      taskTitle: kind === 's-task' ? taskDraft.taskTitle?.trim() ?? '' : undefined,
      categoryId: taskDraft.categoryId?.trim() || categories[0]?.id || '',
      content:
        kind === 's-task'
          ? buildTaskTemplateContent({ taskSections: sections })
          : taskDraft.content.trim(),
      taskSections: kind === 's-task' ? sections : undefined,
      taskSectionId: kind === 's-task' ? undefined : taskDraft.taskSectionId,
      favorite: Boolean(taskDraft.favorite),
      hiddenFromLists: Boolean(taskDraft.hiddenFromLists),
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
    setToast(`Template ${kind === 's-task' ? 'S-Task' : 'F-Task'} enregistré.`)
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

  const dashboardCalculatorTotals = computeDashboardCalculatorTotals(
    dashboardCalculatorItems,
    dashboardCalculatorFees,
    parseDashboardAmount,
  )
  // The badge reflects the note on the news/notes dashboard page itself, and
  // only when it holds real text (invisible token chars don't count).
  const dashboardNotesHasContent = rqtReminders.some(
    (reminder) => new Date(reminder.dueAt).getTime() <= reminderNow,
  )

  const formatReminderCountdown = (reminder: RqtReminder) => {
    const remaining = new Date(reminder.dueAt).getTime() - reminderNow
    if (remaining <= 0) return 'Échu'
    if (remaining < 60_000) return "Moins d’une minute"
    const hours = Math.floor(remaining / 3_600_000)
    const minutes = Math.floor((remaining % 3_600_000) / 60_000)
    return hours > 0
      ? `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`
      : `${String(minutes).padStart(2, '0')} min`
  }

  const addRqtReminder = () => {
    const rqt = reminderRqtDraft.trim()
    if (!rqt) {
      setToast('Renseignez un numéro de RQT.')
      return
    }
    const dueAt = new Date(Date.now() + reminderDurationDraft * 3_600_000).toISOString()
    if (editingReminderId) {
      updateSettings({
        rqtReminders: rqtReminders.map((reminder) =>
          reminder.id === editingReminderId
            ? {
                ...reminder,
                rqt,
                durationHours: reminderDurationDraft,
                dueAt,
                notifiedAt: undefined,
              }
            : reminder,
        ),
      })
      setToast(editingReminderExpired ? 'Rappel RQT relancé.' : 'Délai du rappel RQT modifié.')
    } else {
      const reminder: RqtReminder = {
        id: createId('rqt-reminder'),
        rqt,
        durationHours: reminderDurationDraft,
        dueAt,
      }
      updateSettings({ rqtReminders: [...rqtReminders, reminder] })
    }
    setReminderRqtDraft('')
    setEditingReminderId(null)
    setReminderModalOpen(false)
  }

  const openNewRqtReminder = () => {
    setEditingReminderId(null)
    setReminderRqtDraft('')
    setReminderDurationDraft(24)
    setReminderModalOpen(true)
  }

  const openRqtReminderEditor = (reminder: RqtReminder) => {
    setEditingReminderId(reminder.id)
    setReminderRqtDraft(reminder.rqt)
    setReminderDurationDraft(normalizeReminderDuration(reminder.durationHours))
    setReminderModalOpen(true)
  }

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
        <span className="dashboard-page-btn__notification" aria-hidden="true" />
      ) : null}
    </button>
  )

  const topWindowZ = windowLayout.windows.reduce(
    (max, item) => (item.minimized ? max : Math.max(max, item.z)),
    0,
  )

  // Replaces the known tags of both drafts with the active case values. Tags
  // without a value (missing or in conflict) stay visible in the text.
  const handleCopyBridgeToken = async () => {
    const token = await caseContextState.getToken()
    if (!token) {
      setToast('Jeton indisponible.')
      return
    }
    const didCopy = await copyText(token)
    setToast(didCopy ? 'Jeton copié. Colle-le dans la page Agentor de Cairm+.' : 'Copie impossible.')
  }

  const updateProductAliases = (next: ProductAlias[]) => updateSettings({ productAliases: next })

  const handleCopyContextValue = async (value: string) => {
    const didCopy = await copyText(value)
    if (!didCopy) setToast('Copie impossible.')
    return didCopy
  }

  const renderDashboardWindowButton = (option: (typeof dashboardWindowOptions)[number]) => {
    const frame = windowLayout.windows.find((item) => item.kind === option.id)
    const detached = detachedKinds.includes(option.id)
    const inPanel = panelItem === referenceItem(option.id)
    const state = detached
      ? ' is-detached'
      : inPanel
        ? ' is-open'
        : !frame
          ? ''
          : frame.minimized
            ? ' is-minimized'
            : ' is-open'
    const needsCheck =
      option.id === 'case' &&
      Boolean(
        caseContextState.context &&
          Object.values(caseContextState.context.fields).some((field) => field?.status === 'conflict'),
      )
    return (
      <button
        key={option.id}
        type="button"
        className={`window-launcher__btn${state}`}
        title={detached ? `${option.title} (fenêtre séparée)` : option.title}
        aria-label={option.title}
        aria-pressed={detached || inPanel || Boolean(frame && !frame.minimized)}
        onClick={() => handleToggleDashboardWindow(option.id)}
      >
        <UiIcon name={option.icon} className="window-launcher__icon" />
        {(option.id === 'reminders' && dashboardNotesHasContent) || needsCheck ? (
          <span className="window-launcher__badge" aria-hidden="true" />
        ) : null}
      </button>
    )
  }

  const renderDashboardWindowContent = (kind: DashboardWindowKind) => {
    if (kind === 'case') return null
    if (kind === 'reminders') return renderDashboardRemindersBlock()
    if (kind === 'news') return renderDashboardNewsBlock()
    if (kind === 'calculator') return renderWorkspaceDashboardVatPanel('Price calculator')
    if (kind === 'portal') return renderWorkspaceDashboardPortalPanel('Portal procédures')
    if (kind === 'parts') return renderWorkspaceDashboardSparePartsPanel('SKU’s')
    return renderWorkspaceDashboardDecorationsPanel('Ascii Wall')
  }

  // Mail and task columns, side by side.
  const renderMailWorkspace = () => (
    <MailWorkspace
      clearArmed={clearArmed} data={data} emailClearPulse={emailClearPulse}
      emailCopied={emailCopied} emailCopyPulse={emailCopyPulse} emailEditorRef={emailEditorRef}
      emailTags={emailTags} handleClearEmail={handleClearEmail} handleCopyEmail={handleCopyEmail}
      mailInsertMode={mailInsertMode} mailInsertModeLabel={mailInsertModeLabel}
      openCallModal={openCallModal} openLink={openLink} openTroubleshootgun={openTroubleshootgun}
      renderDashboardWindowButton={renderDashboardWindowButton}
      resolvedQuickLinks={resolvedQuickLinks}
      setEmailClearPulse={setEmailClearPulse} setEmailCopyPulse={setEmailCopyPulse}
      triggerPulse={triggerPulse} updateEmailDraft={updateEmailDraft}
      search={
        <SectionSearch
          className="section-search--mail" entries={mailSearchEntries} productTerms={workingProductTerms}
          categories={mailTemplateCategories}
          placeholder="Rechercher un modèle de mail" label="Rechercher dans les mails"
          onPick={(entry) => {
            const template = data.templates.find((item) => item.id === entry.id)
            if (template) openTemplatePreview(template)
          }}
        />
      }
    />
  )

  const renderTaskSidebar = () => (
    <TaskSidebar
      search={
        <SectionSearch
          className="section-search--task" entries={taskSearchEntries} productTerms={workingProductTerms}
          categories={taskTemplateCategories}
          placeholder="Rechercher une S-Task ou F-Task" label="Rechercher dans les tâches"
          onPick={(entry) => {
            const task = data.taskTemplates.find((item) => item.id === entry.id)
            if (task) applyTaskTemplate(task)
          }}
        />
      }
      activeTaskBoxIndex={activeTaskBoxIndex} closeDraftBoxTooltip={closeDraftBoxTooltip}
      data={data} handleClearTask={handleClearTask}
      handleCopyTask={handleCopyTask} handleTaskBoxHover={handleTaskBoxHover}
      handleTaskPaste={handleTaskPaste} hasTaskBoxContent={hasTaskBoxContent}
      openTaskBox={openTaskBox} setData={setData}
      setTaskClearPulse={setTaskClearPulse} setTaskCopyPulse={setTaskCopyPulse}
      taskClearArmed={taskClearArmed} taskClearPulse={taskClearPulse} taskCopied={taskCopied}
      taskCopyPulse={taskCopyPulse} taskDraftBoxes={taskDraftBoxes}
      taskDraftSkeletonEnabled={taskDraftSkeletonEnabled} taskEditorRef={taskEditorRef}
      taskHeadingProtectedRanges={taskHeadingProtectedRanges}
      taskTags={taskTags} triggerPulse={triggerPulse}
      updateTaskDraft={updateTaskDraft}
    />
  )

  const panelEntry = (item: PanelItem): ContextPanelEntry => {
    const kind = referenceKind(item)
    if (kind) {
      const option = dashboardWindowOptions.find((entry) => entry.id === kind)
      return { id: item, title: option?.title ?? kind, icon: option?.icon ?? 'dashboard' }
    }
    if (item === 'call') return { id: item, title: 'Appel téléphonique', icon: 'phone' }
    if (item === 'edit') return { id: item, title: `Modifier · ${editedItem()?.name ?? ''}`, icon: 'edit' }
    if (item === 'troubleshootgun') return { id: item, title: 'Troubleshotgun', icon: 'target' }
    const template = templatePreview?.folderId
      ? troubleshootgunFolders.find((folder) => folder.id === templatePreview.folderId)?.templates.find((entry) => entry.id === templatePreview.templateId)
      : data.templates.find((entry) => entry.id === templatePreview?.templateId)
    return { id: item, title: template?.name ?? 'Aperçu du template', icon: 'template' }
  }

  const closePanel = (item: PanelItem) => {
    if (item === 'preview') setTemplatePreview(null)
    else if (item === 'troubleshootgun') setTroubleshootgunOpen(false)
    else if (item === 'call') closeCallModal()
    else if (item === 'edit') setEditTarget(null)
    else setPanelStack((prev) => closePanelItem(prev, item))
  }

  // Name, text and translation count of the item in the quick editor.
  const editedItem = () => {
    if (!editTarget) return null
    const { kind, id, folderId } = editTarget
    if (kind === 'snippet') {
      const item = data.snippets.find((entry) => entry.id === id)
      return item ? { name: item.title, content: item.content, translations: 0 } : null
    }
    if (kind === 'template') {
      const item = data.templates.find((entry) => entry.id === id)
      return item ? { name: item.name, content: item.content, translations: item.translations?.length ?? 0 } : null
    }
    if (kind === 'troubleshootgun') {
      const item = troubleshootgunFolders.find((folder) => folder.id === folderId)?.templates.find((entry) => entry.id === id)
      return item ? { name: item.name, content: item.content, translations: item.translations?.length ?? 0 } : null
    }
    const item = data.taskTemplates.find((entry) => entry.id === id)
    return item ? { name: item.name, content: item.content, translations: 0 } : null
  }

  const saveEditedItem = (name: string, content: string) => {
    if (!editTarget) return
    const { kind, id, folderId } = editTarget
    setData((prev) => {
      if (kind === 'snippet') {
        return { ...prev, snippets: prev.snippets.map((entry) => (entry.id === id ? { ...entry, title: name, content } : entry)) }
      }
      if (kind === 'template') {
        return { ...prev, templates: prev.templates.map((entry) => (entry.id === id ? { ...entry, name, content } : entry)) }
      }
      if (kind === 'troubleshootgun') {
        return {
          ...prev,
          settings: {
            ...prev.settings,
            troubleshootgunFolders: (prev.settings.troubleshootgunFolders ?? []).map((folder) =>
              folder.id === folderId
                ? { ...folder, templates: folder.templates.map((entry) => (entry.id === id ? { ...entry, name, content } : entry)) }
                : folder,
            ),
          },
        }
      }
      return { ...prev, taskTemplates: prev.taskTemplates.map((entry) => (entry.id === id ? { ...entry, name, content } : entry)) }
    })
    setEditTarget(null)
    setToast('Modification enregistrée.')
  }

  // The main window applies what a popup sends: a template import, call notes.
  const mainActionRef = useRef<(action: unknown) => void>(() => {})
  mainActionRef.current = (raw) => {
    if (!raw || typeof raw !== 'object') return
    const action = raw as { type?: unknown; mode?: unknown; preview?: unknown; text?: unknown }
    const entry = (raw as { entry?: { id?: unknown; content?: unknown; createdAt?: unknown } }).entry
    if (action.type === 'call-save') {
      if (!entry || typeof entry.id !== 'string' || typeof entry.content !== 'string' || typeof entry.createdAt !== 'string') return
      const saved = { id: entry.id, content: entry.content, createdAt: entry.createdAt }
      setData((prev) => ({
        ...prev,
        callHistory: [saved, ...prev.callHistory.filter((item) => item.id !== saved.id)].slice(0, CALL_HISTORY_LIMIT),
      }))
      return
    }
    if (action.type === 'task-insert' && typeof action.text === 'string') {
      insertTaskText(action.text, 'section-4')
      setToast('Notes de l’appel ajoutées à la tâche.')
      return
    }
    const preview = action.preview as TemplatePreviewState | undefined
    if (
      action.type === 'template-import' &&
      preview &&
      typeof preview.templateId === 'string' &&
      typeof preview.language === 'string' &&
      Array.isArray(preview.selectedEmailLines) &&
      Array.isArray(preview.selectedTaskSections)
    ) {
      importTemplatePreview(action.mode === 'insert' ? 'insert' : 'replace', preview)
    }
  }
  useEffect(() => {
    if (!mainWindow) return
    return window.agentor?.onMainAction?.((action) => mainActionRef.current(action))
  }, [mainWindow])

  // A popup starts on its own: the call with the call template, Troubleshotgun
  // on the folder of the case's product.
  const popupStartedRef = useRef(false)
  const startPopupRef = useRef<() => void>(() => {})
  startPopupRef.current = () => {
    if (popupTool === 'call') {
      openCallModal()
      return
    }
    const terms = productSearchTerms(workingProductNames)
    const productFolder = troubleshootgunFolders.find((item) =>
      matchesProduct({ kind: 'troubleshootgun', id: item.id, title: item.name, body: '', preview: '' }, terms),
    )
    setSelectedTroubleshootgunFolderId(productFolder?.id ?? null)
    setSelectedTroubleshootgunTemplateId(null)
    setTroubleshootgunOpen(true)
  }
  useEffect(() => {
    if (!popupTool || !loaded || popupStartedRef.current) return
    popupStartedRef.current = true
    startPopupRef.current()
  }, [loaded, popupTool])
  // Closing the call (Escape) closes its window.
  const popupCallShownRef = useRef(false)
  useEffect(() => {
    if (popupTool !== 'call') return
    if (callModalOpen) popupCallShownRef.current = true
    else if (popupCallShownRef.current) window.close()
  }, [callModalOpen, popupTool])
  // The call is saved while it is written, so closing its window loses nothing.
  useEffect(() => {
    if (popupTool !== 'call' || !callModalOpen) return
    const handle = window.setTimeout(() => persistCallDraft(currentCallMemoryLocked ? currentCallMemory : undefined), 400)
    return () => window.clearTimeout(handle)
  }, [callDraft, callModalOpen, currentCallMemory, currentCallMemoryLocked, persistCallDraft, popupTool])

  // Popup Troubleshotgun: the import goes to the main window, which holds the drafts.
  const sendTemplateToMain = (mode: 'replace' | 'insert' = 'replace') => {
    if (!templatePreview) return
    void window.agentor?.sendToMain?.({ type: 'template-import', mode, preview: templatePreview })
    setTemplatePreview(null)
    setToast('Envoyé dans le mail et la tâche.')
  }

  const renderPanelContent = (item: PanelItem) => {
    const kind = referenceKind(item)
    if (kind) return renderDashboardWindowContent(kind)
    if (item === 'edit') {
      const edited = editedItem()
      if (!editTarget || !edited) return <p className="context-panel__note">Cet élément n’existe plus.</p>
      const settingsTab: SettingsTab =
        editTarget.kind === 'snippet'
          ? 'snippets'
          : editTarget.kind === 'template'
            ? 'templates'
            : editTarget.kind === 'troubleshootgun'
              ? 'troubleshootgun'
              : editTarget.kind === 's-task'
                ? 'sTasks'
                : 'fTasks'
      return (
        <LibraryItemEditor
          key={`${editTarget.kind}-${editTarget.folderId ?? ''}-${editTarget.id}`}
          kind={editTarget.kind}
          name={edited.name}
          content={edited.content}
          translationCount={edited.translations}
          onSave={saveEditedItem}
          onCancel={() => setEditTarget(null)}
          onOpenSettings={() => {
            openSettingsTab(settingsTab)
            setEditOpen(true)
          }}
        />
      )
    }
    if (item === 'preview') {
      return templatePreview ? (
        <TemplatePreviewModal
          data={data} importTemplatePreview={popupTool ? sendTemplateToMain : importTemplatePreview}
          setTemplatePreview={setTemplatePreview} taskSectionNames={taskSectionNames}
          templatePreview={templatePreview} troubleshootgunFolders={troubleshootgunFolders}
          mailHasContent={Boolean(data.emailDraft.replace(/\u200b/g, '').trim())}
        />
      ) : null
    }
    if (item === 'troubleshootgun') {
      return (
        <TroubleshootgunPanel
          data={data} openTemplatePreview={openTemplatePreview}
          selectedTroubleshootgunFolderId={selectedTroubleshootgunFolderId}
          selectedTroubleshootgunTemplateId={selectedTroubleshootgunTemplateId}
          setSelectedTroubleshootgunFolderId={setSelectedTroubleshootgunFolderId}
          setSelectedTroubleshootgunTemplateId={setSelectedTroubleshootgunTemplateId}
          troubleshootgunFolders={[...troubleshootgunFolders].sort((a, b) =>
            Number(matchesProduct({ kind: 'troubleshootgun', id: b.id, title: b.name, body: '', preview: '' }, workingProductTerms)) -
            Number(matchesProduct({ kind: 'troubleshootgun', id: a.id, title: a.name, body: '', preview: '' }, workingProductTerms))
          )}
        />
      )
    }
    return (
      <CallModal
        callCopied={callCopied} callDraft={callDraft} callEditorRef={callEditorRef}
        callModalHistoryItems={callModalHistoryItems}
        currentCallMemory={currentCallMemory} currentCallMemoryLocked={currentCallMemoryLocked}
        currentCallPreview={currentCallPreview} handleCopyCall={handleCopyCall}
        selectedCallHistoryId={selectedCallHistoryId} setCallDraft={setCallDraft}
        setCurrentCallMemory={setCurrentCallMemory}
        setCurrentCallMemoryLocked={setCurrentCallMemoryLocked}
        setSelectedCallHistoryId={setSelectedCallHistoryId} updateCallDraft={updateCallDraft}
        onSendToTask={() => {
          const notes = normalizeCallDraftForCopy(callDraft).trim()
          if (!notes) return
          if (popupTool) {
            void window.agentor?.sendToMain?.({ type: 'task-insert', text: notes })
          } else {
            insertTaskText(notes, 'section-4')
          }
          setToast('Notes de l’appel ajoutées à la tâche.')
        }}
      />
    )
  }


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

  const renderDashboardRemindersBlock = () => (
    <RemindersBlock
      formatReminderCountdown={formatReminderCountdown} openNewRqtReminder={openNewRqtReminder}
      openRqtReminderEditor={openRqtReminderEditor} reminderNow={reminderNow}
      rqtReminders={rqtReminders} updateSettings={updateSettings}
    />
  )

  const renderDashboardNewsBlock = () => (
    <NewsBlock
      dashboardNewsSorted={dashboardNewsSorted} handleProcedureLinkClick={handleProcedureLinkClick}
    />
  )

  const renderWorkspaceDashboardNewsNotesPanel = (title: string) => (
    <article className="workspace-dashboard__panel workspace-dashboard__panel--news-notes">
      <div className="workspace-dashboard__panel-title">{title}</div>
      <div className="workspace-dashboard__news-notes-grid">
        {renderDashboardRemindersBlock()}
        {renderDashboardNewsBlock()}
      </div>
    </article>
  )

  const renderWorkspaceDashboardDecorationsPanel = (title: string) => (
    <DecorationsPanel
      addDashboardDecoration={addDashboardDecoration}
      closeDashboardDecorationComposer={closeDashboardDecorationComposer}
      dashboardDecorationComposerOpen={dashboardDecorationComposerOpen}
      dashboardDecorationCopiedId={dashboardDecorationCopiedId}
      dashboardDecorationDraft={dashboardDecorationDraft}
      dashboardDecorationDraftRef={dashboardDecorationDraftRef}
      dashboardDecorations={dashboardDecorations}
      deleteDashboardDecoration={deleteDashboardDecoration}
      handleCopyDashboardDecoration={handleCopyDashboardDecoration}
      openDashboardDecorationComposer={openDashboardDecorationComposer}
      setDashboardDecorationDraft={setDashboardDecorationDraft} title={title}
    />
  )

  const renderWorkspaceDashboardVatPanel = (title: string) => (
    <CalculatorPanel
      title={title} items={dashboardCalculatorItems} fees={dashboardCalculatorFees}
      totals={dashboardCalculatorTotals} copiedKey={dashboardCalculatorCopiedKey}
      onAddItem={addDashboardCalculatorItem} onUpdateItem={updateDashboardCalculatorItem}
      onAdjustQuantity={adjustDashboardCalculatorQuantity} onRemoveItem={removeDashboardCalculatorItem}
      onAddFee={addDashboardCalculatorFee} onUpdateFee={updateDashboardCalculatorFee}
      onRemoveFee={removeDashboardCalculatorFee} onCopy={handleCopyDashboardAmount}
    />
  )

  const renderWorkspaceDashboardSparePartsPanel = (title: string) => (
    <SparePartsPanel
      activeDashboardSpareProduct={activeDashboardSpareProduct}
      activeDashboardSpareProductId={activeDashboardSpareProductId}
      dashboardSparePartQuery={dashboardSparePartQuery}
      filteredProductsWithSpareParts={filteredProductsWithSpareParts}
      handleCopySparePartSku={handleCopySparePartSku}
      setActiveDashboardSpareProductId={setActiveDashboardSpareProductId}
      setDashboardSparePartQuery={setDashboardSparePartQuery} sparePartCopiedId={sparePartCopiedId}
      title={title}
    />
  )

  const renderWorkspaceDashboardPortalPanel = (title: string) => (
    <PortalPanel
      activeDashboardPortalProcedure={activeDashboardPortalProcedure}
      activeDashboardPortalProcedureId={activeDashboardPortalProcedureId}
      dashboardPortalProcedures={dashboardPortalProcedures}
      dashboardProcedureVariant={dashboardProcedureVariant}
      handleCopyPortalCode={handleCopyPortalCode}
      handleCopyPortalQuickText={handleCopyPortalQuickText}
      normalizedProcedureMailtos={normalizedProcedureMailtos} portalCopiedId={portalCopiedId}
      portalQuickCopiedId={portalQuickCopiedId}
      setActiveDashboardPortalProcedureId={setActiveDashboardPortalProcedureId}
      setDashboardProcedureVariant={setDashboardProcedureVariant} title={title}
    />
  )

  const renderWorkspaceDashboardContent = () => {
    if (workspaceDashboardPage === 'tools') {
      return (
        <div className="workspace-dashboard__single workspace-dashboard__single--news-notes">
          {renderWorkspaceDashboardNewsNotesPanel('News et Rappels')}
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

    if (workspaceDashboardPage === 'parts') {
      return (
        <div className="workspace-dashboard__single">
          {renderWorkspaceDashboardSparePartsPanel('SKU’s')}
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
        {renderWorkspaceDashboardNewsNotesPanel('News et Rappels')}
      </div>
    )
  }

  const renderDashboardPageNavigation = () => (
    <div className="dashboard-shell__nav">
      {workspaceDashboardPageOptions.map((page) => renderDashboardPageButton(page))}
    </div>
  )

  const renderReminderDialog = () => (
    reminderModalOpen ? (
      <ReminderModal
        addRqtReminder={addRqtReminder} editingReminderExpired={editingReminderExpired}
        editingReminderId={editingReminderId} reminderDurationDraft={reminderDurationDraft}
        reminderRqtDraft={reminderRqtDraft} setEditingReminderId={setEditingReminderId}
        setReminderDurationDraft={setReminderDurationDraft} setReminderModalOpen={setReminderModalOpen}
        setReminderRqtDraft={setReminderRqtDraft}
      />
    ) : null
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

  if (popupTool) {
    const title = popupTool === 'call' ? 'Appel téléphonique' : 'Troubleshotgun'
    return (
      <>
        <div className="detached-dashboard popup-tool" data-window={popupTool}>
          <header className="detached-dashboard__bar">
            <UiIcon name={popupTool === 'call' ? 'phone' : 'target'} className="floating-window__icon" />
            <span className="floating-window__title">{templatePreview && popupTool === 'troubleshootgun' ? 'Aperçu' : title}</span>
            {templatePreview && popupTool === 'troubleshootgun' ? (
              <button type="button" className="ghost popup-tool__back" onClick={() => setTemplatePreview(null)}>
                Retour à la liste
              </button>
            ) : null}
          </header>
          <div className="detached-dashboard__body floating-window__body popup-tool__body">
            {popupTool === 'call'
              ? callModalOpen
                ? renderPanelContent('call')
                : null
              : templatePreview
                ? renderPanelContent('preview')
                : renderPanelContent('troubleshootgun')}
          </div>
        </div>
        {toast ? <div className="toast">{toast}</div> : null}
      </>
    )
  }

  if (detachedKind) {
    const option = dashboardWindowOptions.find((item) => item.id === detachedKind)
    return (
      <>
        <div className="detached-dashboard dashboard-tool" data-window={detachedKind}>
          <header className="detached-dashboard__bar">
            <span className="dashboard-tool__symbol"><UiIcon name={option?.icon ?? 'dashboard'} /></span>
            <div className="dashboard-tool__heading">
              <h1>{option?.title ?? 'Dashboard'}</h1>
              <p>{{ reminders: 'Les échéances de vos dossiers', news: 'Informations et mises à jour', calculator: 'Prix, livraison et TVA', portal: 'Retrouver et copier une procédure', parts: 'Références et pièces détachées', decorations: 'Vos textes à copier', case: '' }[detachedKind]}</p>
            </div>
            <button
              type="button"
              className="dashboard-tool__attach"
              title="Remettre dans la fenêtre principale"
              aria-label="Remettre dans la fenêtre principale"
              onClick={() => void window.agentor?.attachDashboard?.(detachedKind)}
            >
              <UiIcon name="attach" /><span>Regrouper</span>
            </button>
          </header>
          <div className="detached-dashboard__body floating-window__body">
            {renderDashboardWindowContent(detachedKind)}
          </div>
        </div>
        {renderReminderDialog()}
        {toast ? <div className="toast">{toast}</div> : null}
      </>
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
      </>
    )
  }

  return (
    <>
      <CaseBar
        tabs={caseTabs.tabs.map((tab, index) => {
          const isActive = tab.id === caseTabs.activeId
          const context = caseForTab(tab, activeCase)
          return {
            id: tab.id,
            label: caseTabLabel(tab, index),
            title: [caseTabLabel(tab, index), context?.fields.caseTitle?.value, context?.fields.customerName?.value]
              .filter(Boolean)
              .join(' · '),
            filled: isActive ? isWorkspaceFilled(snapshotWorkspace()) : isWorkspaceFilled(tab.workspace),
            bound: Boolean(tab.caseKey),
            locked: tab.locked === true,
          }
        })}
        activeId={caseTabs.activeId}
        closeArmedId={caseTabCloseArmed}
        canAdd={caseTabs.tabs.length < CASE_TABS_LIMIT}
        caseContext={workingCase}
        boundNumber={activeTab?.caseKey ? activeTab.caseKey.number ?? 'RQT sans numéro' : null}
        available={caseContextState.available}
        bridge={caseContextState.bridge}
        tags={caseTags}
        imports={caseImport}
        onSelect={switchCaseTab}
        onAdd={() => void openCaseTab(null)}
        onClose={closeCaseTab}
        onCopy={handleCopyContextValue}
        onToggleLock={(tabId) => setCaseTabs((prev) => toggleCaseTabLock(prev, tabId))}
                onOpenSettings={() => openSettingsTab('connections')}
      />
      <div className={`app-shell app-shell--with-case-bar${panelItem ? ' app-shell--with-panel' : ''}`}>
      <LibrarySidebar
        snippets={data.snippets} snippetCategories={data.categories} categoryColorById={categoryColorById}
        templates={data.templates} mailTemplateCategories={mailTemplateCategories}
        troubleshootgunFolders={troubleshootgunFolders} taskTemplates={data.taskTemplates}
        taskKind={normalizeTaskTemplateKind} procedures={dashboardPortalProcedures}
        productNames={workingProductNames} productLabel={workingProductName || null}
        editButtonLabel={editButtonLabel} onOpenSettings={() => setEditOpen(true)}
        onSnippet={insertSnippet} onTemplate={openTemplatePreview} onTask={applyTaskTemplate}
        onProcedure={(procedureId) => {
          setActiveDashboardPortalProcedureId(procedureId)
          try {
            window.localStorage.setItem(PORTAL_PROCEDURE_STORAGE_KEY, JSON.stringify({ id: procedureId, at: Date.now() }))
          } catch {
            // The separate window then opens on its last procedure.
          }
          showDashboardWindow('portal')
        }}
        showSnippetTooltip={showSnippetTooltip} hideSnippetTooltip={hideSnippetTooltip}
        underPanel={Boolean(panelItem) && panelNarrow}
        hiddenPanelTitle={panelHidden && panelStack.length ? panelEntry(panelStack[panelStack.length - 1]).title : null}
        onShowPanel={() => setPanelHidden(false)}
        onEdit={(entry) => {
          if (entry.kind === 'procedure') return
          setEditTarget({ kind: entry.kind, id: entry.id, folderId: entry.folderId })
          showInPanel('edit')
        }}
      />
      {panelItem ? (
        <ContextPanel
          current={panelEntry(panelItem)}
          previous={panelStack.slice(0, -1).map(panelEntry)}
          onShow={(id) => showInPanel(id as PanelItem)}
          onClose={() => closePanel(panelItem)}
          onFloat={
            referenceKind(panelItem)
              ? () => {
                  const kind = referenceKind(panelItem) as DashboardWindowKind
                  setPanelStack((prev) => closePanelItem(prev, panelItem))
                  setWindowLayout((prev) => openWindow(prev, kind, getWindowViewport()))
                }
              : undefined
          }
          onDetach={
            referenceKind(panelItem) && canDetach
              ? () => {
                  setPanelStack((prev) => closePanelItem(prev, panelItem))
                  handleDetachDashboard(referenceKind(panelItem) as DashboardWindowKind)
                }
              : undefined
          }
        >
          {renderPanelContent(panelItem)}
        </ContextPanel>
      ) : null}

      {renderMailWorkspace()}
      {renderTaskSidebar()}
    </div>

    <WindowLayer
      appZoom={appZoom} canDetach={canDetach} getWindowViewport={getWindowViewport}
      handleDetachDashboard={handleDetachDashboard}
      renderDashboardWindowContent={renderDashboardWindowContent} setWindowLayout={setWindowLayout}
      topWindowZ={topWindowZ} windowLayout={windowLayout}
    />
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
    {renderReminderDialog()}
    {expiredReminders?.length ? (
      <ReminderWarning
        expiredReminders={expiredReminders} setExpiredReminders={setExpiredReminders}
      />
    ) : null}

    {editOpen ? (
        <div className="modal-backdrop" onClick={() => setEditOpen(false)}>
          <div className="modal modal--settings" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <div className="modal__title-group">
                <div className="brand__title brand__title--with-icon">
                  <UiIcon name="settings" className="brand__title-icon" />
                  <span>Paramètres</span>
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
                <div className="settings-layout__nav-search">
                  <UiIcon name="search" className="settings-layout__nav-search-icon" />
                  <input
                    type="search"
                    value={settingsSearch}
                    placeholder="Rechercher un réglage"
                    aria-label="Rechercher dans les paramètres"
                    onChange={(event) => setSettingsSearch(event.target.value)}
                  />
                </div>
                <div className="settings-layout__nav-scroll">
                {filteredSettingsNavigation.map((section) => (
                  <div className="settings-layout__nav-section" key={section.id}>
                    <div className="settings-layout__nav-title">
                      <UiIcon name={section.icon} className="settings-layout__nav-title-icon" />
                      <span>{section.label}</span>
                    </div>
                    <div className="settings-layout__nav-items">
                      {section.items.map((item) => {
                        const issueCount = settingsIssueCounts[item.id] ?? 0
                        // Sub-pages (categories, formatting) appear under their
                        // parent only while that family is open, or when searching.
                        const family = item.parent ?? item.id
                        const familyOpen =
                          editTab === family ||
                          section.items.some((other) => other.parent === family && other.id === editTab)
                        if (item.parent && !familyOpen && !settingsSearch.trim()) return null
                        const count = item.countKey ? settingsCounts[item.countKey] : undefined
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={`settings-layout__nav-btn${
                              editTab === item.id ? ' is-active' : ''
                            }${issueCount ? ' has-issues' : ''}${item.parent ? ' settings-layout__nav-btn--child' : ''}`}
                            onClick={() => openSettingsTab(item.id)}
                            title={item.description}
                          >
                            <span className="settings-layout__nav-btn-main">
                              <UiIcon name={item.icon} className="settings-layout__nav-btn-icon" />
                              <span>{item.label}</span>
                            </span>
                            {issueCount ? (
                              <span className="settings-layout__nav-badge">{issueCount}</span>
                            ) : count !== undefined ? (
                              <span className="settings-layout__nav-count">{count}</span>
                            ) : null}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
                {!filteredSettingsNavigation.length ? (
                  <div className="settings-layout__nav-empty">Aucun réglage trouvé.</div>
                ) : null}
                </div>
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
                  {relatedSettingsTabs.length ? (
                    <div className="settings-layout__related" aria-label="Réglages associés">
                      <span>Associés</span>
                      {relatedSettingsTabs.map((tab) => (
                        <button key={tab.id} type="button" onClick={() => openSettingsTab(tab.id)}>
                          <UiIcon name={tab.icon} />
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="settings-layout__content-body">
            {editTab === 'categories' ? (
              <SnippetCategoriesSettings
                categoryDraft={categoryDraft} categoryDraftIssues={categoryDraftIssues}
                categoryPreviewSnippets={categoryPreviewSnippets}
                clearSettingsValidationTouched={clearSettingsValidationTouched} data={data}
                deleteCategory={deleteCategory} getEmptyCategoryDraft={getEmptyCategoryDraft}
                handleCategorySave={handleCategorySave} isCategorySelectionEmpty={isCategorySelectionEmpty}
                renderValidationIssues={renderValidationIssues} selectedCategoryId={selectedCategoryId}
                setCategoryDraft={setCategoryDraft} setData={setData}
                setSelectedCategoryId={setSelectedCategoryId}
              />
            ) : null}

            {editTab === 'snippets' ? (
              <SnippetsSettings
                applySuggestedTag={applySuggestedTag} beginNewSnippetDraft={beginNewSnippetDraft}
                categoryIdSet={categoryIdSet} clearSettingsValidationTouched={clearSettingsValidationTouched}
                data={data} deleteSnippet={deleteSnippet} editSnippetCategoryId={editSnippetCategoryId}
                editSnippets={editSnippets} handleSnippetReorder={handleSnippetReorder}
                handleSnippetSave={handleSnippetSave} insertSnippetToken={insertSnippetToken}
                isSnippetSelectionEmpty={isSnippetSelectionEmpty} openSettingsTab={openSettingsTab}
                renderIssueBadge={renderIssueBadge} renderTagSuggestions={renderTagSuggestions}
                renderValidationIssues={renderValidationIssues} selectedSnippetId={selectedSnippetId}
                setEditSnippetCategoryId={setEditSnippetCategoryId} setLibraryFilter={setLibraryFilter}
                setSelectedSnippetId={setSelectedSnippetId} setSnippetActiveField={setSnippetActiveField}
                setSnippetDraft={setSnippetDraft} snippetContentRef={snippetContentRef}
                snippetDraft={snippetDraft} snippetDraftIssues={snippetDraftIssues} snippetQuery={snippetQuery}
                snippetTaskRef={snippetTaskRef} snippetTitleRef={snippetTitleRef}
                taskSectionNames={taskSectionNames}
                updateTagSuggestionFromTarget={updateTagSuggestionFromTarget}
              />
            ) : null}

            {editTab === 'templates' ? (
              <MailTemplatesSettings
                applySuggestedTag={applySuggestedTag} beginNewTemplateDraft={beginNewTemplateDraft}
                clearSettingsValidationTouched={clearSettingsValidationTouched} data={data}
                deleteTemplate={deleteTemplate} handleTemplateSave={handleTemplateSave}
                insertTemplateToken={insertTemplateToken} isTemplateSelectionEmpty={isTemplateSelectionEmpty}
                libraryTemplates={libraryTemplates} mailTemplateCategories={mailTemplateCategories}
                openSettingsTab={openSettingsTab} renderIssueBadge={renderIssueBadge}
                renderTagSuggestions={renderTagSuggestions} renderValidationIssues={renderValidationIssues}
                selectedTemplateId={selectedTemplateId} setData={setData} setLibraryFilter={setLibraryFilter}
                setSelectedTemplateId={setSelectedTemplateId} setTemplateActiveField={setTemplateActiveField}
                setTemplateDraft={setTemplateDraft} taskSectionNames={taskSectionNames}
                taskTemplateIdSet={taskTemplateIdSet} templateContentRef={templateContentRef}
                templateDraft={templateDraft} templateDraftIssues={templateDraftIssues}
                templateFilter={templateFilter} templateNameRef={templateNameRef}
                templateTaskMode={templateTaskMode} templateTaskRef={templateTaskRef}
                updateTagSuggestionFromTarget={updateTagSuggestionFromTarget}
              />
            ) : null}

            {editTab === 'troubleshootgun' ? (
              <TroubleshootgunSettings
                       data={data} selectedTroubleshootgunFolderId={selectedTroubleshootgunFolderId}
                       selectedTroubleshootgunTemplateId={selectedTroubleshootgunTemplateId}
                       setSelectedTroubleshootgunFolderId={setSelectedTroubleshootgunFolderId}
                       setSelectedTroubleshootgunTemplateId={setSelectedTroubleshootgunTemplateId}
                       setTroubleshootgunFolderNameDraft={setTroubleshootgunFolderNameDraft}
                       troubleshootgunFolderNameDraft={troubleshootgunFolderNameDraft}
                       troubleshootgunFolders={troubleshootgunFolders} updateSettings={updateSettings}
                     />
            ) : null}

            {editTab === 'templateCategories' ? (
              <TemplateCategoriesSettings
                data={data} deleteTemplateCategory={deleteTemplateCategory}
                mailTemplateCategories={mailTemplateCategories} saveTemplateCategory={saveTemplateCategory}
                setTemplateCategoryDraft={setTemplateCategoryDraft}
                templateCategoryDraft={templateCategoryDraft} updateSettings={updateSettings}
              />
            ) : null}

            {editTab === 'sTaskCategories' || editTab === 'fTaskCategories' ? (
              <TaskCategoriesSettings
                data={data} deleteTaskTemplateCategory={deleteTaskTemplateCategory}
                saveTaskTemplateCategory={saveTaskTemplateCategory}
                setTaskTemplateCategoryDraft={setTaskTemplateCategoryDraft}
                settingsTaskTemplateCategories={settingsTaskTemplateCategories}
                settingsTaskTemplateKind={settingsTaskTemplateKind}
                taskTemplateCategories={taskTemplateCategories}
                taskTemplateCategoryDraft={taskTemplateCategoryDraft} updateSettings={updateSettings}
              />
            ) : null}

            {editTab === 'sTasks' || editTab === 'fTasks' ? (
              <TaskTemplatesSettings
                applySuggestedTag={applySuggestedTag} beginNewTaskDraft={beginNewTaskDraft}
                clearSettingsValidationTouched={clearSettingsValidationTouched}
                deleteTaskTemplate={deleteTaskTemplate} handleTaskTemplateSave={handleTaskTemplateSave}
                insertTaskTemplateToken={insertTaskTemplateToken} isTaskSelectionEmpty={isTaskSelectionEmpty}
                libraryTaskTemplates={libraryTaskTemplates} openSettingsTab={openSettingsTab}
                renderIssueBadge={renderIssueBadge} renderTagSuggestions={renderTagSuggestions}
                renderValidationIssues={renderValidationIssues} selectedTaskId={selectedTaskId}
                setData={setData} setLibraryFilter={setLibraryFilter} setSelectedTaskId={setSelectedTaskId}
                setTaskDraft={setTaskDraft} setTaskTemplateActiveField={setTaskTemplateActiveField}
                settingsTaskTemplateCategories={settingsTaskTemplateCategories}
                settingsTaskTemplateKind={settingsTaskTemplateKind}
                settingsTaskTemplates={settingsTaskTemplates} taskDraft={taskDraft}
                taskDraftIssues={taskDraftIssues} taskFilter={taskFilter} taskSectionNames={taskSectionNames}
                taskTemplateContentRef={taskTemplateContentRef} taskTemplateKind={taskTemplateKind}
                taskTemplateNameRef={taskTemplateNameRef} taskTemplateSectionRefs={taskTemplateSectionRefs}
                taskTemplateSections={taskTemplateSections} taskTemplateTitleRef={taskTemplateTitleRef}
                toggleTaskTemplateFavorite={toggleTaskTemplateFavorite}
                updateTagSuggestionFromTarget={updateTagSuggestionFromTarget}
              />
            ) : null}

            {editTab === 'taskFormat' ? (
              <TaskFormatSettings
                taskSectionNames={taskSectionNames} taskTemplates={data.taskTemplates}
                updateTaskSectionName={updateTaskSectionName}
              />
            ) : null}

            {editTab === 'connections' ? (
              <ConnectionsSettings
                caseContextState={caseContextState} handleCopyBridgeToken={handleCopyBridgeToken}
                setToast={setToast}
              />
            ) : null}

            {editTab === 'productAliases' ? (
              <ProductAliasesSettings
                activeCase={activeCase} caseContextState={caseContextState} productAliases={productAliases}
                updateProductAliases={updateProductAliases}
              />
            ) : null}

            {editTab === 'caseTags' ? (
              <CaseTagsSettings
                activeCase={activeCase} caseAutoFill={caseAutoFill} caseTags={caseTags} imports={caseImport}
                data={data} updateSettings={updateSettings}
              />
            ) : null}

            {editTab === 'contents' ? (
              <ContentsScreen
                data={data}
                updateData={setData}
                taskKind={normalizeTaskTemplateKind}
                categoriesByType={contentsCategories}
                knownTags={contentsKnownTags}
                makeId={(type) => createId(contentIdPrefix[type])}
                onOpenSettings={(type) => openSettingsTab(contentSettingsTab[type])}
              />
            ) : null}

            {editTab === 'caseImport' ? (
              <CaseImportSettings
                receivedCase={activeCase} imports={caseImport} caseTags={caseTags} updateSettings={updateSettings}
              />
            ) : null}

            {editTab === 'tags' ? (
              <SuggestedTagsSettings
                handleAddPredefinedTag={handleAddPredefinedTag}
                handleRemovePredefinedTag={handleRemovePredefinedTag} predefinedTagDraft={predefinedTagDraft}
                predefinedTags={predefinedTags} setPredefinedTagDraft={setPredefinedTagDraft}
              />
            ) : null}

            {editTab === 'callHistory' ? (
              <CallHistorySettings
                callHistoryCopiedId={callHistoryCopiedId} handleCopyHistoryCall={handleCopyHistoryCall}
                recentCallHistory={recentCallHistory}
              />
            ) : null}

            {editTab === 'callTemplate' ? (
              <CallTemplateSettings
                applySuggestedTag={applySuggestedTag} callTemplate={callTemplate}
                callTemplateRef={callTemplateRef} insertCallTemplateToken={insertCallTemplateToken}
                renderTagSuggestions={renderTagSuggestions} updateCallTemplate={updateCallTemplate}
                updateTagSuggestionFromTarget={updateTagSuggestionFromTarget}
              />
            ) : null}

            {editTab === 'quickLinks' ? (
              <QuickLinksSettings
                quickLinkUrls={quickLinkUrls} resetQuickLinkUrl={resetQuickLinkUrl}
                updateQuickLinkUrl={updateQuickLinkUrl}
              />
            ) : null}

            {editTab === 'procedureMailtos' ? (
              <MailtoSettings
                addProcedureMailtoLink={addProcedureMailtoLink}
                normalizedProcedureMailtos={normalizedProcedureMailtos}
                removeProcedureMailtoLink={removeProcedureMailtoLink}
                updateProcedureMailtoLink={updateProcedureMailtoLink}
              />
            ) : null}

            {editTab === 'preferences' ? (
              <PreferencesSettings
                clearAllArmed={clearAllArmed} editorLineHeight={editorLineHeight} exportFont={exportFont}
                exportFontSize={exportFontSize} handleClearData={handleClearData}
                separateWindows={data.settings.separateWindows !== false}
                renderSettingsSlider={renderSettingsSlider} textScale={textScale}
                updateSettings={updateSettings} zoomValue={zoomValue}
              />
            ) : null}

            {editTab === 'dashboardPortal' ? (
              <ProceduresSettings
                handleAddPortalProcedure={handleAddPortalProcedure}
                renderPortalCodeEditorSettings={renderPortalCodeEditorSettings}
                selectedPortalProcedureId={selectedPortalProcedureId}
                setPortalProcedureEditorOpen={setPortalProcedureEditorOpen}
              />
            ) : null}

            {editTab === 'dashboardSpareParts' ? (
              <SparePartsSettings
                addProductDraftSparePart={addProductDraftSparePart} getEmptyProductDraft={getEmptyProductDraft}
                getProductCatalogDraft={getProductCatalogDraft}
                handleReorderProductCatalog={handleReorderProductCatalog}
                handleReorderProductDraftSpareParts={handleReorderProductDraftSpareParts}
                handleSaveProductCatalogItem={handleSaveProductCatalogItem}
                isProductCatalogSelectionEmpty={isProductCatalogSelectionEmpty} productDraft={productDraft}
                productsSorted={productsSorted} removeProductDraftSparePart={removeProductDraftSparePart}
                selectedProductCatalogId={selectedProductCatalogId} setProductDraft={setProductDraft}
                setProductTagsDraftText={setProductTagsDraftText}
                setSelectedProductCatalogId={setSelectedProductCatalogId}
                updateProductDraftSparePart={updateProductDraftSparePart}
              />
            ) : null}

            {editTab === 'dashboardNews' ? (
              <NewsSettings
                clearSettingsValidationTouched={clearSettingsValidationTouched}
                dashboardNewsContentRef={dashboardNewsContentRef} dashboardNewsDraft={dashboardNewsDraft}
                dashboardNewsDraftIssues={dashboardNewsDraftIssues} dashboardNewsSorted={dashboardNewsSorted}
                getEmptyDashboardNewsDraft={getEmptyDashboardNewsDraft}
                handleDeleteDashboardNews={handleDeleteDashboardNews}
                handleReorderDashboardNews={handleReorderDashboardNews}
                handleSaveDashboardNews={handleSaveDashboardNews}
                insertDashboardNewsColorTag={insertDashboardNewsColorTag}
                isDashboardNewsSelectionEmpty={isDashboardNewsSelectionEmpty}
                renderIssueBadge={renderIssueBadge} renderValidationIssues={renderValidationIssues}
                selectedDashboardNewsId={selectedDashboardNewsId} setDashboardNewsDraft={setDashboardNewsDraft}
                setSelectedDashboardNewsId={setSelectedDashboardNewsId}
              />
            ) : null}

            {editTab === 'dashboard' ? (
              <OverviewSettings
                data={data} handleExportHistory={handleExportHistory} handleExportJson={handleExportJson}
                handleImportClick={handleImportClick} historyLimit={historyLimit} historyOnCopy={historyOnCopy}
                openSettingsTab={openSettingsTab} renderSettingsSlider={renderSettingsSlider}
                settingsCounts={settingsCounts} updateSettings={updateSettings}
              />
            ) : null}

            {editTab === 'updates' ? (
              <UpdatesSettings
                availableUpdateVersionLabel={availableUpdateVersionLabel}
                checkingUpdateManually={checkingUpdateManually} handleCheckUpdatesNow={handleCheckUpdatesNow}
                handleInstallDownloadedUpdate={handleInstallDownloadedUpdate}
                installingDownloadedUpdate={installingDownloadedUpdate}
                isUpdateCheckRunning={isUpdateCheckRunning} isUpdateReadyToInstall={isUpdateReadyToInstall}
                showUpdateProgress={showUpdateProgress} updateDownloadProgress={updateDownloadProgress}
                updateSettingsLabel={updateSettingsLabel} updateStatus={updateStatus}
              />
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
