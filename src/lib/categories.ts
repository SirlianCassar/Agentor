/* Mail/task template category normalization. */
import { defaultData } from './defaults'
import type { MailTemplateCategory } from './types'

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

export const normalizeTaskTemplateCategories = (categories: MailTemplateCategory[] | undefined) =>
  normalizeNamedCategories(categories, defaultData.settings.taskTemplateCategories)

