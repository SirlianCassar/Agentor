export type Language = 'fr' | 'en'
export type InsertMode = 'line' | 'cursor'
export type SnippetCategoryDisplay = 'buttons' | 'dropdown'
export type PortalQuickLinkId = 'crm' | 'share' | 'global' | 'portal' | 'assist'

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
  productName?: string
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
  showForward?: boolean
  forwardTarget?: string
  codes: CustomerPortalCodeLine[]
  hasVariant?: boolean
  mainVersionName?: string
  variantVersionName?: string
  variantCodes?: CustomerPortalCodeLine[]
}

export interface CustomerPortalCodeLine {
  id: string
  title?: string
  code: string
  showDraft?: boolean
  quickLinkUrl?: string
  quickCopyText?: string
  quickMailtoTemplateId?: string
  quickMailtoLabel?: string
  quickMailtoHref?: string
  infoNote?: string
}

export interface ProcedureMailtoLink {
  id: string
  label: string
  to: string
  cc?: string
  subject?: string
  body?: string
}

export type DashboardProductCategory = 'software' | 'firmware' | 'driver' | 'product'

export interface DashboardProduct {
  id: string
  name: string
  category: DashboardProductCategory
  latestVersion: string
  sheet: string
  supportUrl?: string
  compatibleProductIds?: string[]
  softwareIds?: string[]
  driverIds?: string[]
}

export interface SparePart {
  id: string
  name: string
  sku: string
  guideAvailable: boolean
}

export type ProductEditionPlatform = 'pc' | 'xbox' | 'playstation' | 'custom'

export interface ProductEdition {
  id: string
  platform: ProductEditionPlatform
  name: string
  firmwareIds: string[]
  compatibleProductIds: string[]
  supportUrl?: string
  shareUrl?: string
  portalUrl?: string
  note?: string
}

export interface ProductCatalogItem {
  id: string
  name: string
  productType?: string
  note?: string
  tags?: string[]
  packingGuideAvailable?: boolean
  compatibleProductIds?: string[]
  softwareIds?: string[]
  driverIds?: string[]
  firmwareIds?: string[]
  editions?: ProductEdition[]
  spareParts: SparePart[]
}

export interface DashboardNewsItem {
  id: string
  date: string
  title: string
  content: string
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
  callTemplate: string
  autoFocusEditor: boolean
  defaultSnippetInsertMode: InsertMode
  snippetCategoryDisplay: SnippetCategoryDisplay
  quickLinkUrls: Record<string, string>
  procedureMailtoLinks: ProcedureMailtoLink[]
  predefinedTags: string[]
  customerPortalCodes: CustomerPortalCode[]
  dashboardProducts: DashboardProduct[]
  products: ProductCatalogItem[]
  dashboardNews: DashboardNewsItem[]
  dashboardReminders: string
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
  callHistory: HistoryItem[]
  settings: AppSettings
}
