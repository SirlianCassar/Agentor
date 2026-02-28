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
  DashboardProduct,
  InsertMode,
  Language,
  MailTemplate,
  Procedure,
  ProcedureBrand,
  ProcedureCoverage,
  Snippet,
  TaskTemplate,
} from './lib/types'
import {
  categoryColors,
  countTokens,
  createId,
  escapeHtml,
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

function getUpdatePillText(status: UpdateStatus | null) {
  if (!status) return null
  if (status.phase === 'checking') return 'Recherche MAJ...'
  if (status.phase === 'available') return 'MAJ dispo...'
  if (status.phase === 'downloading') return `MAJ ${Math.round(status.progress ?? 0)}%`
  if (status.phase === 'downloaded') return 'Installer MAJ'
  return null
}

function getUpdateSettingsLabel(status: UpdateStatus | null) {
  if (!status) return 'Statut inconnu.'
  if (status.phase === 'disabled') return 'Mises à jour auto disponibles sur l’application installée.'
  return status.message
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]) {
  const map = new Map(current.map((item) => [item.id, item]))
  for (const item of incoming) map.set(item.id, item)
  return Array.from(map.values())
}

const sanitizeProcedureDraft = (procedure: Procedure & { categoryId?: string }) => {
  const { categoryId, ...rest } = procedure
  void categoryId
  return { ...rest, optionalNotes: rest.optionalNotes ?? '' }
}

const convertLegacyTokens = (value: string) =>
  value.replace(/\*([^*\r\n]+)\*/g, '<$1>').replace(/#([^#\r\n]+)#/g, '§$1§')

const convertLegacyTokensMaybe = (value?: string) =>
  typeof value === 'string' ? convertLegacyTokens(value) : value

const convertLegacyTokensInData = (payload: AppData): AppData => ({
  ...payload,
  notes: convertLegacyTokens(payload.notes),
  emailDraft: convertLegacyTokens(payload.emailDraft),
  taskDraft: convertLegacyTokens(payload.taskDraft),
  history: payload.history.map((item) => ({
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
    infoText: convertLegacyTokens(procedure.infoText),
    optionalNotes: convertLegacyTokensMaybe(procedure.optionalNotes),
    steps: convertLegacyTokens(procedure.steps),
    taskText: convertLegacyTokensMaybe(procedure.taskText),
  })),
  settings: {
    ...payload.settings,
    dashboardProducts: payload.settings.dashboardProducts.map((product) => ({
      ...product,
      name: convertLegacyTokens(product.name),
      sheet: convertLegacyTokens(product.sheet),
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
    settings: {
      ...current.settings,
      ...incoming.settings,
    },
  }
}

function App() {
  const [data, setData] = useState<AppData>(defaultData)
  const isProcedureWindow =
    typeof window !== 'undefined' && window.location.hash === '#procedure'
  const [loaded, setLoaded] = useState(false)
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all')
  const [templateQuery, setTemplateQuery] = useState('')
  const [taskQuery, setTaskQuery] = useState('')
  const [dashboardProductQuery, setDashboardProductQuery] = useState('')
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
  const [dashboardProductFocused, setDashboardProductFocused] = useState(false)
  const [templateListKey, setTemplateListKey] = useState(0)
  const [taskListKey, setTaskListKey] = useState(0)
  const [dashboardProductListKey, setDashboardProductListKey] = useState(0)
  const [emailCopied, setEmailCopied] = useState(false)
  const [taskCopied, setTaskCopied] = useState(false)
  const [portalCopiedId, setPortalCopiedId] = useState<string | null>(null)
  const [dashboardHtCopied, setDashboardHtCopied] = useState(false)
  const [procedureLanguage] = useState<Language>('fr')
  const [procedureBrand, setProcedureBrand] = useState<ProcedureBrand>('hercules')
  const [procedureCoverage, setProcedureCoverage] = useState<ProcedureCoverage>('oow')
  const [activeProcedureId, setActiveProcedureId] = useState<string | null>(null)
  const [activeDashboardProductId, setActiveDashboardProductId] = useState<string | null>(null)
  const [procedureChecks, setProcedureChecks] = useState<Record<number, boolean>>({})
  const [procedureInfoDraft, setProcedureInfoDraft] = useState('')
  const [editTab, setEditTab] = useState<
    'categories' | 'snippets' | 'templates' | 'tasks' | 'procedure' | 'settings' | 'dashboard' | 'updates'
  >(
    'categories',
  )
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
  const [dashboardTtcPrice, setDashboardTtcPrice] = useState('')
  const [dashboardSectionOpen, setDashboardSectionOpen] = useState(true)
  const [dashboardSectionMounted, setDashboardSectionMounted] = useState(true)
  const [settingsPanel, setSettingsPanel] = useState<
    'display' | 'export' | 'general' | 'snippets' | 'history'
  >('display')
  const isCategorySelectionEmpty = selectedCategoryId === null
  const isSnippetSelectionEmpty = selectedSnippetId === null
  const isTemplateSelectionEmpty = selectedTemplateId === null
  const isTaskSelectionEmpty = selectedTaskId === null
  const isProcedureSelectionEmpty = selectedProcedureId === null
  const isDashboardProductSelectionEmpty = selectedDashboardProductId === null

  const emailEditorRef = useRef<TextEditorHandle>(null)
  const taskEditorRef = useRef<TextEditorHandle>(null)
  const emailCopyTimeoutRef = useRef<number | null>(null)
  const taskCopyTimeoutRef = useRef<number | null>(null)
  const portalCopyTimeoutRef = useRef<number | null>(null)
  const dashboardHtCopyTimeoutRef = useRef<number | null>(null)
  const snippetTitleRef = useRef<HTMLInputElement>(null)
  const snippetContentRef = useRef<HTMLTextAreaElement>(null)
  const snippetTaskRef = useRef<HTMLTextAreaElement>(null)
  const templateNameRef = useRef<HTMLInputElement>(null)
  const templateContentRef = useRef<HTMLTextAreaElement>(null)
  const templateTaskRef = useRef<HTMLTextAreaElement>(null)
  const taskTemplateNameRef = useRef<HTMLInputElement>(null)
  const taskTemplateContentRef = useRef<HTMLTextAreaElement>(null)
  const procedureInfoRef = useRef<HTMLTextAreaElement>(null)
  const procedureNotesRef = useRef<HTMLTextAreaElement>(null)
  const procedureStepsRef = useRef<HTMLTextAreaElement>(null)
  const templateSearchRef = useRef<HTMLDivElement>(null)
  const taskSearchRef = useRef<HTMLDivElement>(null)
  const dashboardProductSearchRef = useRef<HTMLDivElement>(null)
  const dashboardProductSheetRef = useRef<HTMLTextAreaElement>(null)
  const manualUpdateCheckRequestedRef = useRef(false)
  const dashboardOpenFrameRef = useRef<number | null>(null)

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

  const closeDashboardProductSearch = useCallback(() => {
    setDashboardProductFocused(false)
    setDashboardProductQuery('')
    setDashboardProductListKey((prev) => prev + 1)
  }, [])

  const closeSearchMenus = useCallback(() => {
    closeTemplateSearch()
    closeTaskSearch()
    closeDashboardProductSearch()
  }, [closeDashboardProductSearch, closeTemplateSearch, closeTaskSearch])

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
    sheet: '',
    supportUrl: '',
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
    const raw = data.settings.customerPortalCodes
    if (!Array.isArray(raw)) return [] as CustomerPortalCode[]
    return raw.map((item, index) => ({
      id: item?.id?.trim() || `portal-${index + 1}`,
      procedureName: item?.procedureName ?? '',
      code: item?.code ?? '',
    }))
  }, [data.settings.customerPortalCodes])
  const dashboardProducts = useMemo(() => {
    const raw = data.settings.dashboardProducts
    if (!Array.isArray(raw)) return [] as DashboardProduct[]
    return raw.map((item, index) => ({
      id: item?.id?.trim() || `product-${index + 1}`,
      name: item?.name ?? '',
      sheet: item?.sheet ?? '',
      supportUrl: item?.supportUrl ?? '',
    }))
  }, [data.settings.dashboardProducts])

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
    () =>
      ({
        id: '',
        name: '',
        sheet: '',
        supportUrl: '',
      }) as DashboardProduct,
    [],
  )

  useEffect(() => {
    let active = true
    loadData().then((loadedData) => {
      if (!active) return
      setData(loadedData)
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
        setToast('Mise à jour prête. Clique sur l’indicateur MAJ pour installer.')
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
      if (dashboardHtCopyTimeoutRef.current !== null) {
        window.clearTimeout(dashboardHtCopyTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setEditOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    if (!editOpen) return
    setSelectedCategoryId(null)
    setSelectedSnippetId(null)
    setSelectedTemplateId(null)
    setSelectedTaskId(null)
    setSelectedProcedureId(null)
    setSelectedDashboardProductId(null)
    setClearAllArmed(false)
    setCategoryDraft(getEmptyCategoryDraft())
    setSnippetDraft(getEmptySnippetDraft())
    setTemplateDraft(getEmptyTemplateDraft())
    setTaskDraft(getEmptyTaskDraft())
    setProcedureDraft(getEmptyProcedureDraft())
    setDashboardProductDraft(getEmptyDashboardProductDraft())
  }, [
    editOpen,
    editTab,
    getEmptyCategoryDraft,
    getEmptySnippetDraft,
    getEmptyTemplateDraft,
    getEmptyTaskDraft,
    getEmptyProcedureDraft,
    getEmptyDashboardProductDraft,
  ])

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
      if (dashboardProductSearchRef.current?.contains(target)) return
      closeSearchMenus()
    }
    window.addEventListener('pointerdown', handlePointerDown, true)
    return () => window.removeEventListener('pointerdown', handlePointerDown, true)
  }, [closeSearchMenus])

  const emailTags = useMemo(() => countTokens(data.emailDraft), [data.emailDraft])
  const taskTags = useMemo(() => countTokens(data.taskDraft), [data.taskDraft])
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
  const updatePillText = getUpdatePillText(updateStatus)
  const updateSettingsLabel = getUpdateSettingsLabel(updateStatus)
  const isUpdateReadyToInstall = updateStatus?.phase === 'downloaded'
  const showUpdateInAppName =
    updateStatus?.phase === 'available' ||
    updateStatus?.phase === 'downloading' ||
    isUpdateReadyToInstall
  const appNameLabel = showUpdateInAppName ? 'SpeedMail (MAJ dispo)' : 'SpeedMail'
  const settingsPanels = [
    { id: 'display', label: 'Affichage' },
    { id: 'export', label: 'Texte exporté' },
    { id: 'general', label: 'Général' },
    { id: 'snippets', label: 'Snippets' },
    { id: 'history', label: 'Historique' },
  ] as const
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
  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setData((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
  }, [])
  const updateCustomerPortalCodes = useCallback((next: CustomerPortalCode[]) => {
    updateSettings({ customerPortalCodes: next })
  }, [updateSettings])
  const updateDashboardProducts = useCallback((next: DashboardProduct[]) => {
    updateSettings({ dashboardProducts: next })
  }, [updateSettings])

  const handleCheckUpdatesNow = useCallback(async () => {
    manualUpdateCheckRequestedRef.current = true
    setCheckingUpdateManually(true)
    try {
      const result = await checkForUpdatesNow()
      if (!result.ok) {
        if (result.reason === 'disabled') {
          setToast('Recherche de MAJ disponible uniquement sur l’application installée.')
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

  const handleInstallDownloadedUpdate = useCallback(async () => {
    if (updateStatus?.phase !== 'downloaded') return
    const confirmed = window.confirm(
      'Une mise à jour est prête. Voulez-vous redémarrer maintenant pour l’installer ?',
    )
    if (!confirmed) return

    setInstallingDownloadedUpdate(true)
    try {
      const result = await installDownloadedUpdate()
      if (!result.ok) {
        if (result.reason === 'not-downloaded') {
          setToast('La mise à jour n’est pas encore prête.')
        } else if (result.reason === 'disabled') {
          setToast('Installation MAJ disponible uniquement sur l’application installée.')
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
    if (!activeDashboardProductId) return
    if (dashboardProducts.some((product) => product.id === activeDashboardProductId)) return
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

  const dashboardProductResults = useMemo(() => {
    const query = dashboardProductQuery.trim().toLowerCase()
    if (!dashboardProductFocused && !query) return []
    if (!query) return dashboardProducts
    return dashboardProducts.filter((product) => product.name.toLowerCase().includes(query))
  }, [dashboardProductFocused, dashboardProductQuery, dashboardProducts])

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
    () => dashboardProducts.find((product) => product.id === activeDashboardProductId) ?? null,
    [dashboardProducts, activeDashboardProductId],
  )

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

  const updateEmailDraft = useCallback((next: string, cursor?: number) => {
    const normalized = normalizeTokenSpacing(next)
    setData((prev) => ({ ...prev, emailDraft: normalized }))
    if (cursor !== undefined) {
      requestAnimationFrame(() => emailEditorRef.current?.setSelection(cursor, cursor))
    }
  }, [])

  const updateTaskDraft = useCallback((next: string, cursor?: number) => {
    const normalized = normalizeTokenSpacing(next)
    setData((prev) => ({ ...prev, taskDraft: normalized }))
    if (cursor !== undefined) {
      requestAnimationFrame(() => taskEditorRef.current?.setSelection(cursor, cursor))
    }
  }, [])

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
  ) => {
    const target = ref.current
    const start = target?.selectionStart ?? value.length
    const end = target?.selectionEnd ?? value.length
    const next = `${value.slice(0, start)}${token}${value.slice(end)}`
    setValue(next)
    requestAnimationFrame(() => {
      const pos = start + token.length
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
    if (snippet.insertMode === 'line') {
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
    if (emailCopyTimeoutRef.current) {
      window.clearTimeout(emailCopyTimeoutRef.current)
    }
    setEmailCopied(true)
    emailCopyTimeoutRef.current = window.setTimeout(() => setEmailCopied(false), 1600)
  }

  const handleCopyTask = async () => {
    if (!data.taskDraft.trim()) return
    const cleaned = stripTokenSpacing(data.taskDraft)
    const didCopy = await copyText(cleaned, buildExportHtml(cleaned))
    if (!didCopy) {
      setToast('Copie impossible.')
      return
    }
    if (taskCopyTimeoutRef.current) {
      window.clearTimeout(taskCopyTimeoutRef.current)
    }
    setTaskCopied(true)
    taskCopyTimeoutRef.current = window.setTimeout(() => setTaskCopied(false), 1600)
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

  const handleCopyDashboardHt = async () => {
    if (dashboardHtPrice === null) return
    const didCopy = await copyText(`${formattedDashboardHtPrice} EUR`)
    if (!didCopy) {
      setToast('Copie impossible.')
      return
    }
    if (dashboardHtCopyTimeoutRef.current) {
      window.clearTimeout(dashboardHtCopyTimeoutRef.current)
    }
    setDashboardHtCopied(true)
    dashboardHtCopyTimeoutRef.current = window.setTimeout(() => setDashboardHtCopied(false), 1600)
  }

  const handleSaveDashboardProduct = () => {
    const name = dashboardProductDraft.name.trim()
    if (!name) return
    const payload: DashboardProduct = {
      id: dashboardProductDraft.id,
      name,
      sheet: dashboardProductDraft.sheet,
      supportUrl: dashboardProductDraft.supportUrl?.trim() ?? '',
    }

    const exists = dashboardProducts.some((product) => product.id === payload.id)
    const id = exists ? payload.id : createId('product')
    const next = exists
      ? dashboardProducts.map((product) => (product.id === id ? { ...payload, id } : product))
      : [...dashboardProducts, { ...payload, id }]
    updateDashboardProducts(next)
    setSelectedDashboardProductId(null)
    setDashboardProductDraft(getEmptyDashboardProductDraft())
  }

  const handleDeleteDashboardProduct = (product: DashboardProduct) => {
    if (!window.confirm(`Supprimer le produit "${product.name}" ?`)) return
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
    setProcedureChecks({})
    setActiveProcedureId(null)
    setActiveDashboardProductId(null)
    setDashboardProductQuery('')
    setDashboardProductFocused(false)
    setSnippetTooltip(null)
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
  const dashboardTtcValue = dashboardTtcPrice.replace(',', '.').trim()
  const parsedDashboardTtc = Number.parseFloat(dashboardTtcValue)
  const dashboardHtPrice = Number.isFinite(parsedDashboardTtc) ? parsedDashboardTtc / VAT_DIVISOR : null
  const formattedDashboardHtPrice =
    dashboardHtPrice === null
      ? '--'
      : new Intl.NumberFormat('fr-FR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(dashboardHtPrice)

  if (isProcedureWindow) {
    return (
      <>
        <div className="dashboard-shell">
          <div className="dashboard-main">
            <header className="dashboard-header">
              <div>
                <div className="dashboard-header__title">Dashboard</div>
              </div>
              <button
                className="ghost"
                type="button"
                onClick={() => window.close()}
              >
                Fermer
              </button>
            </header>

            <div className="dashboard-grid">
              <section className="dashboard-panel dashboard-panel--codes">
                <div className="dashboard-panel__title">Codes customer portal</div>
                {customerPortalCodes.length ? (
                  <div className="portal-code-list">
                    {customerPortalCodes.map((item) => (
                      <div className="portal-code-item" key={item.id}>
                        <div className="portal-code-item__name">
                          {item.procedureName.trim() || 'Procédure sans nom'}
                        </div>
                        <div className="portal-code-item__actions">
                          <code className="portal-code-item__code">{item.code.trim() || '—'}</code>
                          <button
                            className={`ghost dashboard-copy-btn${
                              portalCopiedId === item.id ? ' is-success' : ''
                            }`}
                            type="button"
                            onClick={() => void handleCopyPortalCode(item.id, item.code)}
                            disabled={!item.code.trim()}
                          >
                            {portalCopiedId === item.id ? 'Copié !' : 'Copier'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="dashboard-empty">Aucun code configuré dans Paramètres.</div>
                )}
              </section>

              <section className="dashboard-panel dashboard-panel--versions">
                <div className="dashboard-panel__title">Versions produits</div>
                <div className="dashboard-versions-tools">
                  <div className="template-search-wrap dashboard-products-search" ref={dashboardProductSearchRef}>
                    <input
                      value={dashboardProductQuery}
                      onChange={(event) => setDashboardProductQuery(event.target.value)}
                      placeholder="Rechercher un produit..."
                      onFocus={() => {
                        setDashboardProductFocused(true)
                        setDashboardProductListKey((prev) => prev + 1)
                      }}
                      onBlur={() => {
                        closeDashboardProductSearch()
                      }}
                    />
                    {dashboardProductResults.length ? (
                      <div
                        className="search-results visible"
                        key={dashboardProductListKey}
                        onMouseDown={(event) => event.preventDefault()}
                      >
                        {dashboardProductResults.map((product) => (
                          <div
                            key={product.id}
                            className="search-result-item"
                            onClick={() => {
                              setActiveDashboardProductId(product.id)
                              closeDashboardProductSearch()
                            }}
                          >
                            <div className="result-name">
                              <span className="result-name__text">
                                {product.name.trim() || 'Produit sans nom'}
                              </span>
                            </div>
                            <div
                              className="result-preview"
                              dangerouslySetInnerHTML={{
                                __html: highlightTextPreview(product.sheet.split('\n')[0] ?? ''),
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <button
                    className="ghost dashboard-support-btn"
                    type="button"
                    onClick={handlePullSupportSite}
                  >
                    Pull site support
                  </button>
                </div>

                {activeDashboardProduct ? (
                  <div className="dashboard-product-sheet" onClick={handleProcedureLinkClick}>
                    <div className="dashboard-product-sheet__title">{activeDashboardProduct.name}</div>
                    <div
                      className="dashboard-product-sheet__content"
                      dangerouslySetInnerHTML={{
                        __html: formatProcedureText(activeDashboardProduct.sheet || 'Fiche vide.'),
                      }}
                    />
                  </div>
                ) : (
                  <div className="dashboard-wip">
                    <strong>Recherche produit</strong>
                    <span>Sélectionne un produit pour afficher sa fiche version.</span>
                  </div>
                )}
              </section>

              <section className="dashboard-panel dashboard-panel--formatter">
                <div className="dashboard-panel__title">Name formatter</div>
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
              </section>

              <section className="dashboard-panel dashboard-panel--vat">
                <div className="dashboard-panel__title">Calculateur TVA</div>
                <div className="dashboard-calculator">
                  <label className="dashboard-calculator__label" htmlFor="dashboard-price-ttc">
                    Prix TTC
                  </label>
                  <input
                    id="dashboard-price-ttc"
                    className="input"
                    value={dashboardTtcPrice}
                    onChange={(event) => setDashboardTtcPrice(event.target.value)}
                    placeholder="Ex: 119,99"
                    inputMode="decimal"
                  />
                  <div className="dashboard-calculator__result">
                    <span>
                      HT: <strong>{formattedDashboardHtPrice} EUR</strong>
                    </span>
                    <button
                      className={`ghost dashboard-copy-btn dashboard-copy-btn--inline${
                        dashboardHtCopied ? ' is-success' : ''
                      }`}
                      type="button"
                      onClick={() => void handleCopyDashboardHt()}
                      disabled={dashboardHtPrice === null}
                    >
                      {dashboardHtCopied ? 'Copié !' : 'Copier'}
                    </button>
                  </div>
                </div>
              </section>

              <section className="dashboard-panel dashboard-panel--wip">
                <div className="dashboard-panel__title">Encart WIP</div>
                <div className="dashboard-wip">
                  <strong>WIP</strong>
                  <span>Zone non définie pour le moment.</span>
                </div>
              </section>
            </div>
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
            <p className="brand-name">{appNameLabel}</p>
            <span className="version-pill">v{APP_VERSION_LABEL}</span>
            {updatePillText ? (
              <button
                type="button"
                className={`update-pill${isUpdateReadyToInstall ? ' update-pill--action' : ''}`}
                onClick={() => void handleInstallDownloadedUpdate()}
                disabled={!isUpdateReadyToInstall || installingDownloadedUpdate}
                title={
                  isUpdateReadyToInstall
                    ? 'Installer la mise à jour'
                    : 'La mise à jour sera installable une fois téléchargée'
                }
              >
                {installingDownloadedUpdate && isUpdateReadyToInstall
                  ? 'Installation...'
                  : updatePillText}
              </button>
            ) : null}
          </div>
          <div className="sidebar-top-actions">
            <button
              className="sidebar-icon-btn"
              onClick={() => setEditOpen(true)}
              title="Édition"
              aria-label="Édition"
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
          <p className="workspace-title">Compose template</p>
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
        </header>

        <div className="workspace-content">
          <section className="composer">
            <TextEditor
              ref={emailEditorRef}
              value={data.emailDraft}
              onChange={(value) => updateEmailDraft(value)}
              placeholder="Rédigez votre email..."
              className="editor--email"
            />
            <div className="composer-actions">
              <div className="composer-actions__left">
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
              </div>
              <div className="actions">
                {emailTags ? <span className="tag-warning">⚠️</span> : null}
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
              <div className="workspace-dashboard__inner">
                <div className="workspace-dashboard__left">
                  <article className="workspace-dashboard__panel">
                    <div className="workspace-dashboard__panel-title">Name format</div>
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
                  <article className="workspace-dashboard__panel">
                    <div className="workspace-dashboard__panel-title">TVA Calculator</div>
                    <div className="dashboard-calculator">
                      <label className="dashboard-calculator__label" htmlFor="dashboard-price-ttc">
                        Prix TTC
                      </label>
                      <input
                        id="dashboard-price-ttc"
                        className="input"
                        value={dashboardTtcPrice}
                        onChange={(event) => setDashboardTtcPrice(event.target.value)}
                        placeholder="Ex: 119,99"
                        inputMode="decimal"
                      />
                      <div className="dashboard-calculator__result">
                        <span>
                          HT: <strong>{formattedDashboardHtPrice} EUR</strong>
                        </span>
                        <button
                          className={`ghost dashboard-copy-btn dashboard-copy-btn--inline${
                            dashboardHtCopied ? ' is-success' : ''
                          }`}
                          type="button"
                          onClick={() => void handleCopyDashboardHt()}
                          disabled={dashboardHtPrice === null}
                        >
                          {dashboardHtCopied ? 'Copié !' : 'Copier'}
                        </button>
                      </div>
                    </div>
                  </article>
                </div>
                <article className="workspace-dashboard__panel workspace-dashboard__panel--portal">
                  <div className="workspace-dashboard__panel-title">PORTAL CODES</div>
                  {customerPortalCodes.length ? (
                    <div className="portal-code-list">
                      {customerPortalCodes.map((item) => (
                        <div className="portal-code-item" key={item.id}>
                          <div className="portal-code-item__name">
                            {item.procedureName.trim() || 'Procédure sans nom'}
                          </div>
                          <div className="portal-code-item__actions">
                            <code className="portal-code-item__code">{item.code.trim() || '—'}</code>
                            <button
                              className={`ghost dashboard-copy-btn${
                                portalCopiedId === item.id ? ' is-success' : ''
                              }`}
                              type="button"
                              onClick={() => void handleCopyPortalCode(item.id, item.code)}
                              disabled={!item.code.trim()}
                            >
                              {portalCopiedId === item.id ? 'Copié !' : 'Copier'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="dashboard-empty">Aucun code configuré dans Paramètres.</div>
                  )}
                </article>
              </div>
            </section>
          ) : null}
        </div>
      </main>

      <aside className="right-sidebar">
        <div className="note-panel-workspace">
          <p className="section-label section-label--tight">Notes personnelles</p>
          <div className="note-editor-wrapper">
            <textarea
              value={data.notes}
              onChange={(event) => setData((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Notes persistantes..."
            />
            <button
              className="note-clear-btn"
              onClick={() => setData((prev) => ({ ...prev, notes: '' }))}
              title="Effacer la note"
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

        <section className="task-builder">
          <p className="section-label section-label--tight">Task Builder</p>
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
            <p className="task-title">Task</p>
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
    {snippetTooltip ? (
      <div
        className="bullet-tooltip visible"
        style={{ top: snippetTooltip.y, left: snippetTooltip.x }}
        dangerouslySetInnerHTML={{ __html: highlightTextPreview(snippetTooltip.text) }}
      />
    ) : null}

    {editOpen ? (
        <div className="modal-backdrop" onClick={() => setEditOpen(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <div className="modal__header">
              <div className="brand__title">Édition</div>
              <div className="modal-actions">
                <button className="icon-btn" onClick={handleExportJson} title="Exporter les données">
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
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </button>
                <button
                  className="icon-btn"
                  onClick={handleImportClick}
                  title="Importer les données (Shift = remplacer)"
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
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
                <button
                  className="icon-btn"
                  onClick={handleExportHistory}
                  title="Exporter l’historique (.txt)"
                  disabled={!data.history.length}
                >
                  {data.history.length ? (
                    <span className="mail-count-badge">{data.history.length}</span>
                  ) : null}
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
                    <path d="M4 4h12v12H4z" />
                    <path d="M16 8h4v12H8v-4" />
                    <path d="M8 9h4" />
                    <path d="M8 13h4" />
                  </svg>
                </button>
                <button
                  className={`icon-btn danger${clearAllArmed ? ' confirm' : ''}`}
                  onClick={handleClearData}
                  title={clearAllArmed ? 'Confirmer suppression des données' : 'Clear data'}
                  aria-label="Clear data"
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
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" />
                    <path d="M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
                <button className="close-modal" onClick={() => setEditOpen(false)}>
                  ×
                </button>
              </div>
            </div>

            <div className="modal__tabs">
              {[
                { id: 'categories', label: 'Catégories' },
                { id: 'snippets', label: 'Snippets' },
                { id: 'templates', label: 'Templates mail' },
                { id: 'tasks', label: 'Templates de tâche' },
                { id: 'dashboard', label: 'Dashboard' },
                { id: 'updates', label: 'Mise à jour' },
                { id: 'settings', label: 'Paramètres' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`tab${editTab === tab.id ? ' active' : ''}`}
                  onClick={() => setEditTab(tab.id as typeof editTab)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

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
                            <div className="list-item__title">
                              {snippet.title}
                              <span className="insert-icons">
                                <span
                                  className={`insert-icon insert-icon--badge${
                                    snippet.insertMode === 'line' ? ' is-line' : ' is-cursor'
                                  }`}
                                  title={
                                    snippet.insertMode === 'line'
                                      ? 'Insertion à la ligne'
                                      : 'Insertion au curseur'
                                  }
                                >
                                  {snippet.insertMode === 'line' ? 'L' : 'C'}
                                </span>
                              </span>
                            </div>
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
                          onFocus={() => setSnippetActiveField('title')}
                          onChange={(event) =>
                            setSnippetDraft((prev) => ({ ...prev, title: event.target.value }))
                          }
                        />
                        <textarea
                          className="textarea textarea--tall"
                          placeholder="Contenu"
                          value={snippetDraft.content}
                          ref={snippetContentRef}
                          onFocus={() => setSnippetActiveField('content')}
                          onChange={(event) =>
                            setSnippetDraft((prev) => ({ ...prev, content: event.target.value }))
                          }
                        />
                        <div className="form__row two">
                          <select
                            className="select select--roomy"
                            value={snippetDraft.insertMode}
                            onChange={(event) =>
                              setSnippetDraft((prev) => ({
                                ...prev,
                                insertMode: event.target.value as InsertMode,
                              }))
                            }
                          >
                            <option value="line">À la ligne</option>
                            <option value="cursor">Au curseur</option>
                          </select>
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
                          onFocus={() => setSnippetActiveField('task')}
                          onChange={(event) =>
                            setSnippetDraft((prev) => ({ ...prev, taskText: event.target.value }))
                          }
                          readOnly={snippetDraft.taskOptional ?? false}
                        />
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
                          onFocus={() => setTemplateActiveField('name')}
                          onChange={(event) =>
                            setTemplateDraft((prev) => ({ ...prev, name: event.target.value }))
                          }
                        />
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
                          onFocus={() => setTemplateActiveField('content')}
                          onChange={(event) =>
                            setTemplateDraft((prev) => ({ ...prev, content: event.target.value }))
                          }
                        />
                        {templateUsesCustomTask ? (
                          <textarea
                            className={`textarea${
                              templateDraft.taskOptional ? ' textarea--disabled' : ''
                            }`}
                            placeholder="Tâche custom"
                            value={templateDraft.taskText ?? ''}
                            ref={templateTaskRef}
                            onFocus={() => setTemplateActiveField('task')}
                            onChange={(event) =>
                              setTemplateDraft((prev) => ({
                                ...prev,
                                taskText: event.target.value,
                              }))
                            }
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
                          onFocus={() => setTaskTemplateActiveField('name')}
                          onChange={(event) =>
                            setTaskDraft((prev) => ({ ...prev, name: event.target.value }))
                          }
                        />
                        <textarea
                          className="textarea textarea--tall"
                          placeholder="Contenu"
                          value={taskDraft.content}
                          ref={taskTemplateContentRef}
                          onFocus={() => setTaskTemplateActiveField('content')}
                          onChange={(event) =>
                            setTaskDraft((prev) => ({ ...prev, content: event.target.value }))
                          }
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {editTab === 'procedure' ? (
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
                          onChange={(event) =>
                            setProcedureDraft((prev) => ({ ...prev, name: event.target.value }))
                          }
                        />
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
                          onFocus={() => setProcedureActiveField('info')}
                          onChange={(event) =>
                            setProcedureDraft((prev) => ({
                              ...prev,
                              infoText: event.target.value,
                            }))
                          }
                        />
                        <textarea
                          className="textarea textarea--tall"
                          placeholder="Notes optionnelles"
                          value={procedureDraft.optionalNotes ?? ''}
                          ref={procedureNotesRef}
                          onFocus={() => setProcedureActiveField('notes')}
                          onChange={(event) =>
                            setProcedureDraft((prev) => ({
                              ...prev,
                              optionalNotes: event.target.value,
                            }))
                          }
                        />
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
                          onFocus={() => setProcedureActiveField('steps')}
                          onChange={(event) =>
                            setProcedureDraft((prev) => ({
                              ...prev,
                              steps: event.target.value,
                            }))
                          }
                        />
                        {procedureUsesCustomTask ? (
                          <textarea
                            className="textarea"
                            placeholder="Tâche custom"
                            value={procedureDraft.taskText ?? ''}
                            onChange={(event) =>
                              setProcedureDraft((prev) => ({
                                ...prev,
                                taskText: event.target.value,
                              }))
                            }
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

            {editTab === 'settings' ? (
              <div className="settings-layout">
                <aside className="settings-layout__nav">
                  {settingsPanels.map((panel) => (
                    <button
                      key={panel.id}
                      type="button"
                      className={`settings-layout__nav-btn${
                        settingsPanel === panel.id ? ' is-active' : ''
                      }`}
                      onClick={() => setSettingsPanel(panel.id)}
                    >
                      {panel.label}
                    </button>
                  ))}
                </aside>

                <div className="settings-layout__content">
                  {settingsPanel === 'display' ? (
                    <div className="list-card list-card--form">
                      <div className="list-card__header">
                        <div className="list-card__title-group">
                          <div className="list-card__title">Affichage</div>
                          <div className="list-card__subtitle">Confort visuel et densité.</div>
                        </div>
                      </div>
                      <div className="list-card__body">
                        <div className="settings-block">
                          <div>
                            <div className="settings-row">
                              <div className="settings-label">Taille du texte</div>
                              <div className="settings-value">{Math.round(textScale * 100)}%</div>
                            </div>
                            <input
                              className="range"
                              type="range"
                              min="0.85"
                              max="1.4"
                              step="0.05"
                              value={textScale}
                              onChange={(event) => {
                                const nextScale = Number(event.target.value)
                                const textScale = Math.min(1.4, Math.max(0.85, nextScale))
                                updateSettings({ textScale })
                              }}
                            />
                          </div>
                          <div>
                            <div className="settings-row">
                              <div className="settings-label">Niveau de zoom</div>
                              <div className="settings-value">{Math.round(zoomValue * 100)}%</div>
                            </div>
                            <input
                              className="range"
                              type="range"
                              min="0.8"
                              max="1.3"
                              step="0.05"
                              value={zoomValue}
                              onChange={(event) => {
                                const nextZoom = Number(event.target.value)
                                const zoom = Math.min(1.3, Math.max(0.8, nextZoom))
                                updateSettings({ zoom })
                              }}
                            />
                          </div>
                          <div>
                            <div className="settings-row">
                              <div className="settings-label">Interligne éditeur</div>
                              <div className="settings-value">{editorLineHeight.toFixed(2)}x</div>
                            </div>
                            <input
                              className="range"
                              type="range"
                              min="1.3"
                              max="2"
                              step="0.05"
                              value={editorLineHeight}
                              onChange={(event) => {
                                const nextHeight = Number(event.target.value)
                                const editorLineHeight = Math.min(2, Math.max(1.3, nextHeight))
                                updateSettings({ editorLineHeight })
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {settingsPanel === 'export' ? (
                    <div className="list-card list-card--form">
                      <div className="list-card__header">
                        <div className="list-card__title-group">
                          <div className="list-card__title">Texte exporté</div>
                          <div className="list-card__subtitle">
                            Police et taille lors de la copie.
                          </div>
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
                          <div>
                            <div className="settings-row">
                              <div className="settings-label">Taille</div>
                              <div className="settings-value">{exportFontSize}px</div>
                            </div>
                            <input
                              className="range"
                              type="range"
                              min={EXPORT_FONT_SIZE_MIN}
                              max={EXPORT_FONT_SIZE_MAX}
                              step="1"
                              value={exportFontSize}
                              onChange={(event) => {
                                const nextSize = Number(event.target.value)
                                const exportFontSize = Math.min(
                                  EXPORT_FONT_SIZE_MAX,
                                  Math.max(EXPORT_FONT_SIZE_MIN, nextSize),
                                )
                                updateSettings({ exportFontSize })
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {settingsPanel === 'general' ? (
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

                  {settingsPanel === 'snippets' ? (
                    <div className="list-card list-card--form">
                      <div className="list-card__header">
                        <div className="list-card__title-group">
                          <div className="list-card__title">Snippets</div>
                          <div className="list-card__subtitle">Règles de création rapide.</div>
                        </div>
                      </div>
                      <div className="list-card__body">
                        <div className="settings-block">
                          <div className="settings-option">
                            <div className="settings-option__info">
                              <div className="settings-option__title">
                                Mode d'insertion par défaut
                              </div>
                              <div className="settings-option__desc">
                                Appliqué aux nouveaux snippets.
                              </div>
                            </div>
                            <div className="settings-segment">
                              <button
                                type="button"
                                className={`settings-pill${
                                  defaultSnippetInsertMode === 'line' ? ' is-active' : ''
                                }`}
                                onClick={() => updateSettings({ defaultSnippetInsertMode: 'line' })}
                              >
                                À la ligne
                              </button>
                              <button
                                type="button"
                                className={`settings-pill${
                                  defaultSnippetInsertMode === 'cursor' ? ' is-active' : ''
                                }`}
                                onClick={() => updateSettings({ defaultSnippetInsertMode: 'cursor' })}
                              >
                                Au curseur
                              </button>
                            </div>
                          </div>
                          <div className="settings-option">
                            <div className="settings-option__info">
                              <div className="settings-option__title">Affichage des catégories</div>
                              <div className="settings-option__desc">
                                Affiche les catégories des snippets en 7 boutons ou en liste
                                déroulante.
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
                      </div>
                    </div>
                  ) : null}

                  {settingsPanel === 'history' ? (
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
                              <div className="settings-option__title">Sauvegarder les copies</div>
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
                          <div>
                            <div className="settings-row">
                              <div className="settings-label">Taille max</div>
                              <div className="settings-value">{historyLimit} entrées</div>
                            </div>
                            <input
                              className="range"
                              type="range"
                              min="50"
                              max="400"
                              step="10"
                              value={historyLimit}
                              disabled={!historyOnCopy}
                              onChange={(event) => {
                                const nextLimit = Number(event.target.value)
                                const historyLimit = Math.min(400, Math.max(50, nextLimit))
                                updateSettings({ historyLimit })
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {editTab === 'dashboard' ? (
              <div className="modal__grid modal__grid--settings">
                <div className="list-card list-card--form">
                  <div className="list-card__header">
                    <div className="list-card__title-group">
                      <div className="list-card__title">Codes customer portal</div>
                      <div className="list-card__subtitle">
                        Liste affichée dans le dashboard.
                      </div>
                    </div>
                    <div className="list-card__tools">
                      <button
                        className="btn btn--ghost btn--small"
                        type="button"
                        onClick={() =>
                          updateCustomerPortalCodes([
                            ...customerPortalCodes,
                            { id: createId('portal'), procedureName: '', code: '' },
                          ])
                        }
                      >
                        Ajouter
                      </button>
                    </div>
                  </div>
                  <div className="list-card__body">
                    <div className="portal-code-editor">
                      {customerPortalCodes.length ? (
                        customerPortalCodes.map((item) => (
                          <div className="portal-code-editor__row" key={item.id}>
                            <input
                              className="input"
                              value={item.procedureName}
                              placeholder="Nom de procédure"
                              onChange={(event) =>
                                updateCustomerPortalCodes(
                                  customerPortalCodes.map((entry) =>
                                    entry.id === item.id
                                      ? { ...entry, procedureName: event.target.value }
                                      : entry,
                                  ),
                                )
                              }
                            />
                            <input
                              className="input"
                              value={item.code}
                              placeholder="Code portal"
                              onChange={(event) =>
                                updateCustomerPortalCodes(
                                  customerPortalCodes.map((entry) =>
                                    entry.id === item.id
                                      ? { ...entry, code: event.target.value }
                                      : entry,
                                  ),
                                )
                              }
                            />
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
                        ))
                      ) : (
                        <div className="empty-state">Aucun code configuré.</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="list-card list-card--form">
                  <div className="list-card__header">
                    <div className="list-card__title-group">
                      <div className="list-card__title">Produits versions</div>
                      <div className="list-card__subtitle">Fiches affichées dans le dashboard.</div>
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
                                setDashboardProductDraft(product)
                                setSelectedDashboardProductId(product.id)
                              }}
                            >
                              <div className="list-item__content">
                                <div className="list-item__title">{product.name}</div>
                                <div className="list-item__meta">
                                  {product.sheet.split('\n')[0] || 'Fiche vide'}
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
                          <div className="empty-state">Aucun produit configuré.</div>
                        )}
                      </div>

                      <div className="dashboard-product-editor__form">
                        {isDashboardProductSelectionEmpty ? (
                          <div className="empty-state">
                            Sélectionnez un produit pour éditer sa fiche ou appuyez sur Nouveau.
                          </div>
                        ) : (
                          <div className="form">
                            <input
                              className="input"
                              placeholder="Nom du produit"
                              value={dashboardProductDraft.name}
                              onChange={(event) =>
                                setDashboardProductDraft((prev) => ({
                                  ...prev,
                                  name: event.target.value,
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
                              placeholder="Fiche produit (versions, firmware, notes, liens...)"
                              value={dashboardProductDraft.sheet}
                              onChange={(event) =>
                                setDashboardProductDraft((prev) => ({
                                  ...prev,
                                  sheet: event.target.value,
                                }))
                              }
                            />

                            <div className="list-item__meta">
                              Mise en forme supportée: [b][/b], [i][/i], [texte](https://...)
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
                      <div className="list-card__subtitle">Vérification et statut de l’application.</div>
                    </div>
                  </div>
                  <div className="list-card__body">
                    <div className="settings-block">
                      <div className="settings-option settings-option--column">
                        <div className="settings-option__info">
                          <div className="settings-option__title">Statut actuel</div>
                          <div className="settings-option__desc">{updateSettingsLabel}</div>
                        </div>
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
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

          </div>
        </div>
      ) : null}

    </>
  )
}

export default App
