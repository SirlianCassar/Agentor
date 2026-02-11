export type Language = 'fr' | 'en'
export type InsertMode = 'line' | 'cursor'
export type SnippetCategoryDisplay = 'buttons' | 'dropdown'

export type CategoryColor =
  | 'rouge'
  | 'orange'
  | 'jaune'
  | 'jaune-vert'
  | 'vert-clair'
  | 'vert'
  | 'cyan'
  | 'turquoise'
  | 'bleu-clair'
  | 'bleu'
  | 'bleu-nuit'
  | 'violet'
  | 'magenta'
  | 'indigo'
  | 'rose'
  | 'fuchsia'

export interface Category {
  id: string
  name: string
  color: CategoryColor
}

export interface Snippet {
  id: string
  title: string
  content: string
  insertMode: InsertMode
  taskText?: string
  taskOptional?: boolean
  categoryId: string
}

export interface MailTemplate {
  id: string
  name: string
  content: string
  language: Language
  taskText?: string
  taskOptional?: boolean
  taskTemplateId?: string
  taskCustom?: boolean
}

export interface TaskTemplate {
  id: string
  name: string
  content: string
}

export type ProcedureBrand = 'hercules' | 'thrustmaster'
export type ProcedureCoverage = 'oow' | 'uw'

export interface Procedure {
  id: string
  name: string
  language: Language
  brand: ProcedureBrand
  coverage: ProcedureCoverage
  infoText: string
  optionalNotes?: string
  steps: string
  taskTemplateId?: string
  taskCustom?: boolean
  taskText?: string
}

export interface HistoryItem {
  id: string
  content: string
  createdAt: string
}

export interface CustomerPortalCode {
  id: string
  procedureName: string
  code: string
}

export interface AppSettings {
  language: Language
  zoom: number
  textScale: number
  editorLineHeight: number
  exportFont: string
  exportFontSize: number
  historyOnCopy: boolean
  historyLimit: number
  autoFocusEditor: boolean
  defaultSnippetInsertMode: InsertMode
  snippetCategoryDisplay: SnippetCategoryDisplay
  customerPortalCodes: CustomerPortalCode[]
}

export interface AppData {
  version: number
  categories: Category[]
  snippets: Snippet[]
  templates: MailTemplate[]
  taskTemplates: TaskTemplate[]
  procedures: Procedure[]
  notes: string
  emailDraft: string
  taskDraft: string
  history: HistoryItem[]
  settings: AppSettings
}
