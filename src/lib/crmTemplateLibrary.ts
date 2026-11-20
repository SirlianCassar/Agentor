/* The CRM templates as library items.

   A family of CRM templates is not a second kind of thing the agent has to
   learn: it belongs in the same search as the mail templates, with the same
   categories and the same preview. What changes is where the body comes from —
   the CRM merges it with the case when it is asked for, instead of it being
   stored here.

   So this module says how a family reads in the list, and what the merged body
   becomes once it comes back: an ordinary MailTemplate, holes turned to tags. */
import { markCrmTemplateHoles, type CrmTemplateHoleMap } from './crmTemplateHoles'
import type { CrmTemplateIndex } from './crmTemplates'
import { suggestCrmTemplates, type CrmTemplateCaseFields, type CrmTemplateSuggestion } from './crmTemplateSuggest'
import type { Language, MailTemplate } from './types'
import type { SearchEntry } from './unifiedSearch'

export const CRM_LIBRARY_FOLDER_ID = 'crm'
export const CRM_LIBRARY_FOLDER_NAME = 'Modèles du CRM'
export const CRM_UNCLASSIFIED_FOLDER_ID = 'crm-unclassified'
export const CRM_UNCLASSIFIED_FOLDER_NAME = 'Modèles du CRM · non classés'

export type CrmLibraryPick =
  | { kind: 'family'; familyKey: string }
  | { kind: 'template'; templateId: string }
  // One named variant of a family, chosen by hand: the family key still travels
  // with it, so the `***` of that family become tags as usual.
  | { kind: 'variant'; familyKey: string; templateId: string }

/** Reads back what a search entry stands for. */
export function readCrmLibraryId(id: string): CrmLibraryPick | null {
  if (id.startsWith('variant:')) {
    const [familyKey, ...rest] = id.slice(8).split(':')
    const templateId = rest.join(':')
    return familyKey && templateId ? { kind: 'variant', familyKey, templateId } : null
  }
  if (id.startsWith('family:')) {
    const familyKey = id.slice(7)
    return familyKey ? { kind: 'family', familyKey } : null
  }
  if (id.startsWith('template:')) {
    const templateId = id.slice(9)
    return templateId ? { kind: 'template', templateId } : null
  }
  return null
}

/** Why a family cannot be resolved for this case, in the agent's words. */
export function crmSuggestionNote(suggestion: CrmTemplateSuggestion, brandFromDefault = false): string {
  if (suggestion.title) {
    const note = suggestion.exactZone ? suggestion.title : `${suggestion.title} · zone approchée`
    return brandFromDefault ? `${note} · marque par défaut` : note
  }
  if (suggestion.reason === 'brand') return 'Marque du dossier inconnue'
  if (suggestion.reason === 'language') return 'Langue du client inconnue'
  if (suggestion.reason === 'zone') return 'Plusieurs zones possibles'
  return 'Aucune variante utilisable'
}

/** The variant's own title, shortened to what distinguishes it in a list. */
function crmVariantNote(variant: { language: string; zones: string[] }): string {
  return [variant.language, variant.zones.join('/')].filter(Boolean).join(' · ')
}

export interface CrmLibraryEntries {
  entries: SearchEntry[]
  suggestions: Map<string, CrmTemplateSuggestion>
}

/** The families and the leftovers, as entries of the mail search. */
export function buildCrmSearchEntries(
  index: CrmTemplateIndex,
  fields: CrmTemplateCaseFields,
): CrmLibraryEntries {
  const resolved = suggestCrmTemplates(index, fields)
  const byKey = new Map(index.families.map((family) => [family.key, family]))
  const suggestions = new Map(resolved.families.map((family) => [family.key, family]))

  /* A family the case resolves is one entry. A family it does not resolve used
     to be one entry too, which said "à choisir" and then refused to open: the
     agent was told to choose with nothing to choose from. It now opens into its
     variants, each one a line of the same list, so the import is always
     possible — by hand when the case does not decide. */
  const entries: SearchEntry[] = resolved.families.flatMap((suggestion): SearchEntry[] => {
    const family = byKey.get(suggestion.key)
    const title = suggestion.logistics ? `LOG ${suggestion.label}` : suggestion.label
    const variants = family?.variants ?? []
    if (!suggestion.title) {
      const reason = crmSuggestionNote(suggestion)
      return variants.map((variant): SearchEntry => ({
        kind: 'crm',
        id: `variant:${suggestion.key}:${variant.id}`,
        title: `${title} · ${variant.brand} ${crmVariantNote(variant)}`,
        body: variant.title,
        preview: `${reason} — variante choisie à la main`,
        folderId: CRM_LIBRARY_FOLDER_ID,
        folderName: CRM_LIBRARY_FOLDER_NAME,
        language: variant.language,
      }))
    }
    return [{
      kind: 'crm',
      id: `family:${suggestion.key}`,
      title,
      // Searching on the variant titles too: "RMA EN" finds the family.
      body: variants.map((variant) => variant.title).join('\n'),
      preview: crmSuggestionNote(suggestion, resolved.target.brandFromDefault),
      folderId: CRM_LIBRARY_FOLDER_ID,
      folderName: CRM_LIBRARY_FOLDER_NAME,
      language: resolved.target.language ?? undefined,
    }]
  })

  for (const entry of index.unclassified) {
    entries.push({
      kind: 'crm',
      id: `template:${entry.id}`,
      title: entry.title,
      body: entry.title,
      preview: 'Hors convention — choisi à la main',
      folderId: CRM_UNCLASSIFIED_FOLDER_ID,
      folderName: CRM_UNCLASSIFIED_FOLDER_NAME,
    })
  }

  return { entries, suggestions }
}

export interface MergedCrmTemplate {
  familyKey?: string
  title: string
  subject: string
  body: string
}

/* The template Agentor holds for the length of a draft. It is not saved: the
   bodies live in the CRM, where other people edit them. Its identifier is the
   CRM one, so reopening the same template replaces the preview rather than
   piling up. */
export const CRM_PREVIEW_TEMPLATE_PREFIX = 'crm-template-'

export function crmTemplateAsMailTemplate(
  merged: MergedCrmTemplate,
  language: Language,
  holes?: CrmTemplateHoleMap,
): { template: MailTemplate; marked: string[]; remaining: number } {
  const { text, marked, remaining } = markCrmTemplateHoles(merged.body, merged.familyKey, holes)
  return {
    template: {
      id: `${CRM_PREVIEW_TEMPLATE_PREFIX}${merged.familyKey ?? 'single'}`,
      name: merged.title,
      description: merged.subject,
      content: text,
      language,
      // Nothing is imported into a task: a CRM template is a mail.
      taskImportMode: 'none',
      taskOptional: true,
    },
    marked,
    remaining,
  }
}

/* Agentor's own language field only tells French from the rest; the CRM
   language decided the variant long before, and the merged body is already in
   it. This is only what the preview labels the single version with. */
export const crmLanguageToAppLanguage = (language: string | null | undefined): Language =>
  String(language ?? '').toUpperCase() === 'FR' ? 'fr' : 'en'
