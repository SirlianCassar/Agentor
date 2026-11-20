/* What Agentor answers when the extension asks which template fits the case:
   the families, the variant resolved for this case, and the values that fill
   the `***` left in the merged body. */
import {
  normalizeCrmTemplateBrand,
  normalizeCrmTemplateLanguage,
  resolveCrmTemplateVariant,
  type CrmTemplateBrand,
  type CrmTemplateIndex,
  type CrmTemplateLanguage,
  type CrmTemplateTarget,
  type CrmTemplateZone,
} from './crmTemplates'

const normalize = (value: string) =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

// The zone a country belongs to, as the template titles cut the world. The
// list is deliberately explicit: a country nobody listed falls to WW rather
// than to a neighbour's rules.
const ZONE_BY_COUNTRY: Record<string, CrmTemplateZone> = {}
const addZone = (zone: CrmTemplateZone, countries: string[]) => {
  for (const country of countries) ZONE_BY_COUNTRY[normalize(country)] = zone
}

addZone('UK', ['royaume-uni', 'royaume uni', 'united kingdom', 'angleterre', 'grande-bretagne'])
addZone('US', ['etats-unis', 'etats unis', 'united states', 'usa'])
addZone('CA', ['canada'])
addZone('CH', ['suisse', 'switzerland'])
addZone('HK', ['hong-kong', 'hong kong'])
addZone('TW', ['taiwan', 'taïwan'])
addZone('AU', ['australie', 'australia'])
addZone('EU', [
  'allemagne', 'autriche', 'belgique', 'bulgarie', 'chypre', 'croatie', 'danemark', 'espagne',
  'estonie', 'finlande', 'france', 'grece', 'hongrie', 'irlande', 'islande', 'italie', 'lettonie',
  'liechtenstein', 'lituanie', 'luxembourg', 'malte', 'norvege', 'pays-bas', 'pologne', 'portugal',
  'republique tcheque', 'roumanie', 'slovaquie', 'slovenie', 'suede',
])

export function resolveCrmTemplateZone(country: unknown): CrmTemplateZone | null {
  if (typeof country !== 'string' || !country.trim()) return null
  return ZONE_BY_COUNTRY[normalize(country)] ?? 'WW'
}

// Only an explicit brand word decides. A product named after its model alone
// leaves the brand open, and the agent picks.
export function resolveCrmTemplateBrand(productName: unknown): CrmTemplateBrand | null {
  if (typeof productName !== 'string') return null
  const text = normalize(productName)
  for (const word of ['thrustmaster', 'hercules', 'djuced']) {
    if (text.includes(word)) return normalizeCrmTemplateBrand(word)
  }
  return null
}

export interface CrmTemplateCaseFields {
  productName?: string | null
  country?: string | null
  customerLanguage?: string | null
}

export function resolveCrmTemplateTarget(fields: CrmTemplateCaseFields): CrmTemplateTarget {
  return {
    brand: resolveCrmTemplateBrand(fields.productName),
    language: normalizeCrmTemplateLanguage(fields.customerLanguage ?? null),
    zone: resolveCrmTemplateZone(fields.country),
  }
}

export interface CrmTemplateSuggestion {
  key: string
  label: string
  logistics: boolean
  variants: number
  // Null when the case does not decide: the extension then lists the variants.
  templateId: string | null
  title: string | null
  exactZone: boolean
  reason?: 'brand' | 'language' | 'zone' | 'empty'
}

export interface CrmTemplateSuggestions {
  target: {
    brand: CrmTemplateBrand | null
    language: CrmTemplateLanguage | null
    zone: CrmTemplateZone | null
  }
  families: CrmTemplateSuggestion[]
}

/** Resolves every family against the case at once; the list is short. */
export function suggestCrmTemplates(
  index: CrmTemplateIndex,
  fields: CrmTemplateCaseFields,
): CrmTemplateSuggestions {
  const target = resolveCrmTemplateTarget(fields)
  const families = index.families.map((family) => {
    const resolution = resolveCrmTemplateVariant(family, target)
    return {
      key: family.key,
      label: family.label,
      logistics: family.logistics,
      variants: family.variants.length,
      templateId: resolution.variant?.id ?? null,
      title: resolution.variant?.title ?? null,
      exactZone: resolution.variant ? resolution.exactZone : false,
      ...(resolution.variant ? {} : { reason: resolution.reason }),
    }
  })
  return { target, families }
}
