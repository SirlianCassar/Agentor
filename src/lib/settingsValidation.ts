import type {
  Category,
  CustomerPortalCode,
  CustomerPortalCodeLine,
  DashboardNewsItem,
  DashboardProduct,
  MailTemplate,
  ProductCatalogItem,
  ProcedureMailtoLink,
  Snippet,
  TaskTemplate,
  TroubleshootgunTemplate,
} from './types'

export type SettingsValidationScope =
  | 'category'
  | 'snippet'
  | 'template'
  | 'task'
  | 'dashboardProduct'
  | 'product'
  | 'portalProcedure'
  | 'procedureMailto'
  | 'dashboardNews'

const isBlank = (value: unknown) => typeof value !== 'string' || !value.trim()

export const hasIssues = (issues: string[]) => issues.length > 0

export function getCategoryIssues(category: Category) {
  const issues: string[] = []
  if (isBlank(category.name)) issues.push('Titre obligatoire.')
  if (isBlank(category.color)) issues.push('Couleur obligatoire.')
  return issues
}

export function getSnippetIssues(snippet: Snippet, categoryIds: Set<string>) {
  const issues: string[] = []
  if (isBlank(snippet.title)) issues.push('Titre obligatoire.')
  if (isBlank(snippet.content)) issues.push('Contenu obligatoire.')
  if (!snippet.categoryId || !categoryIds.has(snippet.categoryId)) {
    issues.push('Categorie obligatoire.')
  }
  return issues
}

export function getMailTemplateIssues(template: MailTemplate, taskTemplateIds: Set<string>) {
  const issues: string[] = []
  if (isBlank(template.name)) issues.push('Titre obligatoire.')
  if (isBlank(template.content)) issues.push('Contenu obligatoire.')
  if (
    template.taskTemplateId &&
    !template.taskCustom &&
    !template.taskOptional &&
    !taskTemplateIds.has(template.taskTemplateId)
  ) {
    issues.push('Template de task introuvable.')
  }
  return issues
}

export function getTaskTemplateIssues(task: TaskTemplate) {
  const issues: string[] = []
  if (isBlank(task.name)) issues.push('Titre obligatoire.')
  if (isBlank(task.content)) issues.push('Contenu obligatoire.')
  return issues
}

export function getDashboardProductIssues(product: DashboardProduct) {
  const issues: string[] = []
  if (isBlank(product.name)) issues.push('Nom obligatoire.')
  if (product.category !== 'product' && isBlank(product.latestVersion)) {
    issues.push('Version obligatoire.')
  }
  return issues
}

export function getProductCatalogItemIssues(product: ProductCatalogItem) {
  const issues: string[] = []
  if (isBlank(product.name)) issues.push('Nom obligatoire.')
  if (isBlank(product.productType)) issues.push('Type de produit manquant.')
  const incompleteEditions = (product.editions ?? []).filter((edition) => isBlank(edition.name))
  if (incompleteEditions.length) issues.push('Edition sans nom.')
  const incompleteSpareParts = product.spareParts.filter(
    (sparePart) => isBlank(sparePart.name) || isBlank(sparePart.sku),
  )
  if (incompleteSpareParts.length) issues.push('Spare part incomplete.')
  return issues
}

export function getPortalCodeLineIssues(line: CustomerPortalCodeLine) {
  const issues: string[] = []
  const hasAnyModule = Boolean(
    line.title?.trim() ||
      line.code.trim() ||
      line.quickLinkUrl?.trim() ||
      line.quickCopyText?.trim() ||
      line.infoNote?.trim() ||
      line.showDraft,
  )
  if (!hasAnyModule) issues.push('Etape vide.')
  if (line.quickLinkUrl?.trim() && !/^https?:\/\//i.test(line.quickLinkUrl.trim())) {
    issues.push('Lien rapide invalide.')
  }
  return issues
}

export function getPortalProcedureIssues(procedure: CustomerPortalCode) {
  const issues: string[] = []
  if (isBlank(procedure.procedureName)) issues.push('Nom obligatoire.')
  if (!procedure.codes.length) issues.push('Au moins une etape obligatoire.')
  if (procedure.codes.some((line) => getPortalCodeLineIssues(line).length > 0)) {
    issues.push('Etape principale incomplete.')
  }
  if (
    procedure.hasVariant &&
    (!(procedure.variantCodes ?? []).length ||
      (procedure.variantCodes ?? []).some((line) => getPortalCodeLineIssues(line).length > 0))
  ) {
    issues.push('Version alternative incomplete.')
  }
  return issues
}

export function getProcedureMailtoIssues(link: ProcedureMailtoLink) {
  const issues: string[] = []
  if (isBlank(link.label)) issues.push('Libelle obligatoire.')
  if (isBlank(link.to)) issues.push('Email obligatoire.')
  if (link.to?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(link.to.trim())) {
    issues.push('Email invalide.')
  }
  return issues
}

export function getTroubleshootgunTemplateIssues(template: TroubleshootgunTemplate) {
  const issues: string[] = []
  if (isBlank(template.name)) issues.push('Titre obligatoire.')
  if (isBlank(template.content)) issues.push('Contenu mail obligatoire.')
  return issues
}

export function getDashboardNewsIssues(item: DashboardNewsItem) {
  const issues: string[] = []
  if (isBlank(item.date)) issues.push('Date obligatoire.')
  if (isBlank(item.title)) issues.push('Titre obligatoire.')
  if (isBlank(item.content)) issues.push('Contenu obligatoire.')
  return issues
}
