/* High-level AppData operations: clone, merge, legacy-token conversion,
   section normalization, and seed merging. */
import { normalizeMailTemplateCategories, normalizeTaskTemplateCategories } from './categories'
import { CALL_HISTORY_LIMIT, PHONE_CALL_TEMPLATE } from './constants'
import {
  normalizeDashboardData,
  normalizeDashboardNews,
  normalizeDashboardProducts,
  normalizePortalProcedures,
  normalizeProducts,
} from './dashboardData'
import {
  buildTaskTemplateContent,
  ensureStructuredTaskDraft,
  normalizeStoredTaskSectionNames,
  normalizeTaskSectionId,
  normalizeTaskTemplateKind,
  normalizeTaskTemplateSections,
} from './taskDraft'
import type { AppData } from './types'
import { normalizeDashboardNewsColorTags } from './utils'

export function cloneAppData(payload: AppData): AppData {
  return JSON.parse(JSON.stringify(payload)) as AppData
}


export function mergeById<T extends { id: string }>(current: T[], incoming: T[]) {
  const map = new Map(current.map((item) => [item.id, item]))
  for (const item of incoming) map.set(item.id, item)
  return Array.from(map.values())
}

export const convertLegacyTokens = (value: string) =>
  value.replace(/\*([^*\r\n]+)\*/g, '<$1>').replace(/#([^#\r\n]+)#/g, '§$1§')

export const convertLegacyTokensMaybe = (value?: string) =>
  typeof value === 'string' ? convertLegacyTokens(value) : value

export const normalizeTaskSectionsInData = (payload: AppData): AppData => {
  const sectionNames = normalizeStoredTaskSectionNames(payload.settings.taskSectionNames)
  const templateCategories = normalizeMailTemplateCategories(payload.settings.mailTemplateCategories)
  const taskTemplateCategories = normalizeTaskTemplateCategories(payload.settings.taskTemplateCategories)
  const firstTemplateCategoryId = templateCategories[0]?.id ?? ''
  const taskCategoryIdsByKind = {
    's-task': new Set(
      taskTemplateCategories
        .filter((category) => category.kind === 's-task')
        .map((category) => category.id),
    ),
    'f-task': new Set(
      taskTemplateCategories
        .filter((category) => category.kind === 'f-task')
        .map((category) => category.id),
    ),
  }
  const firstTaskTemplateCategoryId = {
    's-task':
      taskTemplateCategories.find((category) => category.kind === 's-task')?.id ?? '',
    'f-task':
      taskTemplateCategories.find((category) => category.kind === 'f-task')?.id ?? '',
  }
  const snippetCategoryId = 'cat-general'
  const categories = payload.categories.filter((category) => category.id !== snippetCategoryId)
  return {
    ...payload,
    categories,
    taskDraft: ensureStructuredTaskDraft(payload.taskDraft, sectionNames),
    snippets: payload.snippets.map((snippet) => ({
      ...snippet,
      taskSectionId: normalizeTaskSectionId(snippet.taskSectionId),
      categoryId: snippet.categoryId === snippetCategoryId ? '' : snippet.categoryId,
    })),
    templates: payload.templates.map((template) => ({
      ...template,
      taskSectionId: normalizeTaskSectionId(template.taskSectionId),
      categoryId: template.categoryId?.trim() || firstTemplateCategoryId,
      favorite: Boolean(template.favorite),
    })),
    taskTemplates: payload.taskTemplates.map((task) => {
      const kind = normalizeTaskTemplateKind(task)
      return {
        ...task,
        kind,
        taskSectionId:
          kind === 's-task' ? undefined : normalizeTaskSectionId(task.taskSectionId),
        taskSections: normalizeTaskTemplateSections(task),
        content: buildTaskTemplateContent(task),
        hiddenFromLists: Boolean(task.hiddenFromLists),
        categoryId:
          task.categoryId && taskCategoryIdsByKind[kind].has(task.categoryId)
            ? task.categoryId
            : firstTaskTemplateCategoryId[kind],
        favorite: Boolean(task.favorite),
      }
    }),
    procedures: payload.procedures.map((procedure) => ({
      ...procedure,
      taskSectionId: normalizeTaskSectionId(procedure.taskSectionId),
    })),
    settings: {
      ...payload.settings,
      taskSectionNames: sectionNames,
      mailTemplateCategories: templateCategories,
      taskTemplateCategories,
    },
  }
}

export const convertLegacyTokensInData = (payload: AppData): AppData =>
  normalizeTaskSectionsInData(normalizeDashboardData({
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
      description: convertLegacyTokensMaybe(template.description),
      content: convertLegacyTokens(template.content),
      taskText: convertLegacyTokensMaybe(template.taskText),
      categoryId: template.categoryId,
      favorite: Boolean(template.favorite),
    })),
    taskTemplates: payload.taskTemplates.map((task) => ({
      ...task,
      name: convertLegacyTokens(task.name),
      taskTitle: convertLegacyTokensMaybe(task.taskTitle),
      content: convertLegacyTokens(task.content),
      taskSections: normalizeTaskTemplateSections(task).map((section) => convertLegacyTokens(section)),
      categoryId: task.categoryId,
      favorite: Boolean(task.favorite),
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
  }))

export function mergeData(current: AppData, incoming: AppData) {
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

export function addMissingById<T extends { id: string }>(current: T[], seed: T[]) {
  const currentIds = new Set(current.map((item) => item.id))
  return [...current, ...seed.filter((item) => !currentIds.has(item.id))]
}

export function mergeSeedIntoData(current: AppData, seed: AppData) {
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
      mailTemplateCategories: addMissingById(
        normalizeMailTemplateCategories(current.settings.mailTemplateCategories),
        normalizeMailTemplateCategories(seed.settings.mailTemplateCategories),
      ),
      taskTemplateCategories: addMissingById(
        normalizeTaskTemplateCategories(current.settings.taskTemplateCategories),
        normalizeTaskTemplateCategories(seed.settings.taskTemplateCategories),
      ),
    },
  }
}
