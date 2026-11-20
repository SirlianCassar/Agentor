/* CRM e-mail templates: the index Agentor keeps, how a title is read, and how
   the right variant is resolved for the open case.

   The organisation names its case templates on a convention:

     [LOG ] <TM|HR> <LANG> - <famille>[ - <zone>]

   A few families invert it (`Order Cancellation TM EN`) or name the brand in
   full (`THRUSTMASTER FR - …`). Everything else is kept as unclassified rather
   than guessed: a template nobody can read is still choosable by hand. */

export const CRM_TEMPLATE_LANGUAGES = ['EN', 'FR', 'DE', 'SP', 'IT', 'PT', 'NL'] as const
export type CrmTemplateLanguage = (typeof CRM_TEMPLATE_LANGUAGES)[number]

export const CRM_TEMPLATE_BRANDS = ['TM', 'HR'] as const
export type CrmTemplateBrand = (typeof CRM_TEMPLATE_BRANDS)[number]

// Zones as the titles write them. A suffix is read as a zone only when every
// one of its words is one of these; "US Ricmotech" stays part of the family.
export const CRM_TEMPLATE_ZONES = ['WW', 'EU', 'UK', 'US', 'CA', 'CH', 'HK', 'TW', 'AU'] as const
export type CrmTemplateZone = (typeof CRM_TEMPLATE_ZONES)[number]

const LANGUAGE_BY_CODE: Record<number, CrmTemplateLanguage> = {
  1033: 'EN',
  1036: 'FR',
  1031: 'DE',
  3082: 'SP',
  1040: 'IT',
  2070: 'PT',
  1043: 'NL',
}

// What the CRM writes in the language lookup of a case or a contact, and the
// spellings a few titles use for Dutch and Spanish.
const LANGUAGE_BY_LABEL: Record<string, CrmTemplateLanguage> = {
  anglais: 'EN',
  english: 'EN',
  francais: 'FR',
  french: 'FR',
  allemand: 'DE',
  german: 'DE',
  deutsch: 'DE',
  espagnol: 'SP',
  spanish: 'SP',
  es: 'SP',
  italien: 'IT',
  italian: 'IT',
  portugais: 'PT',
  portuguese: 'PT',
  neerlandais: 'NL',
  dutch: 'NL',
  ne: 'NL',
}

// DJUCED titles answer for Hercules products: same brand as far as the
// templates are concerned.
const BRAND_BY_WORD: Record<string, CrmTemplateBrand> = {
  tm: 'TM',
  thrustmaster: 'TM',
  hr: 'HR',
  herc: 'HR',
  hercules: 'HR',
  djuced: 'HR',
}

const normalize = (value: string) =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()

/** Accepts a Dynamics language code (1036), a title token (FR) or a label ("Français"). */
export function normalizeCrmTemplateLanguage(value: unknown): CrmTemplateLanguage | null {
  if (typeof value === 'number') return LANGUAGE_BY_CODE[value] ?? null
  if (typeof value !== 'string') return null
  const text = value.trim()
  if (!text) return null
  const code = Number(text)
  if (Number.isInteger(code) && LANGUAGE_BY_CODE[code]) return LANGUAGE_BY_CODE[code]
  const upper = text.toUpperCase()
  if ((CRM_TEMPLATE_LANGUAGES as readonly string[]).includes(upper)) return upper as CrmTemplateLanguage
  return LANGUAGE_BY_LABEL[normalize(text)] ?? null
}

export function normalizeCrmTemplateBrand(value: unknown): CrmTemplateBrand | null {
  if (typeof value !== 'string') return null
  return BRAND_BY_WORD[normalize(value)] ?? null
}

/** The family key both sides agree on: accents and punctuation dropped. */
export const crmTemplateFamilyKey = (label: string) =>
  normalize(label).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export interface CrmTemplateIndexEntry {
  id: string
  title: string
  languageCode: number
  modifiedOn?: string
}

export interface CrmTemplateVariant extends CrmTemplateIndexEntry {
  brand: CrmTemplateBrand
  language: CrmTemplateLanguage
  zones: CrmTemplateZone[]
}

export interface CrmTemplateFamily {
  key: string
  label: string
  // Logistics families carry the LOG prefix; they are the return labels and
  // shipping notices, kept apart from the agent's own answers.
  logistics: boolean
  variants: CrmTemplateVariant[]
}

export interface CrmTemplateIndex {
  families: CrmTemplateFamily[]
  unclassified: CrmTemplateIndexEntry[]
}

interface ParsedTitle {
  brand: CrmTemplateBrand
  language: CrmTemplateLanguage
  zones: CrmTemplateZone[]
  family: string
  logistics: boolean
}

const readZones = (segment: string): CrmTemplateZone[] | null => {
  const words = segment.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return null
  const zones: CrmTemplateZone[] = []
  for (const word of words) {
    const zone = word.toUpperCase()
    if (!(CRM_TEMPLATE_ZONES as readonly string[]).includes(zone)) return null
    zones.push(zone as CrmTemplateZone)
  }
  return zones
}

// Takes the zone words closing a segment, leaving the rest of the wording
// alone. A family word that happens to spell a zone in lower case is kept.
const readTrailingZones = (segment: string): { rest: string; zones: CrmTemplateZone[] } | null => {
  const words = segment.trim().split(/\s+/).filter(Boolean)
  const zones: CrmTemplateZone[] = []
  while (words.length > 1 && (CRM_TEMPLATE_ZONES as readonly string[]).includes(words[words.length - 1])) {
    zones.unshift(words.pop() as CrmTemplateZone)
  }
  return zones.length ? { rest: words.join(' '), zones } : null
}

/** Reads a template title; returns null when it does not follow the convention. */
export function parseCrmTemplateTitle(rawTitle: string, languageCode?: number): ParsedTitle | null {
  const title = String(rawTitle || '').trim()
  if (!title) return null

  const logistics = /^log\s+/i.test(title)
  const body = logistics ? title.replace(/^log\s+/i, '') : title
  const segments = body.split(' - ').map((part) => part.trim())
  const head = segments[0] ?? ''

  // "TM EN - Famille - ZONE" and "THRUSTMASTER DE - Famille".
  const headMatch = head.match(/^([A-Za-zé]+)\s+([A-Za-z]{2})$/)
  if (headMatch && segments.length > 1) {
    const brand = normalizeCrmTemplateBrand(headMatch[1])
    const language = normalizeCrmTemplateLanguage(headMatch[2]) ?? normalizeCrmTemplateLanguage(languageCode)
    if (brand && language) {
      const rest = segments.slice(1)
      const segmentZones = rest.length > 1 ? readZones(rest[rest.length - 1]) : null
      const kept = segmentZones ? rest.slice(0, -1) : rest
      // The logistics titles close on the zone without a separator:
      // "… - message to customer EU". Only uppercase zone words are taken.
      const trailing = !segmentZones ? readTrailingZones(kept[kept.length - 1] ?? '') : null
      if (trailing) kept[kept.length - 1] = trailing.rest
      const zones = segmentZones ?? trailing?.zones ?? []
      const family = kept.join(' - ').trim()
      if (family) return { brand, language, zones, family, logistics }
    }
  }

  // "Order Cancellation TM EN": the brand and the language close the title.
  const tailMatch = body.match(/^(.+?)\s+([A-Za-z]+)\s+([A-Za-z]{2})$/)
  if (tailMatch && segments.length === 1) {
    const brand = normalizeCrmTemplateBrand(tailMatch[2])
    const language = normalizeCrmTemplateLanguage(tailMatch[3]) ?? normalizeCrmTemplateLanguage(languageCode)
    const family = tailMatch[1].trim()
    if (brand && language && family) return { brand, language, zones: [], family, logistics }
  }

  return null
}

/** Folds the flat index into families; what cannot be read stays listed apart. */
export function buildCrmTemplateIndex(entries: CrmTemplateIndexEntry[]): CrmTemplateIndex {
  const families = new Map<string, CrmTemplateFamily>()
  const unclassified: CrmTemplateIndexEntry[] = []

  for (const entry of entries) {
    const parsed = parseCrmTemplateTitle(entry.title, entry.languageCode)
    if (!parsed) {
      unclassified.push(entry)
      continue
    }
    const key = `${parsed.logistics ? 'log-' : ''}${crmTemplateFamilyKey(parsed.family)}`
    const family = families.get(key) ?? { key, label: parsed.family, logistics: parsed.logistics, variants: [] }
    family.variants.push({
      ...entry,
      brand: parsed.brand,
      language: parsed.language,
      zones: parsed.zones,
    })
    families.set(key, family)
  }

  return {
    families: [...families.values()].sort((a, b) => a.label.localeCompare(b.label, 'fr')),
    unclassified: unclassified.sort((a, b) => a.title.localeCompare(b.title, 'fr')),
  }
}

export interface CrmTemplateTarget {
  brand: CrmTemplateBrand | null
  language: CrmTemplateLanguage | null
  zone: CrmTemplateZone | null
}

export type CrmTemplateResolution =
  | { variant: CrmTemplateVariant; exactZone: boolean }
  // Nothing is chosen in the dark: the caller shows the reason and the list.
  | { variant: null; reason: 'brand' | 'language' | 'zone' | 'empty' }

/** Picks the variant of a family for the open case. */
export function resolveCrmTemplateVariant(
  family: CrmTemplateFamily,
  target: CrmTemplateTarget,
): CrmTemplateResolution {
  if (!family.variants.length) return { variant: null, reason: 'empty' }
  if (!target.brand) return { variant: null, reason: 'brand' }
  if (!target.language) return { variant: null, reason: 'language' }

  const sameBrand = family.variants.filter((variant) => variant.brand === target.brand)
  if (!sameBrand.length) return { variant: null, reason: 'brand' }
  const candidates = sameBrand.filter((variant) => variant.language === target.language)
  if (!candidates.length) return { variant: null, reason: 'language' }

  if (target.zone) {
    const exact = candidates.find((variant) => variant.zones.includes(target.zone as CrmTemplateZone))
    if (exact) return { variant: exact, exactZone: true }
  }
  // A template without a zone covers every country; WW says so explicitly.
  const worldwide = candidates.find((variant) => variant.zones.includes('WW'))
  if (worldwide) return { variant: worldwide, exactZone: false }
  const zoneless = candidates.find((variant) => !variant.zones.length)
  if (zoneless) return { variant: zoneless, exactZone: false }
  if (candidates.length === 1) return { variant: candidates[0], exactZone: false }
  return { variant: null, reason: 'zone' }
}
