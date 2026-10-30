// Constants, local types and small helpers shared by the main window and its zones.
import { categoryColors } from '../lib/utils'
import type { AppIconName } from '../lib/iconTypes'
import type { DashboardProductCategory, ProductCatalogItem } from '../lib/types'
import { emptyLayout, parseLayout, type DashboardWindowKind, type WindowLayout } from '../windows/windowLayout'
import { createCaseTabsState, parseCaseTabs, serializeCaseTabs, type CaseTabsState } from '../lib/caseTabs'

export const TAG_TOKEN = '<TAG>'
export const SELECTOR_TOKEN = '[Option1/Option2]'
export const ADDITION_TOKEN = '§texte§'
export const PROCEDURE_CHANNEL = 'agentor-procedure'
export const APP_VERSION = (import.meta.env.VITE_APP_VERSION || '2.0.0').trim()
export const APP_VERSION_LABEL = APP_VERSION.replace(/\.0$/, '')
export const DATA_HISTORY_LIMIT = 160
export const dashboardProductCategoryLabels: Record<DashboardProductCategory, string> = {
  software: 'Logiciel',
  driver: 'Driver',
  firmware: 'Firmware',
  product: 'Legacy',
}

export type DraftBoxTooltipState = {
  index: number
  x: number
  y: number
  previewHtml: string
}


export type TemplatePreviewState = {
  templateId: string
  folderId?: string
  language: string
  selectedEmailLines: boolean[]
  selectedTaskSections: boolean[]
  importTask: boolean
}

export type WorkspaceDashboardPage =
  | 'tools'
  | 'calculator'
  | 'portal'
  | 'catalog'
  | 'parts'
  | 'decorations'

export const workspaceDashboardPageOptions: Array<{
  id: WorkspaceDashboardPage
  title: string
  icon: AppIconName
}> = [
  { id: 'tools', title: 'Rappels et actus', icon: 'news' },
  { id: 'calculator', title: 'Calculateur prix', icon: 'money' },
  { id: 'portal', title: 'Procédures', icon: 'list' },
  { id: 'parts', title: 'SKU et pièces', icon: 'maintenance' },
  { id: 'decorations', title: 'Ascii Wall', icon: 'asciiWall' },
]

// Main window launcher: each button opens its dashboard in a floating window.
export const dashboardWindowOptions: Array<{ id: DashboardWindowKind; title: string; icon: AppIconName }> = [
  { id: 'case', title: 'Dossier actif', icon: 'caseFile' },
  { id: 'reminders', title: 'Rappels RQT', icon: 'timer' },
  { id: 'news', title: 'News', icon: 'news' },
  { id: 'calculator', title: 'Calculateur prix', icon: 'money' },
  { id: 'portal', title: 'Procédures', icon: 'list' },
  { id: 'parts', title: 'SKU et pièces', icon: 'maintenance' },
  { id: 'decorations', title: 'Ascii Wall', icon: 'asciiWall' },
]

export const WINDOW_LAYOUT_STORAGE_KEY = 'agentor:window-layout:v1'
export const TEMPLATE_LANGUAGE_STORAGE_KEY = 'agentor:template-language'
// Procedure picked in the main window, for the Procédures window when it is
// a separate window: { id, at } in localStorage, shared by every window.
export const PORTAL_PROCEDURE_STORAGE_KEY = 'agentor:portal-procedure'

// Last language picked when loading a template, offered first next time.
export const readStoredTemplateLanguage = () => {
  try {
    return window.localStorage.getItem(TEMPLATE_LANGUAGE_STORAGE_KEY)
  } catch {
    return null
  }
}

export const writeStoredTemplateLanguage = (language: string) => {
  try {
    window.localStorage.setItem(TEMPLATE_LANGUAGE_STORAGE_KEY, language)
  } catch {
    // Only a convenience.
  }
}

export const readStoredWindowLayout = (): WindowLayout => {
  try {
    const raw = window.localStorage.getItem(WINDOW_LAYOUT_STORAGE_KEY)
    return raw ? parseLayout(JSON.parse(raw)) : emptyLayout()
  } catch {
    return emptyLayout()
  }
}

const CASE_TABS_STORAGE_KEY = 'agentor:case-tabs:v1'

// Case tabs are kept on this computer only, outside the exported data.
export const readStoredCaseTabs = (): CaseTabsState => {
  try {
    const raw = window.localStorage.getItem(CASE_TABS_STORAGE_KEY)
    return raw ? parseCaseTabs(JSON.parse(raw)) : createCaseTabsState()
  } catch {
    return createCaseTabsState()
  }
}

export const writeStoredCaseTabs = (state: CaseTabsState) => {
  try {
    window.localStorage.setItem(CASE_TABS_STORAGE_KEY, serializeCaseTabs(state))
  } catch {
    // The live drafts are still saved with the data; only the other tabs are lost.
  }
}

export const categoryColorMap = new Map(categoryColors.map((color) => [color.id, color.hex]))
export const exportFontOptions = [
  { label: 'Calibri', value: 'Calibri, "Segoe UI", Arial, sans-serif' },
  { label: 'Segoe UI', value: '"Segoe UI", Arial, sans-serif' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
]
export const EXPORT_FONT_SIZE_MIN = 10
export const EXPORT_FONT_SIZE_MAX = 22
export const reminderDurationOptions = [0.25, 1, 24, 48] as const
export type ReminderDuration = (typeof reminderDurationOptions)[number]

export const normalizeReminderDuration = (duration: number): ReminderDuration =>
  reminderDurationOptions.includes(duration as ReminderDuration)
    ? (duration as ReminderDuration)
    : 48

// A catalog product once its links to the other products are filled in both ways.
export type LinkedProduct = ProductCatalogItem &
  Required<
    Pick<
      ProductCatalogItem,
      'compatibleProductIds' | 'softwareIds' | 'driverIds' | 'firmwareIds' | 'note' | 'packingGuideAvailable' | 'editions'
    >
  >
