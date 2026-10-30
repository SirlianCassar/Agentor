/* Several languages for one mail template. The main version is the template's
   own language and content; other languages are stored as translations. */
import type { MailTemplate } from './types'

export const TEMPLATE_LANGUAGES: Array<{ code: string; label: string }> = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'Anglais' },
  { code: 'de', label: 'Allemand' },
  { code: 'es', label: 'Espagnol' },
  { code: 'it', label: 'Italien' },
  { code: 'nl', label: 'Néerlandais' },
  { code: 'pt', label: 'Portugais' },
  { code: 'pl', label: 'Polonais' },
]

export const templateLanguageLabel = (code: string) =>
  TEMPLATE_LANGUAGES.find((item) => item.code === code)?.label ?? code.toUpperCase()

export interface TemplateVersion {
  language: string
  content: string
}

// Main version first, then each other language that has content, once.
export function getTemplateVersions(template: Pick<MailTemplate, 'language' | 'content' | 'translations'>) {
  const versions: TemplateVersion[] = [{ language: template.language, content: template.content }]
  for (const item of template.translations ?? []) {
    if (!item?.content?.trim() || versions.some((version) => version.language === item.language)) continue
    versions.push({ language: item.language, content: item.content })
  }
  return versions
}

export function getTemplateVersion(
  template: Pick<MailTemplate, 'language' | 'content' | 'translations'>,
  language: string | undefined,
) {
  const versions = getTemplateVersions(template)
  return versions.find((version) => version.language === language) ?? versions[0]
}

// Country of the active case (as written in the CRM) to a template language.
const countryLanguages: Array<[RegExp, string]> = [
  [/^(france|belgique|belgium|luxembourg|monaco)$/, 'fr'],
  [/^(allemagne|germany|deutschland|autriche|austria|osterreich)$/, 'de'],
  [/^(espagne|spain|espana|mexique|mexico)$/, 'es'],
  [/^(italie|italy|italia)$/, 'it'],
  [/^(pays-bas|netherlands|nederland)$/, 'nl'],
  [/^(portugal|bresil|brazil|brasil)$/, 'pt'],
  [/^(pologne|poland|polska)$/, 'pl'],
  [/^(royaume-uni|united kingdom|uk|irlande|ireland|etats-unis|united states|usa|canada|australie|australia)$/, 'en'],
]

export function languageForCountry(country: string | null | undefined) {
  if (!country) return null
  const name = country
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLocaleLowerCase('fr')
    .trim()
  return countryLanguages.find(([pattern]) => pattern.test(name))?.[1] ?? null
}

// Language offered first when a template is loaded: the one of the case's
// country if the template has it, otherwise the last one chosen, otherwise the
// main version.
export function pickTemplateLanguage(
  template: Pick<MailTemplate, 'language' | 'content' | 'translations'>,
  hints: { country?: string | null; lastChosen?: string | null },
) {
  const available = getTemplateVersions(template).map((version) => version.language)
  const fromCountry = languageForCountry(hints.country)
  if (fromCountry && available.includes(fromCountry)) return fromCountry
  if (hints.lastChosen && available.includes(hints.lastChosen)) return hints.lastChosen
  return available[0]
}
