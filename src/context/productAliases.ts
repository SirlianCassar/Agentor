/* Product names as written in the mails: CRM names are often long, so a list
   maps a CRM name to the shorter name used in templates. */
import type { CaseContext } from './caseContext'

export interface ProductAlias {
  id: string
  crm: string
  alias: string
}

const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('fr')
    .replace(/\s+/g, ' ')
    .trim()

export function normalizeProductAliases(raw: unknown): ProductAlias[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return []
    const { id, crm, alias } = item as Partial<ProductAlias>
    if (typeof crm !== 'string' || typeof alias !== 'string') return []
    return [{ id: typeof id === 'string' && id ? id : `product-alias-${index}`, crm, alias }]
  })
}

// An exact name wins; otherwise the longest CRM name contained in the product
// name, so "T598" does not hide a more precise "T598 Racing Wheel".
export function findProductAlias(name: string, aliases: ProductAlias[]) {
  const target = fold(name)
  if (!target) return null
  const usable = aliases.filter((item) => fold(item.crm) && item.alias.trim())
  const exact = usable.find((item) => fold(item.crm) === target)
  if (exact) return exact
  return (
    usable
      .filter((item) => target.includes(fold(item.crm)))
      .sort((left, right) => fold(right.crm).length - fold(left.crm).length)[0] ?? null
  )
}

// The context as used by Agentor: the product name replaced by its mail name,
// the CRM name kept beside it.
export function applyProductAliases(context: CaseContext | null, aliases: ProductAlias[]): CaseContext | null {
  const field = context?.fields.productName
  if (!context || !field?.value || !aliases.length) return context
  const match = findProductAlias(field.value, aliases)
  if (!match) return context
  return {
    ...context,
    fields: {
      ...context.fields,
      productName: { ...field, value: match.alias.trim(), aliasOf: field.value },
    },
  }
}
