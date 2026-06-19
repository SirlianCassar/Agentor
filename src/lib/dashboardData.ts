/* Normalization & legacy migration for portal procedures, product catalog,
   dashboard products, and dashboard news. */
import { productEditionPlatformLabels, quickLinks } from './constants'
import type {
  AppData,
  CustomerPortalCode,
  CustomerPortalCodeLine,
  DashboardNewsItem,
  DashboardProduct,
  DashboardProductCategory,
  PortalQuickLinkId,
  ProductCatalogItem,
  ProductEdition,
  ProductEditionPlatform,
  SparePart,
} from './types'
import { createId, normalizeDashboardNewsColorTags } from './utils'

export type LegacyCustomerPortalCode = Partial<
  Omit<CustomerPortalCode, 'codes'> &
    CustomerPortalCodeLine & {
      showForward: unknown
      forwardTarget: unknown
      hasVariant: unknown
      mainVersionName: unknown
      variantVersionName: unknown
      variantCodes: unknown
      codes: unknown
    }
>
export type LegacyCustomerPortalCodeLine = Partial<CustomerPortalCodeLine> & {
  quickLinkId?: unknown
  quickLinkUrl?: unknown
}
export type LegacyDashboardProduct = Partial<
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
export type LegacySparePart = Partial<
  SparePart & {
    guideAvailable: unknown
  }
>
export type LegacyProductEdition = Partial<
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
export type LegacyProductCatalogItem = Partial<
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
export type LegacyDashboardNewsItem = Partial<
  DashboardNewsItem & {
    date: unknown
    title: unknown
    content: unknown
  }
>

export const createEmptyPortalCodeLine = (id = createId('portal-code')): CustomerPortalCodeLine => ({
  id,
  title: '',
  code: '',
  showDraft: false,
  quickLinkUrl: '',
  quickCopyText: '',
  quickMailtoTemplateId: '',
  quickMailtoLabel: '',
  quickMailtoHref: '',
  infoNote: '',
})

export type PortalCodeLineSet = 'codes' | 'variantCodes'
export type PortalCodeOptionalModule = 'code' | 'quickLink' | 'quickCopy' | 'mailto'

export const isPortalQuickLinkId = (value: unknown): value is PortalQuickLinkId =>
  value === 'crm' || value === 'share' || value === 'global' || value === 'portal' || value === 'assist'

export const normalizePortalCodeLine = (raw: unknown, fallbackId: string): CustomerPortalCodeLine => {
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
    quickMailtoTemplateId:
      typeof item.quickMailtoTemplateId === 'string' ? item.quickMailtoTemplateId.trim() : '',
    quickMailtoLabel: typeof item.quickMailtoLabel === 'string' ? item.quickMailtoLabel : '',
    quickMailtoHref:
      typeof item.quickMailtoHref === 'string' ? item.quickMailtoHref.trim() : '',
    infoNote: typeof item.infoNote === 'string' ? item.infoNote : '',
  }
}

export const normalizePortalProcedure = (raw: unknown, index: number): CustomerPortalCode => {
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
  const rawVariantCodes = Array.isArray(item.variantCodes) ? item.variantCodes : []
  const variantCodes = rawVariantCodes.map((entry, codeIndex) =>
    normalizePortalCodeLine(entry, `${id}-variant-code-${codeIndex + 1}`),
  )
  const hasVariant = Boolean(item.hasVariant) || variantCodes.length > 0

  return {
    id,
    procedureName: typeof item.procedureName === 'string' ? item.procedureName : '',
    showForward: hasForward,
    forwardTarget: hasForward ? forwardTargetCandidate : '',
    codes,
    hasVariant,
    mainVersionName: typeof item.mainVersionName === 'string' ? item.mainVersionName : '',
    variantVersionName: typeof item.variantVersionName === 'string' ? item.variantVersionName : '',
    variantCodes,
  }
}

export const normalizePortalProcedures = (raw: unknown): CustomerPortalCode[] => {
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => normalizePortalProcedure(item, index))
}

export const normalizePortalProceduresInData = (payload: AppData): AppData => ({
  ...payload,
  settings: {
    ...payload.settings,
    customerPortalCodes: normalizePortalProcedures(payload.settings.customerPortalCodes),
  },
})

export const normalizeDashboardProductCategory = (value: unknown): DashboardProductCategory => {
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

export const normalizeIdList = (value: unknown): string[] => {
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

export const normalizeTextList = (value: unknown): string[] => {
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

export const parseProductTags = (value: string) => normalizeTextList(value.split(/[,;\n]/))

export const normalizeDashboardProduct = (raw: unknown, index: number): DashboardProduct => {
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

export const normalizeDashboardProducts = (raw: unknown): DashboardProduct[] => {
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => normalizeDashboardProduct(item, index))
}

export const normalizeDashboardProductsInData = (payload: AppData): AppData => ({
  ...payload,
  settings: {
    ...payload.settings,
    dashboardProducts: normalizeDashboardProducts(payload.settings.dashboardProducts),
  },
})

export const normalizeSparePart = (raw: unknown, fallbackId: string): SparePart => {
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

export const normalizeProductEditionPlatform = (value: unknown): ProductEditionPlatform => {
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

export const normalizeProductEdition = (raw: unknown, fallbackId: string): ProductEdition => {
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

export const createProductEditionDraft = (
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

export const getProductDashboardVersionIds = (
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

export const normalizeProductCatalogItem = (raw: unknown, index: number): ProductCatalogItem => {
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

export const normalizeProducts = (raw: unknown): ProductCatalogItem[] => {
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => normalizeProductCatalogItem(item, index))
}

export const normalizeProductsInData = (payload: AppData): AppData => ({
  ...payload,
  settings: {
    ...payload.settings,
    products: normalizeProducts(payload.settings.products),
  },
})

export const normalizeDashboardNewsItem = (raw: unknown, index: number): DashboardNewsItem => {
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

export const normalizeDashboardNews = (raw: unknown): DashboardNewsItem[] => {
  if (!Array.isArray(raw)) return []
  return raw.map((item, index) => normalizeDashboardNewsItem(item, index))
}

export const normalizeDashboardNewsInData = (payload: AppData): AppData => ({
  ...payload,
  settings: {
    ...payload.settings,
    dashboardNews: normalizeDashboardNews(payload.settings.dashboardNews),
  },
})

export const normalizeDashboardData = (payload: AppData): AppData =>
  normalizeDashboardNewsInData(
    normalizeProductsInData(
      normalizeDashboardProductsInData(normalizePortalProceduresInData(payload)),
    ),
  )

