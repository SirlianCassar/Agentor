/* Mail/task template category normalization. */
import { defaultData } from './defaults'
import type { MailTemplateCategory, TaskTemplateCategory, TaskTemplateKind } from './types'

export const normalizeNamedCategories = (
  categories: MailTemplateCategory[] | undefined,
  fallbackCategories: MailTemplateCategory[],
) => {
  const source = Array.isArray(categories) ? categories : fallbackCategories
  const normalized = source
    .map((category, index) => ({
      id: category.id?.trim() || `template-cat-${index + 1}`,
      name: category.name?.trim() || `Category ${index + 1}`,
    }))
    .filter((category) => category.name.trim())
  return Array.isArray(categories) ? normalized : fallbackCategories
}

export const normalizeMailTemplateCategories = (categories: MailTemplateCategory[] | undefined) =>
  normalizeNamedCategories(categories, defaultData.settings.mailTemplateCategories)

export const normalizeTaskTemplateCategories = (
  categories: TaskTemplateCategory[] | undefined,
) => {
  const source = Array.isArray(categories)
    ? categories
    : defaultData.settings.taskTemplateCategories
  const normalized = source
    .map((category, index) => ({
      id: category.id?.trim() || `task-template-cat-${index + 1}`,
      name: category.name?.trim() || `Category ${index + 1}`,
      kind: (category.kind === 's-task' ? 's-task' : 'f-task') as TaskTemplateKind,
    }))
    .filter((category) => category.name.trim())

  const withFallbacks = [...normalized]
  const kinds: TaskTemplateKind[] = ['s-task', 'f-task']
  kinds.forEach((kind) => {
    if (withFallbacks.some((category) => category.kind === kind)) return
    const fallback = defaultData.settings.taskTemplateCategories.find(
      (category) => category.kind === kind,
    )
    if (fallback) withFallbacks.push({ ...fallback, kind })
  })
  return withFallbacks
}
